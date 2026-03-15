"""
Plan Schemas - 执行计划 API 接口定义
"""
from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field, ConfigDict

from app.models.plan import PlanType, PlanStatus, StepStatus


class PlanStepBase(BaseModel):
    """计划步骤基础字段"""
    step_number: int = Field(..., ge=1, description="步骤序号")
    name: str = Field(..., min_length=1, max_length=200, description="步骤名称")
    description: str = Field(..., min_length=1, description="步骤描述")
    action_type: str = Field(..., description="执行类型：skill, agent, command, condition")
    action_config: Dict[str, Any] = Field(..., description="执行配置")
    depends_on: List[int] = Field(default_factory=list, description="依赖的步骤ID列表")
    parallel_group: Optional[str] = Field(None, description="并行组标识")
    condition: Optional[str] = Field(None, description="执行条件")
    skip_on_failure: bool = Field(default=False, description="失败时是否跳过")


class PlanStepCreate(PlanStepBase):
    """创建计划步骤"""
    pass


class PlanStepUpdate(BaseModel):
    """更新计划步骤"""
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = None
    action_type: Optional[str] = None
    action_config: Optional[Dict[str, Any]] = None
    depends_on: Optional[List[int]] = None
    parallel_group: Optional[str] = None
    condition: Optional[str] = None
    skip_on_failure: Optional[bool] = None
    status: Optional[StepStatus] = None


class PlanStepResponse(PlanStepBase):
    """计划步骤响应"""
    id: int
    plan_id: int
    status: StepStatus
    output: Optional[Dict[str, Any]] = None
    error_message: Optional[str] = None
    logs: Optional[str] = None
    execution_time: Optional[float] = None
    retry_count: int
    created_at: datetime
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class PlanBase(BaseModel):
    """计划基础字段"""
    name: str = Field(..., min_length=1, max_length=200, description="计划名称")
    description: str = Field(..., min_length=1, description="计划描述")
    plan_type: PlanType = Field(default=PlanType.SEQUENTIAL, description="计划类型")
    input_schema: Optional[Dict[str, Any]] = Field(None, description="输入参数定义")
    output_schema: Optional[Dict[str, Any]] = Field(None, description="输出结果定义")
    max_execution_time: Optional[int] = Field(None, ge=0, description="最大执行时间（秒）")
    max_retries: int = Field(default=3, ge=0, le=10, description="最大重试次数")
    tags: List[str] = Field(default_factory=list, description="标签列表")
    meta: Optional[Dict[str, Any]] = Field(None, description="元数据")


class PlanCreate(PlanBase):
    """创建计划"""
    task_id: Optional[int] = Field(None, description="关联的任务ID")
    agent_id: Optional[int] = Field(None, description="关联的Agent ID")
    steps: List[PlanStepCreate] = Field(default_factory=list, description="计划步骤")


class PlanUpdate(BaseModel):
    """更新计划"""
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = None
    plan_type: Optional[PlanType] = None
    status: Optional[PlanStatus] = None
    input_schema: Optional[Dict[str, Any]] = None
    output_schema: Optional[Dict[str, Any]] = None
    input_data: Optional[Dict[str, Any]] = None
    max_execution_time: Optional[int] = None
    max_retries: Optional[int] = None
    tags: Optional[List[str]] = None
    meta: Optional[Dict[str, Any]] = None


class PlanResponse(PlanBase):
    """计划响应"""
    id: int
    task_id: Optional[int] = None
    agent_id: Optional[int] = None
    status: PlanStatus
    generated_by: Optional[str] = None
    generation_prompt: Optional[str] = None
    generation_model: Optional[str] = None
    total_steps: int
    completed_steps: int
    failed_steps: int
    retry_count: int
    input_data: Optional[Dict[str, Any]] = None
    output_data: Optional[Dict[str, Any]] = None
    error_message: Optional[str] = None
    error_step_id: Optional[int] = None
    created_at: datetime
    updated_at: datetime
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    steps: List[PlanStepResponse] = Field(default_factory=list, description="计划步骤")

    # 计算属性
    progress_percentage: float = Field(default=0.0, description="执行进度百分比")
    is_executable: bool = Field(default=False, description="是否可以执行")
    is_running: bool = Field(default=False, description="是否正在执行")

    model_config = ConfigDict(from_attributes=True)


