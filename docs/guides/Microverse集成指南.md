# Microverse 集成指南

## 概述

Microverse 是 Open Adventure 的游戏化 3D 可视化前端，基于 Godot 4.4 引擎开发。本文档介绍如何使用和开发 Microverse。

## 快速开始

### 前置要求

1. **安装 Godot 4.4+**

   **macOS**:
   ```bash
   brew install --cask godot
   ```

   **Linux**:
   从 https://godotengine.org/download 下载

2. **首次导出**

   首次使用需要导出 Web 版本：
   ```bash
   cd microverse
   ./export.sh
   ```

   这会将 Godot 项目导出为 WebAssembly，生成的文件位于 `export/` 目录。

### 运行方式

#### 方式 1：独立运行（推荐用于开发）

```bash
cd microverse
./serve.sh
```

访问: http://localhost:5174

#### 方式 2：集成运行（完整系统）

```bash
cd ..
./start.sh --with-microverse
```

这会同时启动：
- 后端 API: http://localhost:38080
- React 前端: http://localhost:5173
- Microverse: http://localhost:5174

#### 方式 3：后台运行

```bash
./start.sh --with-microverse --daemon
```

停止服务：
```bash
./stop.sh
```

## 开发工作流

### 1. 修改 Godot 项目

```bash
# 打开 Godot 编辑器
cd microverse
godot project.godot
```

在 Godot 编辑器中：
- 修改场景文件（`scene/` 目录）
- 编辑脚本（`script/` 目录）
- 调整资源（`asset/` 目录）

### 2. 重新导出

每次修改后需要重新导出：

```bash
./export.sh
```

### 3. 测试

```bash
./serve.sh
```

在浏览器中访问 http://localhost:5174 查看效果。

## 目录结构

```
microverse/
├── asset/                  # Godot 资源文件
│   ├── audio/              # 音频资源
│   ├── models/             # 3D 模型
│   └── textures/           # 纹理贴图
├── scene/                  # Godot 场景文件
│   ├── main.tscn           # 主场景
│   └── ...
├── script/                 # GDScript 脚本
│   ├── ai/                 # AI 相关脚本
│   ├── character/          # 角色脚本
│   └── ...
├── export/                 # Web 导出文件（生成，不提交）
│   ├── index.html
│   ├── microverse.wasm
│   ├── microverse.js
│   └── microverse.pck
├── project.godot           # Godot 项目配置
├── export_presets.cfg      # 导出预设配置
├── export.sh               # 导出脚本
├── serve.sh                # 独立 HTTP 服务器
└── README.md               # 使用说明
```

## 配置说明

### 导出预设

导出配置位于 `export_presets.cfg`，主要配置项：

- **导出路径**: `export/index.html`
- **导出模式**: Release（生产环境）
- **Canvas 调整策略**: 自适应窗口大小
- **启动时聚焦**: 是

如需修改配置：
1. 在 Godot 编辑器中打开项目
2. 项目 → 导出
3. 选择 "Web" 预设
4. 修改配置选项
5. 保存预设

### 端口配置

- **Microverse 端口**: 5174（在 `start.sh` 中配置）
- **后端 API 端口**: 38080
- **React 前端端口**: 5173

## API 对接（未来计划）

目前 Microverse 使用外部 AI API。未来计划：

1. **修改 API 端点**
   - 位置: `script/ai/` 目录
   - 目标: 改为 `http://localhost:38080/api/claude`

2. **适配请求格式**
   - 分析现有 API 调用
   - 适配 Open Adventure 后端接口

3. **后端添加代理**
   - 在 FastAPI 后端添加代理接口
   - 转发 Microverse 请求到 Claude API

## 故障排查

### Godot 未安装

```bash
# macOS
brew install --cask godot

# 或访问官网下载
open https://godotengine.org/download
```

### 导出失败

1. **检查 Godot 版本**
   ```bash
   godot --version
   ```
   需要 >= 4.4

2. **下载 Web 导出模板**
   - 打开 Godot 编辑器
   - 编辑器 → 管理导出模板
   - 下载并安装 Web (HTML5) 模板

3. **检查导出预设**
   - 项目 → 导出
   - 确认 "Web" 预设存在
   - 检查导出路径配置

### 浏览器无法加载

1. **检查浏览器兼容性**
   - 需要支持 WebAssembly
   - 推荐: Chrome、Firefox、Safari（最新版）

2. **查看浏览器控制台**
   - 按 F12 打开开发者工具
   - 查看 Console 标签页的错误信息

3. **SharedArrayBuffer 支持**
   - 某些浏览器需要特殊配置
   - 如果遇到问题，尝试在导出预设中禁用线程支持

### 端口被占用

```bash
# 查看端口占用
lsof -i :5174

# 停止占用进程
./stop.sh
```

## 性能优化

### Web 版本性能建议

1. **减少多边形数量**
   - 优化 3D 模型
   - 使用 LOD（细节层次）

2. **压缩纹理**
   - 使用 VRAM 压缩
   - 减小纹理尺寸

3. **优化脚本**
   - 避免频繁的 GDScript 调用
   - 使用对象池

4. **禁用不必要的功能**
   - 关闭阴影（如果不需要）
   - 减少粒子效果

## 与 React 前端集成（可选）

如果需要在 React 前端中嵌入 Microverse：

1. **创建 Microverse 页面**
   ```typescript
   // frontend/src/app/pages/MicroversePage.tsx
   export function MicroversePage() {
     return (
       <iframe
         src="http://localhost:5174"
         className="w-full h-full border-0"
         title="Microverse"
       />
     );
   }
   ```

2. **添加路由**
   ```typescript
   // frontend/src/app/routes.tsx
   {
     path: '/microverse',
     element: <MicroversePage />,
   }
   ```

3. **添加导航链接**
   在侧边栏添加 Microverse 入口。

## 注意事项

1. **文件体积**
   - Web 导出文件约 50-100MB
   - 已在 `.gitignore` 中排除
   - 不要提交到 Git

2. **浏览器兼容性**
   - 需要现代浏览器
   - 支持 WebAssembly
   - 推荐使用最新版 Chrome/Firefox

3. **性能差异**
   - Web 版本性能低于原生版本
   - 适合演示和轻度使用
   - 重度使用建议桌面版

4. **独立开发**
   - Microverse 可以完全独立开发
   - 不影响现有 React 前端
   - 通过 API 与后端通信

## 原始项目

本项目基于 [Microverse](https://github.com/KsanaDock/Microverse)，一个多智能体 AI 社交模拟系统。

## 许可证

遵循原始 Microverse 项目的许可证。
