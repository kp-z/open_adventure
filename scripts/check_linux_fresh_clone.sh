#!/bin/bash

# Linux fresh clone 一键自检脚本
# 输出分级：PASS / WARN / FAIL，并给出修复建议

set -u

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
BACKEND_DIR="$REPO_ROOT/backend"
FRONTEND_DIR="$REPO_ROOT/frontend"

PASS_COUNT=0
WARN_COUNT=0
FAIL_COUNT=0

print_result() {
    local level="$1"
    local title="$2"
    local detail="$3"
    local fix="$4"

    case "$level" in
        PASS)
            PASS_COUNT=$((PASS_COUNT + 1))
            echo "[PASS] $title"
            [ -n "$detail" ] && echo "       $detail"
            ;;
        WARN)
            WARN_COUNT=$((WARN_COUNT + 1))
            echo "[WARN] $title"
            [ -n "$detail" ] && echo "       $detail"
            [ -n "$fix" ] && echo "       建议: $fix"
            ;;
        FAIL)
            FAIL_COUNT=$((FAIL_COUNT + 1))
            echo "[FAIL] $title"
            [ -n "$detail" ] && echo "       $detail"
            [ -n "$fix" ] && echo "       修复: $fix"
            ;;
    esac
}

command_check() {
    local cmd="$1"
    local version_cmd="$2"

    if command -v "$cmd" >/dev/null 2>&1; then
        local version
        version=$(eval "$version_cmd" 2>/dev/null | head -n 1)
        print_result "PASS" "命令可用: $cmd" "$version" ""
    else
        print_result "FAIL" "命令缺失: $cmd" "未检测到 $cmd" "请安装 $cmd 并确保在 PATH 中"
    fi
}

check_env_key() {
    local file="$1"
    local key="$2"
    if grep -q "^${key}=" "$file" 2>/dev/null; then
        return 0
    fi
    return 1
}

check_env_file() {
    local env_file="$1"
    local example_file="$2"
    shift 2
    local required_keys=("$@")

    if [ ! -f "$env_file" ]; then
        print_result "FAIL" "缺少环境文件: $env_file" "未找到运行时环境文件" "可执行: cp $example_file $env_file"
        return
    fi

    local missing=()
    local key
    for key in "${required_keys[@]}"; do
        if ! check_env_key "$env_file" "$key"; then
            missing+=("$key")
        fi
    done

    if [ ${#missing[@]} -eq 0 ]; then
        print_result "PASS" "环境文件完整: $env_file" "关键字段齐全" ""
    else
        print_result "FAIL" "环境文件字段缺失: $env_file" "缺少字段: ${missing[*]}" "补充上述字段后重试"
    fi
}

check_port() {
    local port="$1"
    if lsof -Pi ":$port" -sTCP:LISTEN -t >/dev/null 2>&1; then
        local pid
        pid=$(lsof -Pi ":$port" -sTCP:LISTEN -t | head -n 1)
        print_result "WARN" "端口占用: $port" "检测到监听进程 PID=$pid" "如需启动项目可先释放端口"
    else
        print_result "PASS" "端口空闲: $port" "可用于启动服务" ""
    fi
}

check_writable_dir() {
    local dir="$1"
    mkdir -p "$dir" 2>/dev/null || true
    if [ -d "$dir" ] && [ -w "$dir" ]; then
        print_result "PASS" "目录可写: $dir" "读写权限正常" ""
    else
        print_result "FAIL" "目录不可写: $dir" "无法写入运行时目录" "请修复目录权限: chmod -R u+w $dir"
    fi
}

check_python_fastapi() {
    local py_cmd=""

    if [ -x "$BACKEND_DIR/venv/bin/python" ]; then
        py_cmd="$BACKEND_DIR/venv/bin/python"
    elif command -v python3 >/dev/null 2>&1; then
        py_cmd="python3"
    else
        print_result "FAIL" "Python FastAPI 健康检查" "找不到可用 Python" "请先安装 Python 3.11+"
        return
    fi

    if "$py_cmd" -c "import fastapi" >/dev/null 2>&1; then
        print_result "PASS" "Python 依赖检查" "fastapi 可导入" ""
    else
        print_result "FAIL" "Python 依赖检查" "fastapi 导入失败" "在 backend 目录执行: source venv/bin/activate && pip install -r ../requirements.txt"
    fi
}

check_npm_deps() {
    if [ ! -f "$FRONTEND_DIR/package.json" ]; then
        print_result "FAIL" "前端依赖检查" "frontend/package.json 不存在" "请确认仓库完整"
        return
    fi

    if (cd "$FRONTEND_DIR" && npm ls --depth=0 >/dev/null 2>&1); then
        print_result "PASS" "前端依赖检查" "npm 依赖树完整" ""
    else
        print_result "FAIL" "前端依赖检查" "npm 依赖不完整或未安装" "在 frontend 目录执行: npm install"
    fi
}

echo "==============================================="
echo "Open Adventure Linux Fresh Clone 自检"
echo "仓库路径: $REPO_ROOT"
echo "==============================================="
echo ""

echo "[1/6] 基础命令检查"
command_check "python3" "python3 --version"
command_check "node" "node --version"
command_check "npm" "npm --version"
command_check "claude" "claude --version"
echo ""

echo "[2/6] 环境文件检查"
check_env_file "$BACKEND_DIR/.env" "$BACKEND_DIR/.env.example" \
    "APP_NAME" "APP_VERSION" "API_PREFIX" "DATABASE_URL" "CLAUDE_CLI_PATH" "CORS_ORIGINS"
check_env_file "$FRONTEND_DIR/.env" "$FRONTEND_DIR/.env.example" \
    "VITE_API_BASE_URL" "VITE_WS_BASE_URL"
echo ""

echo "[3/6] 端口占用检查"
check_port 8000
check_port 5173
echo ""

echo "[4/6] 运行时目录可写性"
check_writable_dir "$REPO_ROOT/docs/logs"
check_writable_dir "$REPO_ROOT/.run"
echo ""

echo "[5/6] 依赖健康检查"
check_npm_deps
check_python_fastapi
echo ""

echo "[6/6] 建议下一步"
if [ "$FAIL_COUNT" -eq 0 ]; then
    print_result "PASS" "可以启动项目" "建议执行: ./start.sh" ""
else
    print_result "WARN" "存在失败项，建议先修复" "修复 FAIL 项后重试本脚本" ""
fi

echo ""
echo "==============================================="
echo "自检汇总: PASS=$PASS_COUNT WARN=$WARN_COUNT FAIL=$FAIL_COUNT"
echo "==============================================="

if [ "$FAIL_COUNT" -gt 0 ]; then
    exit 1
fi

exit 0
