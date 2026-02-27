# 发布包测试指南

## 测试目的
验证发布包在干净环境下能否正常运行，确保用户体验良好。

## 测试环境要求
- macOS 系统（测试 macOS 版本）
- Python 3.8+
- 无需预装任何依赖

## 测试步骤

### 1. 创建测试发布包

```bash
cd /Users/kp/项目/Proj/claude_manager
./scripts/build-release.sh 0.1.3 macos arm64
```

### 2. 在干净目录测试

```bash
# 创建临时测试目录
cd /tmp
rm -rf claude-manager-test
mkdir claude-manager-test
cd claude-manager-test

# 解压发布包
tar -xzf /Users/kp/项目/Proj/claude_manager/docs/releases/claude-manager-v0.1.3-macos-arm64.tar.gz
cd claude-manager-v0.1.3-macos-arm64

# 检查文件结构
ls -la
ls -la backend/

# 确认 .env 不存在，.env.example 存在
[ ! -f backend/.env ] && echo "✅ .env 不存在（正确）" || echo "❌ .env 存在（错误）"
[ -f backend/.env.example ] && echo "✅ .env.example 存在（正确）" || echo "❌ .env.example 不存在（错误）"

# 运行启动脚本
./start.sh
```

### 3. 验证启动过程

启动脚本应该：
1. ✅ 检测到 backend 目录
2. ✅ 创建虚拟环境（如果不存在）
3. ✅ 安装依赖
4. ✅ 从 .env.example 创建 .env
5. ✅ 提示用户编辑配置
6. ✅ 启动服务器（生产模式，reload=False）

### 4. 验证服务运行

在另一个终端：

```bash
# 检查服务是否启动
curl http://localhost:8000/health

# 访问 API 文档
open http://localhost:8000/docs

# 检查进程
ps aux | grep uvicorn
```

### 5. 验证配置文件

```bash
# 检查 .env 文件是否正确创建
cat backend/.env

# 应该包含：
# - APP_VERSION="0.1.3"
# - DEBUG=false
# - 正确的数据库路径
```

### 6. 验证环境变量

```bash
# 在服务运行时，检查是否使用生产模式
# 查看日志，应该没有 "Watching for file changes" 的提示
```

### 7. 清理测试环境

```bash
# 停止服务（Ctrl+C）
cd /tmp
rm -rf claude-manager-test
```

## 测试检查清单

- [ ] 发布包大小合理（< 50MB）
- [ ] 不包含 .env 文件
- [ ] 包含 .env.example 文件
- [ ] 不包含 venv 目录
- [ ] 不包含 node_modules 目录
- [ ] 不包含 .git 目录
- [ ] 不包含数据库文件
- [ ] 不包含日志文件
- [ ] start.sh 可执行
- [ ] 首次运行自动创建 .env
- [ ] 虚拟环境自动创建
- [ ] 依赖自动安装
- [ ] 服务正常启动
- [ ] 生产模式运行（reload=False）
- [ ] API 文档可访问
- [ ] 健康检查接口正常

## 常见问题排查

### 问题 1: 虚拟环境创建失败
```bash
# 检查 Python 版本
python3 --version

# 手动创建虚拟环境
cd backend
python3 -m venv venv
```

### 问题 2: 依赖安装失败
```bash
# 检查 requirements.txt 是否存在
ls -la requirements.txt

# 手动安装
source backend/venv/bin/activate
pip install -r requirements.txt
```

### 问题 3: 服务启动失败
```bash
# 检查 .env 文件
cat backend/.env

# 检查数据库路径
ls -la backend/claude_manager.db

# 查看详细错误
cd backend
source venv/bin/activate
python run.py
```

## 在其他 Mac 上测试

如果可能，在以下环境测试：
1. Intel Mac（x86_64）
2. Apple Silicon Mac（arm64）
3. 不同 macOS 版本（Monterey, Ventura, Sonoma）
4. 干净的用户账户

## 测试报告模板

```markdown
## 测试环境
- 系统: macOS [版本]
- 架构: [arm64/x86_64]
- Python: [版本]

## 测试结果
- [ ] 解压成功
- [ ] 启动脚本执行成功
- [ ] 虚拟环境创建成功
- [ ] 依赖安装成功
- [ ] .env 文件创建成功
- [ ] 服务启动成功
- [ ] API 可访问

## 遇到的问题
[描述问题]

## 建议
[改进建议]
```
