/**
 * AgentEditor - 子代理编辑器组件
 *
 * 统一的创建/编辑界面
 * - 创建模式：agent 为 null
 * - 编辑模式：agent 不为 null
 * 支持可视化和源码两种编辑模式
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  ArrowLeft,
  Save,
  Code2,
  Eye,
  Wrench,
  Shield,
  AlertCircle,
  CheckCircle2,
  Plus,
  X,
  Terminal,
  Cpu,
  Sparkles,
  Wand2,
  MessageSquare,
  Zap,
  FolderOpen,
  Palette,
  ChevronDown,
  ChevronUp,
  Server,
  GitBranch,
  Clock,
  Ban,
  Brain,
  Layers,
  Bot,
  Code,
  Search,
  FileText,
  Globe,
  Settings,
  Bug,
  Rocket,
  Star,
  Heart,
  Shield as ShieldIcon,
  Lightbulb,
  Target,
  Hammer,
  RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GlassCard } from './ui-shared';
import { agentsApi, skillsApi } from '@/lib/api';
import type { Agent, AgentUpdate, AgentPermissionMode, AgentModel, AgentScope, Skill } from '@/lib/api';

// 从路径中提取项目名称
const extractProjectName = (path: string): string => {
  const pathParts = path.split('/');

  // 优先从 .claude 前面的目录获取（这是最准确的项目名称）
  const claudeIndex = pathParts.findIndex(p => p === '.claude');
  if (claudeIndex > 0) {
    return pathParts[claudeIndex - 1];
  }

  // 如果没有 .claude，查找常见的项目目录标识
  const projectDirNames = ['项目', 'Proj', 'projects', 'Projects', 'workspace', 'Workspace'];
  const projectIndex = pathParts.findIndex(p => projectDirNames.includes(p));

  if (projectIndex >= 0 && projectIndex < pathParts.length - 1) {
    return pathParts[projectIndex + 1];
  }

  // 默认返回倒数第三个目录（通常是项目根目录）
  return pathParts.length >= 3 ? pathParts[pathParts.length - 3] : 'project';
};

// 可用工具列表
const AVAILABLE_TOOLS = [
  'Read', 'Write', 'Edit', 'Bash', 'Grep', 'Glob',
  'Task', 'AskUser', 'WebSearch', 'WebFetch', 'MultiEdit',
  'TodoRead', 'TodoWrite', 'NotebookEdit', 'NotebookRead'
];

// 权限模式选项
const PERMISSION_MODES: { value: AgentPermissionMode; label: string; desc: string }[] = [
  { value: 'default', label: 'Default', desc: '标准权限检查' },
  { value: 'acceptEdits', label: 'Accept Edits', desc: '自动接受文件编辑' },
  { value: 'dontAsk', label: "Don't Ask", desc: '自动拒绝权限提示' },
  { value: 'plan', label: 'Plan', desc: '只读模式' },
  { value: 'bypassPermissions', label: 'Bypass', desc: '跳过所有权限检查（危险）' }
];

// 模型选项
const MODEL_OPTIONS: { value: AgentModel; label: string; desc: string; color: string }[] = [
  { value: 'inherit', label: 'Inherit', desc: '继承主会话模型', color: 'gray' },
  { value: 'sonnet', label: 'Sonnet', desc: '平衡能力和速度', color: 'blue' },
  { value: 'opus', label: 'Opus', desc: '最强能力', color: 'purple' },
  { value: 'haiku', label: 'Haiku', desc: '最快速度', color: 'green' }
];

// 作用域选项
const SCOPE_OPTIONS: { value: AgentScope; label: string; desc: string }[] = [
  { value: 'user', label: '用户级', desc: '~/.claude/agents/ - 所有项目可用' },
  { value: 'project', label: '项目级', desc: '.claude/agents/ - 仅当前项目' }
];

// 可用颜色
const AVAILABLE_COLORS = [
  { value: 'blue', label: '蓝色', class: 'bg-blue-500' },
  { value: 'purple', label: '紫色', class: 'bg-purple-500' },
  { value: 'green', label: '绿色', class: 'bg-green-500' },
  { value: 'orange', label: '橙色', class: 'bg-orange-500' },
  { value: 'red', label: '红色', class: 'bg-red-500' },
  { value: 'pink', label: '粉色', class: 'bg-pink-500' },
  { value: 'cyan', label: '青色', class: 'bg-cyan-500' },
  { value: 'yellow', label: '黄色', class: 'bg-yellow-500' },
  { value: 'indigo', label: '靛蓝', class: 'bg-indigo-500' },
  { value: 'teal', label: '蓝绿', class: 'bg-teal-500' },
];

// 可用图标
const AVAILABLE_ICONS = [
  { value: 'bot', label: 'Bot', icon: Bot },
  { value: 'cpu', label: 'CPU', icon: Cpu },
  { value: 'code', label: 'Code', icon: Code },
  { value: 'terminal', label: 'Terminal', icon: Terminal },
  { value: 'search', label: 'Search', icon: Search },
  { value: 'file-text', label: 'File', icon: FileText },
  { value: 'globe', label: 'Globe', icon: Globe },
  { value: 'settings', label: 'Settings', icon: Settings },
  { value: 'bug', label: 'Bug', icon: Bug },
  { value: 'rocket', label: 'Rocket', icon: Rocket },
  { value: 'star', label: 'Star', icon: Star },
  { value: 'heart', label: 'Heart', icon: Heart },
  { value: 'shield', label: 'Shield', icon: ShieldIcon },
  { value: 'lightbulb', label: 'Idea', icon: Lightbulb },
  { value: 'target', label: 'Target', icon: Target },
  { value: 'hammer', label: 'Hammer', icon: Hammer },
  { value: 'brain', label: 'Brain', icon: Brain },
  { value: 'layers', label: 'Layers', icon: Layers },
  { value: 'zap', label: 'Zap', icon: Zap },
  { value: 'wrench', label: 'Wrench', icon: Wrench },
];

// 内存选项
const MEMORY_OPTIONS = [
  { value: '', label: '禁用', desc: '不使用持久化内存' },
  { value: 'user', label: '用户级', desc: '~/.claude/agent-memory/' },
  { value: 'project', label: '项目级', desc: '.claude/agent-memory/' },
  { value: 'local', label: '本地级', desc: '.claude/agent-memory-local/' },
];

interface AgentEditorProps {
  agent: Agent | null;
  onBack: () => void;
  onSave: () => void;
}

export const AgentEditor: React.FC<AgentEditorProps> = ({
  agent,
  onBack,
  onSave
}) => {
  const isCreateMode = agent === null;

  // 编辑模式：visual（可视化）或 source（源码）
  const [editMode, setEditMode] = useState<'visual' | 'source'>('visual');

  // === 必填字段 ===
  const [name, setName] = useState(agent?.name || '');
  const [description, setDescription] = useState(agent?.description || '');

  // === 常用字段 ===
  const [systemPrompt, setSystemPrompt] = useState(agent?.system_prompt || '');
  const [model, setModel] = useState<AgentModel>(agent?.model as AgentModel || 'inherit');
  const [tools, setTools] = useState<string[]>(agent?.tools || []);
  const [skills, setSkills] = useState<string[]>(agent?.skills || []);
  const [scope, setScope] = useState<AgentScope>(agent?.scope as AgentScope || 'user');

  // === 外观设置 ===
  const [color, setColor] = useState(agent?.meta?.color || 'blue');
  const [icon, setIcon] = useState(agent?.meta?.icon || 'bot');

  // === 高级字段（可折叠） ===
  const [disallowedTools, setDisallowedTools] = useState<string[]>(agent?.disallowed_tools || []);
  const [permissionMode, setPermissionMode] = useState<AgentPermissionMode>(
    agent?.permission_mode as AgentPermissionMode || 'default'
  );
  const [maxTurns, setMaxTurns] = useState<number | null>(agent?.max_turns || null);
  const [memory, setMemory] = useState<string | null>(agent?.memory || null);
  const [background, setBackground] = useState(agent?.background || false);
  const [isolation, setIsolation] = useState<string | null>(agent?.isolation || null);

  // === MCP Servers（高级） ===
  const [mcpServers, setMcpServers] = useState<string[]>(
    agent?.mcp_servers?.map((s: any) => typeof s === 'string' ? s : Object.keys(s)[0]) || []
  );
  const [newMcpServer, setNewMcpServer] = useState('');

  // === 折叠状态 ===
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showAppearance, setShowAppearance] = useState(true);

  // 源码编辑状态
  const [sourceContent, setSourceContent] = useState('');
  const [sourceLoading, setSourceLoading] = useState(false);

  // 保存状态
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // 新工具输入
  const [newTool, setNewTool] = useState('');
  const [newDisallowedTool, setNewDisallowedTool] = useState('');

  // 可用技能列表
  const [availableSkills, setAvailableSkills] = useState<Skill[]>([]);

  // Scope 修改确认
  const [showScopeChangeConfirm, setShowScopeChangeConfirm] = useState(false);
  const [pendingScope, setPendingScope] = useState<AgentScope | null>(null);

  // AI 生成
  const [aiPrompt, setAiPrompt] = useState('');
  const [generating, setGenerating] = useState(false);

  // 生成源码预览内容
  const generateSourcePreview = useCallback(() => {
    const frontmatter: Record<string, any> = {
      name: name || 'my-agent',
      description: description || 'Description here',
    };

    if (model !== 'inherit') frontmatter.model = model;
    if (tools.length > 0) frontmatter.tools = tools;
    if (disallowedTools.length > 0) frontmatter.disallowedTools = disallowedTools;
    if (permissionMode !== 'default') frontmatter.permissionMode = permissionMode;
    if (maxTurns) frontmatter.maxTurns = maxTurns;
    if (skills.length > 0) frontmatter.skills = skills;
    if (mcpServers.length > 0) frontmatter.mcpServers = mcpServers;
    if (memory) frontmatter.memory = memory;
    if (background) frontmatter.background = true;
    if (isolation) frontmatter.isolation = isolation;

    const yamlLines = Object.entries(frontmatter).map(([key, value]) => {
      if (Array.isArray(value)) {
        return `${key}:\n${value.map(v => `  - ${v}`).join('\n')}`;
      }
      if (typeof value === 'string' && value.includes('\n')) {
        return `${key}: |\n${value.split('\n').map(l => `  ${l}`).join('\n')}`;
      }
      return `${key}: ${JSON.stringify(value)}`;
    });

    return `---
${yamlLines.join('\n')}
---

${systemPrompt || 'You are a specialized agent. Write your system prompt here.'}
`;
  }, [name, description, model, tools, disallowedTools, permissionMode, maxTurns, skills, mcpServers, memory, background, isolation, systemPrompt]);

  // 从源码解析字段
  const parseSourceContent = useCallback((content: string) => {
    try {
      const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
      if (!match) return;

      const [, yamlPart, bodyPart] = match;
      const lines = yamlPart.split('\n');
      let currentKey = '';
      let currentArray: string[] = [];
      const parsed: Record<string, any> = {};

      for (const line of lines) {
        const keyMatch = line.match(/^(\w+):\s*(.*)$/);
        if (keyMatch) {
          if (currentKey && currentArray.length > 0) {
            parsed[currentKey] = currentArray;
            currentArray = [];
          }
          currentKey = keyMatch[1];
          const value = keyMatch[2].trim();
          if (value && !value.startsWith('|')) {
            try {
              parsed[currentKey] = JSON.parse(value);
            } catch {
              parsed[currentKey] = value;
            }
            currentKey = '';
          }
        } else if (line.trim().startsWith('- ')) {
          currentArray.push(line.trim().substring(2));
        }
      }
      if (currentKey && currentArray.length > 0) {
        parsed[currentKey] = currentArray;
      }

      if (parsed.name) setName(parsed.name);
      if (parsed.description) setDescription(parsed.description);
      if (parsed.model) setModel(parsed.model);
      if (parsed.tools) setTools(parsed.tools);
      if (parsed.disallowedTools) setDisallowedTools(parsed.disallowedTools);
      if (parsed.permissionMode) setPermissionMode(parsed.permissionMode);
      if (parsed.maxTurns) setMaxTurns(parsed.maxTurns);
      if (parsed.skills) setSkills(parsed.skills);
      if (parsed.mcpServers) setMcpServers(parsed.mcpServers);
      if (parsed.memory) setMemory(parsed.memory);
      if (parsed.background !== undefined) setBackground(parsed.background);
      if (parsed.isolation) setIsolation(parsed.isolation);
      if (bodyPart.trim()) setSystemPrompt(bodyPart.trim());
    } catch (err) {
      console.error('Failed to parse source:', err);
    }
  }, []);

  // 加载可用技能
  useEffect(() => {
    loadAvailableSkills();
  }, []);

  const loadAvailableSkills = async () => {
    try {
      const response = await skillsApi.list({ limit: 100 });
      setAvailableSkills(response.items);
    } catch (err) {
      console.error('Failed to load skills:', err);
    }
  };

  // 处理 Scope 修改
  const handleScopeChange = (newScope: AgentScope) => {
    // 创建模式直接修改
    if (isCreateMode) {
      setScope(newScope);
      return;
    }

    // 编辑模式：如果是当前 scope，不做任何操作
    if (agent && agent.scope === newScope) {
      return;
    }

    // 编辑模式：显示确认弹窗
    setPendingScope(newScope);
    setShowScopeChangeConfirm(true);
  };

  // 确认 Scope 修改
  const confirmScopeChange = () => {
    if (pendingScope) {
      setScope(pendingScope);
    }
    setShowScopeChangeConfirm(false);
    setPendingScope(null);
  };

  // 取消 Scope 修改
  const cancelScopeChange = () => {
    setShowScopeChangeConfirm(false);
    setPendingScope(null);
  };

  // 切换到源码模式时生成/加载内容
  useEffect(() => {
    if (editMode === 'source') {
      if (isCreateMode) {
        setSourceContent(generateSourcePreview());
      } else if (!sourceContent) {
        loadSourceContent();
      }
    }
  }, [editMode, isCreateMode, generateSourcePreview]);

  // 切换到可视化模式时解析源码
  useEffect(() => {
    if (editMode === 'visual' && sourceContent && isCreateMode) {
      parseSourceContent(sourceContent);
    }
  }, [editMode]);

  const loadSourceContent = async () => {
    if (!agent) return;
    try {
      setSourceLoading(true);
      const content = await agentsApi.getContent(agent.id);
      setSourceContent(content.content);
    } catch (err) {
      console.error('Failed to load source:', err);
      setError('加载源码失败');
    } finally {
      setSourceLoading(false);
    }
  };

  // AI 生成配置
  const handleAIGenerate = async () => {
    if (!aiPrompt.trim()) return;

    try {
      setGenerating(true);
      setError(null);

      const result = await agentsApi.generate({
        prompt: aiPrompt.trim(),
        scope,
        model,
        tools_preset: 'all'
      });

      setName(result.name);
      setDescription(result.description);
      setSystemPrompt(result.preview_content.split('---')[2]?.trim() || '');
      setTools(result.tools);

      if (editMode === 'source') {
        setSourceContent(result.preview_content);
      }
    } catch (err) {
      console.error('Failed to generate:', err);
      setError(err instanceof Error ? err.message : 'AI 生成失败');
    } finally {
      setGenerating(false);
    }
  };

  // 同步源码到可视化
  const syncSourceToVisual = () => {
    parseSourceContent(sourceContent);
  };

  // 同步可视化到源码
  const syncVisualToSource = () => {
    setSourceContent(generateSourcePreview());
  };

  // 保存
  const handleSave = async () => {
    const currentName = editMode === 'source' ? extractNameFromSource() : name;
    const currentDesc = editMode === 'source' ? extractDescFromSource() : description;

    if (!currentName?.trim()) {
      setError('请输入名称');
      return;
    }
    if (!currentDesc?.trim()) {
      setError('请输入描述');
      return;
    }
    if (isCreateMode && !/^[a-z][a-z0-9-]*$/.test(currentName)) {
      setError('名称必须是小写字母开头，只能包含小写字母、数字和连字符');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      if (editMode === 'source' && isCreateMode) {
        parseSourceContent(sourceContent);
      }

      const meta = { color, icon };

      if (isCreateMode) {
        await agentsApi.create({
          name: (editMode === 'source' ? extractNameFromSource() : name).trim(),
          description: (editMode === 'source' ? extractDescFromSource() : description).trim(),
          system_prompt: (editMode === 'source' ? extractBodyFromSource() : systemPrompt).trim() || undefined,
          model,
          scope,
          tools: tools.length > 0 ? tools : undefined,
          disallowed_tools: disallowedTools.length > 0 ? disallowedTools : undefined,
          skills: skills.length > 0 ? skills : undefined,
          permission_mode: permissionMode !== 'default' ? permissionMode : undefined,
          max_turns: maxTurns || undefined,
          memory: memory || undefined,
          background: background || undefined,
          isolation: isolation || undefined,
          mcp_servers: mcpServers.length > 0 ? mcpServers : undefined,
          meta,
        });
      } else {
        if (editMode === 'source') {
          await agentsApi.updateContent(agent!.id, {
            path: agent!.meta?.path || '',
            content: sourceContent,
            frontmatter: {},
            body: ''
          });
        } else {
          const updateData: AgentUpdate = {
            name,
            description,
            system_prompt: systemPrompt,
            model,
            tools,
            disallowed_tools: disallowedTools,
            permission_mode: permissionMode,
            max_turns: maxTurns,
            skills,
            memory,
            background,
            isolation,
            mcp_servers: mcpServers,
            meta,
          };
          await agentsApi.update(agent!.id, updateData);
        }
      }

      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onSave();
      }, 1500);
    } catch (err) {
      console.error('Failed to save:', err);
      setError(err instanceof Error ? err.message : '保存失败');
    } finally {
      setSaving(false);
    }
  };

  // 从源码提取字段的辅助函数
  const extractNameFromSource = () => {
    const match = sourceContent.match(/name:\s*"?([^"\n]+)"?/);
    return match ? match[1].trim() : name;
  };

  const extractDescFromSource = () => {
    const match = sourceContent.match(/description:\s*"?([^"\n]+)"?/);
    return match ? match[1].trim() : description;
  };

  const extractBodyFromSource = () => {
    const match = sourceContent.match(/^---\n[\s\S]*?\n---\n([\s\S]*)$/);
    return match ? match[1].trim() : systemPrompt;
  };

  // 工具操作
  const handleAddTool = (tool: string) => {
    if (tool && !tools.includes(tool)) {
      setTools([...tools, tool]);
    }
  };

  const handleRemoveTool = (tool: string) => {
    setTools(tools.filter(t => t !== tool));
  };

  const handleAddDisallowedTool = (tool: string) => {
    if (tool && !disallowedTools.includes(tool)) {
      setDisallowedTools([...disallowedTools, tool]);
    }
  };

  const handleRemoveDisallowedTool = (tool: string) => {
    setDisallowedTools(disallowedTools.filter(t => t !== tool));
  };

  // MCP Server 操作
  const handleAddMcpServer = () => {
    if (newMcpServer && !mcpServers.includes(newMcpServer)) {
      setMcpServers([...mcpServers, newMcpServer]);
    }
    setNewMcpServer('');
  };

  const handleRemoveMcpServer = (server: string) => {
    setMcpServers(mcpServers.filter(s => s !== server));
  };

  // 技能切换
  const handleToggleSkill = (skillName: string) => {
    if (skills.includes(skillName)) {
      setSkills(skills.filter(s => s !== skillName));
    } else {
      setSkills([...skills, skillName]);
    }
  };

  // 获取当前图标组件
  const CurrentIcon = AVAILABLE_ICONS.find(i => i.value === icon)?.icon || Bot;

  return (
    <div className="max-w-6xl mx-auto pb-20">
      {/* 头部 */}
      <div className="flex items-center gap-4 mb-8">
        <div className="flex items-center gap-4 flex-1">
          <div
            className={`w-14 h-14 rounded-2xl flex items-center justify-center bg-${color}-500/20 border border-${color}-500/30`}
            style={{
              backgroundColor: `color-mix(in srgb, var(--${color}-500, #3b82f6) 20%, transparent)`,
            }}
          >
            <CurrentIcon size={28} className={`text-${color}-400`} />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {isCreateMode ? '创建新子代理' : '编辑子代理'}
            </h1>
            <p className="text-gray-400 mt-1">
              {isCreateMode ? '配置你的 AI 子代理' : agent?.meta?.path || agent?.name}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* 模式切换 - 始终显示 */}
          <div className="flex bg-white/5 rounded-xl p-1">
            <button
              onClick={() => setEditMode('visual')}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${editMode === 'visual' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}
            >
              <Eye size={16} />
              可视化
            </button>
            <button
              onClick={() => setEditMode('source')}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${editMode === 'source' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}
            >
              <Code2 size={16} />
              源码
            </button>
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 disabled:from-gray-600 disabled:to-gray-600 disabled:cursor-not-allowed rounded-xl font-bold transition-all shadow-lg"
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white/30 border-t-white" />
                保存中...
              </>
            ) : success ? (
              <>
                <CheckCircle2 size={20} />
                已保存
              </>
            ) : (
              <>
                <Save size={20} />
                {isCreateMode ? '创建' : '保存'}
              </>
            )}
          </button>
        </div>
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-6">
          <div className="flex items-center gap-3">
            <AlertCircle size={20} className="text-red-400" />
            <span className="text-red-400">{error}</span>
            <button onClick={() => setError(null)} className="ml-auto text-gray-400 hover:text-white">×</button>
          </div>
        </div>
      )}

      {/* AI 助手区域 - 两种模式都显示 */}
      <GlassCard className="p-6 border-2 border-purple-500/30 mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
            <Sparkles className="text-purple-400" size={20} />
          </div>
          <div className="flex-1">
            <h3 className="font-bold">AI 助手</h3>
            <p className="text-xs text-gray-400">
              描述你的子代理，让 AI 帮你生成配置
              {editMode === 'source' && ' (将直接生成 Markdown 源码)'}
            </p>
          </div>
          {/* 源码模式下显示同步按钮 */}
          {editMode === 'source' && (
            <button
              onClick={syncVisualToSource}
              className="flex items-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-sm transition-all"
              title="从可视化表单重新生成源码"
            >
              <RefreshCw size={14} />
              重新生成
            </button>
          )}
        </div>
        <div className="flex gap-3">
          <input
            type="text"
            placeholder="例如：'一个专门审查代码安全性的后端专家'"
            value={aiPrompt}
            onChange={(e) => setAiPrompt(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && aiPrompt.trim() && handleAIGenerate()}
            className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50 transition-all"
            disabled={generating}
          />
          <button
            onClick={handleAIGenerate}
            disabled={generating || !aiPrompt.trim()}
            className="flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-500 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-xl font-bold transition-all"
          >
            {generating ? (
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-white/30 border-t-white" />
            ) : (
              <Wand2 size={20} />
            )}
            生成
          </button>
        </div>
      </GlassCard>

      {/* 可视化编辑模式 */}
      {editMode === 'visual' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* 左侧 */}
          <div className="space-y-6">
            {/* 基本信息 */}
            <GlassCard className="p-6">
              <div className="flex items-center gap-2 mb-6">
                <Cpu size={18} className="text-blue-400" />
                <h3 className="font-bold">基本信息</h3>
                <span className="text-xs text-red-400">* 必填</span>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-400 mb-2">名称 *</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(isCreateMode ? e.target.value.toLowerCase() : e.target.value)}
                    placeholder="my-agent"
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-blue-500/50 transition-all"
                    disabled={!isCreateMode && agent?.is_builtin}
                  />
                  {isCreateMode && <p className="text-xs text-gray-500 mt-1">小写字母、数字和连字符</p>}
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-400 mb-2">描述 *</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Claude 何时委托给此子代理..."
                    rows={3}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-blue-500/50 resize-none transition-all"
                  />
                </div>

                {/* 模型选择 */}
                <div>
                  <label className="block text-sm font-bold text-gray-400 mb-2">模型</label>
                  <div className="grid grid-cols-2 gap-2">
                    {MODEL_OPTIONS.map(option => {
                      const isSelected = model === option.value;
                      return (
                        <button
                          key={option.value}
                          onClick={() => setModel(option.value)}
                          className={`p-3 rounded-xl text-left transition-all border ${isSelected
                            ? `bg-${option.color}-500/20 border-${option.color}-500/50`
                            : 'bg-white/5 border-white/10 hover:border-white/20'
                            }`}
                        >
                          <p className={`font-bold text-sm ${isSelected ? `text-${option.color}-400` : ''}`}>
                            {option.label}
                          </p>
                          <p className="text-xs text-gray-500">{option.desc}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </GlassCard>

            {/* 外观设置 */}
            <GlassCard className="p-6">
              <button
                onClick={() => setShowAppearance(!showAppearance)}
                className="flex items-center justify-between w-full mb-4"
              >
                <div className="flex items-center gap-2">
                  <Palette size={18} className="text-pink-400" />
                  <h3 className="font-bold">外观设置</h3>
                </div>
                {showAppearance ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </button>

              <AnimatePresence>
                {showAppearance && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="space-y-4 overflow-hidden"
                  >
                    <div>
                      <label className="block text-sm font-bold text-gray-400 mb-2">颜色</label>
                      <div className="flex flex-wrap gap-2">
                        {AVAILABLE_COLORS.map(c => (
                          <button
                            key={c.value}
                            onClick={() => setColor(c.value)}
                            className={`w-8 h-8 rounded-lg ${c.class} transition-all ${color === c.value ? 'ring-2 ring-white ring-offset-2 ring-offset-gray-900 scale-110' : 'hover:scale-105'}`}
                            title={c.label}
                          />
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-gray-400 mb-2">图标</label>
                      <div className="grid grid-cols-5 gap-2">
                        {AVAILABLE_ICONS.map(i => {
                          const IconComp = i.icon;
                          const isSelected = icon === i.value;
                          return (
                            <button
                              key={i.value}
                              onClick={() => setIcon(i.value)}
                              className={`p-3 rounded-xl transition-all border flex items-center justify-center ${isSelected
                                ? `bg-${color}-500/20 border-${color}-500/50`
                                : 'bg-white/5 border-white/10 hover:border-white/20'
                                }`}
                              title={i.label}
                            >
                              <IconComp size={20} className={isSelected ? `text-${color}-400` : 'text-gray-400'} />
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </GlassCard>

            {/* 目录配置卡片 */}
            <GlassCard className="p-6 border-blue-500/20">
              <div className="flex items-center gap-2 mb-6">
                <FolderOpen size={18} className="text-blue-400" />
                <h3 className="font-bold">目录配置</h3>
              </div>

              <div className="space-y-3">
                {/* Scope 选择下拉框 */}
                {(isCreateMode || (agent && !agent.is_builtin)) ? (
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase mb-2">
                      保存位置
                    </label>
                    <select
                      value={scope}
                      onChange={(e) => handleScopeChange(e.target.value as AgentScope)}
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-blue-500/50 text-white"
                    >
                      {SCOPE_OPTIONS.map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label} - {option.desc}
                        </option>
                      ))}
                    </select>
                    {/* 显示完整路径 */}
                    <p className="text-xs text-gray-300 mt-2 font-mono break-all">
                      {(() => {
                        // 编辑模式：显示实际路径
                        if (!isCreateMode && agent?.meta?.path) {
                          const path = agent.meta.path;
                          if (path.includes('/.claude/agents/')) {
                            return path.substring(0, path.lastIndexOf('/.claude/agents/') + 16);
                          } else if (path.includes('/.claude/plugins/')) {
                            const agentsIndex = path.lastIndexOf('/agents/');
                            if (agentsIndex !== -1) {
                              return path.substring(0, agentsIndex + 8);
                            }
                            return path.substring(0, path.lastIndexOf('/.claude/plugins/') + 17);
                          }
                          return path;
                        }
                        // 创建模式：显示通用路径
                        if (scope === 'user') return '~/.claude/agents/';
                        if (scope === 'project') return '.claude/agents/ (当前项目)';
                        return '';
                      })()}
                    </p>
                  </div>
                ) : (
                  /* 内置 Agent 提示 */
                  <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertCircle size={16} className="text-yellow-400" />
                      <p className="text-sm font-bold text-yellow-400">内置 Agent</p>
                    </div>
                    <p className="text-xs text-gray-400">
                      内置 Agent 由系统提供，无法修改保存位置
                    </p>
                  </div>
                )}

                {/* 项目名称 - 仅 project scope 显示 */}
                {!isCreateMode && agent && agent.scope === 'project' && agent.meta?.path && (
                  <div className="p-3 bg-white/5 rounded-xl">
                    <div className="flex items-center gap-2 mb-2">
                      <Code size={12} className="text-purple-400" />
                      <span className="text-xs text-gray-400 uppercase">项目名称</span>
                    </div>
                    <p className="text-sm font-bold text-purple-400">
                      {extractProjectName(agent.meta.path)}
                    </p>
                  </div>
                )}

                {/* 优先级 - 仅编辑模式显示 */}
                {!isCreateMode && agent && agent.priority !== undefined && (
                  <div className="p-3 bg-white/5 rounded-xl">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-400 uppercase">优先级</span>
                      <span className="text-sm font-bold text-blue-400">
                        {agent.priority}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      数字越大优先级越高
                    </p>
                  </div>
                )}
              </div>
            </GlassCard>

            {/* Scope 修改确认弹窗 */}
            <AnimatePresence>
              {showScopeChangeConfirm && pendingScope && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50"
                  onClick={cancelScopeChange}
                >
                  <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    onClick={(e) => e.stopPropagation()}
                    className="bg-[#1a1b26] border border-yellow-500/30 rounded-2xl p-6 max-w-md mx-4 shadow-2xl"
                  >
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2 bg-yellow-500/20 rounded-xl">
                        <AlertCircle size={24} className="text-yellow-400" />
                      </div>
                      <h3 className="text-xl font-bold">确认修改保存位置</h3>
                    </div>

                    <div className="space-y-3 mb-6">
                      <p className="text-gray-300">
                        您即将修改 Agent 的保存位置：
                      </p>
                      <div className="p-3 bg-white/5 rounded-xl">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs text-gray-400">当前位置</span>
                          <span className="text-sm font-bold text-red-400">{agent?.scope}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-400">新位置</span>
                          <span className="text-sm font-bold text-green-400">{pendingScope}</span>
                        </div>
                      </div>
                      <p className="text-sm text-yellow-400">
                        ⚠️ 此操作将移动 Agent 配置文件到新位置
                      </p>
                    </div>

                    <div className="flex gap-3">
                      <button
                        onClick={cancelScopeChange}
                        className="flex-1 px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl font-bold transition-all"
                      >
                        取消
                      </button>
                      <button
                        onClick={confirmScopeChange}
                        className="flex-1 px-4 py-2.5 bg-green-600 hover:bg-green-500 rounded-xl font-bold transition-all"
                      >
                        确认修改
                      </button>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* 工具配置 */}
            <GlassCard className="p-6">
              <div className="flex items-center gap-2 mb-6">
                <Wrench size={18} className="text-orange-400" />
                <h3 className="font-bold">工具配置</h3>
              </div>

              <div className="space-y-6">
                {/* 允许的工具 */}
                <div>
                  <label className="block text-sm font-bold text-gray-400 mb-3">
                    允许的工具（为空则继承全部）
                  </label>

                  {/* 已选择的工具标签 */}
                  {tools.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-3 p-3 bg-white/5 rounded-xl">
                      {tools.map(tool => (
                        <span key={tool} className="inline-flex items-center gap-1 px-3 py-1.5 bg-green-500/20 text-green-400 rounded-lg text-sm border border-green-500/30">
                          {tool}
                          <button onClick={() => handleRemoveTool(tool)} className="hover:text-white">
                            <X size={14} />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}

                  {/* 可选择的工具标签 */}
                  <div className="p-3 bg-black/40 rounded-xl border border-white/10">
                    <p className="text-xs text-gray-500 mb-2">点击添加工具</p>
                    <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto">
                      {AVAILABLE_TOOLS.filter(t => !tools.includes(t)).map(tool => (
                        <button
                          key={tool}
                          onClick={() => handleAddTool(tool)}
                          className="px-3 py-1.5 bg-white/5 hover:bg-green-500/20 border border-white/10 hover:border-green-500/30 text-gray-400 hover:text-green-400 rounded-lg text-sm transition-all"
                        >
                          {tool}
                        </button>
                      ))}
                      {AVAILABLE_TOOLS.filter(t => !tools.includes(t)).length === 0 && (
                        <span className="text-gray-500 text-sm">所有工具已添加</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* 禁止的工具 */}
                <div>
                  <label className="block text-sm font-bold text-gray-400 mb-3">
                    禁止的工具
                  </label>

                  {/* 已禁止的工具标签 */}
                  {disallowedTools.length > 0 ? (
                    <div className="flex flex-wrap gap-2 mb-3 p-3 bg-white/5 rounded-xl">
                      {disallowedTools.map(tool => (
                        <span key={tool} className="inline-flex items-center gap-1 px-3 py-1.5 bg-red-500/20 text-red-400 rounded-lg text-sm border border-red-500/30">
                          <Ban size={12} />
                          {tool}
                          <button onClick={() => handleRemoveDisallowedTool(tool)} className="hover:text-white">
                            <X size={14} />
                          </button>
                        </span>
                      ))}
                    </div>
                  ) : (
                    <div className="p-3 bg-white/5 rounded-xl mb-3">
                      <span className="text-gray-500 text-sm">无禁止工具</span>
                    </div>
                  )}

                  {/* 可选择的工具标签 */}
                  <div className="p-3 bg-black/40 rounded-xl border border-white/10">
                    <p className="text-xs text-gray-500 mb-2">点击禁止工具</p>
                    <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto">
                      {AVAILABLE_TOOLS.filter(t => !disallowedTools.includes(t)).map(tool => (
                        <button
                          key={tool}
                          onClick={() => handleAddDisallowedTool(tool)}
                          className="px-3 py-1.5 bg-white/5 hover:bg-red-500/20 border border-white/10 hover:border-red-500/30 text-gray-400 hover:text-red-400 rounded-lg text-sm transition-all"
                        >
                          {tool}
                        </button>
                      ))}
                      {AVAILABLE_TOOLS.filter(t => !disallowedTools.includes(t)).length === 0 && (
                        <span className="text-gray-500 text-sm">所有工具已禁止</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </GlassCard>
          </div>

          {/* 右侧 */}
          <div className="space-y-6">
            {/* Skills 配置 */}
            <GlassCard className="p-6">
              <div className="flex items-center gap-2 mb-6">
                <Zap size={18} className="text-cyan-400" />
                <h3 className="font-bold">预加载技能</h3>
                <span className="px-2 py-0.5 bg-cyan-500/20 rounded-full text-xs font-black text-cyan-400">
                  {skills.length}
                </span>
              </div>

              {availableSkills.length === 0 ? (
                <p className="text-sm text-gray-500">暂无可用技能</p>
              ) : (
                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                  {availableSkills.map(skill => {
                    const isSelected = skills.includes(skill.name);
                    return (
                      <button
                        key={skill.id}
                        onClick={() => handleToggleSkill(skill.name)}
                        className={`p-3 rounded-xl text-left transition-all border text-sm ${isSelected
                          ? 'bg-cyan-500/20 border-cyan-500/50'
                          : 'bg-white/5 border-white/10 hover:border-white/20'
                          }`}
                      >
                        <p className={`font-bold truncate ${isSelected ? 'text-cyan-400' : ''}`}>{skill.name}</p>
                        <p className="text-xs text-gray-500 truncate">{skill.scope}</p>
                      </button>
                    );
                  })}
                </div>
              )}

              {skills.length > 0 && (
                <div className="mt-4 pt-4 border-t border-white/10">
                  <p className="text-xs text-gray-400 mb-2">已选择的技能：</p>
                  <div className="flex flex-wrap gap-2">
                    {skills.map(skill => (
                      <span key={skill} className="px-3 py-1 bg-cyan-500/20 border border-cyan-500/30 rounded-lg text-sm font-bold text-cyan-400 flex items-center gap-2">
                        {skill}
                        <button onClick={() => handleToggleSkill(skill)} className="hover:text-cyan-300"><X size={14} /></button>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </GlassCard>

            {/* 系统提示 */}
            <GlassCard className="p-6">
              <div className="flex items-center gap-2 mb-6">
                <MessageSquare size={18} className="text-purple-400" />
                <h3 className="font-bold">系统提示</h3>
              </div>
              <textarea
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                placeholder="You are a specialized agent..."
                rows={8}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-purple-500/50 resize-none font-mono text-sm transition-all"
              />
            </GlassCard>

            {/* 高级配置（可折叠） */}
            <GlassCard className="p-6">
              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="flex items-center justify-between w-full"
              >
                <div className="flex items-center gap-2">
                  <Shield size={18} className="text-red-400" />
                  <h3 className="font-bold">高级配置</h3>
                  <span className="text-xs text-gray-500 px-2 py-0.5 bg-white/5 rounded-full">可选</span>
                </div>
                {showAdvanced ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </button>

              <AnimatePresence>
                {showAdvanced && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="space-y-4 mt-6">
                      <div>
                        <label className="block text-sm font-bold text-gray-400 mb-2">权限模式</label>
                        <div className="space-y-2">
                          {PERMISSION_MODES.map(option => (
                            <button
                              key={option.value}
                              onClick={() => setPermissionMode(option.value)}
                              className={`w-full p-3 rounded-xl text-left transition-all border flex justify-between items-center ${permissionMode === option.value
                                ? option.value === 'bypassPermissions'
                                  ? 'bg-red-500/20 border-red-500/50 text-red-400'
                                  : 'bg-blue-500/20 border-blue-500/50 text-blue-400'
                                : 'bg-white/5 border-white/10 hover:border-white/20'
                                }`}
                            >
                              <div>
                                <p className="font-bold text-sm">{option.label}</p>
                                <p className="text-xs text-gray-500">{option.desc}</p>
                              </div>
                              {permissionMode === option.value && <CheckCircle2 size={16} />}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-bold text-gray-400 mb-2 flex items-center gap-2">
                          <Clock size={14} />
                          最大轮次
                        </label>
                        <input
                          type="number"
                          value={maxTurns || ''}
                          onChange={(e) => setMaxTurns(e.target.value ? parseInt(e.target.value) : null)}
                          placeholder="不限制"
                          className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-blue-500/50"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-bold text-gray-400 mb-2 flex items-center gap-2">
                          <Brain size={14} />
                          持久内存
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          {MEMORY_OPTIONS.map(option => (
                            <button
                              key={option.value}
                              onClick={() => setMemory(option.value || null)}
                              className={`p-3 rounded-xl text-left transition-all border ${(memory || '') === option.value
                                ? 'bg-purple-500/20 border-purple-500/50'
                                : 'bg-white/5 border-white/10 hover:border-white/20'
                                }`}
                            >
                              <p className={`font-bold text-sm ${(memory || '') === option.value ? 'text-purple-400' : ''}`}>
                                {option.label}
                              </p>
                              <p className="text-xs text-gray-500">{option.desc}</p>
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-bold text-gray-400 mb-2 flex items-center gap-2">
                          <Server size={14} />
                          MCP Servers
                        </label>
                        <div className="flex flex-wrap gap-2 mb-3">
                          {mcpServers.map(server => (
                            <span key={server} className="inline-flex items-center gap-1 px-3 py-1 bg-indigo-500/20 text-indigo-400 rounded-lg text-sm border border-indigo-500/30">
                              {server}
                              <button onClick={() => handleRemoveMcpServer(server)} className="hover:text-white"><X size={14} /></button>
                            </span>
                          ))}
                          {mcpServers.length === 0 && <span className="text-gray-500 text-sm">无</span>}
                        </div>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={newMcpServer}
                            onChange={(e) => setNewMcpServer(e.target.value)}
                            placeholder="服务器名称，如 slack"
                            className="flex-1 px-4 py-2 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-blue-500/50"
                          />
                          <button
                            onClick={handleAddMcpServer}
                            disabled={!newMcpServer}
                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-600 rounded-xl text-sm font-bold transition-all"
                          >
                            <Plus size={16} />
                          </button>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-4 pt-2">
                        <label className="flex items-center gap-2 cursor-pointer bg-white/5 px-4 py-3 rounded-xl border border-white/10 hover:border-white/20 transition-all">
                          <input
                            type="checkbox"
                            checked={background}
                            onChange={(e) => setBackground(e.target.checked)}
                            className="w-4 h-4 rounded accent-blue-500"
                          />
                          <span className="text-sm font-bold">后台运行</span>
                        </label>

                        <label className="flex items-center gap-2 cursor-pointer bg-white/5 px-4 py-3 rounded-xl border border-white/10 hover:border-white/20 transition-all">
                          <input
                            type="checkbox"
                            checked={isolation === 'worktree'}
                            onChange={(e) => setIsolation(e.target.checked ? 'worktree' : null)}
                            className="w-4 h-4 rounded accent-blue-500"
                          />
                          <GitBranch size={14} className="text-gray-400" />
                          <span className="text-sm font-bold">工作树隔离</span>
                        </label>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </GlassCard>
          </div>
        </div>
      )}

      {/* 源码编辑模式 */}
      {editMode === 'source' && (
        <div className="space-y-6">
          {/* 保存位置 - 创建模式显示 */}
          {isCreateMode && (
            <GlassCard className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <FolderOpen size={18} className="text-green-400" />
                <h3 className="font-bold">保存位置</h3>
              </div>
              <div className="flex gap-3">
                {SCOPE_OPTIONS.map(option => (
                  <button
                    key={option.value}
                    onClick={() => setScope(option.value)}
                    className={`flex-1 p-4 rounded-xl text-left transition-all border ${scope === option.value
                      ? 'bg-green-500/20 border-green-500/50'
                      : 'bg-white/5 border-white/10 hover:border-white/20'
                      }`}
                  >
                    <p className={`font-bold ${scope === option.value ? 'text-green-400' : ''}`}>
                      {option.label}
                    </p>
                    <p className="text-xs text-gray-500 font-mono">{option.desc}</p>
                  </button>
                ))}
              </div>
            </GlassCard>
          )}

          {/* 源码编辑器 */}
          <GlassCard className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Code2 size={18} className="text-yellow-400" />
                <h3 className="font-bold">Markdown 源文件</h3>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <span>YAML frontmatter + 系统提示</span>
              </div>
            </div>

            {sourceLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500/30 border-t-blue-500" />
              </div>
            ) : (
              <textarea
                value={sourceContent}
                onChange={(e) => setSourceContent(e.target.value)}
                rows={25}
                className="w-full px-4 py-3 bg-black/30 border border-white/10 rounded-xl focus:outline-none focus:border-yellow-500/50 resize-none font-mono text-sm"
                spellCheck={false}
                placeholder={`---
name: "my-agent"
description: "Claude 何时委托给此子代理"
model: "sonnet"
tools:
  - Read
  - Write
  - Bash
---

You are a specialized agent...`}
              />
            )}

            <div className="mt-4 p-4 bg-white/5 rounded-xl border border-white/10">
              <p className="text-xs text-gray-400 mb-2">支持的字段：</p>
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="px-2 py-1 bg-red-500/20 text-red-400 rounded">name *</span>
                <span className="px-2 py-1 bg-red-500/20 text-red-400 rounded">description *</span>
                <span className="px-2 py-1 bg-white/10 text-gray-400 rounded">model</span>
                <span className="px-2 py-1 bg-white/10 text-gray-400 rounded">tools</span>
                <span className="px-2 py-1 bg-white/10 text-gray-400 rounded">disallowedTools</span>
                <span className="px-2 py-1 bg-white/10 text-gray-400 rounded">permissionMode</span>
                <span className="px-2 py-1 bg-white/10 text-gray-400 rounded">maxTurns</span>
                <span className="px-2 py-1 bg-white/10 text-gray-400 rounded">skills</span>
                <span className="px-2 py-1 bg-white/10 text-gray-400 rounded">mcpServers</span>
                <span className="px-2 py-1 bg-white/10 text-gray-400 rounded">memory</span>
                <span className="px-2 py-1 bg-white/10 text-gray-400 rounded">background</span>
                <span className="px-2 py-1 bg-white/10 text-gray-400 rounded">isolation</span>
              </div>
            </div>
          </GlassCard>
        </div>
      )}
    </div>
  );
};
