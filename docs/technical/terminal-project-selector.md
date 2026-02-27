# Terminal 项目路径选择功能

## 功能说明
在 Terminal 页面添加了项目路径下拉框，用户可以选择不同的项目目录来启动终端。

## 实现内容

### 1. 前端修改

#### TerminalContext.tsx
- `createTerminal` 函数添加可选参数 `projectPath?: string`
- WebSocket 连接 URL 支持 `project_path` 查询参数
- 如果指定了项目路径，会通过 URL 参数传递给后端

#### Terminal.tsx
- 添加项目路径下拉框
- 从 API 获取启用的项目路径列表
- 用户可以选择不同的项目目录
- 创建新终端时使用选中的项目路径

### 2. 后端修改

#### terminal.py
- WebSocket 端点添加 `project_path` 查询参数
- 优先使用 URL 参数指定的项目路径
- 如果没有指定，则使用第一个启用的项目路径
- 支持动态切换项目目录

## 使用方法

### 1. 打开 Terminal 页面
在前端界面点击 "Terminal" 或 "SHELL" 菜单

### 2. 选择项目路径
在页面顶部可以看到项目路径下拉框（文件夹图标旁边）：
```
🗂️ [claude_manager ▼]
```

### 3. 切换项目
- 点击下拉框
- 选择不同的项目
- 点击 "New Tab" 按钮创建新终端
- 新终端会自动进入选中的项目目录并启动 Claude

## UI 设计

### 下拉框位置
```
SHELL
🟢 1 terminal active  🗂️ [claude_manager ▼]
```

### 下拉框样式
- 深色背景 (`bg-black/40`)
- 灰色文字 (`text-gray-300`)
- 小字体 (`text-xs`)
- 绿色聚焦边框 (`focus:border-green-500/50`)

## API 调用

### 获取项目路径列表
```javascript
GET http://localhost:8000/api/project-paths?enabled=true
```

### WebSocket 连接
```javascript
// 不指定项目路径（使用默认）
ws://localhost:8000/api/terminal/ws

// 指定项目路径
ws://localhost:8000/api/terminal/ws?project_path=/Users/kp/项目/Proj/claude_manager
```

## 工作流程

1. **页面加载**
   - 获取所有启用的项目路径
   - 默认选择第一个项目路径
   - 创建第一个终端（使用默认项目路径）

2. **用户切换项目**
   - 用户在下拉框中选择不同的项目
   - 更新 `selectedProjectPath` 状态
   - 下次创建终端时使用新选择的项目路径

3. **创建新终端**
   - 点击 "New Tab" 按钮
   - 使用当前选中的项目路径创建终端
   - WebSocket 连接包含 `project_path` 参数
   - 后端接收参数并切换到指定目录

## 技术细节

### URL 编码
项目路径包含中文和特殊字符，需要进行 URL 编码：
```javascript
const wsUrl = `ws://${wsHost}:${wsPort}/api/terminal/ws?project_path=${encodeURIComponent(projectPath)}`;
```

### 后端参数解析
FastAPI 自动解析查询参数：
```python
async def terminal_websocket(
    websocket: WebSocket,
    db: AsyncSession = Depends(get_db),
    project_path: str = None
):
```

### 优先级
1. URL 参数指定的项目路径（最高优先级）
2. 数据库中第一个启用的项目路径
3. HOME 目录（默认）

## 测试

### 1. 验证下拉框显示
- 打开 Terminal 页面
- 检查是否显示项目路径下拉框
- 检查下拉框是否包含所有启用的项目路径

### 2. 验证项目切换
- 选择不同的项目
- 点击 "New Tab" 创建新终端
- 检查终端是否进入正确的目录
- 检查是否自动启动 Claude

### 3. 验证多终端
- 创建多个终端，使用不同的项目路径
- 验证每个终端都在正确的目录中

## 未来改进
- [ ] 记住用户最后选择的项目路径
- [ ] 支持为每个终端标签显示当前项目
- [ ] 支持快捷键切换项目
- [ ] 支持搜索和过滤项目路径
