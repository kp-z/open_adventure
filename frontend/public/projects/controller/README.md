# Controller - 快捷键配置工具

## 项目概述

Controller 是一个独立的本地快捷键配置工具，采用硬件控制器风格的 UI 设计，让用户可以：
- 自定义各种快捷键绑定
- 一键执行各种本地指令/脚本
- 保持 Controller 硬件风格的 UI 设计
- 本地保存配置（localStorage）

## 功能特性

### 1. 配置管理
- **右键点击**任何控制器元素（按钮、推子、旋钮）打开配置对话框
- 配置内容包括：
  - 名称：快捷键的显示名称
  - 描述：功能说明
  - Shell 命令：要执行的命令
  - 启用/禁用：控制绑定是否生效

### 2. 命令执行
- **左键点击**已配置的按钮，命令会自动复制到剪贴板
- 用户粘贴到终端执行（浏览器安全限制，无法直接执行）
- 显示 Toast 提示反馈

### 3. 视觉反馈
- 已配置的控制器显示绿色边框
- 禁用的控制器半透明显示
- 控制器下方显示绑定名称标签

### 4. 本地存储
- 配置保存在浏览器 localStorage
- 刷新页面配置保留
- 支持导入/导出（未来功能）

## 使用方法

### 访问页面
1. 启动 Open Adventure 前端服务
2. 访问 `http://localhost:5173/projects/controller/`

### 配置快捷键
1. **右键点击**任意按钮（如 "rec"、"play"、"loop" 等）
2. 在弹出的配置对话框中填写：
   - 名称：例如 "启动后端"
   - 描述：例如 "启动 FastAPI 后端服务"
   - Shell 命令：例如 `cd ~/项目/Proj/open_adventure/backend && ./start.sh`
3. 点击"保存"

### 执行命令
1. **左键点击**已配置的按钮
2. 命令会自动复制到剪贴板
3. 在终端粘贴并执行

### 测试命令
在配置对话框中，点击"测试（复制）"按钮可以测试命令是否正确复制。

## 默认配置

项目包含以下默认配置（可自行修改）：

| 按钮 | 名称 | 命令 |
|------|------|------|
| rec | 启动后端 | `cd ~/项目/Proj/open_adventure/backend && ./start.sh` |
| play | 启动前端 | `cd ~/项目/Proj/open_adventure/frontend && npm run dev` |
| loop | 运行测试 | `cd ~/项目/Proj/open_adventure/backend && pytest` |
| stop | 停止服务 | `pkill -f 'uvicorn\|vite'` |

## 技术栈

- **纯 HTML + JavaScript**：无需构建工具
- **Three.js**：OLED 显示屏粒子动画
- **localStorage**：配置存储
- **Clipboard API**：命令复制

## 文件结构

```
frontend/public/projects/controller/
├── index.html               # 主 HTML 文件
├── config.js                # 配置管理脚本
├── styles.css               # 样式文件
└── default-config.json      # 默认配置文件
```

## 浏览器要求

- 支持 Clipboard API（需要 HTTPS 或 localhost）
- 支持 localStorage
- 支持 ES6+

## 未来扩展

### 方案 A：集成主项目后端 API（推荐）
- 添加 `/api/controller/execute` 端点
- 支持自动执行命令
- 实时反馈执行结果

### 方案 B：Electron/Tauri 包装
- 打包为桌面应用
- 可以直接执行系统命令
- 完全自动化

### 方案 C：浏览器扩展
- 需要额外权限
- 可以执行系统命令
- 跨浏览器支持

## 注意事项

1. **浏览器限制**：无法直接执行 Shell 命令，只能复制到剪贴板
2. **安全性**：不要配置包含敏感信息的命令
3. **路径问题**：命令中的路径需要使用绝对路径或 `cd` 切换目录

## 开发场景示例

### 启动开发环境
```bash
# 按钮 1: 启动后端
cd ~/项目/Proj/open_adventure/backend && ./start.sh

# 按钮 2: 启动前端
cd ~/项目/Proj/open_adventure/frontend && npm run dev

# 按钮 3: 启动 Microverse
cd ~/项目/Proj/open_adventure && ./start_microverse.sh
```

### 测试和部署
```bash
# 按钮 4: 运行测试
cd ~/项目/Proj/open_adventure/backend && pytest

# 按钮 5: 构建前端
cd ~/项目/Proj/open_adventure/frontend && npm run build

# 按钮 6: 部署到服务器
cd ~/项目/Proj/open_adventure && ./deploy.sh
```

### 数据库操作
```bash
# 按钮 7: 数据库迁移
cd ~/项目/Proj/open_adventure/backend && alembic upgrade head

# 按钮 8: 重置数据库
cd ~/项目/Proj/open_adventure/backend && ./reset_db.sh
```

## 贡献

欢迎提交 Issue 和 Pull Request！

## 许可证

MIT License
