/**
 * 项目列表（拟物控制台风）；数据来自 Project 索引 API。
 */
import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";
import { Settings, Maximize2, Activity, FolderPlus, Radar, Bot, Sparkles, Loader2 } from "lucide-react";
import { MechButton, MetalPanel, Rivet, Led, type LedStatus } from "../components/ui/SkeuoUI";
import MetaballCanvas from "../components/MetaballCanvas";
import { useNotifications } from "../contexts/NotificationContext";
import * as projectsApi from "../../lib/api/services/projects";
import { agentsApi } from "../../lib/api";
import type { ProjectRecord } from "../../lib/api/services/projects";

// Workspace Agent 默认 System Prompt
const WORKSPACE_AGENT_PROMPT = `你是 {projectName} 项目的 Workspace Agent。

## 核心职责

### 1. 项目结构扫描
- 分析项目目录结构和文件组织
- 识别项目类型（前端/后端/全栈/移动端）
- 检测使用的框架和技术栈（React/Vue/Next.js 等）

### 2. 前端入口检测
- 查找前端入口目录（web/、frontend/、client/、src/ 等）
- 检测包管理器（npm/yarn/pnpm/bun）
- 识别启动命令（dev/start/serve）
- 分析 package.json 中的 scripts

### 3. 工作区配置
- 将检测结果写入 .claude/config.json 的 workspace 字段
- 管理工作区端口（默认 5173）和启动参数
- 支持手动覆盖自动检测的配置

### 4. 项目管理支持
- 帮助用户理解项目结构
- 提供开发建议和问题诊断
- 协助配置开发环境

首次使用时，请先扫描项目结构并输出检测结果。`;

function cardLed(p: ProjectRecord): LedStatus {
  // 未关联 Agent 时显示红色
  if (!p.agent_id) return "red";
  // 已绑定但未扫描 config：与「需点 Init」状态一致
  if (!p.workspace_scanned) return "gray";
  if (p.has_workspace && p.has_agent) return "green";
  if (p.has_workspace) return "yellow";
  return "gray";
}

function cardAction(p: ProjectRecord): string {
  // 未关联 Agent 时显示"创建 Agent"
  if (!p.agent_id) return "创建 AGENT";
  // 以 config 扫描为准；仅有 web/ 不算已 Init
  if (p.workspace_scanned) return "ENTER WORKSPACE";
  return "INIT WORKSPACE";
}

