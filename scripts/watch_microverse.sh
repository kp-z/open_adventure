#!/bin/bash

# Godot 导出文件监听脚本
# 功能：监听 microverse/export/ 目录变化，自动触发同步

set -e

# 获取脚本所在目录
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# 定义路径
WATCH_DIR="$PROJECT_ROOT/microverse/export"
SYNC_SCRIPT="$SCRIPT_DIR/sync_microverse.sh"

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

# 检查监听目录
check_watch_dir() {
    if [ ! -d "$WATCH_DIR" ]; then
        log_error "Watch directory not found: $WATCH_DIR"
        log_info "Please export Godot project first:"
        log_info "  cd microverse && ./export.sh"
        exit 1
    fi
}

# 检查同步脚本
check_sync_script() {
    if [ ! -f "$SYNC_SCRIPT" ]; then
        log_error "Sync script not found: $SYNC_SCRIPT"
        exit 1
    fi

    if [ ! -x "$SYNC_SCRIPT" ]; then
        log_warning "Sync script is not executable, fixing..."
        chmod +x "$SYNC_SCRIPT"
    fi
}

# 检测操作系统和可用的监听工具
detect_watch_tool() {
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS: 优先使用 fswatch
        if command -v fswatch &> /dev/null; then
            echo "fswatch"
        else
            echo "none"
        fi
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        # Linux: 优先使用 inotifywait
        if command -v inotifywait &> /dev/null; then
            echo "inotifywait"
        else
            echo "none"
        fi
    else
        echo "none"
    fi
}

# 显示工具安装提示
show_install_hint() {
    local tool="$1"

    if [ "$tool" = "none" ]; then
        if [[ "$OSTYPE" == "darwin"* ]]; then
            log_warning "fswatch not found on macOS"
            log_info "Install with: brew install fswatch"
        elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
            log_warning "inotifywait not found on Linux"
            log_info "Install with:"
            log_info "  Ubuntu/Debian: sudo apt-get install inotify-tools"
            log_info "  CentOS/RHEL: sudo yum install inotify-tools"
            log_info "  Arch: sudo pacman -S inotify-tools"
        else
            log_warning "Unsupported OS: $OSTYPE"
        fi
    fi
}

# 使用 fswatch 监听（macOS）
watch_with_fswatch() {
    log_info "Starting fswatch on $WATCH_DIR..."
    log_info "Press Ctrl+C to stop"
    echo ""

    # 首次同步
    "$SYNC_SCRIPT"

    # 监听变化（延迟 2 秒，避免频繁触发）
    fswatch -r -l 2 "$WATCH_DIR" | while read -r event; do
        log_info "Detected change: $event"
        "$SYNC_SCRIPT"
        echo ""
    done
}

# 使用 inotifywait 监听（Linux）
watch_with_inotifywait() {
    log_info "Starting inotifywait on $WATCH_DIR..."
    log_info "Press Ctrl+C to stop"
    echo ""

    # 首次同步
    "$SYNC_SCRIPT"

    # 监听变化
    inotifywait -m -r -e modify,create,delete,move "$WATCH_DIR" | while read -r path action file; do
        log_info "Detected change: $action $file in $path"
        "$SYNC_SCRIPT"
        echo ""
    done
}

# 回退方案：轮询监听
watch_with_polling() {
    log_warning "No file watching tool available, using polling (checks every 5 seconds)"
    log_info "Press Ctrl+C to stop"
    echo ""

    # 首次同步
    "$SYNC_SCRIPT"

    # 记录上次修改时间
    local last_mtime=$(get_dir_mtime "$WATCH_DIR")

    while true; do
        sleep 5

        local current_mtime=$(get_dir_mtime "$WATCH_DIR")
        if [ "$current_mtime" -gt "$last_mtime" ]; then
            log_info "Detected changes in $WATCH_DIR"
            "$SYNC_SCRIPT"
            last_mtime="$current_mtime"
            echo ""
        fi
    done
}

# 获取目录的最新修改时间
get_dir_mtime() {
    local dir="$1"
    if [ ! -d "$dir" ]; then
        echo "0"
        return
    fi

    if [[ "$OSTYPE" == "darwin"* ]]; then
        find "$dir" -type f -exec stat -f "%m" {} \; 2>/dev/null | sort -n | tail -1 || echo "0"
    else
        find "$dir" -type f -exec stat -c "%Y" {} \; 2>/dev/null | sort -n | tail -1 || echo "0"
    fi
}

# 主函数
main() {
    log_info "🎮 Microverse File Watcher"
    echo ""

    # 检查目录和脚本
    check_watch_dir
    check_sync_script

    # 检测监听工具
    local watch_tool=$(detect_watch_tool)

    echo ""
    log_info "Watch directory: $WATCH_DIR"
    log_info "Sync script: $SYNC_SCRIPT"
    log_info "Watch tool: $watch_tool"
    show_install_hint "$watch_tool"
    echo ""

    # 根据可用工具选择监听方式
    case "$watch_tool" in
        fswatch)
            watch_with_fswatch
            ;;
        inotifywait)
            watch_with_inotifywait
            ;;
        none)
            watch_with_polling
            ;;
        *)
            log_error "Unknown watch tool: $watch_tool"
            exit 1
            ;;
    esac
}

# 捕获 Ctrl+C
cleanup() {
    echo ""
    log_info "Stopping file watcher..."
    exit 0
}

trap cleanup SIGINT SIGTERM

# 执行主函数
main "$@"
