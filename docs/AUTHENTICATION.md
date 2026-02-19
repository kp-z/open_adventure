# 认证系统说明

## 概述

Claude Manager 的认证系统是**可选的**，系统可以在不登录的情况下正常使用所有功能。认证系统主要用于：

1. 多用户环境下的用户识别
2. 个性化设置和数据隔离
3. 权限管理（如超级用户权限）

## 使用方式

### 无需登录使用

用户可以直接访问所有功能页面：
- Dashboard
- Skills 管理
- Agents 管理
- Teams 管理
- Workflows 管理和编辑
- Executions 历史
- 游戏化中心

### 登录后使用

登录后可以获得额外功能：
- 个人资料管理
- 用户特定的数据和设置
- 未来可扩展的权限控制

## 前端实现

### 首页
- 未登录：显示 "Login" 和 "Sign Up" 按钮
- 已登录：显示 "Profile" 按钮

### 个人资料页面
- 未登录：显示友好的提示页面，引导用户登录或返回首页
- 已登录：显示用户信息和编辑功能

## 后端实现

### 可选认证依赖

创建了 `app/core/auth_optional.py`，提供可选的认证依赖：

```python
async def get_current_user_optional(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: AsyncSession = Depends(get_db)
) -> Optional[User]:
    """
    Get current user if authenticated, otherwise return None.
    This allows endpoints to work both with and without authentication.
    """
```

### API 端点

所有现有的 API 端点都可以在不提供 Token 的情况下访问。如果需要为特定端点添加可选认证，可以使用：

```python
from app.core.auth_optional import get_current_active_user_optional

@router.get("/some-endpoint")
async def some_endpoint(
    current_user: Optional[User] = Depends(get_current_active_user_optional)
):
    # current_user 可能是 None（未登录）或 User 对象（已登录）
    if current_user:
        # 为登录用户提供个性化功能
        pass
    else:
        # 为未登录用户提供默认功能
        pass
```

## 认证 API

### 注册
```bash
POST /api/auth/register
Content-Type: application/json

{
  "username": "user123",
  "email": "user@example.com",
  "password": "password123",
  "full_name": "John Doe"
}
```

### 登录
```bash
POST /api/auth/login
Content-Type: application/x-www-form-urlencoded

username=user123&password=password123
```

响应：
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer"
}
```

### 获取当前用户信息
```bash
GET /api/auth/me
Authorization: Bearer <access_token>
```

### 更新用户信息
```bash
PUT /api/auth/me
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "email": "newemail@example.com",
  "full_name": "Jane Doe",
  "password": "newpassword123"  // 可选
}
```

## Token 存储

前端使用 `localStorage` 存储 JWT Token：

```javascript
// 存储 Token
localStorage.setItem('access_token', token);

// 获取 Token
const token = localStorage.getItem('access_token');

// 删除 Token（登出）
localStorage.removeItem('access_token');
```

## 安全特性

1. **密码哈希**: 使用 bcrypt 算法
2. **JWT Token**: HS256 算法，30 分钟过期
3. **Email 验证**: 使用 email-validator
4. **密码强度**: 最少 6 个字符
5. **用户名唯一性**: 数据库级别约束

## 未来扩展

可以基于此认证系统扩展以下功能：

1. **数据隔离**: 每个用户只能看到自己的工作流和执行记录
2. **权限控制**: 基于角色的访问控制（RBAC）
3. **团队协作**: 多用户共享工作流
4. **审计日志**: 记录用户操作历史
5. **OAuth 集成**: 支持第三方登录（Google, GitHub 等）

## 配置

在 `backend/app/config/settings.py` 中配置：

```python
# Security
secret_key: str = "your-secret-key-here-change-in-production"
access_token_expire_minutes: int = 30
```

**重要**: 在生产环境中，请务必修改 `secret_key` 为一个强随机字符串。

## 总结

Claude Manager 的认证系统设计为可选和灵活的，既支持单用户无需登录的简单使用场景，也支持多用户环境下的身份识别和权限管理。用户可以根据实际需求选择是否使用认证功能。
