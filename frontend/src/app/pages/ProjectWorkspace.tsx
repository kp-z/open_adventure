/**
 * Workspace：iframe 预览、启停、底栏 Tab、Agent 侧栏、日志占位。
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router";
import {
  ArrowLeft,
  ExternalLink,
  PanelRightOpen,
  PanelRightClose,
  Play,
  Square,
  RotateCcw,
  ScrollText,
  Wrench,
  Settings,
  Users,
  RefreshCw,
  Camera,
} from "lucide-react";
import { Led, MechButton } from "../components/ui/SkeuoUI";
import { useNotifications } from "../contexts/NotificationContext";
import { useProjectWorkspaceStatus } from "../hooks/useProjectWorkspaceStatus";
import * as projectsApi from "../../lib/api/services/projects";
import type { ProjectRecord } from "../../lib/api/services/projects";

type FrameTab = "local" | "remote";

export default function ProjectWorkspace() {
  const { id } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const { addNotification } = useNotifications();

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

  const genInitRef = useRef(false);

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

  const iframeSrc =
    frameTab === "remote" && remoteUrl
      ? remoteUrl
      : status?.url && status.running
        ? status.url
        : null;

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

  return (
    <div className="h-full flex flex-col bg-[#0f111a] -m-4 md:-m-8">
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
          {iframeSrc && (
            <a
              href={iframeSrc}
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
            className="p-1.5 rounded-md border border-white/10 text-gray-400 hover:text-indigo-400 hover:border-indigo-500/50 transition-colors"
            onClick={() => setCollabOpen((v) => !v)}
            title="Agent"
          >
            {collabOpen ? <PanelRightClose className="w-4 h-4" /> : <Users className="w-4 h-4" />}
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
            <iframe title="workspace" src={iframeSrc} className="w-full h-full border-0" />
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
        {collabOpen && (
          <div className="w-80 shrink-0 border-l border-white/10 bg-[#0f111a] flex flex-col">
            <div className="px-4 py-3 border-b border-white/10">
              <div className="text-xs text-gray-400 font-mono uppercase tracking-wider">
                Agent · agent.md
              </div>
            </div>
            <textarea
              className="flex-1 bg-transparent text-gray-200 text-xs font-mono p-4 focus:outline-none resize-none"
              value={agentDraft}
              onChange={(e) => setAgentDraft(e.target.value)}
              disabled={agentBusy}
              spellCheck={false}
              placeholder="输入 Agent 配置..."
            />
            <div className="p-3 border-t border-white/10">
              <MechButton
                variant="primary"
                className="text-xs w-full"
                disabled={agentBusy}
                onClick={() => void onSaveAgent()}
              >
                {agentBusy ? "保存中…" : "保存"}
              </MechButton>
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
      <div className="shrink-0 h-11 flex items-end px-4 gap-1 bg-[#0f111a] border-t border-white/10 overflow-x-auto">
        {allProjects.slice(0, 6).map((p) => {
          const isActive = p.id === numericId;
          return (
            <Link
              key={p.id}
              to={`/projects/${p.id}/workspace`}
              className={`px-4 py-2 rounded-t-lg text-xs font-bold truncate max-w-[160px] transition-colors ${
                isActive
                  ? "bg-[#1a1d2e] border-x border-t border-indigo-500/50 text-white"
                  : "border-x border-t border-white/10 text-gray-500 hover:text-white hover:bg-[#1a1d2e]"
              }`}
            >
              {p.name}
            </Link>
          );
        })}
        <Link
          to="/projects"
          className="px-3 py-2 text-gray-500 hover:text-indigo-400 text-xs font-mono transition-colors"
          title="返回项目列表"
        >
          ← 列表
        </Link>
      </div>
    </div>
  );
}
