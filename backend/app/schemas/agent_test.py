"""Agent 测试相关的 Schema"""
from pydantic import BaseModel, Field

class AgentTestRequest(BaseModel):
    """Agent 测试请求"""
    test_input: str = Field(..., description="测试输入", max_length=5000)

class AgentTestResponse(BaseModel):
    """Agent 测试响应"""
    execution_id: int = Field(..., description="执行 ID")
    status: str = Field(..., description="执行状态")
    message: str = Field(..., description="提示消息")

    class Config:
        from_attributes = True
