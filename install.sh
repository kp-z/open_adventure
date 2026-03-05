#!/bin/bash

# Open Adventure 开发环境一键安装脚本
# 目标：可控地清理旧环境并安装新开发环境（默认保守）

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$SCRIPT_DIR"
BACKEND_DIR="$REPO_ROOT/backend"
FRONTEND_DIR="$REPO_ROOT/frontend"

YES=false
CLEAN_RUNTIME=false
CLEAN_DEPS=false
WITH_PLUGIN=false
NO_PLUGIN=false
NO_KILL=false
REMOVE_FRONTEND_ENV_LOCAL=false
DRY_RUN=false

PASS_COUNT=0
WARN_COUNT=0
FAIL_COUNT=0

print_help() {
  cat <<'EOF'
Usage: ./install.sh [options]

一键安装 Open Adventure 开发环境（支持可选清理旧环境）

Options:
  --yes                         非交互模式，自动确认
  --clean-runtime               清理运行时状态（PID、端口占用进程）
  --clean-deps                  清理依赖并重建（backend/venv, frontend/node_modules）
  --with-plugin                 安装插件（可能改写 ~/.claude/settings.json）
  --no-plugin                   跳过插件安装
  --no-kill                     不执行任何进程终止，仅报告端口占用
  --remove-frontend-env-local   删除 frontend/.env.local
  --dry-run                     仅打印将执行动作，不实际执行
  -h, --help                    显示帮助

默认策略（保守）：
- 不清理依赖
- 不清理运行时进程
- 不安装插件
- 不删除 frontend/.env.local

示例：
  ./install.sh
  ./install.sh --clean-runtime --clean-deps --with-plugin
  ./install.sh --yes --clean-runtime --clean-deps --no-plugin
  ./install.sh --dry-run --clean-runtime --clean-deps --with-plugin
EOF
}

log_pass() {
  PASS_COUNT=$((PASS_COUNT + 1))
  echo "[PASS] $1"
}

log_warn() {
  WARN_COUNT=$((WARN_COUNT + 1))
  echo "[WARN] $1"
}

log_fail() {
  FAIL_COUNT=$((FAIL_COUNT + 1))
  echo "[FAIL] $1"
}

run_cmd() {
  local cmd="$1"
  if [ "$DRY_RUN" = true ]; then
    echo "[DRY-RUN] $cmd"
  else
    eval "$cmd"
  fi
}

confirm() {
  local prompt="$1"
  local default="${2:-N}"

  if [ "$YES" = true ]; then
    return 0
  fi

  if [ "$default" = "Y" ]; then
    read -r -p "$prompt [Y/n] " response
    [[ -z "$response" || "$response" =~ ^([yY][eE][sS]|[yY])$ ]]
  else
    read -r -p "$prompt [y/N] " response
    [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]
  fi
}

parse_args() {
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --yes)
        YES=true
        ;;
      --clean-runtime)
        CLEAN_RUNTIME=true
        ;;
      --clean-deps)
        CLEAN_DEPS=true
        ;;
      --with-plugin)
        WITH_PLUGIN=true
        ;;
      --no-plugin)
        NO_PLUGIN=true
        ;;
      --no-kill)
        NO_KILL=true
        ;;
      --remove-frontend-env-local)
        REMOVE_FRONTEND_ENV_LOCAL=true
        ;;
      --dry-run)
        DRY_RUN=true
        ;;
      -h|--help)
        print_help
        exit 0
        ;;
      *)
        echo "❌ 未知参数: $1"
        print_help
        exit 1
        ;;
    esac
    shift
  done

  # 参数优先级
  if [ "$NO_PLUGIN" = true ]; then
    WITH_PLUGIN=false
  fi
  if [ "$NO_KILL" = true ]; then
    CLEAN_RUNTIME=false
  fi
}

check_path_exists() {
  local path="$1"
  local label="$2"
  if [ -e "$path" ]; then
    log_pass "$label 存在: $path"
  else
    log_fail "$label 不存在: $path"
    exit 1
  fi
}

