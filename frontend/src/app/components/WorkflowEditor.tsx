import React, { useState, useEffect, useRef } from "react";
import {
  GitBranch,
  Layout,
  BarChart3,
  Plus,
  Sparkles,
  Play,
  X,
  Zap,
  Shield,
  ShieldCheck,
  Compass,
  BrainCircuit,
  MessageSquare,
  AlertCircle,
  CheckCircle2,
  Pause,
  Ban,
  AlertTriangle,
  CircleDot,
  Clock,
  Users,
  Link2,
  CheckSquare,
  Lock,
  ArrowRight,
  CheckCircle,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useAppContext } from "../contexts/AppContext";
import { GlassCard, GameCard, ActionButton } from "./ui-shared";

type WorkflowView = "flow" | "kanban" | "gantt";

// Workflow 全局状态
type WorkflowState = 
  | "edit"      // 编辑态 - 可编辑节点、连线
  | "ready"     // 就绪态 - 编辑已锁定，等待运行
  | "running"   // 运行中 - 正在执行流水线
  | "paused"    // 已暂停 - 暂停执行
  | "stopped"   // 已停止 - 手动停止
  | "completed" // 已完成 - 所有节点执行完毕
  | "failed";   // 执行失败 - 存在错误节点

type NodeStatus = 
  | "pending"     // 待执行
  | "running"     // 运行中
  | "paused"      // 已暂停
  | "completed"   // 已完成
  | "error"       // 异常
  | "interrupted" // 中断（用户或AI）
  | "ai-interrupted"; // AI自动中断

interface Team {
  id: string;
  name: string;
  members: number;
  color: string;
  icon: any;
}

const mockTeams: Team[] = [
  { id: "1", name: "Core Infrastructure", members: 3, color: "blue", icon: Shield },
  { id: "2", name: "The UI Wizards", members: 2, color: "purple", icon: Sparkles },
  { id: "3", name: "Data Insights", members: 2, color: "orange", icon: BrainCircuit },
];

interface Node {
  id: string;
  name: string;
  type: "trigger" | "action" | "condition" | "team-leader" | "task" | "result";
  status: NodeStatus;
  position: { x: number; y: number }; // 节点在画布上的位置
  connections: string[]; // 连接的后续节点ID
  teamId?: string;
  agentIds?: string[]; // 分配的agent IDs
  isParallel?: boolean; // 是否为并行节点
  // Task specific fields (matching Claude task JSON format)
  taskId?: string; // Task ID from JSON
  subject?: string; // Task subject/title
  owner?: string; // Agent name who owns this task (from team members)
  priority?: "high" | "normal" | "low";
  blocks?: string[]; // Task IDs this task blocks
  blockedBy?: string[]; // Task IDs blocking this task
  description?: string;
  createdAt?: string;
  updatedAt?: string;
  metadata?: {
    createdBy?: string;
    teamName?: string;
    notes?: string;
  };
}

// Mock Agents - Based on feature-launch team
const mockAgents = [
  { id: "agt_team_lead_01", name: "team-lead", agentType: "team-lead", model: "claude-opus-4.6", role: "Team Lead" },
  { id: "agt_backend_01", name: "backend-dev", agentType: "general-purpose", model: "claude-sonnet-4.5", role: "Backend" },
  { id: "agt_frontend_01", name: "frontend-dev", agentType: "general-purpose", model: "claude-sonnet-4.5", role: "Frontend" },
  { id: "agt_tester_01", name: "tester", agentType: "general-purpose", model: "claude-sonnet-4.5", role: "Testing" },
  { id: "agt_docs_01", name: "docs-writer", agentType: "general-purpose", model: "claude-haiku-4", role: "Documentation" },
];

// Mock Runtime Logs for Agent Communication
interface RuntimeLog {
  id: string;
  timestamp: string;
  type: "system" | "agent-message" | "error" | "success";
  agentId?: string;
  agentName?: string;
  targetAgentId?: string; // 对话目标Agent
  targetAgentName?: string;
  message: string;
  data?: any;
  isTyping?: boolean; // 是否正在输入
}

const getMockRuntimeLogs = (nodeId: string, nodeStatus: NodeStatus): RuntimeLog[] => {
  // Task 1: Backend API (running)
  if (nodeId === "task-1" && nodeStatus === "running") {
    return [
      {
        id: "1",
        timestamp: "09:31:05",
        type: "system",
        message: "Task #1 claimed by backend-dev - Implementing user profile API",
      },
      {
        id: "2",
        timestamp: "09:31:10",
        type: "agent-message",
        agentId: "agt_backend_01",
        agentName: "backend-dev",
        message: "Starting backend API implementation. Setting up /api/profile endpoints...",
      },
      {
        id: "3",
        timestamp: "09:32:15",
        type: "agent-message",
        agentId: "agt_backend_01",
        agentName: "backend-dev",
        message: "Added GET /api/profile and PUT /api/profile endpoints. Implementing auth middleware integration.",
        data: { endpoints: 2, middleware: "auth-middleware-v2" },
      },
      {
        id: "4",
        timestamp: "09:35:20",
        type: "agent-message",
        agentId: "agt_backend_01",
        agentName: "backend-dev",
        targetAgentId: "agt_tester_01",
        targetAgentName: "tester",
        message: "Hey tester, I'm adding a JSONB column for profile_extra. Can you help prepare test cases for custom fields?",
      },
      {
        id: "5",
        timestamp: "09:35:45",
        type: "agent-message",
        agentId: "agt_tester_01",
        agentName: "tester",
        targetAgentId: "agt_backend_01",
        targetAgentName: "backend-dev",
        message: "Sure! I'll prepare test cases for JSONB validation. Will cover edge cases like empty objects and nested fields.",
      },
      {
        id: "6",
        timestamp: "09:38:30",
        type: "agent-message",
        agentId: "agt_backend_01",
        agentName: "backend-dev",
        message: "Database migration completed. API endpoints are functional and ready for frontend integration.",
        data: { migration: "20260224_add_profile_extra", status: "success" },
      },
      {
        id: "7",
        timestamp: "09:40:12",
        type: "agent-message",
        agentId: "agt_backend_01",
        agentName: "backend-dev",
        isTyping: true,
        message: "Writing API documentation...",
      },
    ];
  } else if (nodeStatus === "ai-interrupted") {
    return [
      {
        id: "1",
        timestamp: "14:28:15",
        type: "system",
        message: "Task started - Logging error conditions",
      },
      {
        id: "2",
        timestamp: "14:28:17",
        type: "agent-message",
        agentId: "a4",
        agentName: "API Tester",
        message: "Beginning error log analysis. Running diagnostic tests...",
      },
      {
        id: "3",
        timestamp: "14:28:19",
        type: "error",
        agentId: "a4",
        agentName: "API Tester",
        message: "⚠️ Anomaly detected: Response time 2.3s exceeds 1.0s threshold. This could impact user experience.",
      },
      {
        id: "4",
        timestamp: "14:28:20",
        type: "agent-message",
        agentId: "a4",
        agentName: "API Tester",
        message: "This looks serious. I'm pausing execution and requesting human review before we proceed further.",
      },
      {
        id: "5",
        timestamp: "14:28:21",
        type: "system",
        message: "⏸ Task paused - Awaiting human decision",
      },
    ];
  } else if (nodeStatus === "completed") {
    return [
      {
        id: "1",
        timestamp: "14:15:00",
        type: "system",
        message: "✓ Trigger activated - New issue detected",
      },
      {
        id: "2",
        timestamp: "14:15:01",
        type: "success",
        message: "Successfully processed trigger event",
      },
      {
        id: "3",
        timestamp: "14:15:02",
        type: "system",
        message: "→ Task completed - Forwarding to next stage",
      },
    ];
  }
  
  return [
    {
      id: "1",
      timestamp: "--:--:--",
      type: "system",
      message: "⏳ Task pending - Waiting for previous stages to complete",
    },
  ];
};

interface WorkflowEditorProps {
  workflow?: any;
  onClose: () => void;
}

