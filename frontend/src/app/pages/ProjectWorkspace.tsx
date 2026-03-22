/**
 * Workspace：iframe 预览、启停、底栏 Tab、Agent 侧栏、日志占位。
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useParams, useSearchParams, useNavigate } from "react-router";
import { getAgentAvatarUrl } from "../../imports/avatars";
import {
  ArrowLeft,
  ExternalLink,
  PanelRightOpen,
  Play,
  Square,
  RotateCcw,
  ScrollText,
  Wrench,
  Settings,
  Users,
  RefreshCw,
  Camera,
  Bot,
  Loader2,
  Sparkles,
  Tag,
} from "lucide-react";
import { Led, MechButton } from "../components/ui/SkeuoUI";
import { useNotifications } from "../contexts/NotificationContext";
import { useProjectWorkspaceStatus } from "../hooks/useProjectWorkspaceStatus";
import * as projectsApi from "../../lib/api/services/projects";
import type { ProjectRecord } from "../../lib/api/services/projects";
import { agentsApi } from "../../lib/api/services/agents";
import type { Agent } from "../../lib/api/types";
import { MessageBubble } from "../components/agent-test/MessageBubble";
import type { ChatMessage } from "../components/agent-test/types";
import '../../styles/markdown.css';

type FrameTab = "local" | "remote";

export default function ProjectWorkspace() {
  const { id } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const { addNotification } = useNotifications();
  const navigate = useNavigate();

  const numericId = id ? parseInt(id, 10) : NaN;
  const generate = searchParams.get("generate") === "1";

  const [project, setProject] = useState<ProjectRecord | null>(null);
  const [loadingProject, setLoadingProject] = useState(true);
  const [remoteUrl, setRemoteUrl] = useState<string | null>(null);
  const [allProjects, setAllProjects] = useState<ProjectRecord[]>([]);
  const [frameTab, setFrameTab] = useState<FrameTab>("local");
  const [collabOpen, setCollabOpen] = useState(generate);
  const [agentDraft, setAgentDraft] = useState("");
  const [agentBusy, setAgentBusy] = useState(false);
  const [logs, setLogs] = useState<{ lines: string[]; note?: string } | null>(null);
  const [logsOpen, setLogsOpen] = useState(false);
  const [actionBusy, setActionBusy] = useState<string | null>(null);
  const [workspaceConfig, setWorkspaceConfig] = useState<{
    frontend_entry?: string;
    start_command?: string;
    framework?: string;
    scanned?: boolean;
  } | null>(null);

  const [iframeBlocked, setIframeBlocked] = useState(false);
  const iframeBlockedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const iframeLoadedRef = useRef(false);
  const [iframeSrc, setIframeSrc] = useState<string | null>(null);
  const genInitRef = useRef(false);

  // 对话状态
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Agent 详情状态
  const [agentDetail, setAgentDetail] = useState<Agent | null>(null);
  const [loadingAgent, setLoadingAgent] = useState(false);

  // 处理发送消息
  const handleSendMessage = useCallback(async () => {
    if (!inputMessage.trim() || !project?.agent_id || isStreaming) return;
    
    const userMessage = inputMessage.trim();
    setInputMessage("");
    setMessages(prev => [...prev, {
      id: `user-${Date.now()}`,
      role: 'user',
      content: userMessage,
      timestamp: new Date().toISOString(),
    }]);
    setIsStreaming(true);

    // 添加一个占位 agent 消息用于流式更新
    setMessages(prev => [...prev, {
      id: `agent-${Date.now()}`,
      role: 'agent',
      content: '⏳ 正在连接...',
      timestamp: new Date().toISOString(),
      status: 'sending',
    }]);
    
    try {
      const response = await fetch(
        `/api/agents/${project.agent_id}/test-stream?prompt=${encodeURIComponent(userMessage)}`,
        {
          method: 'POST',
          headers: {
            'Accept': 'text/event-stream',
          },
        }
      );
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      
      if (!reader) {
        throw new Error('无法读取响应流');
      }
      
      let buffer = '';
      let assistantContent = '';
      
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              
              if (data.type === 'chunk' && data.text) {
                // 流式更新 agent 消息
                assistantContent += data.text;
                setMessages(prev => {
                  const newMessages = [...prev];
                  const last = newMessages[newMessages.length - 1];
                  newMessages[newMessages.length - 1] = { ...last, content: assistantContent };
                  return newMessages;
                });
              } else if (data.type === 'log' && data.message) {
                // 进度日志：累积追加，MessageBubble 自动折叠超过 5 行的内容
                if (!assistantContent) {
                  setMessages(prev => {
                    const newMessages = [...prev];
                    const last = newMessages[newMessages.length - 1];
                    const newContent = last.content === '⏳ 正在连接...'
                      ? data.message
                      : last.content + '\n' + data.message;
                    newMessages[newMessages.length - 1] = { ...last, content: newContent };
                    return newMessages;
                  });
                }
              } else if (data.type === 'complete') {
                // 完成：读取 AI 最终输出并渲染 Markdown
                if (data.data?.output) {
                  assistantContent = data.data.output;
                  setMessages(prev => {
                    const newMessages = [...prev];
                    const last = newMessages[newMessages.length - 1];
                    newMessages[newMessages.length - 1] = {
                      ...last,
                      content: assistantContent,
                      status: 'success',
                    };
                    return newMessages;
                  });
                } else if (data.data?.success === false) {
                  setMessages(prev => {
                    const newMessages = [...prev];
                    const last = newMessages[newMessages.length - 1];
                    newMessages[newMessages.length - 1] = {
                      ...last,
                      content: `执行失败: ${data.data?.output || '未知错误'}`,
                      status: 'error',
                    };
                    return newMessages;
                  });
                }
                console.log('Stream complete:', data.data);
              } else if (data.type === 'error') {
                // 错误
                setMessages(prev => {
                  const newMessages = [...prev];
                  const last = newMessages[newMessages.length - 1];
                  newMessages[newMessages.length - 1] = {
                    ...last,
                    content: `错误: ${data.message}`,
                    status: 'error',
                  };
                  return newMessages;
                });
              }
            } catch (e) {
              console.error('解析 SSE 消息失败:', e);
            }
          }
        }
      }
    } catch (error) {
      console.error('发送消息失败:', error);
      addNotification({
        type: 'error',
        title: '对话失败',
        message: error instanceof Error ? error.message : String(error),
      });
      
      // 移除失败的 assistant 消息
      setMessages(prev => prev.slice(0, -1));
    } finally {
      setIsStreaming(false);
    }
  }, [inputMessage, project?.agent_id, isStreaming, addNotification]);

  // 获取 Agent 详情
  useEffect(() => {
    if (project?.agent_id) {
      setLoadingAgent(true);
      agentsApi.get(project.agent_id)
        .then(setAgentDetail)
        .catch(err => {
          console.error('Failed to load agent:', err);
          setAgentDetail(null);
        })
        .finally(() => setLoadingAgent(false));
    } else {
      setAgentDetail(null);
    }
  }, [project?.agent_id]);

  // 自动滚动到消息底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // iframeSrc 变化时重置阻断状态，并启动超时检测
  useEffect(() => {
    setIframeBlocked(false);
    iframeLoadedRef.current = false;
    if (iframeBlockedTimerRef.current) clearTimeout(iframeBlockedTimerRef.current);
    if (iframeSrc) {
      iframeBlockedTimerRef.current = setTimeout(() => {
        // 只有 onLoad 从未触发过才显示阻断提示
        if (!iframeLoadedRef.current) setIframeBlocked(true);
      }, 5000);
    }
    return () => {
      if (iframeBlockedTimerRef.current) clearTimeout(iframeBlockedTimerRef.current);
    };
  }, [iframeSrc]);

  useEffect(() => {
    genInitRef.current = false;
  }, [numericId]);

  const { status, refresh } = useProjectWorkspaceStatus(Number.isNaN(numericId) ? null : numericId, {
    enabled: !Number.isNaN(numericId),
  });

  const loadProject = useCallback(async () => {
    if (Number.isNaN(numericId)) return;
    setLoadingProject(true);
    try {
      const p = await projectsApi.getProject(numericId);
      setProject(p);
    } catch (e) {
      addNotification({
        type: "error",
        title: "项目",
        message: e instanceof Error ? e.message : String(e),
      });
      setProject(null);
    } finally {
      setLoadingProject(false);
    }
  }, [numericId, addNotification]);

  useEffect(() => {
    void loadProject();
  }, [loadProject]);

  // 加载所有项目（用于底部 Tab 切换）
  useEffect(() => {
    void (async () => {
      try {
        const res = await projectsApi.listProjects({ limit: 20 });
        setAllProjects(res.items);
      } catch {
        setAllProjects([]);
      }
    })();
  }, []);

  /** 设计文档：从列表「生成」进入时展开协作并生成 web/ 骨架 */
  useEffect(() => {
    if (!generate || !project || genInitRef.current) return;
    if (project.has_workspace) {
      setSearchParams({}, { replace: true });
      return;
    }
    genInitRef.current = true;
    void (async () => {
      try {
        const r = await projectsApi.initWorkspace(project.id);
        addNotification({ type: "success", title: "Workspace", message: r.message });
        await loadProject();
        setCollabOpen(true);
      } catch (e) {
        addNotification({
          type: "error",
          title: "生成 web/ 失败",
          message: e instanceof Error ? e.message : String(e),
        });
      } finally {
        setSearchParams({}, { replace: true });
      }
    })();
  }, [generate, project, loadProject, addNotification, setSearchParams]);

  useEffect(() => {
    if (!project) return;
    void (async () => {
      try {
        const c = await projectsApi.getProjectConfig(project.id);
        const ws = c.workspace as Record<string, unknown> | undefined;
        const u = ws?.url;
        setRemoteUrl(typeof u === "string" ? u : null);
        // 保存 workspace 配置
        if (ws) {
          setWorkspaceConfig({
            frontend_entry: ws.frontend_entry as string | undefined,
            start_command: ws.start_command as string | undefined,
            framework: ws.framework as string | undefined,
            scanned: ws.scanned as boolean | undefined,
          });
        }
      } catch {
        setRemoteUrl(null);
        setWorkspaceConfig(null);
      }
    })();
  }, [project?.id]);

  useEffect(() => {
    if (!collabOpen || Number.isNaN(numericId)) return;
    void (async () => {
      setAgentBusy(true);
      try {
        const r = await projectsApi.getProjectAgent(numericId);
        setAgentDraft(r.content ?? "");
      } catch {
        setAgentDraft("");
      } finally {
        setAgentBusy(false);
      }
    })();
  }, [collabOpen, numericId]);

  const metaWorkspaceUrl = project?.meta?.workspace_url as string | undefined;
  // file:// URL 转换为后端 localfs 代理地址，使 iframe 可以加载本地文件
  const resolvedMetaUrl = metaWorkspaceUrl?.startsWith("file://")
    ? `/api/localfs${metaWorkspaceUrl.slice("file://".length)}`
    : metaWorkspaceUrl;

  const computedIframeSrc =
    frameTab === "remote" && remoteUrl
      ? remoteUrl
      : resolvedMetaUrl
        ? resolvedMetaUrl
        : status?.url && status.running
          ? status.url
          : null;

  // 用 state 稳定 iframeSrc，避免 status 轮询导致值频繁变化重启计时器
  useEffect(() => {
    setIframeSrc((prev) => (prev === computedIframeSrc ? prev : computedIframeSrc));
  }, [computedIframeSrc]);

  const ledStatus =
    status?.phase === "error" || status?.health === "unhealthy"
      ? "red"
      : status?.running && status?.health === "healthy"
        ? "green"
        : status?.running
          ? "yellow"
          : "gray";

  const onStart = async () => {
    if (Number.isNaN(numericId)) return;
    setActionBusy("start");
    try {
      await projectsApi.startWorkspace(numericId);
      await refresh();
      addNotification({ type: "success", title: "Workspace", message: "已启动开发服务（若首次请在 web/ 执行 npm install）" });
    } catch (e) {
      addNotification({
        type: "error",
        title: "启动失败",
        message: e instanceof Error ? e.message : String(e),
      });
    } finally {
      setActionBusy(null);
    }
  };

  const onStop = async () => {
    if (Number.isNaN(numericId)) return;
    setActionBusy("stop");
    try {
      await projectsApi.stopWorkspace(numericId);
      await refresh();
    } catch (e) {
      addNotification({
        type: "error",
        title: "停止失败",
        message: e instanceof Error ? e.message : String(e),
      });
    } finally {
      setActionBusy(null);
    }
  };

  const onRestart = async () => {
    if (Number.isNaN(numericId)) return;
    setActionBusy("restart");
    try {
      await projectsApi.restartWorkspace(numericId);
      await refresh();
    } catch (e) {
      addNotification({
        type: "error",
        title: "重启失败",
        message: e instanceof Error ? e.message : String(e),
      });
    } finally {
      setActionBusy(null);
    }
  };

  const onSaveAgent = async () => {
    if (Number.isNaN(numericId)) return;
    setAgentBusy(true);
    try {
      await projectsApi.putProjectAgent(numericId, agentDraft);
      addNotification({ type: "success", title: "Agent", message: "已保存" });
      await loadProject();
    } catch (e) {
      addNotification({
        type: "error",
        title: "保存失败",
        message: e instanceof Error ? e.message : String(e),
      });
    } finally {
      setAgentBusy(false);
    }
  };

  const onFetchLogs = async () => {
    if (Number.isNaN(numericId)) return;
    try {
      const l = await projectsApi.getWorkspaceLogs(numericId);
      setLogs(l);
      setLogsOpen(true);
    } catch (e) {
      addNotification({
        type: "error",
        title: "日志",
        message: e instanceof Error ? e.message : String(e),
      });
    }
  };

  const onInitWeb = async () => {
    if (!project) return;
    try {
      const r = await projectsApi.initWorkspace(project.id);
      addNotification({ type: "success", title: "Workspace", message: r.message });
      await loadProject();
    } catch (e) {
      addNotification({
        type: "error",
        title: "生成失败",
        message: e instanceof Error ? e.message : String(e),
      });
    }
  };

  const onRescan = async () => {
    if (Number.isNaN(numericId)) return;
    setActionBusy("rescan");
    try {
      const result = await projectsApi.scanProjectStructure(numericId);
      if (result.success) {
        setWorkspaceConfig({
          frontend_entry: result.workspace_config.frontend_entry ?? undefined,
          start_command: result.workspace_config.start_command ?? undefined,
          framework: result.workspace_config.framework ?? undefined,
          scanned: result.workspace_config.scanned,
        });
        addNotification({ type: "success", title: "扫描", message: "项目结构扫描完成" });
      } else {
        addNotification({ type: "error", title: "扫描", message: result.message || "扫描失败" });
      }
    } catch (e) {
      addNotification({
        type: "error",
        title: "扫描失败",
        message: e instanceof Error ? e.message : String(e),
      });
    } finally {
      setActionBusy(null);
    }
  };

  const onScreenshot = async () => {
    if (Number.isNaN(numericId)) return;
    setActionBusy("screenshot");
    try {
      const result = await projectsApi.captureScreenshot(numericId);
      if (result.success) {
        addNotification({ type: "success", title: "截图", message: "缩略图已更新" });
      } else {
        addNotification({ type: "warning", title: "截图", message: result.message || "截图失败" });
      }
    } catch (e) {
      addNotification({
        type: "error",
        title: "截图失败",
        message: e instanceof Error ? e.message : String(e),
      });
    } finally {
      setActionBusy(null);
    }
  };

  if (Number.isNaN(numericId)) {
    return <div className="p-6 text-red-400 text-sm font-mono">无效的项目 ID</div>;
  }

  // Agent 头像组件
  const AgentAvatar = ({ agent }: { agent: Agent | null }) => {
    const name = agent?.name || 'Workspace Agent';
    const agentId = agent?.id || 0;
    
    return (
      <div
        className="w-6 h-6 rounded-lg overflow-hidden flex-shrink-0 cursor-help border border-white/10"
        title={name}
      >
        <img
          src={getAgentAvatarUrl(agentId, name)}
          alt={name}
          className="w-full h-full object-cover"
        />
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col bg-[#0f111a]">
      {/* 顶部状态栏 */}
      <div className="shrink-0 flex items-center justify-between px-4 py-2 border-b border-white/10 bg-[#0f111a]/95 backdrop-blur-sm">
        {/* 左侧：项目信息 */}
        <div className="flex items-center gap-3 min-w-0">
          <Link to="/projects" className="text-gray-400 hover:text-white transition-colors shrink-0">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <h1 className="text-sm font-bold text-white truncate">{project?.name || "加载中..."}</h1>
          <Led status={ledStatus} />
          {status?.port != null && (
            <span className="text-xs text-gray-500 shrink-0">
              :{status.port}
            </span>
          )}
          {/* 框架和配置信息 */}
          {workspaceConfig?.framework && (
            <span className="text-xs text-indigo-400 bg-indigo-500/20 px-1.5 py-0.5 rounded shrink-0">
              {workspaceConfig.framework}
            </span>
          )}
          {workspaceConfig?.frontend_entry && (
            <span className="text-xs text-gray-500 shrink-0" title="前端入口目录">
              {workspaceConfig.frontend_entry || "根目录"}/
            </span>
          )}
          {(iframeSrc || metaWorkspaceUrl) && (
            <a
              href={metaWorkspaceUrl || iframeSrc}
              target="_blank"
              rel="noreferrer"
              className="text-indigo-400 hover:text-indigo-300 shrink-0"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
        </div>

        {/* 右侧：操作按钮 */}
        <div className="flex items-center gap-2 shrink-0">
          <MechButton
            variant="secondary"
            className="text-xs h-7 px-2"
            disabled={!!actionBusy}
            onClick={() => void onStart()}
          >
            <Play className="w-3 h-3" />
          </MechButton>
          <MechButton
            variant="secondary"
            className="text-xs h-7 px-2"
            disabled={!!actionBusy}
            onClick={() => void onStop()}
          >
            <Square className="w-3 h-3" />
          </MechButton>
          <MechButton
            variant="secondary"
            className="text-xs h-7 px-2"
            disabled={!!actionBusy}
            onClick={() => void onRestart()}
          >
            <RotateCcw className="w-3 h-3" />
          </MechButton>
          <MechButton variant="secondary" className="text-xs h-7 px-2" onClick={() => void onFetchLogs()}>
            <ScrollText className="w-3 h-3" />
          </MechButton>
          <MechButton
            variant="secondary"
            className="text-xs h-7 px-2"
            disabled={actionBusy === "rescan"}
            onClick={() => void onRescan()}
            title="重新扫描项目结构"
          >
            <RefreshCw className={`w-3 h-3 ${actionBusy === "rescan" ? "animate-spin" : ""}`} />
          </MechButton>
          {status?.running && (
            <MechButton
              variant="secondary"
              className="text-xs h-7 px-2"
              disabled={actionBusy === "screenshot"}
              onClick={() => void onScreenshot()}
              title="截取缩略图"
            >
              <Camera className="w-3 h-3" />
            </MechButton>
          )}
          {project && !project.has_workspace && (
            <MechButton variant="secondary" className="text-xs h-7 px-2" onClick={() => void onInitWeb()}>
              <Wrench className="w-3 h-3" />
            </MechButton>
          )}
          <button
            type="button"
            className={`p-1.5 rounded-md border transition-colors ${
              project?.agent_id
                ? collabOpen
                  ? 'border-indigo-500 bg-indigo-500/10 text-indigo-400'
                  : 'border-indigo-500/50 text-indigo-400 hover:border-indigo-500 hover:bg-indigo-500/5'
                : 'border-white/10 text-gray-400 opacity-50 cursor-not-allowed'
            }`}
            onClick={() => {
              if (project?.agent_id) {
                setCollabOpen(v => !v);
              } else {
                addNotification({
                  type: "warning",
                  title: "未绑定 Agent",
                  message: "该项目尚未绑定 Workspace Agent",
                });
              }
            }}
            title={project?.agent_id ? (collabOpen ? "关闭 Agent 对话" : "打开 Agent 对话") : "未绑定 Agent"}
            disabled={!project?.agent_id}
          >
            <Bot className="w-4 h-4" />
          </button>
          <Link
            to={`/projects/${numericId}`}
            className="p-1.5 rounded-md border border-white/10 text-gray-400 hover:text-indigo-400 hover:border-indigo-500/50 transition-colors"
            title="设置"
          >
            <Settings className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* 中间内容区（iframe + 可选 Agent 侧栏） */}
      <div className="flex-1 flex min-h-0">
        {/* iframe 填充整个内容区域 */}
        <div className="flex-1 min-h-0 bg-black">
          {loadingProject ? (
            <div className="h-full flex items-center justify-center text-gray-500 text-sm font-mono">
              加载项目…
            </div>
          ) : iframeSrc ? (
            <>
              <iframe
                key={iframeSrc}
                title="workspace"
                src={iframeSrc}
                className="w-full h-full border-0"
                onLoad={() => {
                  iframeLoadedRef.current = true;
                  if (iframeBlockedTimerRef.current) clearTimeout(iframeBlockedTimerRef.current);
                  setIframeBlocked(false);
                }}
              />
              {/* iframe 被安全策略阻止时才显示提示 */}
              {iframeBlocked && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="bg-black/80 backdrop-blur-sm p-8 rounded-xl border border-white/10 pointer-events-auto max-w-md">
                  <div className="text-center space-y-4">
                    <div className="text-yellow-400 text-sm font-mono">
                      ⚠️ 目标服务器配置了安全策略，禁止 iframe 嵌入
                    </div>
                    <div className="text-gray-400 text-xs font-mono">
                      服务器响应头包含 X-Frame-Options: DENY
                    </div>
                    <MechButton
                      variant="primary"
                      className="w-full"
                      onClick={() => window.open(iframeSrc, '_blank')}
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      在新窗口打开
                    </MechButton>
                  </div>
                </div>
              </div>
              )}
            </>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-gray-500 text-sm font-mono px-6 text-center gap-3">
              <p>
                {project?.has_workspace
                  ? "开发服务未运行或仍在启动。请点击「启动」，并确保已在 web/ 目录执行 npm install。"
                  : "尚未生成 web/ 模块。请在设置页或点击「生成 web/」。"}
              </p>
              {status?.last_error && (
                <p className="text-red-400/80 text-xs max-w-md break-all">{status.last_error}</p>
              )}
            </div>
          )}
        </div>

        {/* Agent 侧边栏 */}
        {collabOpen && project?.agent_id && (
          <div className="w-96 shrink-0 border-l border-white/10 bg-[#0f111a] flex flex-col">
            {/* 头部 */}
            {loadingAgent ? (
              <div className="px-4 py-3 border-b border-white/10 flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg flex items-center justify-center bg-indigo-500/20 flex-shrink-0">
                  <Loader2 className="w-3.5 h-3.5 text-indigo-400 animate-spin" />
                </div>
                <div className="text-xs text-gray-400">加载中...</div>
              </div>
            ) : (
              <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between gap-2">
                {/* 左侧：Agent头像 + 信息（紧凑显示） */}
                <div className="flex items-center gap-2 min-w-0">
                  {/* Agent 头像（hover 显示名称） */}
                  <AgentAvatar agent={agentDetail} />
                  
                  {/* 模型信息（紧凑显示） */}
                  <div className="flex items-center gap-1 text-xs text-gray-400 flex-shrink-0">
                    <Sparkles className="w-3 h-3" />
                    <span>
                      {(() => {
                        const model = agentDetail?.resolved_model || agentDetail?.model || 'sonnet';
                        return model === 'opus' ? 'Opus' :
                               model === 'sonnet' ? 'Sonnet' : 
                               model === 'haiku' ? 'Haiku' : 
                               model.charAt(0).toUpperCase() + model.slice(1);
                      })()}
                    </span>
                  </div>
                  
                  {/* 分隔符 */}
                  <div className="w-px h-3 bg-white/10 flex-shrink-0" />
                  
                  {/* 作用域信息（紧凑显示） */}
                  <div className="flex items-center gap-1 text-xs text-gray-400 flex-shrink-0">
                    <Tag className="w-3 h-3" />
                    <span>
                      {agentDetail?.scope === 'project' ? '项目' :
                       agentDetail?.scope === 'user' ? '用户' :
                       agentDetail?.scope === 'builtin' ? '内置' :
                       agentDetail?.scope === 'plugin' ? '插件' : '-'}
                    </span>
                  </div>
                </div>
                
                {/* 右侧：编辑按钮 */}
                <button
                  onClick={() => navigate(`/agents/${project?.agent_id}`)}
                  className="p-1 rounded hover:bg-white/5 text-gray-400 hover:text-gray-200 flex-shrink-0"
                  title="编辑 Agent"
                >
                  <Settings className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
            
            {/* 消息列表 */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 ? (
                <div className="h-full flex items-center justify-center text-gray-500 text-sm text-center">
                  <div>
                    <Bot className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>开始与 Workspace Agent 对话</p>
                    <p className="text-xs mt-1">输入指令来操作项目</p>
                  </div>
                </div>
              ) : (
                <>
                  {messages.map((msg) => (
                    <MessageBubble key={msg.id} message={msg} />
                  ))}
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>
            
            {/* 输入框 */}
            <div className="p-3 border-t border-white/10">
              <div className="flex gap-2">
                <input
                  type="text"
                  className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-indigo-500/50"
                  placeholder={isStreaming ? "AI 正在回复..." : "输入消息..."}
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      void handleSendMessage();
                    }
                  }}
                  disabled={isStreaming}
                />
                <MechButton
                  variant="primary"
                  className="px-3 py-2"
                  disabled={!inputMessage.trim() || isStreaming}
                  onClick={() => void handleSendMessage()}
                >
                  {isStreaming ? <Loader2 className="w-4 h-4 animate-spin" /> : "发送"}
                </MechButton>
              </div>
              <div className="mt-2 text-xs text-gray-500">
                按 Enter 发送，Shift+Enter 换行
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 日志面板（浮动） */}
      {logsOpen && logs && (
        <div className="absolute bottom-14 left-4 right-4 bg-[#0f111a]/95 border border-white/10 rounded-lg p-3 max-h-40 overflow-y-auto backdrop-blur-sm">
          <div className="flex justify-between items-center mb-2 text-gray-400 text-xs font-mono">
            <span>Workspace 日志</span>
            <button type="button" className="text-gray-500 hover:text-white" onClick={() => setLogsOpen(false)}>
              关闭
            </button>
          </div>
          {logs.note && <p className="text-gray-500 mb-2 text-xs">{logs.note}</p>}
          {logs.lines.length === 0 ? (
            <p className="text-gray-500 text-xs">暂无日志</p>
          ) : (
            <pre className="whitespace-pre-wrap text-gray-300 text-xs">{logs.lines.join("\n")}</pre>
          )}
        </div>
      )}

      {/* 底部项目切换 Tab */}
      <div className="shrink-0 h-11 flex items-end px-4 gap-1 bg-transparent border-t border-white/10 overflow-x-auto">
        {allProjects
          .filter((p) => p.meta?.workspace_url || p.has_workspace)
          .slice(0, 6)
          .map((p) => {
            const isActive = p.id === numericId;
            return (
              <Link
                key={p.id}
                to={`/projects/${p.id}/workspace`}
                className={`px-4 py-2 rounded-t-lg border-x border-t border-b-0 text-xs font-bold truncate max-w-[160px] transition-colors ${
                  isActive
                    ? "bg-[#1a1d2e] border-indigo-500/50 text-white"
                    : "border-white/10 text-gray-500 hover:text-white hover:bg-[#1a1d2e]"
                }`}
              >
                {p.name}
              </Link>
            );
          })}
      </div>
    </div>
  );
}