export default function Projects() {
  const navigate = useNavigate();
  const { addNotification } = useNotifications();
  const [items, setItems] = useState<ProjectRecord[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Gen Agent 弹窗状态
  const [showGenAgentModal, setShowGenAgentModal] = useState(false);
  const [genAgentTarget, setGenAgentTarget] = useState<ProjectRecord | null>(null);
  const [generating, setGenerating] = useState(false);
  
  // Init Workspace 状态
  const [initializingProjects, setInitializingProjects] = useState<Set<number>>(new Set());

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // 先从 project-paths 同步项目（自动导入已配置的路径）
      const syncResult = await projectsApi.syncFromPaths();
      if (syncResult.synced > 0) {
        console.log(`[Projects] 自动导入 ${syncResult.synced} 个项目（来自 project-paths）`);
      }

      // 再加载项目列表
      const res = await projectsApi.listProjects({ limit: 200 });
      setItems(res.items);
    } catch (e) {
      addNotification({
        type: "error",
        title: "项目列表",
        message: e instanceof Error ? e.message : String(e),
      });
    } finally {
      setLoading(false);
    }
  }, [addNotification]);

  useEffect(() => {
    void load();
  }, [load]);

  const openWorkspace = (id: number, generate?: boolean) => {
    const q = generate ? "?generate=1" : "";
    navigate(`/projects/${id}/workspace${q}`);
  };

  const onAddFromPath = () => {
    const raw = window.prompt("输入项目根目录绝对路径（Git 仓库）");
    if (!raw?.trim()) return;
    void (async () => {
      try {
        const p = await projectsApi.createProjectFromPath({ path: raw.trim() });
        addNotification({ type: "success", title: "项目", message: `已添加：${p.name}` });
        await load();
      } catch (e) {
        addNotification({
          type: "error",
          title: "添加失败",
          message: e instanceof Error ? e.message : String(e),
        });
      }
    })();
  };

  const onScan = () => {
    const raw = window.prompt("扫描根目录（将发现其下 Git 仓库并建立索引）");
    if (!raw?.trim()) return;
    void (async () => {
      try {
        const r = await projectsApi.scanProjects({ root_path: raw.trim(), max_depth: 4 });
        addNotification({
          type: "info",
          title: "扫描完成",
          message: `发现 ${r.discovered.length} 个仓库，新建索引 ${r.created_ids.length} 条`,
        });
        await load();
      } catch (e) {
        addNotification({
          type: "error",
          title: "扫描失败",
          message: e instanceof Error ? e.message : String(e),
        });
      }
    })();
  };

  // 创建 Workspace Agent
  const handleGenAgent = async () => {
    if (!genAgentTarget) return;
    
    // 验证项目路径有效性
    if (!genAgentTarget.path) {
      addNotification({
        type: "error",
        title: "创建失败",
        message: "项目路径无效，无法创建 Workspace Agent",
      });
      return;
    }
    
    setGenerating(true);
    addNotification({
      type: "info",
      title: "Workspace Agent",
      message: `正在为 ${genAgentTarget.name} 创建 Agent...`,
    });
    
    try {
      // 1. 创建 Agent
      const agent = await agentsApi.create({
        name: `${genAgentTarget.name.toLowerCase().replace(/\s+/g, '-')}-workspace`,
        description: `${genAgentTarget.name} 项目的 Workspace Agent，负责项目配置扫描和工作区管理`,
        scope: 'project',
        system_prompt: WORKSPACE_AGENT_PROMPT.replace('{projectName}', genAgentTarget.name),
        tools: ['Read', 'Write', 'Bash', 'Glob', 'Grep'],
        model: 'inherit',
        meta: {
          project_path: genAgentTarget.path,
          color: 'green',
          icon: 'rocket',
        },
      });
      
      // 2. 绑定到项目
      await projectsApi.bindAgent(genAgentTarget.id, agent.id);
      
      addNotification({
        type: "success",
        title: "Workspace Agent",
        message: `Agent 创建成功，正在跳转到编辑页面...`,
      });
      
      // 3. 关闭弹窗并跳转到编辑页面
      setShowGenAgentModal(false);
      setGenAgentTarget(null);
      navigate(`/agents/${agent.id}/edit`);
      
    } catch (e) {
      addNotification({
        type: "error",
        title: "创建失败",
        message: e instanceof Error ? e.message : String(e),
      });
    } finally {
      setGenerating(false);
    }
  };

  // Init Workspace 处理函数
  const handleInitWorkspace = async (project: ProjectRecord) => {
    setInitializingProjects(prev => new Set(prev).add(project.id));
    addNotification({
      type: "info",
      title: "Init Workspace",
      message: `正在扫描 ${project.name} 项目结构...`,
    });
    
    try {
      const result = await projectsApi.scanProjectStructure(project.id);
      if (result.success) {
        addNotification({
          type: "success",
          title: "初始化完成",
          message: `检测到 ${result.workspace_config?.framework || '未知'} 框架，端口 ${result.workspace_config?.port || 5173}`,
        });
        await load(); // 刷新列表
      } else {
        addNotification({
          type: "warning",
          title: "初始化完成",
          message: "未检测到前端项目结构，已设置默认配置",
        });
        await load();
      }
    } catch (e) {
      addNotification({
        type: "error",
        title: "初始化失败",
        message: e instanceof Error ? e.message : String(e),
      });
    } finally {
      setInitializingProjects(prev => {
        const next = new Set(prev);
        next.delete(project.id);
        return next;
      });
    }
  };

  return (
    <div className="flex-1 p-4 md:p-8 lg:p-10 flex flex-col gap-8 min-h-full overflow-y-auto font-mono bg-[#0f111a] -m-4 md:-m-8 pb-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-lg font-bold text-[#ccc] tracking-[0.2em] uppercase">Projects</h1>
        <div className="flex gap-2">
          <MechButton variant="secondary" className="text-xs px-3 py-2" onClick={() => void load()} disabled={loading}>
            {loading ? <Activity className="w-3 h-3 animate-spin" /> : "刷新"}
          </MechButton>
          <MechButton variant="secondary" className="text-xs px-3 py-2 gap-1" onClick={onScan}>
            <Radar className="w-3 h-3" />
            扫描
          </MechButton>
        </div>
      </div>

      {loading && items.length === 0 ? (
        <div className="text-[#666] text-sm font-mono py-12 text-center">加载中…</div>
      ) : items.length === 0 ? (
        <MetalPanel className="p-8 text-center text-[#888] text-sm max-w-lg mx-auto">
          <p className="mb-4">暂无项目索引。可从路径添加，或扫描目录批量导入。</p>
          <MechButton variant="primary" className="text-xs gap-2" onClick={onAddFromPath}>
            <FolderPlus className="w-3 h-3" />
            从路径添加
          </MechButton>
        </MetalPanel>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((project) => {
            const led = cardLed(project);
            const action = cardAction(project);
            const hasAgent = !!project.agent_id;
            const thumbnailUrl = hasAgent ? projectsApi.getThumbnailUrl(project.id) : null;
            
            return (
              <MetalPanel
                key={project.id}
                className="p-4 flex flex-col gap-4 group hover:border-[#555] transition-colors relative"
              >
                <Rivet className="absolute top-2 left-2 z-10" />
                <Rivet className="absolute top-2 right-2 z-10" />
                <Rivet className="absolute bottom-2 left-2 z-10" />
                <Rivet className="absolute bottom-2 right-2 z-10" />

                <div className="w-full h-40 bg-[#0a0a0a] rounded-lg border-2 border-[#111] shadow-[inset_0_4px_8px_rgba(0,0,0,0.8)] overflow-hidden relative group-hover:shadow-[inset_0_4px_12px_rgba(99,102,241,0.15)] transition-shadow">
                  {thumbnailUrl ? (
                    <img 
                      src={thumbnailUrl} 
                      alt={`${project.name} preview`}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        // 缩略图加载失败时隐藏图片，显示 Metaball
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  ) : null}
                  <MetaballCanvas className="w-full h-full absolute inset-0" style={{ 
                    opacity: thumbnailUrl ? 0 : 1,
                    zIndex: thumbnailUrl ? -1 : 0
                  }} />
                </div>

                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="text-lg font-bold text-[#eee] tracking-wider truncate">{project.name}</h3>
                    {project.description && (
                      <p className="text-xs text-[#888] font-sans mt-1 line-clamp-2">
                        {project.description}
                      </p>
                    )}
                    {/* 显示关联的 Agent 状态 */}
                    {hasAgent ? (
                      <div className="flex items-center gap-1 mt-2">
                        <Bot className="w-3 h-3 text-green-500" />
                        <span className="text-xs text-green-500/80 font-mono">Agent 已绑定</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 mt-2">
                        <Bot className="w-3 h-3 text-[#666]" />
                        <span className="text-xs text-[#666] font-mono">未绑定 Agent</span>
                      </div>
                    )}
                  </div>
                  <Led status={led} className="mt-1 shrink-0" />
                </div>

                <div className="flex items-center gap-2 mt-auto pt-2 border-t border-[#333]/50">
                  <Link
                    to={`/projects/${project.id}`}
                    className={`shrink-0 p-2 bg-[#222] rounded-md border border-[#333] transition shadow-[0_2px_4px_rgba(0,0,0,0.5)] ${
                      hasAgent ? 'hover:bg-[#333]' : 'opacity-50 cursor-not-allowed pointer-events-none'
                    }`}
                    title="设置"
                    onClick={(e) => !hasAgent && e.preventDefault()}
                  >
                    <Settings className="w-4 h-4 text-[#aaa]" />
                  </Link>
                  <button
                    type="button"
                    className={`shrink-0 p-2 bg-[#222] rounded-md border border-[#333] transition shadow-[0_2px_4px_rgba(0,0,0,0.5)] ${
                      hasAgent ? 'hover:bg-[#333]' : 'opacity-50 cursor-not-allowed'
                    }`}
                    title="放大"
                    onClick={() => hasAgent && openWorkspace(project.id)}
                    disabled={!hasAgent}
                  >
                    <Maximize2 className="w-4 h-4 text-[#aaa]" />
                  </button>

                  {hasAgent ? (
                    <MechButton
                      className="flex-1 text-xs py-2 h-full"
                      variant={led === "green" ? "primary" : "secondary"}
                      disabled={initializingProjects.has(project.id)}
                      onClick={() => {
                        if (project.workspace_scanned) {
                          openWorkspace(project.id, false);
                        } else {
                          handleInitWorkspace(project);
                        }
                      }}
                    >
                      {initializingProjects.has(project.id) ? (
                        <><Loader2 className="w-3 h-3 animate-spin mr-1" />初始化中...</>
                      ) : (
                        action
                      )}
                    </MechButton>
                  ) : (
                    <MechButton
                      className="flex-1 text-xs py-2 h-full gap-1"
                      variant="primary"
                      onClick={() => {
                        setGenAgentTarget(project);
                        setShowGenAgentModal(true);
                      }}
                    >
                      <Sparkles className="w-3 h-3" />
                      Gen Agent
                    </MechButton>
                  )}
                </div>
              </MetalPanel>
            );
          })}
        </div>
      )}

      {/* Gen Agent 确认弹窗 */}
      {showGenAgentModal && genAgentTarget && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-[#1a1b26] border border-[#333] rounded-2xl p-6 max-w-md mx-4 shadow-2xl">
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-[#eee]">
              <Bot className="w-5 h-5 text-green-400" />
              创建 Workspace Agent
            </h3>
            
            <p className="text-gray-300 mb-4">
              将为 <span className="text-green-400 font-bold">{genAgentTarget.name}</span> 项目创建专属 Workspace Agent
            </p>
            
            <div className="p-4 bg-white/5 rounded-xl mb-4 border border-[#333]">
              <h4 className="font-bold text-sm mb-2 text-[#ccc]">Agent 职责：</h4>
              <ul className="text-sm text-gray-400 space-y-1">
                <li className="flex items-start gap-2">
                  <span className="text-green-400">•</span>
                  <span>扫描项目结构，识别框架和技术栈</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-400">•</span>
                  <span>检测前端入口目录和启动命令</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-400">•</span>
                  <span>配置工作区参数到 .claude/config.json</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-400">•</span>
                  <span>辅助 Web 项目开发和调试</span>
                </li>
              </ul>
            </div>

            <p className="text-xs text-gray-500 mb-4">
              创建后将跳转到 Agent 编辑页面，您可以进一步自定义配置。
            </p>
            
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowGenAgentModal(false);
                  setGenAgentTarget(null);
                }}
                disabled={generating}
                className="flex-1 px-4 py-2.5 bg-[#222] hover:bg-[#333] border border-[#444] rounded-xl font-bold text-sm transition-all disabled:opacity-50"
              >
                取消
              </button>
              <button
                onClick={handleGenAgent}
                disabled={generating}
                className="flex-1 px-4 py-2.5 bg-green-600 hover:bg-green-500 rounded-xl font-bold text-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {generating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    创建中...
                  </>
                ) : (
                  '确认创建'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