check_command() {
  local cmd="$1"
  local version_cmd="$2"
  if command -v "$cmd" >/dev/null 2>&1; then
    local version
    version=$(eval "$version_cmd" 2>/dev/null | head -n 1 || true)
    if [ -n "$version" ]; then
      log_pass "$cmd 可用 ($version)"
    else
      log_pass "$cmd 可用"
    fi
  else
    log_fail "$cmd 不可用，请先安装并加入 PATH"
    exit 1
  fi
}

precheck() {
  echo ""
  echo "== 1) 环境预检 =="

  check_path_exists "$BACKEND_DIR" "backend 目录"
  check_path_exists "$FRONTEND_DIR" "frontend 目录"
  check_path_exists "$REPO_ROOT/requirements.txt" "requirements.txt"
  check_path_exists "$FRONTEND_DIR/package.json" "frontend package.json"

  check_command "python3" "python3 --version"
  check_command "npm" "npm --version"

  if [ "$CLEAN_RUNTIME" = true ] && [ "$NO_KILL" = false ]; then
    check_command "lsof" "lsof -v"
  fi
}

clean_runtime() {
  echo ""
  echo "== 2) 清理运行时状态 =="

  run_cmd "mkdir -p \"$REPO_ROOT/.run\""
  run_cmd "mkdir -p \"$REPO_ROOT/docs/logs\""

  # PID 文件清理
  run_cmd "rm -f \"$REPO_ROOT/.run/backend.pid\" \"$REPO_ROOT/.run/frontend.pid\""
  log_pass "已清理 PID 文件"

  if [ "$NO_KILL" = true ]; then
    log_warn "--no-kill 已启用：仅报告端口占用，不终止进程"
    for port in 8000 5173; do
      if lsof -Pi ":$port" -sTCP:LISTEN -t >/dev/null 2>&1; then
        pid=$(lsof -Pi ":$port" -sTCP:LISTEN -t | head -n 1)
        log_warn "端口 $port 被占用（PID=$pid）"
      else
        log_pass "端口 $port 空闲"
      fi
    done
    return
  fi

  for port in 8000 5173; do
    if lsof -Pi ":$port" -sTCP:LISTEN -t >/dev/null 2>&1; then
      local pids
      pids=$(lsof -ti ":$port" | tr '\n' ' ')
      log_warn "检测到端口 $port 占用（PID: $pids）"

      if confirm "是否停止占用端口 $port 的进程？" "N"; then
        run_cmd "lsof -ti :$port | xargs kill 2>/dev/null || true"
        log_pass "已尝试温和停止端口 $port 进程"

        if [ "$DRY_RUN" = false ] && lsof -Pi ":$port" -sTCP:LISTEN -t >/dev/null 2>&1; then
          log_warn "端口 $port 仍被占用"
          if confirm "是否对端口 $port 执行强制 kill -9？" "N"; then
            run_cmd "lsof -ti :$port | xargs kill -9 2>/dev/null || true"
            log_pass "已对端口 $port 执行强制清理"
          else
            log_warn "用户跳过端口 $port 强制清理"
          fi
        fi
      else
        log_warn "用户跳过端口 $port 进程清理"
      fi
    else
      log_pass "端口 $port 空闲"
    fi
  done
}

clean_deps() {
  echo ""
  echo "== 3) 清理依赖目录 =="

  if [ -d "$BACKEND_DIR/venv" ]; then
    if confirm "是否删除 backend/venv 并重建？" "N"; then
      run_cmd "rm -rf \"$BACKEND_DIR/venv\""
      log_pass "已删除 backend/venv"
    else
      log_warn "跳过删除 backend/venv"
    fi
  else
    log_pass "backend/venv 不存在，无需清理"
  fi

  if [ -d "$FRONTEND_DIR/node_modules" ]; then
    if confirm "是否删除 frontend/node_modules 并重建？" "N"; then
      run_cmd "rm -rf \"$FRONTEND_DIR/node_modules\""
      log_pass "已删除 frontend/node_modules"
    else
      log_warn "跳过删除 frontend/node_modules"
    fi
  else
    log_pass "frontend/node_modules 不存在，无需清理"
  fi
}

