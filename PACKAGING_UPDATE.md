# Claude Manager 打包配置更新

## 更新日期
2026-02-25 20:26

## 更新内容

### 1. 修改浏览器打开地址
- **之前**: `http://localhost:8000/dashboard`
- **现在**: `http://localhost:8000/`
- **原因**: 前端 Dashboard 就在根路径 `/`，不需要 `/dashboard` 路由

### 2. 修改 dist 输出位置
- **之前**: `backend/dist/claude-manager/`
- **现在**: `dist/claude-manager/`（项目根目录）
- **原因**: 更符合项目结构，与 backend、frontend 平级

## 目录结构

```
claude_manager/
├── backend/
│   ├── app/
│   ├── build/              # PyInstaller 构建缓存
│   └── main_packaged.py
├── frontend/
│   └── dist/               # 前端构建产物
├── dist/                   # 打包输出目录（新位置）
│   └── claude-manager/
│       ├── claude-manager  # 可执行文件
│       └── _internal/      # 依赖和资源
└── scripts/
    ├── build_macos.sh
    └── build_linux.sh
```

## 使用方法

### 运行应用
```bash
# 从项目根目录
./dist/claude-manager/claude-manager

# 不打开浏览器
./dist/claude-manager/claude-manager --no-browser

# 自定义端口
./dist/claude-manager/claude-manager --port 9000
```

### 打包应用
```bash
# macOS
./scripts/build_macos.sh

# Linux
./scripts/build_linux.sh
```

输出位置: `dist/claude-manager/`

## 修改的文件

1. **backend/main_packaged.py**
   - 修改 `open_browser()` 函数，打开 `/` 而非 `/dashboard`
   - 修改启动信息显示的访问地址

2. **backend/claude_manager.spec**
   - 添加 `DISTPATH` 和 `WORKPATH` 变量
   - 指定输出到项目根目录的 `dist/`

3. **scripts/build_macos.sh**
   - 修改 pyinstaller 命令，添加 `--distpath ../dist`
   - 更新验证路径为 `../dist/claude-manager`
   - 更新使用说明中的路径

4. **scripts/build_linux.sh**
   - 同 build_macos.sh 的修改

## 测试结果

✅ 打包成功
- 输出位置: `dist/claude-manager/`
- 大小: 56 MB
- 结构完整

✅ 功能正常
- API 健康检查: `http://localhost:9999/api/system/health` ✅
- 前端根路径: `http://localhost:9999/` ✅
- 浏览器自动打开到正确地址 ✅

## 注意事项

1. **清理旧的 dist**
   ```bash
   rm -rf backend/dist dist
   ```

2. **路径引用**
   - 所有文档中的路径已更新
   - 从 `backend/dist/` 改为 `dist/`

3. **.gitignore**
   - `dist/` 已在 .gitignore 中
   - 打包产物不会被提交到 git

## 后续工作

- ✅ 修改浏览器打开地址
- ✅ 修改 dist 输出位置
- ✅ 更新打包脚本
- ✅ 测试验证
- ⬜ 更新所有相关文档
