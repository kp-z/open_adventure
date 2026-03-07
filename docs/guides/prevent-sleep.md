# 防止 MacBook 休眠指南

## 问题描述

在 macOS 上，当 MacBook 熄屏或休眠时，前端开发服务器会自动停止运行，导致开发中断。

## 解决方案

使用 `--no-sleep` 参数启动项目，系统会自动使用 `caffeinate` 命令防止 MacBook 休眠。

## 使用方法

### 前台模式（推荐）

```bash
./start.sh --no-sleep
```

前端服务器在前台运行，按 `Ctrl+C` 停止。MacBook 不会休眠。

### 后台模式

```bash
./start.sh --daemon --no-sleep
```

前端和后端都在后台运行，MacBook 不会休眠。

停止服务：
```bash
./stop.sh
```

## 工作原理

`caffeinate` 是 macOS 内置命令，用于防止系统休眠：

- `-i` 参数：防止系统空闲休眠（idle sleep）
- 当进程运行时，系统保持唤醒状态
- 当进程结束时，系统恢复正常休眠策略

## 注意事项

1. **仅在 macOS 上生效**：Linux 系统不支持此功能
2. **电池消耗**：防止休眠会增加电池消耗，建议连接电源使用
3. **手动休眠**：可以手动合上屏幕盖子强制休眠，但服务会停止
4. **屏幕保护**：屏幕可以正常熄屏，但系统不会进入休眠状态

## 其他方案

### 方案 1：系统设置（临时）

```bash
# 防止休眠（直到手动取消）
caffeinate -d
```

在另一个终端运行 `./start.sh`，按 `Ctrl+C` 取消 caffeinate。

### 方案 2：系统偏好设置（永久）

1. 打开"系统偏好设置" → "电池"
2. 选择"电源适配器"标签
3. 将"显示器关闭后，防止电脑自动进入睡眠"勾选上

**注意**：此方法会影响所有应用，不推荐。

### 方案 3：使用 tmux/screen（高级）

```bash
# 安装 tmux
brew install tmux

# 创建会话
tmux new -s dev

# 启动项目
./start.sh

# 分离会话（Ctrl+B 然后按 D）
# 关闭终端，会话继续运行

# 重新连接
tmux attach -t dev
```

## 推荐配置

**开发时**：
```bash
./start.sh --no-sleep
```

**长时间运行**：
```bash
./start.sh --daemon --no-sleep
```

**测试时**：
```bash
./start.sh  # 不使用 --no-sleep，正常休眠
```