install_backend() {
  echo ""
  echo "== 4) 安装后端环境 =="

  if [ ! -d "$BACKEND_DIR/venv" ]; then
    run_cmd "cd \"$BACKEND_DIR\" && python3 -m venv venv"
    log_pass "已创建 backend/venv"
  else
    log_pass "backend/venv 已存在"
  fi

  run_cmd "cd \"$BACKEND_DIR\" && source venv/bin/activate && pip install -r ../requirements.txt"
  log_pass "后端依赖安装完成"

  if [ ! -f "$BACKEND_DIR/.env" ]; then
    if [ -f "$BACKEND_DIR/.env.example" ]; then
      run_cmd "cp \"$BACKEND_DIR/.env.example\" \"$BACKEND_DIR/.env\""
      log_pass "已从 .env.example 创建 backend/.env"
    else
      log_warn "backend/.env.example 不存在，跳过 .env 自动创建"
    fi
  else
    log_pass "backend/.env 已存在"
  fi
}

install_frontend() {
  echo ""
  echo "== 5) 安装前端环境 =="

  if [ "$REMOVE_FRONTEND_ENV_LOCAL" = true ]; then
    if [ -f "$FRONTEND_DIR/.env.local" ]; then
      if confirm "是否删除 frontend/.env.local？" "N"; then
        run_cmd "rm -f \"$FRONTEND_DIR/.env.local\""
        log_pass "已删除 frontend/.env.local"
      else
        log_warn "用户跳过删除 frontend/.env.local"
      fi
    else
      log_pass "frontend/.env.local 不存在，无需删除"
    fi
  else
    log_pass "默认保守策略：不删除 frontend/.env.local"
  fi

  run_cmd "cd \"$FRONTEND_DIR\" && npm install"
  log_pass "前端依赖安装完成"
}

install_plugin() {
  echo ""
  echo "== 6) 插件安装 =="

  if [ "$NO_PLUGIN" = true ]; then
    log_pass "--no-plugin 已启用：跳过插件安装"
    return
  fi

  if [ "$WITH_PLUGIN" = false ]; then
    log_pass "默认保守策略：跳过插件安装（未启用 --with-plugin）"
    return
  fi

  if [ ! -f "$REPO_ROOT/scripts/install_plugins.sh" ]; then
    log_warn "scripts/install_plugins.sh 不存在，跳过插件安装"
    return
  fi

  if confirm "插件安装可能改写 ~/.claude/settings.json，是否继续？" "N"; then
    run_cmd "bash \"$REPO_ROOT/scripts/install_plugins.sh\""
    log_pass "插件安装流程完成"
  else
    log_warn "用户取消插件安装"
  fi
}

summary() {
  echo ""
  echo "=========================================="
  echo "安装总结: PASS=$PASS_COUNT WARN=$WARN_COUNT FAIL=$FAIL_COUNT"
  echo "=========================================="
  echo "下一步建议:"
  echo "  1) 启动服务: ./start.sh"
  echo "  2) 停止服务: ./stop.sh"
  echo "  3) Linux 自检: ./scripts/check_linux_fresh_clone.sh"

  if [ "$FAIL_COUNT" -gt 0 ]; then
    exit 1
  fi
}

main() {
  parse_args "$@"

  echo "=========================================="
  echo "Open Adventure 开发环境安装"
  echo "仓库路径: $REPO_ROOT"
  echo "模式: clean-runtime=$CLEAN_RUNTIME clean-deps=$CLEAN_DEPS with-plugin=$WITH_PLUGIN no-plugin=$NO_PLUGIN no-kill=$NO_KILL dry-run=$DRY_RUN"
  echo "=========================================="

  precheck

  if [ "$CLEAN_RUNTIME" = true ] || [ "$NO_KILL" = true ]; then
    clean_runtime
  else
    log_pass "默认保守策略：跳过运行时清理（可用 --clean-runtime）"
  fi

  if [ "$CLEAN_DEPS" = true ]; then
    clean_deps
  else
    log_pass "默认保守策略：跳过依赖清理（可用 --clean-deps）"
  fi

  install_backend
  install_frontend
  install_plugin
  summary
}

main "$@"
