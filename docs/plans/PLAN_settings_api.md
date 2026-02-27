# 配置读取 API 实现计划

## 任务概述
实现后端 API 读取 ~/.claude/settings.json 配置文件，提供 GET /api/settings 端点。

## 技术方案

### 1. Adapter 层实现
**文件**: `backend/app/adapters/claude/settings_adapter.py`

**职责**:
- 读取 ~/.claude/settings.json 文件
- 处理文件不存在的情况
- 返回原始配置数据

**实现要点**:
- 使用 Path 对象处理文件路径
- 使用 json.load() 读取配置
- 异常处理：FileNotFoundError, JSONDecodeError
- 返回 dict 类型的配置数据

### 2. Service 层实现
**文件**: `backend/app/services/settings_service.py`

**职责**:
- 调用 Adapter 层获取配置
- 实现敏感信息脱敏逻辑
- 提供业务层接口

**脱敏规则**:
- `env.ANTHROPIC_AUTH_TOKEN`: 如果不是 "PROXY_MANAGED"，则脱敏为 "***"
- `env.ANTHROPIC_BASE_URL`: 保留（本地代理地址）
- 其他字段：保持原样

**实现要点**:
- 深拷贝配置数据避免修改原始数据
- 使用递归或字典遍历实现脱敏
- 返回脱敏后的配置字典

### 3. API 层实现
**文件**: `backend/app/api/routers/settings.py`

**职责**:
- 提供 GET /api/settings 端点
- 调用 Service 层获取脱敏后的配置
- 处理异常并返回适当的 HTTP 状态码

**API 设计**:
```
GET /api/settings
Response 200:
{
  "env": {...},
  "permissions": {...},
  "model": "...",
  "enabledPlugins": {...},
  "language": "...",
  "effortLevel": "..."
}

Response 404: 配置文件不存在
Response 500: 读取或解析错误
```

### 4. 主应用集成
**文件**: `backend/app/main.py`

**修改**:
- 导入 settings router
- 注册路由: `app.include_router(settings.router, prefix=f"{settings.api_prefix}")`

## 实现步骤

1. 创建 `backend/app/adapters/claude/` 目录（如果不存在）
2. 实现 `settings_adapter.py`
3. 实现 `settings_service.py`
4. 实现 `api/routers/settings.py`
5. 在 `main.py` 中注册路由
6. 测试 API 端点

## 测试计划

1. 正常情况：配置文件存在且格式正确
2. 异常情况：配置文件不存在
3. 异常情况：配置文件格式错误
4. 验证敏感信息脱敏是否正确

## 依赖关系

- 无新增外部依赖
- 使用现有的 FastAPI、Pydantic 等库

## 预期结果

- API 端点 `/api/settings` 可正常访问
- 返回完整的配置信息
- 敏感字段已正确脱敏
- 错误情况有适当的错误处理
