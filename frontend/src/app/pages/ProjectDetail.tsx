/**
 * 项目详情：概览 + Agent（.claude/agent.md）编辑；Terminal 跳转。
 */
import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { RefreshCw, TerminalSquare, Bot, LayoutDashboard } from "lucide-react";
import { MetalPanel, Led, MechButton } from "../components/ui/SkeuoUI";
import { useNotifications } from "../contexts/NotificationContext";
import { useTerminalContext } from "../contexts/TerminalContext";
import * as projectsApi from "../../lib/api/services/projects";
import type { ProjectRecord } from "../../lib/api/services/projects";

type TabKey = "overview" | "agent";

export default function ProjectDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addNotification } = useNotifications();
  const { createTerminal } = useTerminalContext();

  const numericId = id ? parseInt(id, 10) : NaN;
  const [tab, setTab] = useState<TabKey>("overview");
  const [project, setProject] = useState<ProjectRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [agentDraft, setAgentDraft] = useState("");
  const [agentLoading, setAgentLoading] = useState(false);
  const [savingAgent, setSavingAgent] = useState(false);
  
  // 配置编辑状态
  const [configDraft, setConfigDraft] = useState({
    workspace_url: "",
    start_command: "",
  });
  const [savingConfig, setSavingConfig] = useState(false);

  const loadProject = useCallback(async () => {
    if (Number.isNaN(numericId)) return;
    setLoading(true);
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
      setLoading(false);
    }
  }, [numericId, addNotification]);

  const loadAgent = useCallback(async () => {
    if (Number.isNaN(numericId)) return;
    setAgentLoading(true);
    try {
      const r = await projectsApi.getProjectAgent(numericId);
      setAgentDraft(r.content ?? "");
    } catch {
      setAgentDraft("");
    } finally {
      setAgentLoading(false);
    }
  }, [numericId]);

  useEffect(() => {
    void loadProject();
  }, [loadProject]);

  useEffect(() => {
    if (tab === "agent") void loadAgent();
  }, [tab, loadAgent]);

  // 加载配置
  useEffect(() => {
    if (project?.meta) {
      setConfigDraft({
        workspace_url: (project.meta.workspace_url as string) || "",
        start_command: (project.meta.start_command as string) || "",
      });
    }
  }, [project]);

  const onSync = async () => {
    if (Number.isNaN(numericId)) return;
    try {
      const p = await projectsApi.syncProject(numericId);
      setProject(p);
      addNotification({ type: "success", title: "同步", message: "已刷新磁盘状态" });
    } catch (e) {
      addNotification({
        type: "error",
        title: "同步失败",
        message: e instanceof Error ? e.message : String(e),
      });
    }
  };

  const onInitClaude = async () => {
    if (Number.isNaN(numericId)) return;
    try {
      await projectsApi.initProjectClaude(numericId);
      addNotification({ type: "success", title: ".claude", message: "已写入 agent.md / config" });
      await loadProject();
    } catch (e) {
      addNotification({
        type: "error",
        title: "初始化失败",
        message: e instanceof Error ? e.message : String(e),
      });
    }
  };

  const onInitWorkspace = async () => {
    if (Number.isNaN(numericId)) return;
    try {
      const r = await projectsApi.initWorkspace(numericId);
      addNotification({ type: "success", title: "Workspace", message: r.message });
      await loadProject();
    } catch (e) {
      addNotification({
        type: "error",
        title: "生成 web/ 失败",
        message: e instanceof Error ? e.message : String(e),
      });
    }
  };

  const onSaveAgent = async () => {
    if (Number.isNaN(numericId)) return;
    setSavingAgent(true);
    try {
      await projectsApi.putProjectAgent(numericId, agentDraft);
      addNotification({ type: "success", title: "Agent", message: "已保存 agent.md" });
      await loadProject();
    } catch (e) {
      addNotification({
        type: "error",
        title: "保存失败",
        message: e instanceof Error ? e.message : String(e),
      });
    } finally {
      setSavingAgent(false);
    }
  };

  const openTerminalHere = () => {
    if (!project?.path) return;
    createTerminal(project.path, false);
    navigate("/terminal");
  };

  const onSaveConfig = async () => {
    if (Number.isNaN(numericId)) return;
    setSavingConfig(true);
    try {
      const meta = { ...project?.meta, ...configDraft };
      await projectsApi.updateProject(numericId, { meta });
      addNotification({ type: "success", title: "配置", message: "已保存" });
      await loadProject();
    } catch (e) {
      addNotification({
        type: "error",
        title: "保存失败",
        message: e instanceof Error ? e.message : String(e),
      });
    } finally {
      setSavingConfig(false);
    }
  };

  if (Number.isNaN(numericId)) {
    return (
      <div className="p-6 text-red-400 text-sm font-mono">无效的项目 ID</div>
    );
  }

  return (
    <div className="min-h-full flex items-center justify-center p-4">
      <div className="w-full max-w-4xl space-y-6">
        <MetalPanel className="p-6">
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <Led status={project?.has_workspace && project?.has_agent ? "green" : project?.has_workspace ? "yellow" : "gray"} />
          <h1 className="text-xl font-bold text-[#eee] tracking-wide font-mono flex-1 min-w-0 truncate">
            {loading ? "加载中…" : project?.name ?? "未找到"}
          </h1>
          <Link
            to={`/projects/${numericId}/workspace`}
            className="text-sm px-3 py-1.5 rounded-lg bg-[#00d8ff]/15 text-[#00d8ff] border border-[#00d8ff]/40 hover:bg-[#00d8ff]/25 transition-colors"
          >
            Workspace
          </Link>
        </div>

        <div className="flex gap-2 border-b border-[#333] mb-4">
          <button
            type="button"
            className={`px-3 py-2 text-xs font-mono uppercase tracking-wider border-b-2 -mb-px flex items-center gap-2 ${
              tab === "overview" ? "border-[#00d8ff] text-[#00d8ff]" : "border-transparent text-[#888]"
            }`}
            onClick={() => setTab("overview")}
          >
            <LayoutDashboard className="w-3 h-3" />
            概览
          </button>
          <button
            type="button"
            className={`px-3 py-2 text-xs font-mono uppercase tracking-wider border-b-2 -mb-px flex items-center gap-2 ${
              tab === "agent" ? "border-[#00d8ff] text-[#00d8ff]" : "border-transparent text-[#888]"
            }`}
            onClick={() => setTab("agent")}
          >
            <Bot className="w-3 h-3" />
            Agent
          </button>
        </div>

        {tab === "overview" && (
          <div className="space-y-4 text-sm text-[#aaa] font-sans">
            {project && (
              <>
                {/* 项目配置区域 */}
                <div className="border border-[#333] rounded-lg p-4 bg-[#0a0a0a]/50 mt-6">
                  <h3 className="text-sm font-bold text-[#ccc] mb-3">项目配置</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs text-[#888] mb-1.5">Web URL</label>
                      <input
                        type="url"
                        value={configDraft.workspace_url}
                        onChange={(e) => setConfigDraft({ ...configDraft, workspace_url: e.target.value })}
                        className="w-full px-3 py-2 bg-[#1a1a1a] border border-[#333] rounded text-sm text-[#ddd] focus:outline-none focus:border-[#00d8ff]/50"
                        placeholder="http://localhost:3000"
                      />
                      <p className="text-xs text-[#666] mt-1">用于 iframe 预览的 Web 地址</p>
                    </div>
                    
                    <div>
                      <label className="block text-xs text-[#888] mb-1.5">启动命令</label>
                      <input
                        type="text"
                        value={configDraft.start_command}
                        onChange={(e) => setConfigDraft({ ...configDraft, start_command: e.target.value })}
                        className="w-full px-3 py-2 bg-[#1a1a1a] border border-[#333] rounded text-sm text-[#ddd] focus:outline-none focus:border-[#00d8ff]/50"
                        placeholder="npm run dev"
                      />
                      <p className="text-xs text-[#666] mt-1">项目启动命令（仅作参考）</p>
                    </div>
                    
                    <MechButton 
                      variant="primary" 
                      className="text-xs" 
                      onClick={onSaveConfig}
                      disabled={savingConfig}
                    >
                      {savingConfig ? "保存中..." : "保存配置"}
                    </MechButton>
                  </div>
                </div>
                
                {/* 原有的项目信息 */}
                <p>
                  <span className="text-[#666]">路径</span>
                  <br />
                  <code className="text-[#ccc] break-all text-xs">{project.path || "（轻量级项目）"}</code>
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
                  <p>
                    Git 分支 <span className="text-[#00d8ff]">{project.git_branch ?? "—"}</span>
                  </p>
                  <p className="truncate" title={project.git_remote ?? ""}>
                    Remote <span className="text-[#888]">{project.git_remote ? "已配置" : "—"}</span>
                  </p>
                  <p>
                    .claude/agent <span className="text-[#00d8ff]">{project.has_agent ? "有" : "无"}</span>
                  </p>
                  <p>
                    web/ Workspace <span className="text-[#00d8ff]">{project.has_workspace ? "有" : "无"}</span>
                  </p>
                  <p>
                    端口 <span className="text-[#888]">{project.workspace_port ?? "默认"}</span>
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 pt-2">
                  {project.path && (
                    <>
                      <MechButton variant="secondary" className="text-xs gap-2" onClick={() => void onSync()}>
                        <RefreshCw className="w-3 h-3" />
                        同步磁盘
                      </MechButton>
                      <MechButton variant="secondary" className="text-xs" onClick={() => void onInitClaude()}>
                        初始化 .claude
                      </MechButton>
                      <MechButton variant="secondary" className="text-xs" onClick={() => void onInitWorkspace()}>
                        生成 web/ 骨架
                      </MechButton>
                      <MechButton variant="primary" className="text-xs gap-2" onClick={openTerminalHere}>
                        <TerminalSquare className="w-3 h-3" />
                        终端
                      </MechButton>
                    </>
                  )}
                  {!project.path && (
                    <p className="text-xs text-[#888]">轻量级项目，无本地路径</p>
                  )}
                </div>
              </>
            )}
            {!loading && !project && <p className="text-[#888]">未找到该项目。</p>}
          </div>
        )}

        {tab === "agent" && (
          <div className="space-y-3">
            <p className="text-xs text-[#666] font-mono">
              编辑项目目录下 <code className="text-[#888]">.claude/agent.md</code>
            </p>
            {agentLoading ? (
              <p className="text-sm text-[#666]">加载 Agent 内容…</p>
            ) : (
              <textarea
                className="w-full min-h-[280px] rounded-lg bg-[#0a0a0a] border border-[#333] text-[#ddd] text-sm font-mono p-3 focus:outline-none focus:border-[#00d8ff]/50"
                value={agentDraft}
                onChange={(e) => setAgentDraft(e.target.value)}
                spellCheck={false}
              />
            )}
            <MechButton variant="primary" className="text-xs" disabled={savingAgent || agentLoading} onClick={() => void onSaveAgent()}>
              {savingAgent ? "保存中…" : "保存 agent.md"}
            </MechButton>
          </div>
        )}
      </MetalPanel>
      </div>
    </div>
  );
}