export const WorkflowEditor = ({ workflow, onClose }: WorkflowEditorProps) => {
  const { mode } = useAppContext();
  const [view, setView] = useState<WorkflowView>("flow");
  const [workflowName, setWorkflowName] = useState(workflow?.name || "Untitled Workflow");
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isTaskConfigOpen, setIsTaskConfigOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeAgentIds, setActiveAgentIds] = useState<string[]>([]); // 正在对话的Agent IDs
  
  // Workflow 状态管理
  const [workflowState, setWorkflowState] = useState<WorkflowState>("edit");
  const [executionStartTime, setExecutionStartTime] = useState<number | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);

  // 执行计时器
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (workflowState === "running" && executionStartTime) {
      interval = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - executionStartTime) / 1000));
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [workflowState, executionStartTime]);

  // Grid configuration for table-like layout
  const GRID_SIZE = 40; // 对齐网格大小
  const NODE_WIDTH = 240; // 节点宽度
  const NODE_HEIGHT = 100; // 节点高度
  const COLUMN_GAP = 280; // 列间距（固定）
  const ROW_GAP = 140; // 行间距（固定）
  const START_X = 80; // 起始 X 坐标
  const START_Y = 80; // 起始 Y 坐标

  // 计算节点应该吸附到的 table 位置
  const snapToTableGrid = (x: number, y: number): { x: number; y: number } => {
    // 计算最近的列和行
    const col = Math.round((x - START_X) / COLUMN_GAP);
    const row = Math.round((y - START_Y) / ROW_GAP);
    
    // 返回固定的 table 位置
    return {
      x: START_X + col * COLUMN_GAP,
      y: START_Y + row * ROW_GAP,
    };
  };

  // 对齐到网格
  const snapToGrid = (value: number) => {
    return Math.round(value / GRID_SIZE) * GRID_SIZE;
  };

  // 初始化节点布局（基于 feature-launch 真实任务）
  const [nodes, setNodes] = useState<Node[]>([
    { 
      id: "team-lead", 
      name: "Team Lead", 
      type: "team-leader", 
      status: "completed", 
      position: { x: START_X, y: START_Y + ROW_GAP }, 
      connections: ["task-1"], 
      teamId: "1",
      agentIds: ["agt_team_lead_01"],
      owner: "team-lead",
      description: "Spawn team and assign tasks for user profile feature launch"
    },
    { 
      id: "task-1", 
      name: "Backend API", 
      type: "task", 
      status: "running", 
      position: { x: START_X + COLUMN_GAP, y: START_Y + ROW_GAP }, 
      connections: ["task-2", "task-3"], 
      teamId: "1",
      agentIds: ["agt_backend_01"],
      taskId: "1",
      subject: "Implement user profile backend API",
      owner: "backend-dev",
      priority: "high",
      blocks: ["2", "3"],
      blockedBy: [],
      description: "Add /api/profile endpoints for reading and updating user profiles. Use existing auth middleware. Persist data in the users table, and add a JSONB column `profile_extra` for custom fields.",
      createdAt: "2026-02-24T09:31:00.000Z",
      updatedAt: "2026-02-24T09:40:12.000Z",
      metadata: {
        createdBy: "team-lead",
        teamName: "feature-launch",
        notes: "API shape must be confirmed before frontend & tests proceed."
      }
    },
    { 
      id: "task-2", 
      name: "Frontend UI", 
      type: "task", 
      status: "pending", 
      position: { x: START_X + COLUMN_GAP * 2, y: START_Y }, 
      connections: ["task-4"], 
      teamId: "1",
      agentIds: ["agt_frontend_01"],
      taskId: "2",
      subject: "Build user profile UI in frontend",
      owner: "",
      priority: "normal",
      blocks: ["4"],
      blockedBy: ["1"],
      description: "Implement the user profile page at /settings/profile using the new /api/profile endpoints. Include editable fields for display name, avatar URL, and bio. Handle loading, error, and success states.",
      createdAt: "2026-02-24T09:31:10.000Z",
      updatedAt: "2026-02-24T09:31:10.000Z",
      metadata: {
        createdBy: "team-lead",
        teamName: "feature-launch",
        notes: "Wait for backend API to be stable before implementing."
      },
      isParallel: true 
    },
    { 
      id: "task-3", 
      name: "Backend Tests", 
      type: "task", 
      status: "pending", 
      position: { x: START_X + COLUMN_GAP * 2, y: START_Y + ROW_GAP * 2 }, 
      connections: ["task-4"], 
      teamId: "1",
      agentIds: ["agt_tester_01"],
      taskId: "3",
      subject: "Write backend and integration tests for profile API",
      owner: "",
      priority: "normal",
      blocks: ["4"],
      blockedBy: ["1"],
      description: "Add unit tests for profile read/update endpoints and integration tests covering auth, validation, and error handling. Use existing test utilities. Ensure coverage for invalid payloads and unauthorized access.",
      createdAt: "2026-02-24T09:31:20.000Z",
      updatedAt: "2026-02-24T09:31:20.000Z",
      metadata: {
        createdBy: "team-lead",
        teamName: "feature-launch",
        notes: "Tests should be green before docs claim task 4."
      },
      isParallel: true 
    },
    { 
      id: "task-4", 
      name: "Documentation", 
      type: "task", 
      status: "pending", 
      position: { x: START_X + COLUMN_GAP * 3, y: START_Y + ROW_GAP }, 
      connections: ["result"], 
      teamId: "1",
      agentIds: ["agt_docs_01"],
      taskId: "4",
      subject: "Document the new user profile feature",
      owner: "docs-writer",
      priority: "low",
      blocks: [],
      blockedBy: ["2", "3"],
      description: "Update USER_GUIDE.md and API_REFERENCE.md with usage instructions for the profile page and /api/profile endpoints. Include request/response examples and screenshots of the final UI.",
      createdAt: "2026-02-24T09:31:30.000Z",
      updatedAt: "2026-02-24T09:31:30.000Z",
      metadata: {
        createdBy: "team-lead",
        teamName: "feature-launch",
        notes: "Docs should reflect actual implementation and passing tests."
      }
    },
    { 
      id: "result", 
      name: "Feature Deployed", 
      type: "result", 
      status: "pending", 
      position: { x: START_X + COLUMN_GAP * 4, y: START_Y + ROW_GAP }, 
      connections: [], 
      teamId: "1" 
    },
  ]);

  const containerRef = useRef<HTMLDivElement>(null);
  const selectedNode = nodes.find(n => n.id === selectedNodeId);
  const [isDragging, setIsDragging] = useState(false);
  const [draggingConnection, setDraggingConnection] = useState<{
    fromNodeId: string;
    mouseX: number;
    mouseY: number;
  } | null>(null);
  const [hoveredEdge, setHoveredEdge] = useState<{
    fromId: string;
    toId: string;
  } | null>(null);
  const [isDraggingPlusButton, setIsDraggingPlusButton] = useState(false);
  const [plusButtonStart, setPlusButtonStart] = useState<{ x: number; y: number } | null>(null);

  // 获取状态配置
  const getStatusConfig = (status: NodeStatus) => {
    const configs: Record<NodeStatus, { 
      icon: any; 
      color: string; 
      bg: string; 
      border: string; 
      label: string;
      pulse?: boolean;
    }> = {
      pending: { 
        icon: CircleDot, 
        color: "text-gray-400", 
        bg: "bg-gray-500/10", 
        border: "border-gray-500/30",
        label: "Pending" 
      },
      running: { 
        icon: Play, 
        color: "text-blue-400", 
        bg: "bg-blue-500/20", 
        border: "border-blue-500/50",
        label: "Running",
        pulse: true 
      },
      paused: { 
        icon: Pause, 
        color: "text-yellow-400", 
        bg: "bg-yellow-500/20", 
        border: "border-yellow-500/50",
        label: "Paused" 
      },
      completed: { 
        icon: CheckCircle2, 
        color: "text-green-400", 
        bg: "bg-green-500/20", 
        border: "border-green-500/50",
        label: "Completed" 
      },
      error: { 
        icon: AlertCircle, 
        color: "text-red-400", 
        bg: "bg-red-500/20", 
        border: "border-red-500/50",
        label: "Error" 
      },
      interrupted: { 
        icon: Ban, 
        color: "text-orange-400", 
        bg: "bg-orange-500/20", 
        border: "border-orange-500/50",
        label: "Interrupted" 
      },
      "ai-interrupted": { 
        icon: AlertTriangle, 
        color: "text-purple-400", 
        bg: "bg-purple-500/20", 
        border: "border-purple-500/50",
        label: "AI Interrupted",
        pulse: true 
      },
    };
    return configs[status];
  };

  // 打断节点并打开会话
  const handleNodeInterrupt = (nodeId: string) => {
    setSelectedNodeId(nodeId);
    setIsChatOpen(true);
    // 更新节点状态为中断
    setNodes(nodes.map(n => 
      n.id === nodeId ? { ...n, status: "interrupted" as NodeStatus } : n
    ));
  };

  // 检查是否可以编辑（只有 edit 和 stopped/completed/failed 状态可以编辑）
  const canEdit = workflowState === "edit" || workflowState === "stopped" || workflowState === "completed" || workflowState === "failed";

  // 添加新节点
  const handleAddNode = () => {
    if (!canEdit) return;
    const newNode: Node = {
      id: `${nodes.length + 1}`,
      name: `New Task ${nodes.length + 1}`,
      type: "action",
      status: "pending",
      position: { x: 50 + nodes.length * 100, y: 200 },
      connections: [],
    };
    setNodes([...nodes, newNode]);
  };

  // 在指定节点后方添加新点
  const handleAddNodeAfter = (afterNodeId: string) => {
    if (!canEdit) return;
    const afterNode = nodes.find(n => n.id === afterNodeId);
    if (!afterNode) return;

    const newNodeId = `${Date.now()}`;
    const targetColumn = afterNode.position.x + COLUMN_GAP;
    
    // 找到同列的所有节点
    const sameColumnNodes = nodes.filter(n => 
      Math.abs(n.position.x - targetColumn) < 10 // 容差
    );
    
    // 找到第一个空行位置
    let targetRow = 0;
    let targetY = START_Y;
    
    while (true) {
      const occupied = sameColumnNodes.some(n => 
        Math.abs(n.position.y - targetY) < 10 // 容差
      );
      
      if (!occupied) {
        break;
      }
      
      targetRow++;
      targetY = START_Y + targetRow * ROW_GAP;
    }

    const newNode: Node = {
      id: newNodeId,
      name: `New Task`,
      type: "action",
      status: "pending",
      position: { 
        x: targetColumn, 
        y: targetY
      },
      connections: [],
    };

    // 添加连接
    const updatedNodes = nodes.map(n => 
      n.id === afterNodeId 
        ? { ...n, connections: [...n.connections, newNodeId] } 
        : n
    );

    setNodes([...updatedNodes, newNode]);
    setSelectedNodeId(newNodeId);
  };

  // 检查节点是否可以被连接（只能连接后方列的节点）
  const canConnect = (fromNodeId: string, toNodeId: string) => {
    const fromNode = nodes.find(n => n.id === fromNodeId);
    const toNode = nodes.find(n => n.id === toNodeId);
    
    if (!fromNode || !toNode || fromNodeId === toNodeId) return false;
    
    // 只能连接到后方（x 坐标更大）的节点
    return toNode.position.x > fromNode.position.x;
  };

  // 建立连接
  const handleCreateConnection = (fromNodeId: string, toNodeId: string) => {
    if (!canConnect(fromNodeId, toNodeId)) return;
    
    setNodes(nodes.map(n => 
      n.id === fromNodeId 
        ? { ...n, connections: [...new Set([...n.connections, toNodeId])] } // 使用 Set 避免重复
        : n
    ));
  };

  // 检测鼠标是否在某个节点上
  const getNodeAtPosition = (x: number, y: number, excludeNodeId: string) => {
    return nodes.find(n => {
      if (n.id === excludeNodeId) return false;
      const inXRange = x >= n.position.x && x <= n.position.x + NODE_WIDTH;
      const inYRange = y >= n.position.y && y <= n.position.y + NODE_HEIGHT;
      return inXRange && inYRange;
    });
  };

  // 检查位置是否与其他节点重叠
  const isPositionOccupied = (x: number, y: number, excludeNodeId?: string) => {
    return nodes.some(n => {
      if (excludeNodeId && n.id === excludeNodeId) return false;
      // 检查是否在同一个 table 格子
      return Math.abs(n.position.x - x) < 10 && Math.abs(n.position.y - y) < 10;
    });
  };

  // 删除连接
  const handleDeleteConnection = (fromNodeId: string, toNodeId: string) => {
    if (!canEdit) return;
    setNodes(nodes.map(n => 
      n.id === fromNodeId 
        ? { ...n, connections: n.connections.filter(id => id !== toNodeId) }
        : n
    ));
    setHoveredEdge(null);
  };

  // ========== Workflow 运行控制函数 ==========
  
  // 1. 锁定编辑并准备运行
  const handleLockAndReady = () => {
    setWorkflowState("ready");
    setElapsedTime(0);
    // 重置所有节点状态为 pending
    setNodes(nodes.map(n => ({ ...n, status: "pending" as NodeStatus })));
  };

  // 2. 启动 Workflow
  const handleLaunch = () => {
    setWorkflowState("running");
    setExecutionStartTime(Date.now());
    setElapsedTime(0);
    // 启动第一批可执行的节点（没有依赖的节点）
    executeNextNodes();
  };

  // 3. 暂停 Workflow
  const handlePause = () => {
    setWorkflowState("paused");
    // 将所有 running 节点改为 paused
    setNodes(nodes.map(n => 
      n.status === "running" ? { ...n, status: "paused" as NodeStatus } : n
    ));
  };

  // 4. 恢复运行
  const handleResume = () => {
    setWorkflowState("running");
    // 将所有 paused 节点改为 running
    setNodes(nodes.map(n => 
      n.status === "paused" ? { ...n, status: "running" as NodeStatus } : n
    ));
    // 继续执行
    executeNextNodes();
  };

  // 5. 停止 Workflow
  const handleStop = () => {
    setWorkflowState("stopped");
    setExecutionStartTime(null);
    setElapsedTime(0);
    // 将所有 running/paused 节点改为 pending
    setNodes(nodes.map(n => 
      (n.status === "running" || n.status === "paused") 
        ? { ...n, status: "pending" as NodeStatus } 
        : n
    ));
  };

  // 6. 返回编辑模式
  const handleEdit = () => {
    setWorkflowState("edit");
    setExecutionStartTime(null);
    setElapsedTime(0);
    // 重置所有节点状态
    setNodes(nodes.map(n => ({ ...n, status: "pending" as NodeStatus })));
  };

  // 7. 执行下一批节点（自动化执行逻辑）
  const executeNextNodes = () => {
    setNodes(prevNodes => {
      const updatedNodes = [...prevNodes];
      
      // 找到所有可以开始执行的节点（依赖已完成，自己是pending）
      const executableNodes = updatedNodes.filter(node => {
        if (node.status !== "pending") return false;
        
        // 检查依赖是否都已完成（找到所有指向这个节点的连接）
        const dependencies = updatedNodes.filter(n => n.connections.includes(node.id));
        return dependencies.length === 0 || dependencies.every(dep => dep.status === "completed");
      });

      // 开始执行这些节点
      executableNodes.forEach(node => {
        // Result 节点直接标记为 completed
        if (node.type === "result") {
          node.status = "completed";
          // 检查是否所有节点都完成
          setTimeout(() => {
            setNodes(currentNodes => {
              const allCompleted = currentNodes.every(n => 
                n.status === "completed" || n.status === "error"
              );
              
              if (allCompleted) {
                const hasError = currentNodes.some(n => n.status === "error");
                setWorkflowState(hasError ? "failed" : "completed");
                setExecutionStartTime(null);
              }
              
              return currentNodes;
            });
          }, 100);
          return;
        }
        
        // 其他节点正常执行
        node.status = "running";
        
        // 模拟节点执行（2-5秒随机时间）
        const executionTime = 2000 + Math.random() * 3000;
        setTimeout(() => {
          setNodes(currentNodes => {
            const nodeToUpdate = currentNodes.find(n => n.id === node.id);
            if (!nodeToUpdate || nodeToUpdate.status !== "running") return currentNodes;
            
            // 随机成功/失败（95% 成功率）
            const success = Math.random() > 0.05;
            const newStatus: NodeStatus = success ? "completed" : "error";
            
            const newNodes = currentNodes.map(n => 
              n.id === node.id ? { ...n, status: newStatus } : n
            );
            
            // 检查是否所有节点都执行完毕
            const allCompleted = newNodes.every(n => 
              n.status === "completed" || n.status === "error"
            );
            
            if (allCompleted) {
              const hasError = newNodes.some(n => n.status === "error");
              setWorkflowState(hasError ? "failed" : "completed");
              setExecutionStartTime(null);
            } else {
              // 继续执行下一批
              setTimeout(() => executeNextNodes(), 500);
            }
            
            return newNodes;
          });
        }, executionTime);
      });

      return updatedNodes;
    });
  };

  // Flow View - DAG Pipeline
  const FlowView = () => (
    <div 
      ref={containerRef} 
      className="relative h-full w-full bg-gradient-to-br from-black/40 to-black/20 rounded-2xl overflow-auto p-8 border border-white/5"
      style={{ minHeight: "600px", minWidth: "1200px" }}
      onMouseMove={(e) => {
        if (draggingConnection) {
          const rect = e.currentTarget.getBoundingClientRect();
          setDraggingConnection({
            ...draggingConnection,
            mouseX: e.clientX - rect.left + e.currentTarget.scrollLeft,
            mouseY: e.clientY - rect.top + e.currentTarget.scrollTop,
          });
        }
      }}
      onMouseUp={(e) => {
        if (draggingConnection) {
          const rect = e.currentTarget.getBoundingClientRect();
          const mouseX = e.clientX - rect.left + e.currentTarget.scrollLeft;
          const mouseY = e.clientY - rect.top + e.currentTarget.scrollTop;
          
          const targetNode = getNodeAtPosition(mouseX, mouseY, draggingConnection.fromNodeId);
          if (targetNode && canConnect(draggingConnection.fromNodeId, targetNode.id)) {
            handleCreateConnection(draggingConnection.fromNodeId, targetNode.id);
          }
          
          setDraggingConnection(null);
          setIsDraggingPlusButton(false);
        }
      }}
    >
      {/* Grid background for visual alignment */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(255,255,255,0.03) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255,255,255,0.03) 1px, transparent 1px)
          `,
          backgroundSize: `${GRID_SIZE}px ${GRID_SIZE}px`,
        }}
      />

      {/* SVG for connections - Lower z-index so nodes don't cover edges */}
      <svg 
        className="absolute inset-0 w-full h-full" 
        style={{ minWidth: "100%", minHeight: "100%", zIndex: 1, pointerEvents: "none" }}
      >
        <defs>
          <marker id="arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
            <path d="M 0 0 L 6 3 L 0 6 z" fill={mode === "adventure" ? "#f59e0b" : "#3b82f6"} />
          </marker>
          <marker id="arrow-bidirectional" markerWidth="6" markerHeight="6" refX="1" refY="3" orient="auto-start-reverse">
            <path d="M 0 0 L 6 3 L 0 6 z" fill="#06b6d4" />
          </marker>
        </defs>
        
        {/* Existing connections */}
        {nodes.map(node => 
          node.connections.map(targetId => {
            const target = nodes.find(n => n.id === targetId);
            if (!target) return null;
            
            // Edge starts from right edge of source node
            const startX = node.position.x + NODE_WIDTH;
            const startY = node.position.y + NODE_HEIGHT / 2;
            // Edge ends at left edge of target node
            const endX = target.position.x;
            const endY = target.position.y + NODE_HEIGHT / 2;
            
            // 判断是否为横向连接
            const isHorizontal = Math.abs(startY - endY) < 5; // 容差 5px
            const isHovered = hoveredEdge?.fromId === node.id && hoveredEdge?.toId === targetId;
            
            // 连接线样式（根据节点类型）
            const isBlockingConnection = node.type === "task" && target.type === "task";
            
            // 连接线颜色
            const strokeColor = isBlockingConnection ? "#3b82f6" : 
                               mode === "adventure" ? "#f59e0b" : "#3b82f6";
            const strokeDash = "0";
            
            // 计算边的中点（用于放置删除按钮）
            let midX, midY;
            if (isHorizontal) {
              midX = (startX + endX) / 2;
              midY = startY;
            } else {
              const actualMidX = startX + (endX - startX) / 2;
              midY = (startY + endY) / 2;
              midX = actualMidX;
            }
            
            if (isHorizontal) {
              // 横向：使用直线
              return (
                <g key={`${node.id}-${targetId}`} style={{ pointerEvents: "all" }}>
                  <line
                    x1={startX}
                    y1={startY}
                    x2={endX}
                    y2={endY}
                    stroke={strokeColor}
                    strokeWidth={isHovered ? "3" : "2"}
                    strokeOpacity={isHovered ? "1" : "0.7"}
                    strokeDasharray={strokeDash}
                    markerEnd="url(#arrow)"
                    className="transition-all duration-300 cursor-pointer"
                    style={{ pointerEvents: "stroke" }}
                    onMouseEnter={() => setHoveredEdge({ fromId: node.id, toId: targetId })}
                    onMouseLeave={() => setHoveredEdge(null)}
                  />
                  {isHovered && (
                    <>
                      <circle
                        cx={midX}
                        cy={midY}
                        r="12"
                        fill={mode === "adventure" ? "#1a1a2e" : "#0f111a"}
                        stroke={mode === "adventure" ? "#f59e0b" : "#3b82f6"}
                        strokeWidth="2"
                        className="cursor-pointer"
                        style={{ pointerEvents: "all" }}
                        onClick={() => handleDeleteConnection(node.id, targetId)}
                      />
                      <line
                        x1={midX - 6}
                        y1={midY}
                        x2={midX + 6}
                        y2={midY}
                        stroke="#ef4444"
                        strokeWidth="2"
                        style={{ pointerEvents: "none" }}
                      />
                    </>
                  )}
                </g>
              );
            } else {
              // 非横向：使分段路径（横-竖-横）
              const actualMidX = startX + (endX - startX) / 2;
              const cornerRadius = 8; // 圆角半径
              
              // 构建分段路径：横向 -> 圆角 -> 竖向 -> 圆角 -> 横向
              let path = `M ${startX} ${startY}`;
              
              // 第一段横向
              path += ` L ${actualMidX - cornerRadius} ${startY}`;
              
              // 圆角转弯（向下或向上）
              if (endY > startY) {
                // 向下转弯
                path += ` Q ${actualMidX} ${startY} ${actualMidX} ${startY + cornerRadius}`;
              } else {
                // 向上转弯
                path += ` Q ${actualMidX} ${startY} ${actualMidX} ${startY - cornerRadius}`;
              }
              
              // 竖向段
              if (endY > startY) {
                path += ` L ${actualMidX} ${endY - cornerRadius}`;
              } else {
                path += ` L ${actualMidX} ${endY + cornerRadius}`;
              }
              
              // 第二个圆角转弯
              if (endY > startY) {
                path += ` Q ${actualMidX} ${endY} ${actualMidX + cornerRadius} ${endY}`;
              } else {
                path += ` Q ${actualMidX} ${endY} ${actualMidX + cornerRadius} ${endY}`;
              }
              
              // 第二段横向到终点
              path += ` L ${endX} ${endY}`;
              
              return (
                <g key={`${node.id}-${targetId}`} style={{ pointerEvents: "all" }}>
                  <path
                    d={path}
                    stroke={strokeColor}
                    strokeWidth={isHovered ? "3" : "2"}
                    strokeOpacity={isHovered ? "1" : "0.7"}
                    strokeDasharray={strokeDash}
                    fill="none"
                    markerEnd="url(#arrow)"
                    className="transition-all duration-300 cursor-pointer"
                    style={{ pointerEvents: "stroke" }}
                    onMouseEnter={() => setHoveredEdge({ fromId: node.id, toId: targetId })}
                    onMouseLeave={() => setHoveredEdge(null)}
                  />
                  {isHovered && (
                    <>
                      <circle
                        cx={midX}
                        cy={midY}
                        r="12"
                        fill={mode === "adventure" ? "#1a1a2e" : "#0f111a"}
                        stroke={strokeColor}
                        strokeWidth="2"
                        className="cursor-pointer"
                        style={{ pointerEvents: "all" }}
                        onClick={() => handleDeleteConnection(node.id, targetId)}
                      />
                      <line
                        x1={midX - 6}
                        y1={midY}
                        x2={midX + 6}
                        y2={midY}
                        stroke="#ef4444"
                        strokeWidth="2"
                        style={{ pointerEvents: "none" }}
                      />
                    </>
                  )}
                </g>
              );
            }
          })
        )}
        
        {/* Dragging connection preview */}
        {draggingConnection && (() => {
          const fromNode = nodes.find(n => n.id === draggingConnection.fromNodeId);
          if (!fromNode) return null;
          
          const startX = fromNode.position.x + NODE_WIDTH;
          const startY = fromNode.position.y + NODE_HEIGHT / 2;
          const endX = draggingConnection.mouseX;
          const endY = draggingConnection.mouseY;
          
          return (
            <line
              x1={startX}
              y1={startY}
              x2={endX}
              y2={endY}
              stroke={mode === "adventure" ? "#f59e0b" : "#3b82f6"}
              strokeWidth="2"
              strokeOpacity="0.5"
              strokeDasharray="5,5"
              className="transition-all duration-100"
            />
          );
        })()}
      </svg>

      {/* Nodes with drag support */}
      {nodes.map((node) => {
        const team = mockTeams.find(t => t.id === node.teamId);
        const statusConfig = getStatusConfig(node.status);
        const StatusIcon = statusConfig.icon;
        
        // 检查此节点是否可以被连接（拖动连线时高亮）
        const isConnectionTarget = draggingConnection 
          ? canConnect(draggingConnection.fromNodeId, node.id)
          : false;
        
        // 检查此节点的agent是否在对话中
        const nodeAgents = node.agentIds ? mockAgents.filter(a => node.agentIds!.includes(a.id)) : [];
        const isAgentActive = nodeAgents.some(a => activeAgentIds.includes(a.id));
        const activeAgent = nodeAgents.find(a => activeAgentIds.includes(a.id));
        const agentColor = activeAgent?.role === "Backend" ? "blue" : 
                          activeAgent?.role === "Frontend" ? "purple" : 
                          activeAgent?.role === "Testing" ? "orange" : 
                          activeAgent?.role === "Documentation" ? "cyan" :
                          activeAgent?.role === "Team Lead" ? "red" : "blue";

        return (
          <motion.div
            key={node.id}
            drag={canEdit}
            dragMomentum={false}
            dragElastic={0}
            dragTransition={{ bounceStiffness: 600, bounceDamping: 20 }}
            onDragStart={() => {
              if (canEdit) setIsDragging(true);
            }}
            onDragEnd={(_, info) => {
              setIsDragging(false);
              
              // Calculate new position
              const newX = node.position.x + info.offset.x;
              const newY = node.position.y + info.offset.y;
              
              // Snap to table grid
              const snappedPos = snapToTableGrid(newX, newY);
              
              // 检查目标位置是否被占用，如果是则找最近的空位
              let finalX = Math.max(START_X, snappedPos.x);
              let finalY = Math.max(START_Y, snappedPos.y);
              
              if (isPositionOccupied(finalX, finalY, node.id)) {
                // 寻找同列最近的空位
                let rowOffset = 0;
                while (isPositionOccupied(finalX, finalY, node.id) && rowOffset < 20) {
                  rowOffset++;
                  finalY = START_Y + Math.floor((snappedPos.y - START_Y + rowOffset * ROW_GAP) / ROW_GAP) * ROW_GAP;
                }
              }
              
              setNodes(nodes.map(n => 
                n.id === node.id 
                  ? { ...n, position: { x: finalX, y: finalY } }
                  : n
              ));
            }}
            className="absolute cursor-grab active:cursor-grabbing group"
            style={{ 
              left: node.position.x,
              top: node.position.y,
              width: NODE_WIDTH,
              zIndex: selectedNodeId === node.id ? 50 : 10,
            }}
            onClick={(e) => {
              // Only select if not dragging
              if (!isDragging && (e.target as HTMLElement).tagName !== 'BUTTON') {
                setSelectedNodeId(node.id);
                setIsChatOpen(false); // Open config, not chat
              }
            }}
          >
            <div 
              className={`
                relative w-full px-4 py-2.5 rounded-xl border-2 shadow-xl transition-all duration-500
                ${selectedNodeId === node.id 
                  ? `${statusConfig.border} shadow-2xl` 
                  : isConnectionTarget
                  ? `border-green-500/70 shadow-green-500/30 shadow-xl`
                  : isAgentActive
                  ? `border-${agentColor}-500/80 shadow-${agentColor}-500/50 shadow-2xl ring-4 ring-${agentColor}-500/20`
                  : node.type === "team-leader"
                  ? "border-red-500/30 hover:border-red-500/50"
                  : node.type === "task"
                  ? node.owner === "" 
                    ? "border-gray-500/30 hover:border-gray-500/50 border-dashed"
                    : "border-blue-500/30 hover:border-blue-500/50"
                  : node.type === "result"
                  ? "border-green-500/30 hover:border-green-500/50"
                  : "border-white/10 hover:border-white/30"
                }
                ${mode === "adventure" ? "bg-[#1a1a2e]" : "bg-black/80 backdrop-blur-xl"}
                ${node.type === "team-leader" ? "bg-red-500/5" : ""}
                ${node.type === "task" ? node.owner === "" ? "bg-gray-500/5" : "bg-blue-500/5" : ""}
                ${node.type === "result" ? "bg-green-500/5" : ""}
                ${isAgentActive ? "scale-105" : ""}
              `}
              style={{ height: NODE_HEIGHT }}
            >
              {/* Node Content - Three Part Layout: Left Buttons | Middle (Task+Agent) | Right Status */}
              <div className="flex items-center gap-2.5 h-full px-1">
                {/* Left: Action Buttons (Vertical) */}
                {(node.type === "task" || node.type === "team-leader") && (
                  <div className="flex flex-col gap-1.5 shrink-0">
                    {/* Task Config Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedNodeId(node.id);
                        setIsTaskConfigOpen(true);
                        setIsChatOpen(false);
                      }}
                      className={`
                        p-1.5 rounded-lg transition-all hover:scale-110
                        ${node.type === "task" ? "bg-blue-500/20 hover:bg-blue-500/40 text-blue-400" : "bg-red-500/20 hover:bg-red-500/40 text-red-400"}
                      `}
                      title={node.type === "task" ? "Configure Task" : "Configure Team Lead"}
                    >
                      <CheckSquare size={14} />
                    </button>
                    
                    {/* Agent Chat Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedNodeId(node.id);
                        setIsChatOpen(true);
                        setIsTaskConfigOpen(false);
                      }}
                      className={`
                        p-1.5 rounded-lg transition-all hover:scale-110
                        bg-purple-500/20 hover:bg-purple-500/40 text-purple-400
                      `}
                      title="Chat with Agent"
                    >
                      <MessageSquare size={14} />
                    </button>
                  </div>
                )}
                
                {/* Result node - just icon */}
                {node.type === "result" && (
                  <div className="p-2 rounded-lg bg-green-500/20 text-green-400 shrink-0">
                    <CheckCircle size={16} />
                  </div>
                )}
                
                {/* Middle: Task Info (Top) + Agent Info (Bottom) */}
                <div className="flex-1 min-w-0 flex flex-col gap-1">
                  {/* Top Part: Task Information */}
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5">
                      <span className={`text-[8px] uppercase font-black
                        ${node.type === "team-leader" ? "text-red-400" : ""}
                        ${node.type === "task" ? "text-blue-400" : ""}
                        ${node.type === "result" ? "text-green-400" : ""}
                        ${node.type === "trigger" ? "text-orange-400" : ""}
                        ${!["team-leader", "task", "result", "trigger"].includes(node.type) ? "text-gray-500" : ""}
                      `}>
                        {node.type === "team-leader" && "Team Lead"}
                        {node.type === "task" && `Task #${node.taskId || "?"}`}
                        {node.type === "result" && "Result"}
                        {node.type === "trigger" && "Trigger"}
                        {node.type === "action" && "Action"}
                        {node.type === "condition" && "Condition"}
                      </span>
                      {/* Priority Badge - After Task Type */}
                      {node.priority && (
                        <span className={`text-[7px] px-1.5 py-0.5 rounded font-black uppercase
                          ${node.priority === "high" ? "bg-red-500/20 text-red-400 border border-red-500/30" : ""}
                          ${node.priority === "normal" ? "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30" : ""}
                          ${node.priority === "low" ? "bg-gray-500/20 text-gray-400 border border-gray-500/30" : ""}
                        `}>
                          {node.priority[0].toUpperCase()}
                        </span>
                      )}
                    </div>
                    <h4 className="text-xs font-bold text-white truncate leading-tight">{node.name}</h4>
                  </div>
                  
                  {/* Bottom Part: Agent Information */}
                  {node.type === "task" && (
                    <div className="space-y-0.5 pt-0.5 border-t border-white/5">
                      {/* Owner */}
                      {node.owner ? (
                        <div className="flex items-center gap-1">
                          <BrainCircuit size={9} className="text-blue-400" />
                          <p className="text-[8px] text-blue-400/90 font-bold truncate">
                            {mockAgents.find(a => a.name === node.owner)?.role || node.owner}
                          </p>
                        </div>
                      ) : (
                        <p className="text-[8px] text-gray-500 italic">Unclaimed - Available</p>
                      )}
                      
                      {/* Blocked By */}
                      {node.blockedBy && node.blockedBy.length > 0 && (
                        <div className="flex items-center gap-1">
                          <Lock size={8} className="text-orange-400" />
                          <p className="text-[7px] text-orange-400/70">
                            Blocked by: {node.blockedBy.join(", ")}
                          </p>
                        </div>
                      )}
                      
                      {/* Blocks */}
                      {node.blocks && node.blocks.length > 0 && (
                        <div className="flex items-center gap-1">
                          <ArrowRight size={8} className="text-cyan-400" />
                          <p className="text-[7px] text-cyan-400/70">
                            Unlocks: {node.blocks.join(", ")}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {team && !["team-leader", "task", "result"].includes(node.type) && (
                    <div className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-${team.color}-500/10 border border-${team.color}-500/20`}>
                      <team.icon size={9} className={`text-${team.color}-400`} />
                      <span className={`text-[7px] font-black uppercase text-${team.color}-400`}>{team.name}</span>
                    </div>
                  )}
                </div>

                {/* Right: Status Box (Square) with Status + Live Log */}
                <div className="shrink-0 w-[60px] flex flex-col">
                  {/* Status Display */}
                  <div className={`flex-1 rounded-lg ${statusConfig.bg} ${statusConfig.border} border-2 flex flex-col items-center justify-center gap-1 p-1.5`}>
                    <StatusIcon size={18} className={`${statusConfig.color} ${statusConfig.pulse ? 'animate-pulse' : ''}`} />
                    <span className={`text-[7px] font-black uppercase ${statusConfig.color} leading-none text-center`}>
                      {node.status === "running" && "RUN"}
                      {node.status === "completed" && "OK"}
                      {node.status === "pending" && "WAIT"}
                      {node.status === "error" && "ERR"}
                      {node.status === "paused" && "PAUSE"}
                      {node.status === "interrupted" && "STOP"}
                      {node.status === "ai-interrupted" && "AI"}
                    </span>
                    
                    {/* AI 自动中断标识 */}
                    {node.status === "ai-interrupted" && (
                      <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-yellow-500 flex items-center justify-center animate-pulse z-30">
                        <Zap size={10} className="text-black" fill="currentColor" />
                      </div>
                    )}
                    
                    {/* Live Log - Simple Real-time Display */}
                    {node.status === "running" && (
                      <div className="w-full mt-1 pt-1 border-t border-white/10">
                        <div className="flex flex-col gap-0.5">
                          <div className={`h-0.5 w-full rounded-full ${statusConfig.bg} animate-pulse`}></div>
                          <div className={`h-0.5 w-3/4 rounded-full ${statusConfig.bg} animate-pulse`} style={{ animationDelay: '0.2s' }}></div>
                          <div className={`h-0.5 w-1/2 rounded-full ${statusConfig.bg} animate-pulse`} style={{ animationDelay: '0.4s' }}></div>
                        </div>
                      </div>
                    )}
                    
                    {node.status === "completed" && (
                      <div className="text-[6px] text-green-400/60 text-center mt-0.5">
                        ✓ Done
                      </div>
                    )}
                    
                    {node.status === "failed" && (
                      <div className="text-[6px] text-red-400/60 text-center mt-0.5">
                        ✗ Error
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Connection Icon - Left side (when dragging from another node) */}
              {isConnectionTarget && draggingConnection && (
                <div
                  className={`
                    absolute left-0 top-1/2 w-10 h-10 rounded-full shadow-2xl
                    flex items-center justify-center z-30 cursor-pointer
                    ${mode === "adventure" 
                      ? "bg-gradient-to-br from-green-400 to-emerald-600 text-black" 
                      : "bg-gradient-to-br from-green-500 to-emerald-600 text-white"
                    }
                  `}
                  style={{
                    transform: 'translate(-50%, -50%)',
                  }}
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                  }}
                  onMouseUp={(e) => {
                    e.stopPropagation();
                    if (draggingConnection) {
                      handleCreateConnection(draggingConnection.fromNodeId, node.id);
                      setDraggingConnection(null);
                      setIsDraggingPlusButton(false);
                      setPlusButtonStart(null);
                    }
                  }}
                >
                  <Link2 size={20} strokeWidth={3} />
                </div>
              )}

              {/* Add Node Button - Right side of node (Only in Edit mode) */}
              {canEdit && (
                <button
                  className={`
                    absolute right-0 top-1/2 w-8 h-8 rounded-full shadow-lg
                    flex items-center justify-center opacity-0 group-hover:opacity-100
                    cursor-pointer z-20
                    ${mode === "adventure" 
                      ? "bg-gradient-to-br from-yellow-500 to-orange-600 text-black" 
                      : "bg-gradient-to-br from-blue-600 to-indigo-600 text-white"
                    }
                  `}
                style={{
                  transform: 'translate(50%, -50%)',
                  transition: 'opacity 0.2s ease-in-out'
                }}
                onMouseDown={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  // 记录开始位置
                  setPlusButtonStart({ x: e.clientX, y: e.clientY });
                  setIsDraggingPlusButton(true);
                  setDraggingConnection({
                    fromNodeId: node.id,
                    mouseX: node.position.x + NODE_WIDTH,
                    mouseY: node.position.y + NODE_HEIGHT / 2,
                  });
                }}
                onMouseUp={(e) => {
                  e.stopPropagation();
                  
                  // 计算拖动距离
                  if (plusButtonStart) {
                    const dragDistance = Math.sqrt(
                      Math.pow(e.clientX - plusButtonStart.x, 2) + 
                      Math.pow(e.clientY - plusButtonStart.y, 2)
                    );
                    
                    // 如果拖动距离小于5像素，认为是点击
                    if (dragDistance < 5) {
                      console.log('Plus button clicked - adding node after:', node.id);
                      handleAddNodeAfter(node.id);
                      setDraggingConnection(null);
                    }
                    // 否则是拖动，在容器的 onMouseUp 中处理连接
                  }
                  
                  setPlusButtonStart(null);
                  setIsDraggingPlusButton(false);
                }}
              >
                <Plus size={14} strokeWidth={3} />
              </button>
              )}
            </div>
          </motion.div>
        );
      })}

      {/* Removed: Add Node Button from bottom right */}
    </div>
  );

  // Kanban View
  const KanbanView = () => {
    const columns: { key: NodeStatus; label: string }[] = [
      { key: "pending", label: "Pending" },
      { key: "running", label: "Running" },
      { key: "paused", label: "Paused" },
      { key: "completed", label: "Completed" },
      { key: "error", label: "Error" },
      { key: "interrupted", label: "Interrupted" },
    ];

    return (
      <div className="grid grid-cols-3 lg:grid-cols-6 gap-4 h-full">
        {columns.map(col => {
          const statusConfig = getStatusConfig(col.key);
          const colNodes = nodes.filter(n => n.status === col.key);

          return (
            <div key={col.key} className="flex flex-col gap-3">
              <div className="flex justify-between items-center px-2">
                <div className="flex items-center gap-2">
                  <statusConfig.icon size={14} className={statusConfig.color} />
                  <span className="text-xs font-black uppercase text-gray-400">{col.label}</span>
                </div>
                <span className="text-xs font-bold text-gray-500">{colNodes.length}</span>
              </div>
              <div className="flex-1 bg-black/20 rounded-xl p-3 border border-white/5 space-y-3 overflow-y-auto">
                {colNodes.map(node => {
                  const team = mockTeams.find(t => t.id === node.teamId);
                  return (
                    <div
                      key={node.id}
                      onClick={() => setSelectedNodeId(node.id)}
                      className={`
                        p-3 rounded-lg border transition-all cursor-pointer
                        ${selectedNodeId === node.id 
                          ? `ring-2 ring-white/30 ${statusConfig.border}` 
                          : "border-white/5 hover:border-white/20"
                        }
                        ${mode === "adventure" ? "bg-[#22223b]" : "bg-white/5"}
                      `}
                    >
                      <h5 className="text-sm font-bold text-white mb-2">{node.name}</h5>
                      {team && (
                        <div className="flex items-center gap-1.5 text-[10px]">
                          <team.icon size={10} className={`text-${team.color}-400`} />
                          <span className="text-gray-400">{team.name}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // Gantt View
  const GanttView = () => {
    const totalDuration = 100; // 总时长（示例）
    
    return (
      <div className="h-full overflow-auto">
        <div className="min-w-[800px] space-y-3">
          {nodes.map((node, idx) => {
            const team = mockTeams.find(t => t.id === node.teamId);
            const statusConfig = getStatusConfig(node.status);
            const startPercent = (idx * 15) % 80; // 模拟开始时间
            const durationPercent = 15 + (idx % 3) * 5; // 模拟持续时间

            return (
              <div key={node.id} className="flex items-center gap-4">
                {/* Node Info */}
                <div className="w-48 shrink-0">
                  <h5 className="text-sm font-bold text-white truncate">{node.name}</h5>
                  {team && (
                    <div className="flex items-center gap-1 mt-1">
                      <team.icon size={10} className={`text-${team.color}-400`} />
                      <span className="text-[10px] text-gray-400">{team.name}</span>
                    </div>
                  )}
                </div>

                {/* Timeline Bar */}
                <div className="flex-1 h-10 bg-black/20 rounded-lg border border-white/5 relative">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${durationPercent}%` }}
                    className={`
                      absolute h-full rounded-lg ${statusConfig.bg} ${statusConfig.border} border
                      flex items-center justify-center
                    `}
                    style={{ left: `${startPercent}%` }}
                  >
                    <span className="text-[10px] font-bold text-white">{statusConfig.label}</span>
                  </motion.div>
                </div>

                {/* Status */}
                <div className={`w-24 text-center px-2 py-1 rounded ${statusConfig.bg}`}>
                  <statusConfig.icon size={14} className={`${statusConfig.color} mx-auto`} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className={`
          w-full max-w-7xl h-full max-h-[90vh] rounded-3xl overflow-hidden flex flex-col border shadow-2xl relative
          ${mode === "adventure" 
            ? "bg-[#0f0f1a] border-yellow-500/20 shadow-yellow-500/5" 
            : "bg-[#0a0b14] border-white/10 shadow-blue-500/5"
          }
        `}
      >
        {/* Chat Interface Sidebar */}
        <AnimatePresence>
          {isChatOpen && selectedNodeId && (
            <motion.div
              initial={{ x: 400, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 400, opacity: 0 }}
              className={`
                absolute right-0 top-0 bottom-0 w-96 z-[200] border-l p-6 shadow-2xl backdrop-blur-3xl flex flex-col
                ${mode === "adventure" 
                  ? "bg-[#1a1a2e]/98 border-yellow-500/20" 
                  : "bg-[#0f111a]/98 border-white/10"
                }
              `}
            >
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-xl font-black uppercase">Node Chat</h2>
                  <p className="text-xs text-gray-400 mt-1">Interrupt & communicate with this task</p>
                </div>
                <button 
                  onClick={() => setIsChatOpen(false)} 
                  className="p-2 hover:bg-white/10 rounded-xl transition-all"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Chat Messages - Conversation Style */}
              <div className="flex-1 overflow-y-auto space-y-2 mb-4 px-1">
                {getMockRuntimeLogs(selectedNodeId, selectedNode?.status || "pending").map((log, idx) => {
                  // Get agent color based on role
                  const agent = mockAgents.find(a => a.id === log.agentId);
                  const agentColor = agent?.role === "Backend" ? "blue" : 
                                    agent?.role === "Frontend" ? "purple" : 
                                    agent?.role === "Testing" ? "orange" : 
                                    agent?.role === "Documentation" ? "cyan" :
                                    agent?.role === "Team Lead" ? "red" : "blue";
                  
                  // System messages - centered
                  if (log.type === "system") {
                    return (
                      <div key={log.id} className="flex justify-center my-3">
                        <div className="px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 max-w-[85%]">
                          <p className="text-[10px] text-center text-blue-400 font-bold">{log.message}</p>
                          <p className="text-[8px] text-center text-gray-500 mt-0.5">{log.timestamp}</p>
                        </div>
                      </div>
                    );
                  }
                  
                  // Error messages - centered with red theme
                  if (log.type === "error") {
                    return (
                      <div key={log.id} className="flex justify-center my-3">
                        <div className="px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/30 max-w-[85%]">
                          <p className="text-xs text-red-400 font-bold mb-1">{log.agentName}</p>
                          <p className="text-xs text-gray-300 leading-relaxed">{log.message}</p>
                          <p className="text-[8px] text-gray-500 mt-1">{log.timestamp}</p>
                        </div>
                      </div>
                    );
                  }
                  
                  // Success messages - centered with green theme
                  if (log.type === "success") {
                    return (
                      <div key={log.id} className="flex justify-center my-3">
                        <div className="px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 max-w-[85%]">
                          <p className="text-[10px] text-center text-emerald-400 font-bold">{log.message}</p>
                          <p className="text-[8px] text-center text-gray-500 mt-0.5">{log.timestamp}</p>
                        </div>
                      </div>
                    );
                  }
                  
                  // Agent messages - conversation style (left/right based on agent)
                  const isLeftAlign = log.agentId === "a3" || log.agentId === "a4"; // Data Parser, API Tester on left
                  
                  return (
                    <motion.div
                      key={log.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className={`flex ${isLeftAlign ? "justify-start" : "justify-end"} items-end gap-2`}
                      onMouseEnter={() => {
                        if (log.agentId) setActiveAgentIds([log.agentId]);
                        if (log.targetAgentId) setActiveAgentIds(prev => [...prev, log.targetAgentId!]);
                      }}
                      onMouseLeave={() => setActiveAgentIds([])}
                    >
                      {/* Avatar - Left side */}
                      {isLeftAlign && (
                        <div className={`w-7 h-7 rounded-full bg-gradient-to-br from-${agentColor}-500 to-${agentColor}-700 flex items-center justify-center text-white text-[10px] font-black shrink-0`}>
                          {log.agentName?.slice(0, 2).toUpperCase()}
                        </div>
                      )}
                      
                      {/* Message Bubble */}
                      <div className={`max-w-[75%] ${isLeftAlign ? "" : "flex flex-col items-end"}`}>
                        {/* Agent Name & Target */}
                        <div className={`flex items-center gap-1.5 mb-1 ${isLeftAlign ? "" : "flex-row-reverse"}`}>
                          <p className={`text-[10px] font-black text-${agentColor}-400`}>
                            {log.agentName}
                          </p>
                          {log.targetAgentName && (
                            <>
                              <span className="text-[10px] text-gray-600">→</span>
                              <p className="text-[10px] font-bold text-gray-500">
                                {log.targetAgentName}
                              </p>
                            </>
                          )}
                        </div>
                        
                        {/* Message Content */}
                        <div 
                          className={`
                            px-3 py-2 rounded-2xl
                            ${isLeftAlign 
                              ? `bg-${agentColor}-500/10 border border-${agentColor}-500/20 rounded-tl-sm` 
                              : `bg-white/5 border border-white/10 rounded-tr-sm`
                            }
                            ${log.isTyping ? "animate-pulse" : ""}
                          `}
                        >
                          <p className="text-xs text-gray-200 leading-relaxed">{log.message}</p>
                          
                          {log.data && (
                            <div className="mt-2 p-2 bg-black/30 rounded border border-white/5">
                              <pre className="text-[10px] text-gray-400 font-mono">
                                {JSON.stringify(log.data, null, 2)}
                              </pre>
                            </div>
                          )}
                          
                          {log.isTyping && (
                            <div className="flex gap-1 mt-1">
                              <div className="w-1.5 h-1.5 rounded-full bg-gray-500 animate-bounce" style={{ animationDelay: "0ms" }} />
                              <div className="w-1.5 h-1.5 rounded-full bg-gray-500 animate-bounce" style={{ animationDelay: "150ms" }} />
                              <div className="w-1.5 h-1.5 rounded-full bg-gray-500 animate-bounce" style={{ animationDelay: "300ms" }} />
                            </div>
                          )}
                        </div>
                        
                        {/* Timestamp */}
                        <p className={`text-[8px] text-gray-600 mt-1 font-mono ${isLeftAlign ? "" : "text-right"}`}>
                          {log.timestamp}
                        </p>
                      </div>
                      
                      {/* Avatar - Right side */}
                      {!isLeftAlign && (
                        <div className={`w-7 h-7 rounded-full bg-gradient-to-br from-${agentColor}-500 to-${agentColor}-700 flex items-center justify-center text-white text-[10px] font-black shrink-0`}>
                          {log.agentName?.slice(0, 2).toUpperCase()}
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </div>

              {/* Chat Input */}
              <div className="space-y-3">
                <textarea
                  placeholder="Type your message or instruction..."
                  className="w-full h-24 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50 resize-none"
                />
                <div className="flex gap-2">
                  <button className="flex-1 py-2 px-4 bg-gray-600 hover:bg-gray-500 rounded-lg text-xs font-bold transition-all">
                    Resume
                  </button>
                  <button className="flex-1 py-2 px-4 bg-blue-600 hover:bg-blue-500 rounded-lg text-xs font-bold transition-all">
                    Send
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Node Config Sidebar */}
        <AnimatePresence>
          {selectedNodeId && !isChatOpen && (
            <motion.div
              initial={{ x: 400, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 400, opacity: 0 }}
              className={`
                absolute right-0 top-0 bottom-0 w-96 z-[200] border-l p-6 shadow-2xl backdrop-blur-3xl flex flex-col
                ${mode === "adventure" 
                  ? "bg-[#1a1a2e]/98 border-yellow-500/20" 
                  : "bg-[#0f111a]/98 border-white/10"
                }
              `}
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-black uppercase">Node Config</h2>
                <button 
                  onClick={() => setSelectedNodeId(null)} 
                  className="p-2 hover:bg-white/10 rounded-xl"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-6 flex-1 overflow-y-auto">
                {/* Node Name */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-gray-500">Node Name</label>
                  <input
                    value={selectedNode?.name || ""}
                    onChange={e => setNodes(nodes.map(n => 
                      n.id === selectedNodeId ? { ...n, name: e.target.value } : n
                    ))}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500/50"
                  />
                </div>

                {/* Status */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-gray-500">Status</label>
                  <select
                    value={selectedNode?.status || "pending"}
                    onChange={e => setNodes(nodes.map(n => 
                      n.id === selectedNodeId ? { ...n, status: e.target.value as NodeStatus } : n
                    ))}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500/50"
                  >
                    <option value="pending">Pending</option>
                    <option value="running">Running</option>
                    <option value="paused">Paused</option>
                    <option value="completed">Completed</option>
                    <option value="error">Error</option>
                    <option value="interrupted">Interrupted</option>
                    <option value="ai-interrupted">AI Interrupted</option>
                  </select>
                </div>

                {/* Agent Team */}
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase text-gray-500">Agent Team</label>
                  <div className="space-y-2">
                    {mockTeams.map(t => (
                      <button
                        key={t.id}
                        onClick={() => setNodes(nodes.map(n => 
                          n.id === selectedNodeId ? { ...n, teamId: t.id } : n
                        ))}
                        className={`
                          w-full flex items-center justify-between p-3 rounded-xl border transition-all
                          ${selectedNode?.teamId === t.id 
                            ? `bg-${t.color}-600/10 border-${t.color}-600/50 text-${t.color}-400` 
                            : "bg-white/5 border-white/5 text-gray-400 hover:border-white/20"
                          }
                        `}
                      >
                        <div className="flex items-center gap-3">
                          <t.icon size={18} className={`text-${t.color}-500`} />
                          <div className="text-left">
                            <p className="text-sm font-bold text-white">{t.name}</p>
                            <p className="text-[10px] opacity-50">{t.members} Agents</p>
                          </div>
                        </div>
                        {selectedNode?.teamId === t.id && <ShieldCheck size={16} />}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <button
                onClick={() => setSelectedNodeId(null)}
                className={`
                  mt-6 w-full py-3 rounded-xl font-black uppercase text-white shadow-2xl
                  ${mode === "adventure" 
                    ? "bg-gradient-to-r from-yellow-600 to-orange-600" 
                    : "bg-gradient-to-r from-blue-600 to-indigo-600"
                  }
                `}
              >
                Save Config
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Task Config Panel */}
        <AnimatePresence>
          {isTaskConfigOpen && selectedNodeId && selectedNode && (
            <motion.div
              key="task-config"
              initial={{ x: 400, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 400, opacity: 0 }}
              className={`
                absolute right-0 top-0 bottom-0 w-[500px] z-[200] border-l p-6 shadow-2xl backdrop-blur-3xl flex flex-col overflow-y-auto
                ${mode === "adventure" 
                  ? "bg-[#1a1a2e]/98 border-yellow-500/20" 
                  : "bg-[#0f111a]/98 border-white/10"
                }
              `}
            >
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-xl font-black uppercase">
                    {selectedNode.type === "team-leader" ? "Team Lead Config" : "Task Configuration"}
                  </h2>
                  <p className="text-xs text-gray-400 mt-1">
                    {selectedNode.type === "team-leader" 
                      ? "Spawn team and assign tasks" 
                      : "Configure task details and dependencies"}
                  </p>
                </div>
                <button 
                  onClick={() => setIsTaskConfigOpen(false)} 
                  className="p-2 hover:bg-white/10 rounded-xl transition-all"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-6 flex-1">
                {/* Task ID */}
                {selectedNode.type === "task" && (
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-gray-500">Task ID</label>
                    <input
                      value={selectedNode?.taskId || ""}
                      onChange={e => setNodes(nodes.map(n => 
                        n.id === selectedNodeId ? { ...n, taskId: e.target.value } : n
                      ))}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500/50"
                      placeholder="e.g., 1, 2, 3..."
                    />
                  </div>
                )}

                {/* Subject/Name */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-gray-500">
                    {selectedNode.type === "team-leader" ? "Team Name" : "Subject"}
                  </label>
                  <input
                    value={selectedNode?.name || ""}
                    onChange={e => setNodes(nodes.map(n => 
                      n.id === selectedNodeId ? { ...n, name: e.target.value } : n
                    ))}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500/50"
                    placeholder="Brief task title"
                  />
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-gray-500">Description</label>
                  <textarea
                    value={selectedNode?.description || ""}
                    onChange={e => setNodes(nodes.map(n => 
                      n.id === selectedNodeId ? { ...n, description: e.target.value } : n
                    ))}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500/50 min-h-[120px] resize-none"
                    placeholder="Detailed task description..."
                  />
                </div>

                {/* Owner */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-gray-500">Owner (Agent Name)</label>
                  <select
                    value={selectedNode?.owner || ""}
                    onChange={e => setNodes(nodes.map(n => 
                      n.id === selectedNodeId ? { ...n, owner: e.target.value } : n
                    ))}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500/50"
                  >
                    <option value="">Unclaimed</option>
                    {mockAgents.map(agent => (
                      <option key={agent.id} value={agent.name}>
                        {agent.name} ({agent.role})
                      </option>
                    ))}
                  </select>
                </div>

                {selectedNode.type === "task" && (
                  <>
                    {/* Priority */}
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-gray-500">Priority</label>
                      <div className="grid grid-cols-3 gap-2">
                        {(["high", "normal", "low"] as const).map(p => (
                          <button
                            key={p}
                            onClick={() => setNodes(nodes.map(n => 
                              n.id === selectedNodeId ? { ...n, priority: p } : n
                            ))}
                            className={`
                              px-4 py-2 rounded-xl font-bold uppercase text-xs transition-all
                              ${selectedNode?.priority === p
                                ? p === "high" 
                                  ? "bg-red-500/30 border-2 border-red-500 text-red-400"
                                  : p === "normal"
                                  ? "bg-yellow-500/30 border-2 border-yellow-500 text-yellow-400"
                                  : "bg-gray-500/30 border-2 border-gray-500 text-gray-400"
                                : "bg-white/5 border border-white/10 text-gray-500 hover:border-white/30"
                              }
                            `}
                          >
                            {p}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Status */}
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-gray-500">Status</label>
                      <select
                        value={selectedNode?.status || "pending"}
                        onChange={e => setNodes(nodes.map(n => 
                          n.id === selectedNodeId ? { ...n, status: e.target.value as NodeStatus } : n
                        ))}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500/50"
                      >
                        <option value="pending">Pending</option>
                        <option value="running">In Progress</option>
                        <option value="completed">Completed</option>
                        <option value="paused">Paused</option>
                        <option value="failed">Failed</option>
                      </select>
                    </div>

                    {/* Blocks */}
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-gray-500">Blocks (Task IDs)</label>
                      <input
                        value={selectedNode?.blocks?.join(", ") || ""}
                        onChange={e => setNodes(nodes.map(n => 
                          n.id === selectedNodeId ? { 
                            ...n, 
                            blocks: e.target.value.split(",").map(s => s.trim()).filter(Boolean) 
                          } : n
                        ))}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500/50"
                        placeholder="e.g., 2, 3"
                      />
                      <p className="text-[9px] text-gray-500">Comma-separated task IDs this task will unlock</p>
                    </div>

                    {/* Blocked By */}
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-gray-500">Blocked By (Task IDs)</label>
                      <input
                        value={selectedNode?.blockedBy?.join(", ") || ""}
                        onChange={e => setNodes(nodes.map(n => 
                          n.id === selectedNodeId ? { 
                            ...n, 
                            blockedBy: e.target.value.split(",").map(s => s.trim()).filter(Boolean) 
                          } : n
                        ))}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500/50"
                        placeholder="e.g., 1"
                      />
                      <p className="text-[9px] text-gray-500">Comma-separated task IDs blocking this task</p>
                    </div>

                    {/* Metadata - Notes */}
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-gray-500">Notes (Metadata)</label>
                      <textarea
                        value={selectedNode?.metadata?.notes || ""}
                        onChange={e => setNodes(nodes.map(n => 
                          n.id === selectedNodeId ? { 
                            ...n, 
                            metadata: { ...n.metadata, notes: e.target.value }
                          } : n
                        ))}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500/50 min-h-[80px] resize-none"
                        placeholder="Additional notes for the team..."
                      />
                    </div>

                    {/* Created By */}
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-gray-500">Created By</label>
                      <input
                        value={selectedNode?.metadata?.createdBy || "team-lead"}
                        onChange={e => setNodes(nodes.map(n => 
                          n.id === selectedNodeId ? { 
                            ...n, 
                            metadata: { ...n.metadata, createdBy: e.target.value }
                          } : n
                        ))}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500/50"
                        placeholder="team-lead"
                      />
                    </div>
                  </>
                )}

                {/* JSON Preview */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-gray-500">JSON Preview</label>
                  <pre className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-[10px] text-green-400 overflow-x-auto max-h-[300px] overflow-y-auto">
                    {JSON.stringify({
                      id: selectedNode.taskId || selectedNode.id,
                      subject: selectedNode.name,
                      description: selectedNode.description,
                      owner: selectedNode.owner || "",
                      status: selectedNode.status,
                      priority: selectedNode.priority,
                      createdAt: selectedNode.createdAt || new Date().toISOString(),
                      updatedAt: selectedNode.updatedAt || new Date().toISOString(),
                      blocks: selectedNode.blocks || [],
                      blockedBy: selectedNode.blockedBy || [],
                      metadata: {
                        createdBy: selectedNode.metadata?.createdBy || "team-lead",
                        teamName: selectedNode.metadata?.teamName || "feature-launch",
                        notes: selectedNode.metadata?.notes || ""
                      }
                    }, null, 2)}
                  </pre>
                </div>
              </div>

              <button
                onClick={() => setIsTaskConfigOpen(false)}
                className={`
                  mt-6 w-full py-3 rounded-xl font-black uppercase text-white shadow-2xl
                  ${mode === "adventure" 
                    ? "bg-gradient-to-r from-yellow-600 to-orange-600" 
                    : "bg-gradient-to-r from-blue-600 to-indigo-600"
                  }
                `}
              >
                Save Configuration
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Header */}
        <header className={`px-8 py-6 flex items-center justify-between border-b ${mode === "adventure" ? "border-yellow-500/20" : "border-white/5"}`}>
          <div className="flex items-center gap-8">
            <div className="flex flex-col">
              <input
                value={workflowName}
                onChange={e => setWorkflowName(e.target.value)}
                className={`
                  text-2xl font-black bg-transparent border-none outline-none focus:ring-0 p-0
                  ${mode === "adventure" 
                    ? "text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500 italic uppercase" 
                    : "text-white"
                  }
                `}
              />
              <div className="flex items-center gap-4 mt-1 text-[9px] text-gray-500 font-black uppercase tracking-wider">
                <div className="flex items-center gap-1">
                  <Compass size={12} className="text-blue-500" />
                  {nodes.length} Nodes
                </div>
                <div className="flex items-center gap-1">
                  <Users size={12} className="text-purple-500" />
                  {mockTeams.length} Teams
                </div>
              </div>
            </div>

            {/* View Switcher */}
            <div className="flex bg-black/40 p-1 rounded-xl border border-white/5">
              {[
                { key: "flow", icon: GitBranch, label: "Flow" },
                { key: "kanban", icon: Layout, label: "Kanban" },
                { key: "gantt", icon: BarChart3, label: "Gantt" },
              ].map(v => (
                <button
                  key={v.key}
                  onClick={() => setView(v.key as WorkflowView)}
                  className={`
                    px-5 py-2 rounded-lg text-[10px] font-black uppercase transition-all flex items-center gap-2
                    ${view === v.key 
                      ? (mode === "adventure" 
                        ? "bg-yellow-500 text-black shadow-lg" 
                        : "bg-blue-600 text-white shadow-lg"
                      ) 
                      : "text-gray-500 hover:text-white hover:bg-white/5"
                    }
                  `}
                >
                  <v.icon size={14} />
                  {v.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsGenerating(true)}
              disabled={isGenerating || !canEdit}
              className={`
                px-6 py-2 rounded-xl flex items-center gap-2 font-black uppercase text-[10px] transition-all shadow-xl
                ${mode === "adventure" ? "bg-red-600 text-white" : "bg-purple-600 text-white"}
                ${(isGenerating || !canEdit) ? "opacity-50 cursor-not-allowed" : "hover:scale-105"}
              `}
            >
              {isGenerating ? "Generating..." : "AI Orchestrate"}
              <Sparkles size={16} />
            </button>

            <button
              onClick={onClose}
              className="p-2 bg-white/5 hover:bg-white/10 rounded-xl text-gray-400 hover:text-red-500 transition-all"
            >
              <X size={20} />
            </button>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 p-8 overflow-hidden relative">
          {/* 编辑锁定提示条 */}
          {!canEdit && (
            <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-50 px-6 py-3 rounded-xl bg-yellow-500/20 border-2 border-yellow-500/40 backdrop-blur-xl flex items-center gap-3 animate-pulse">
              <Lock size={16} className="text-yellow-400" />
              <span className="text-[11px] font-black uppercase text-yellow-400">
                🔒 Editing Locked - Workflow {workflowState.toUpperCase()}
              </span>
            </div>
          )}
          
          <AnimatePresence mode="wait">
            <motion.div
              key={view}
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="h-full"
            >
              {view === "flow" && <FlowView />}
              {view === "kanban" && <KanbanView />}
              {view === "gantt" && <GanttView />}
            </motion.div>
          </AnimatePresence>
        </main>

        {/* Footer */}
        <footer className={`px-8 py-5 border-t ${mode === "adventure" ? "border-yellow-500/20 bg-black/60" : "border-white/5 bg-black/40"} flex items-center justify-between backdrop-blur-xl`}>
          {/* Left: Status Indicator */}
          <div className="flex items-center gap-3">
            <div className={`px-4 py-2 rounded-xl border ${
              workflowState === "edit" ? "border-blue-500/30 bg-blue-500/10" :
              workflowState === "ready" ? "border-green-500/30 bg-green-500/10" :
              workflowState === "running" ? "border-yellow-500/30 bg-yellow-500/10 animate-pulse" :
              workflowState === "paused" ? "border-orange-500/30 bg-orange-500/10" :
              workflowState === "stopped" ? "border-gray-500/30 bg-gray-500/10" :
              workflowState === "completed" ? "border-green-500/30 bg-green-500/10" :
              "border-red-500/30 bg-red-500/10"
            }`}>
              <span className={`text-[10px] font-black uppercase ${
                workflowState === "edit" ? "text-blue-400" :
                workflowState === "ready" ? "text-green-400" :
                workflowState === "running" ? "text-yellow-400" :
                workflowState === "paused" ? "text-orange-400" :
                workflowState === "stopped" ? "text-gray-400" :
                workflowState === "completed" ? "text-green-400" :
                "text-red-400"
              }`}>
                📊 Status: {workflowState.toUpperCase()}
              </span>
            </div>
            
            {/* Execution Time */}
            {executionStartTime && workflowState === "running" && (
              <div className="px-3 py-1 rounded-lg bg-white/5 border border-white/10">
                <span className="text-[9px] text-gray-400">
                  ⏱️ {elapsedTime}s
                </span>
              </div>
            )}
          </div>

          {/* Right: Control Buttons */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-6 py-2 rounded-xl border border-white/10 text-[10px] font-black uppercase text-gray-500 hover:text-white transition-all"
            >
              Close
            </button>
            
            {/* 智能单按钮 - 根据状态变化 */}
            {workflowState === "edit" && (
              <button
                onClick={handleLockAndReady}
                className="px-8 py-2 rounded-xl text-[10px] font-black uppercase text-white shadow-2xl flex items-center gap-2 bg-gradient-to-r from-blue-600 to-cyan-600 hover:scale-105 transition-all"
              >
                <Lock size={16} />
                Lock & Ready
              </button>
            )}

            {workflowState === "ready" && (
              <button
                onClick={handleLaunch}
                className="px-8 py-2 rounded-xl text-[10px] font-black uppercase text-white shadow-2xl flex items-center gap-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:scale-105 transition-all animate-pulse"
              >
                <Play size={18} fill="currentColor" />
                Launch Pipeline
              </button>
            )}

            {workflowState === "running" && (
              <div className="flex gap-2">
                <button
                  onClick={handlePause}
                  className="px-6 py-2 rounded-xl text-[10px] font-black uppercase text-white shadow-2xl flex items-center gap-2 bg-gradient-to-r from-yellow-600 to-orange-600 hover:scale-105 transition-all"
                >
                  <Pause size={16} />
                  Pause
                </button>
                <button
                  onClick={handleStop}
                  className="px-6 py-2 rounded-xl text-[10px] font-black uppercase text-white shadow-2xl flex items-center gap-2 bg-gradient-to-r from-red-600 to-rose-600 hover:scale-105 transition-all"
                >
                  <Ban size={16} />
                  Stop
                </button>
              </div>
            )}

            {workflowState === "paused" && (
              <div className="flex gap-2">
                <button
                  onClick={handleResume}
                  className="px-6 py-2 rounded-xl text-[10px] font-black uppercase text-white shadow-2xl flex items-center gap-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:scale-105 transition-all"
                >
                  <Play size={16} />
                  Resume
                </button>
                <button
                  onClick={handleStop}
                  className="px-6 py-2 rounded-xl text-[10px] font-black uppercase text-white shadow-2xl flex items-center gap-2 bg-gradient-to-r from-red-600 to-rose-600 hover:scale-105 transition-all"
                >
                  <Ban size={16} />
                  Stop
                </button>
              </div>
            )}

            {(workflowState === "stopped" || workflowState === "completed" || workflowState === "failed") && (
              <div className="flex gap-2">
                <button
                  onClick={handleEdit}
                  className="px-6 py-2 rounded-xl text-[10px] font-black uppercase text-white shadow-2xl flex items-center gap-2 bg-gradient-to-r from-blue-600 to-cyan-600 hover:scale-105 transition-all"
                >
                  <Layout size={16} />
                  Edit
                </button>
                <button
                  onClick={handleLaunch}
                  className="px-6 py-2 rounded-xl text-[10px] font-black uppercase text-white shadow-2xl flex items-center gap-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:scale-105 transition-all"
                >
                  <Play size={16} />
                  Run Again
                </button>
              </div>
            )}
          </div>
        </footer>
      </motion.div>
    </div>
  );
};