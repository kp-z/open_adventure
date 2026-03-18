"""
测试模块数据模型
"""

from enum import Enum
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base


class TestNodeType(str, Enum):
    """测试节点类型"""
    CATEGORY = "category"      # 分类节点
    TEST_SUITE = "test_suite"  # 测试套件
    TEST_CASE = "test_case"    # 单个测试用例


class TestStatus(str, Enum):
    """测试执行状态"""
    PENDING = "pending"
    RUNNING = "running"
    PASSED = "passed"
    FAILED = "failed"
    SKIPPED = "skipped"
    ERROR = "error"


class TestNode(Base):
    """测试树节点"""
    __tablename__ = "test_nodes"

    id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    type = Column(String, nullable=False)  # TestNodeType
    parent_id = Column(String, ForeignKey("test_nodes.id"), nullable=True)
    test_file = Column(String, nullable=True)
    test_command = Column(String, default="pytest")  # pytest 或 playwright test
    enabled = Column(Boolean, default=True)
    order = Column(Integer, default=0)

    # 关系
    parent = relationship("TestNode", remote_side=[id], backref="children")
    executions = relationship("TestExecution", back_populates="test_node")


class TestExecution(Base):
    """测试执行记录"""
    __tablename__ = "test_executions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    test_node_id = Column(String, ForeignKey("test_nodes.id"), nullable=False)
    status = Column(String, nullable=False)  # TestStatus
    started_at = Column(DateTime, nullable=False)
    completed_at = Column(DateTime, nullable=True)
    duration = Column(Integer, nullable=True)  # 毫秒

    # 测试结果
    total_tests = Column(Integer, default=0)
    passed_tests = Column(Integer, default=0)
    failed_tests = Column(Integer, default=0)
    skipped_tests = Column(Integer, default=0)
    error_tests = Column(Integer, default=0)

    # 详细信息
    output = Column(Text, nullable=True)
    error_message = Column(Text, nullable=True)

    # 关系
    test_node = relationship("TestNode", back_populates="executions")
