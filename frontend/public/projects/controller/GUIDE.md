# Controller 使用指南

## 快速开始

### 1. 访问页面
打开浏览器，访问：`http://localhost:5173/projects/controller/`

### 2. 配置快捷键（右键）
```
┌─────────────────────────────────────┐
│  配置 button-rec                    │
├─────────────────────────────────────┤
│  名称: [启动后端              ]    │
│  描述: [启动 FastAPI 后端服务 ]    │
│  Shell 命令:                        │
│  ┌───────────────────────────────┐  │
│  │ cd ~/项目/Proj/open_adventure │  │
│  │ /backend && ./start.sh        │  │
│  └───────────────────────────────┘  │
│  ☑ 启用此绑定                       │
│                                     │
│  [测试] [保存] [删除] [取消]       │
└─────────────────────────────────────┘
```

### 3. 执行命令（左键）
点击已配置的按钮 → 命令复制到剪贴板 → 粘贴到终端执行

## 界面说明

```
┌──────────────────────────────────────────────────────────────┐
│  Controller - 快捷键配置工具                                 │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  左侧区域：                                                  │
│  ┌────────────┐                                             │
│  │ OLED 显示屏 │  ← Three.js 粒子动画                       │
│  └────────────┘                                             │
│                                                              │
│  [M1] [M2] [rec] [play]  ← 8 个可配置按钮                   │
│  [▶] [■] [loop] [shift]                                     │
│                                                              │
│  右侧区域：                                                  │
│  (Pan) (Tilt) (Dimmer) (FX) (Master)  ← 5 个旋钮            │
│                                                              │
│  [01] [02] [03] [04] [05] [06] [07] [08]  ← 8 个推子        │
│   │    │    │    │    │    │    │    │                      │
│   ●    ●    ●    ●    ●    ●    ●    ●   ← LED 指示灯       │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

## 控制器状态

### 未配置
```
┌────┐
│ rec│  ← 白色按钮，无边框
└────┘
```

### 已配置
```
┌────┐
│ rec│  ← 绿色边框
└────┘
启动后端  ← 显示名称标签
```

### 已禁用
```
┌────┐
│ rec│  ← 半透明，红色边框
└────┘
启动后端
```

## 操作流程

### 配置新快捷键
1. 右键点击任意控制器（按钮/推子/旋钮）
2. 填写配置信息
3. 点击"保存"
4. 控制器显示绿色边框和名称标签

### 执行命令
1. 左键点击已配置的按钮
2. 看到 Toast 提示"已复制: XXX"
3. 打开终端
4. 粘贴（Cmd+V / Ctrl+V）
5. 按 Enter 执行

### 修改配置
1. 右键点击已配置的控制器
2. 修改配置信息
3. 点击"保存"

### 删除配置
1. 右键点击已配置的控制器
2. 点击"删除"
3. 确认删除

### 测试命令
1. 右键点击控制器
2. 填写命令
3. 点击"测试（复制）"
4. 打开终端粘贴验证

## 常用配置示例

### 开发环境
```javascript
// 启动后端
cd ~/项目/Proj/open_adventure/backend && ./start.sh

// 启动前端
cd ~/项目/Proj/open_adventure/frontend && npm run dev

// 启动 Microverse
cd ~/项目/Proj/open_adventure && ./start_microverse.sh
```

### 测试和构建
```javascript
// 运行测试
cd ~/项目/Proj/open_adventure/backend && pytest

// 构建前端
cd ~/项目/Proj/open_adventure/frontend && npm run build

// 类型检查
cd ~/项目/Proj/open_adventure/frontend && npm run type-check
```

### 数据库操作
```javascript
// 数据库迁移
cd ~/项目/Proj/open_adventure/backend && alembic upgrade head

// 重置数据库
cd ~/项目/Proj/open_adventure/backend && ./reset_db.sh

// 备份数据库
cd ~/项目/Proj/open_adventure/backend && ./backup_db.sh
```

### Git 操作
```javascript
// 查看状态
cd ~/项目/Proj/open_adventure && git status

// 拉取最新代码
cd ~/项目/Proj/open_adventure && git pull

// 推送代码
cd ~/项目/Proj/open_adventure && git push
```

### 服务管理
```javascript
// 停止所有服务
pkill -f 'uvicorn|vite'

// 重启后端
cd ~/项目/Proj/open_adventure/backend && ./restart.sh

// 查看日志
tail -f ~/项目/Proj/open_adventure/backend/logs/app.log
```

## 快捷键提示

- **右键**：打开配置对话框
- **左键**：执行命令（复制到剪贴板）
- **ESC**：关闭配置对话框
- **Enter**：保存配置（在对话框中）

## 注意事项

1. **命令路径**：使用绝对路径或 `cd` 切换目录
2. **安全性**：不要配置包含敏感信息的命令
3. **浏览器限制**：无法直接执行命令，只能复制
4. **配置保存**：配置保存在浏览器 localStorage
5. **刷新保留**：刷新页面配置不会丢失

## 故障排查

### 问题：点击按钮没有反应
- 检查是否已配置该按钮
- 检查浏览器控制台是否有错误
- 确认浏览器支持 Clipboard API

### 问题：配置无法保存
- 检查浏览器是否禁用了 localStorage
- 清除浏览器缓存后重试
- 检查浏览器控制台错误信息

### 问题：命令无法复制
- 确认使用 HTTPS 或 localhost
- 检查浏览器权限设置
- 尝试手动授予剪贴板权限

### 问题：刷新后配置丢失
- 检查浏览器是否开启了隐私模式
- 确认 localStorage 未被清除
- 检查浏览器存储空间是否充足

## 技术支持

如有问题，请查看：
- README.md - 项目概述和技术栈
- TEST.md - 功能测试清单
- GitHub Issues - 提交问题和建议
