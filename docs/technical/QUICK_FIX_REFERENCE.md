# 快速参考：Open Adventure 打包修复

## 🔧 修复内容
1. ✅ 修复 `ModuleNotFoundError: No module named 'app'`
2. ✅ 自动打开浏览器到 `/dashboard`
3. ✅ 更新打包配置收集 app 模块

## 📦 重新打包
```bash
# macOS
./scripts/build_macos.sh

# Linux
./scripts/build_linux.sh
```

## 🧪 测试
```bash
./scripts/test_package.sh
```

## 🚀 运行
```bash
# 默认（自动打开浏览器）
./backend/dist/open-adventure

# 不打开浏览器
./backend/dist/open-adventure --no-browser

# 自定义端口
./backend/dist/open-adventure --port 9000
```

## 📝 修改的文件
- `backend/main_packaged.py` - 添加 sys.path，自动打开浏览器
- `backend/open_adventure.spec` - 收集 app 模块，更新 hiddenimports
- `scripts/build_macos.sh` - 新增 macOS 打包脚本
- `scripts/test_package.sh` - 新增测试脚本

## 📚 详细文档
- `PACKAGING_FIX.md` - 完整修复说明
- `PACKAGING_FIX_SUMMARY.md` - 技术总结

## ⚠️ 注意事项
- 需要在目标平台重新打包
- 确保 `frontend/dist` 已构建
- 确保 `backend/open_adventure.db` 存在
