# Microverse 与 AgentRuntime API 契约

**创建日期**：2026-03-21  
**章节编号**：01  
**状态**：已发布  

## 概述

本文说明 Godot Microverse 与 Open Adventure 后端在 **对话（Chat）** 与 **长任务工作（Work / AgentRuntime）** 两条链路上的约定，便于联调与 Dashboard 观测。

## 对话（低延迟，不启动 claude 子进程）

| 项目 | 说明 |
|------|------|
| HTTP | `POST {api_prefix}/microverse/chat` |
| 请求体 | `character_name`, `prompt`, 可选 `context`, `api_type`, `model` |
| Agent 解析 | 若存在 `MicroverseCharacter` 且已绑定 `agent_id`，使用该平台 **Agent**；否则自动维护 `microverse_{character_name}` |
| 模型调用 | 服务端使用 **Anthropic Messages API**（环境变量 `ANTHROPIC_API_KEY`） |
| 响应体 | `character_name`, `response`, `execution_id`, `status` |
| 审计 | 创建 `Task` + `Execution`（短生命周期），成功写入 `test_output` |

Godot 侧：将 `user://settings.cfg` 中 `dialog_provider` 设为 `open_adventure` 时，由 Autoload **`APIManager`** 经 **`MicroverseAPIClient`** 调用上述接口；`APIConfig.parse_response` 识别包装字段 `microverse_chat` 以复用原有回调链。

相关配置键（`SettingsManager`）：

- `open_adventure_base_url`（默认 `http://127.0.0.1:8000`）
- `open_adventure_api_prefix`（默认 `/api`）
- `open_adventure_auth_token`（可选，`Authorization: Bearer …`）
- `dialog_provider`：`local` | `open_adventure`

## 工作 / AgentRuntime（长任务，启动 claude CLI）

| 项目 | 说明 |
|------|------|
| HTTP | `POST {api_prefix}/microverse/characters/{character_name}/work/start` |
| 前置条件 | 角色已存在且 **已绑定** `agent_id` |
| 实现 | `MicroverseAgentService.start_character_work` **仅委托** `AgentRuntimeService.start_agent`（`claude --agent {Agent.name}`、`Task`+`Execution`、监控） |
| 停止 | `POST .../work/stop` → `AgentRuntimeService.stop_agent` |
| 状态 | `GET .../work/status` → 委托 `get_agent_status` |
| 日志 | `GET .../work/logs` → 委托 `get_agent_logs` |

返回中的 `execution_id` 与主站 **Executions**、`AgentMonitorService` 一致，便于统一观测。

## Godot Autoload

| 名称 | 脚本 |
|------|------|
| `MicroverseAPIClient` | `microverse/script/integration/MicroverseAPIClient.gd` |

测试场景 `AgentRuntimeTest.gd` 依赖 `/root/MicroverseAPIClient`，须在 `project.godot` 中注册（已注册）。

## 与通用 Agent API 的关系

管理端仍可使用 `POST {api_prefix}/agents/{agent_id}/execute-background`，与 Microverse `work/start` 功能重叠；游戏侧推荐只使用 `/microverse/...`，以便同步 `MicroverseCharacter.is_working` 等状态。

## 参考资料

- `backend/app/services/agent_runtime_service.py`
- `backend/app/services/microverse_agent_service.py`
- `backend/app/api/routers/microverse.py`
- `microverse/script/integration/MicroverseAPIClient.gd`
- `microverse/script/ai/APIManager.gd`
