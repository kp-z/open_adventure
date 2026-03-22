#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
MICROVERSE_DIR="$PROJECT_ROOT/microverse"
EXPORT_DIR="$MICROVERSE_DIR/export"
TARGET_DIR="$PROJECT_ROOT/frontend/public/microverse"
LOG_FILE="/tmp/godot_export.log"

# ============ Phase 1: Pre-check ============
echo "=== Phase 1: Pre-check ==="

if ! command -v godot &>/dev/null; then
    echo "ERROR: godot not found. Install: brew install godot"
    exit 1
fi
echo "  godot: $(godot --version 2>/dev/null | head -1)"

echo "  Scanning for curly quotes..."
CURLY_FOUND=0
while IFS= read -r -d '' gdfile; do
    python3 -c "
import sys
with open(sys.argv[1],'r') as f:
    for i,line in enumerate(f,1):
        for ch in line:
            if ord(ch) in (0x201C,0x201D,0x2018,0x2019):
                print(f'  ERROR: {sys.argv[1]}:{i} curly quote U+{ord(ch):04X}')
                sys.exit(1)
" "$gdfile" || CURLY_FOUND=1
done < <(find "$MICROVERSE_DIR/script" -name "*.gd" -print0)

if [ "$CURLY_FOUND" -eq 1 ]; then
    echo "ERROR: Curly quotes found. Fix before export."
    exit 1
fi
echo "  No curly quotes found."

if grep -rn "clip_contents" "$MICROVERSE_DIR/script/" 2>/dev/null | grep -v "# clip_contents" >/dev/null; then
    echo "  WARNING: clip_contents found (only valid on Control nodes)"
fi

echo "  Pre-check passed."

# ============ Phase 2: Export ============
echo ""
echo "=== Phase 2: Godot Export ==="
mkdir -p "$EXPORT_DIR"
cd "$MICROVERSE_DIR"
godot --headless --export-debug "Web" "$EXPORT_DIR/index.html" 2>&1 | tee "$LOG_FILE"

if grep -q "SCRIPT ERROR\|Parse Error" "$LOG_FILE"; then
    echo ""
    echo "EXPORT FAILED: Script errors detected:"
    grep "SCRIPT ERROR\|Parse Error" "$LOG_FILE"
    exit 1
fi
echo "  Export completed."

# ============ Phase 3: Sync ============
echo ""
echo "=== Phase 3: Sync to frontend ==="
cd "$PROJECT_ROOT"
mkdir -p "$TARGET_DIR"

for f in "$EXPORT_DIR"/*; do
    fname=$(basename "$f")
    case "$fname" in
        *.import) continue ;;
        *) cp "$f" "$TARGET_DIR/$fname" ;;
    esac
done

COMMIT=$(git -C "$MICROVERSE_DIR" rev-parse --short HEAD 2>/dev/null || echo "unknown")
TIMESTAMP=$(date +"%Y%m%d-%H%M%S")
cat > "$TARGET_DIR/version.json" <<EOFV
{
  "exportTime": "$TIMESTAMP",
  "gitCommit": "$COMMIT",
  "message": "auto build via build_microverse.sh"
}
EOFV

echo "  Verifying file integrity..."
VERIFY_FAIL=0
for f in index.pck index.wasm index.js index.html; do
    if [ ! -f "$EXPORT_DIR/$f" ] || [ ! -f "$TARGET_DIR/$f" ]; then
        echo "  ERROR: $f missing"
        VERIFY_FAIL=1
        continue
    fi
    src_md5=$(md5 -q "$EXPORT_DIR/$f" 2>/dev/null || md5sum "$EXPORT_DIR/$f" | cut -d' ' -f1)
    dst_md5=$(md5 -q "$TARGET_DIR/$f" 2>/dev/null || md5sum "$TARGET_DIR/$f" | cut -d' ' -f1)
    if [ "$src_md5" != "$dst_md5" ]; then
        echo "  ERROR: $f md5 mismatch"
        VERIFY_FAIL=1
    fi
done
if [ "$VERIFY_FAIL" -eq 1 ]; then
    echo "SYNC FAILED"
    exit 1
fi
echo "  All files synced and verified."

# Patch index.html: canvas needs 100% width/height for iframe embedding
sed -i.bak 's/#canvas {/#canvas {\n\twidth: 100%;\n\theight: 100vh;/' "$TARGET_DIR/index.html"
rm -f "$TARGET_DIR/index.html.bak"
echo "  Patched index.html canvas CSS."

# ============ Phase 4: Verify ============
echo ""
echo "=== Phase 4: Verify ==="
PCK_SIZE=$(stat -f %z "$TARGET_DIR/index.pck" 2>/dev/null || stat -c %s "$TARGET_DIR/index.pck")
if [ "$PCK_SIZE" -lt 5000000 ]; then
    echo "  WARNING: pck size unusually small (${PCK_SIZE} bytes)"
fi

echo "  pck:  $(du -h "$TARGET_DIR/index.pck" | cut -f1)"
echo "  wasm: $(du -h "$TARGET_DIR/index.wasm" | cut -f1)"
echo "  js:   $(du -h "$TARGET_DIR/index.js" | cut -f1)"
cat "$TARGET_DIR/version.json"
echo ""
echo "BUILD COMPLETE"
