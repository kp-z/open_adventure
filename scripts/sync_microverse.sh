#!/bin/bash

# Godot 导出文件自动同步脚本
# 功能：检查 microverse/export/ 目录，同步到前端目录

set -e

# 获取脚本所在目录
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# 定义路径
SOURCE_DIR="$PROJECT_ROOT/microverse/export"
TARGET_PUBLIC="$PROJECT_ROOT/frontend/public/microverse"
TARGET_DIST="$PROJECT_ROOT/frontend/dist/microverse"
VERSION_FILE="$TARGET_PUBLIC/version.json"

# 日志函数
log_info() {
    echo "ℹ️  $1"
}

log_success() {
    echo "✅ $1"
}

log_warning() {
    echo "⚠️  $1"
}

log_error() {
    echo "❌ $1"
}

# 检查源目录是否存在
check_source_dir() {
    if [ ! -d "$SOURCE_DIR" ]; then
        log_warning "Microverse export directory not found: $SOURCE_DIR"
        log_info "Please export Godot project first:"
        log_info "  cd microverse && ./export.sh"
        return 1
    fi

    if [ ! -f "$SOURCE_DIR/index.html" ]; then
        log_warning "Microverse export incomplete: index.html not found"
        log_info "Please re-export Godot project:"
        log_info "  cd microverse && ./export.sh"
        return 1
    fi

    return 0
}

# 获取目录的最新修改时间
get_dir_mtime() {
    local dir="$1"
    if [ ! -d "$dir" ]; then
        echo "0"
        return
    fi

    # 使用 find 获取目录中所有文件的最新修改时间
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        find "$dir" -type f -exec stat -f "%m" {} \; 2>/dev/null | sort -n | tail -1 || echo "0"
    else
        # Linux
        find "$dir" -type f -exec stat -c "%Y" {} \; 2>/dev/null | sort -n | tail -1 || echo "0"
    fi
}

# 获取 Git commit hash
get_git_commit() {
    if [ -d "$PROJECT_ROOT/.git" ]; then
        git -C "$PROJECT_ROOT" rev-parse --short HEAD 2>/dev/null || echo "unknown"
    else
        echo "unknown"
    fi
}

# 获取文件列表和大小
get_file_manifest() {
    local dir="$1"
    local manifest=""

    if [ ! -d "$dir" ]; then
        echo "[]"
        return
    fi

    # 生成 JSON 格式的文件清单
    manifest="["
    local first=true

    while IFS= read -r -d '' file; do
        local rel_path="${file#$dir/}"
        local size=$(stat -f "%z" "$file" 2>/dev/null || stat -c "%s" "$file" 2>/dev/null || echo "0")

        if [ "$first" = true ]; then
            first=false
        else
            manifest+=","
        fi

        manifest+="{\"path\":\"$rel_path\",\"size\":$size}"
    done < <(find "$dir" -type f -print0 2>/dev/null)

    manifest+="]"
    echo "$manifest"
}

# 同步文件
sync_files() {
    local source="$1"
    local target="$2"

    log_info "Syncing files from $source to $target..."

    # 创建目标目录
    mkdir -p "$target"

    # 使用 rsync 同步（如果可用）
    if command -v rsync &> /dev/null; then
        rsync -a --delete "$source/" "$target/" 2>/dev/null
    else
        # 回退到 cp
        rm -rf "$target"
        mkdir -p "$target"
        cp -R "$source/." "$target/"
    fi

    log_success "Files synced to $target"
}

# 生成版本文件
generate_version_file() {
    local target_dir="$1"
    local version_file="$target_dir/version.json"

    log_info "Generating version file..."

    local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    local commit=$(get_git_commit)
    local manifest=$(get_file_manifest "$target_dir")

    # 生成 JSON
    cat > "$version_file" <<EOF
{
  "exportTime": "$timestamp",
  "gitCommit": "$commit",
  "files": $manifest
}
EOF

    log_success "Version file generated: $version_file"
}

# 主函数
main() {
    log_info "🎮 Checking Microverse export files..."
    echo ""

    # 检查源目录
    if ! check_source_dir; then
        exit 0
    fi

    # 获取时间戳
    local source_mtime=$(get_dir_mtime "$SOURCE_DIR")
    local target_mtime=$(get_dir_mtime "$TARGET_PUBLIC")

    log_info "Source directory: $SOURCE_DIR"
    log_info "Source last modified: $(date -r "$source_mtime" 2>/dev/null || echo "unknown")"
    log_info "Target last modified: $(date -r "$target_mtime" 2>/dev/null || echo "unknown")"
    echo ""

    # 比较时间戳，决定是否同步
    if [ "$source_mtime" -gt "$target_mtime" ]; then
        log_info "Source is newer, syncing..."
        echo ""

        # 同步到 public 目录
        sync_files "$SOURCE_DIR" "$TARGET_PUBLIC"

        # 同步到 dist 目录（如果存在）
        if [ -d "$PROJECT_ROOT/frontend/dist" ]; then
            sync_files "$SOURCE_DIR" "$TARGET_DIST"
        fi

        # 生成版本文件
        generate_version_file "$TARGET_PUBLIC"
        if [ -d "$TARGET_DIST" ]; then
            generate_version_file "$TARGET_DIST"
        fi

        echo ""
        log_success "Microverse files synced successfully!"
    else
        log_info "Target is up-to-date, no sync needed"
    fi

    echo ""
}

# 执行主函数
main "$@"