class PlanListResponse(BaseModel):
    """计划列表响应"""
    plans: List[PlanResponse]
    total: int
    page: int
    size: int
    has_next: bool


class PlanGenerateRequest(BaseModel):
    """生成计划请求"""
    task_id: int = Field(..., description="任务ID")
    agent_id: Optional[int] = Field(None, description="指定的Agent ID")
    template_id: Optional[int] = Field(None, description="计划模板ID")
    force_regenerate: bool = Field(default=False, description="强制重新生成")


class PlanGenerateResponse(BaseModel):
    """生成计划响应"""
    plan_id: int
    status: str
    message: str
    plan: Optional[PlanResponse] = None


class PlanExecuteRequest(BaseModel):
    """执行计划请求"""
    input_data: Optional[Dict[str, Any]] = Field(None, description="输入数据")
    dry_run: bool = Field(default=False, description="是否为试运行")
    start_from_step: Optional[int] = Field(None, description="从指定步骤开始")


class PlanExecuteResponse(BaseModel):
    """执行计划响应"""
    execution_id: int
    plan_id: int
    status: str
    message: str


class PlanTemplateBase(BaseModel):
    """计划模板基础字段"""
    name: str = Field(..., min_length=1, max_length=200, description="模板名称")
    description: str = Field(..., min_length=1, description="模板描述")
    category: str = Field(..., min_length=1, max_length=50, description="模板分类")
    template_data: Dict[str, Any] = Field(..., description="模板结构")
    input_schema: Dict[str, Any] = Field(..., description="输入参数定义")
    applicable_agent_types: List[str] = Field(default_factory=list, description="适用的Agent类型")
    applicable_frameworks: List[str] = Field(default_factory=list, description="适用的框架")
    tags: List[str] = Field(default_factory=list, description="标签列表")
    meta: Optional[Dict[str, Any]] = Field(None, description="元数据")


class PlanTemplateCreate(PlanTemplateBase):
    """创建计划模板"""
    pass


class PlanTemplateUpdate(BaseModel):
    """更新计划模板"""
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = None
    category: Optional[str] = None
    template_data: Optional[Dict[str, Any]] = None
    input_schema: Optional[Dict[str, Any]] = None
    applicable_agent_types: Optional[List[str]] = None
    applicable_frameworks: Optional[List[str]] = None
    tags: Optional[List[str]] = None
    is_active: Optional[bool] = None
    meta: Optional[Dict[str, Any]] = None


class PlanTemplateResponse(PlanTemplateBase):
    """计划模板响应"""
    id: int
    usage_count: int
    success_rate: Optional[float] = None
    is_active: bool
    is_builtin: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class PlanTemplateListResponse(BaseModel):
    """计划模板列表响应"""
    templates: List[PlanTemplateResponse]
    total: int
    page: int
    size: int
    has_next: bool


class PlanStats(BaseModel):
    """计划统计信息"""
    total_plans: int
    draft_plans: int
    generated_plans: int
    approved_plans: int
    executing_plans: int
    completed_plans: int
    failed_plans: int
    average_steps: float
    average_execution_time: float
    success_rate: float
    plans_by_type: Dict[str, int]
    plans_by_status: Dict[str, int]


class PlanVisualization(BaseModel):
    """计划可视化数据"""
    plan_id: int
    nodes: List[Dict[str, Any]] = Field(..., description="节点列表")
    edges: List[Dict[str, Any]] = Field(..., description="边列表")
    layout: str = Field(default="dagre", description="布局算法")
    meta: Optional[Dict[str, Any]] = None