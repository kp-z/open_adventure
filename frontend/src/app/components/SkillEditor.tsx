import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft,
  Sparkles,
  Code2,
  FileText,
  Library,
  Image as ImageIcon,
  Plus,
  Save,
  Zap,
  Send,
  ChevronRight,
  FolderOpen,
  FileCode,
  FileJson,
  RotateCcw,
  CheckCircle2,
  Settings,
  X,
  MessageSquare,
  Bot,
  AlertCircle,
  Loader2,
  Wand2,
  User,
  Package,
  Upload
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useMode } from '../contexts/ModeContext';
import { useNotifications } from '../contexts/NotificationContext';
import { GlassCard, GameCard, ActionButton } from './ui-shared';
import { TagSelector } from './TagSelector';
import { cn } from '../lib/utils';
import { skillsApi, pluginsApi, projectPathsApi, type ClaudeGenerateResponse, type SkillFileItem, type SaveSkillRequest, type SkillContentResponse, type Plugin, type ProjectPath } from '@/lib/api';

const SKILL_ICON_ASSET_NAME = '__skill_icon__.json';
const MAX_ICON_SIZE = 1024 * 1024;
const ALLOWED_ICON_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml', 'image/x-icon', 'image/vnd.microsoft.icon'];
const ALLOWED_ICON_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp', '.svg', '.ico'];

const isValidIconFile = (file: File): boolean => {
  const lowerName = file.name.toLowerCase();
  return ALLOWED_ICON_TYPES.includes(file.type) || ALLOWED_ICON_EXTENSIONS.some(ext => lowerName.endsWith(ext));
};

const getMimeTypeFromDataUrl = (dataUrl: string): string => {
  const match = dataUrl.match(/^data:(.*?);base64,/);
  return match?.[1] || 'application/octet-stream';
};

// 智能推荐（基于用户输入）
const getSmartRecommendations = (input: string): string[] => {
  const keywords = input.toLowerCase();
  const recommendations: string[] = [];

  if (keywords.includes('test') || keywords.includes('测试')) {
    recommendations.push("生成单元测试用例，包含边界条件和异常处理");
  }
  if (keywords.includes('doc') || keywords.includes('文档')) {
    recommendations.push("生成详细的 API 文档，包含参数说明和示例代码");
  }
  if (keywords.includes('review') || keywords.includes('审查')) {
    recommendations.push("审查代码安全性、性能和可维护性");
  }
  if (keywords.includes('refactor') || keywords.includes('重构')) {
    recommendations.push("识别重复代码并提供重构建议");
  }
  if (keywords.includes('debug') || keywords.includes('调试')) {
    recommendations.push("分析错误日志并定位问题根源");
  }

  return recommendations;
};

type SkillFile = {
  name: string;
  content: string;
  type: 'md' | 'js' | 'json' | 'asset';
};

type SkillStructure = {
  'SKILL.md': string;
  'scripts': SkillFile[];
  'references': SkillFile[];
  'assets': SkillFile[];
};

interface SkillEditorProps {
  onBack: () => void;
  initialMode?: 'ai' | 'manual';
  editingSkillId?: number;  // 编辑现有技能时传入
}

export const SkillEditor = ({ onBack, initialMode = 'ai', editingSkillId }: SkillEditorProps) => {
  const { mode } = useMode();
  const { addNotification, updateNotification } = useNotifications();
  const iconInputRef = useRef<HTMLInputElement | null>(null);

  const [editorMode, setEditorMode] = useState<'visual' | 'manual'>(editingSkillId ? 'visual' : 'visual');
  const [isMobileEditor, setIsMobileEditor] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedFile, setSelectedFile] = useState<string>('SKILL.md');
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);

  const [skillData, setSkillData] = useState<SkillStructure>({
    'SKILL.md': '# New Skill\n\nDescribe your skill here...',
    'scripts': [],
    'references': [],
    'assets': []
  });

  // 生成/保存状态
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [generatedSkillName, setGeneratedSkillName] = useState<string>('');
  const [skillPath, setSkillPath] = useState<string | null>(null);  // 技能的实际路径
  const [generationComplete, setGenerationComplete] = useState(false);
  const [isLoadingSkill, setIsLoadingSkill] = useState(false);
  const [showRecommendations, setShowRecommendations] = useState(true);  // 显示推荐
  const [smartRecommendations, setSmartRecommendations] = useState<string[]>([]);  // 智能推荐
  const [isDragOver, setIsDragOver] = useState(false);
  const [iconPreview, setIconPreview] = useState<string>('');
  const [iconFileName, setIconFileName] = useState<string>('');

  // Scope 相关状态
  const [scope, setScope] = useState<'user' | 'project' | 'plugin'>('user');
  const [selectedPlugin, setSelectedPlugin] = useState<string>('');
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [plugins, setPlugins] = useState<Plugin[]>([]);
  const [projects, setProjects] = useState<ProjectPath[]>([]);
  const [isCreatingPlugin, setIsCreatingPlugin] = useState(false);
  const [showLocationConfigInManual, setShowLocationConfigInManual] = useState(false);
  const [newPluginName, setNewPluginName] = useState('');
  const [newPluginDescription, setNewPluginDescription] = useState('');

  const visibleAssets = skillData.assets.filter(asset => asset.name !== SKILL_ICON_ASSET_NAME);


  useEffect(() => {
    if (editingSkillId) {
      setIsLoadingSkill(true);
      skillsApi.getContent(editingSkillId)
        .then((content: SkillContentResponse) => {
          console.log('[SkillEditor] Loaded skill content:', content);
          setGeneratedSkillName(content.name);
          setSkillPath(content.path);  // 设置实际路径

          const iconAsset = content.assets.find((a: SkillFileItem) => a.name === SKILL_ICON_ASSET_NAME);
          if (iconAsset) {
            try {
              const parsedIcon = JSON.parse(iconAsset.content) as { fileName?: string; dataUrl?: string };
              setIconFileName(parsedIcon.fileName || 'skill-icon');
              setIconPreview(parsedIcon.dataUrl || '');
            } catch (err) {
              console.warn('[SkillEditor] Failed to parse icon asset:', err);
              setIconFileName('');
              setIconPreview('');
            }
          } else {
            setIconFileName('');
            setIconPreview('');
          }

          setSkillData({
            'SKILL.md': content.skill_md || '# New Skill\n\nDescribe your skill here...',
            'scripts': content.scripts.map((s: SkillFileItem) => ({
              name: s.name,
              content: s.content,
              type: s.name.endsWith('.py') ? 'js' : s.name.endsWith('.json') ? 'json' : 'js' as const
            })),
            'references': content.references.map((r: SkillFileItem) => ({
              name: r.name,
              content: r.content,
              type: r.name.endsWith('.json') ? 'json' : 'md' as const
            })),
            'assets': content.assets
              .filter((a: SkillFileItem) => a.name !== SKILL_ICON_ASSET_NAME)
              .map((a: SkillFileItem) => ({
                name: a.name,
                content: a.content,
                type: 'asset' as const
              }))
          });
        })
        .catch((err: Error) => {
          console.error('[SkillEditor] Failed to load skill content:', err);
          setGenerateError(err.message || '加载技能内容失败');
        })
        .finally(() => {
          setIsLoadingSkill(false);
        });
    }
  }, [editingSkillId]);

  useEffect(() => {
    const checkIsMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobileEditor(mobile);
    };

    checkIsMobile();
    window.addEventListener('resize', checkIsMobile);
    return () => window.removeEventListener('resize', checkIsMobile);
  }, []);

  useEffect(() => {
    if (isMobileEditor && editorMode === 'manual') {
      setEditorMode('visual');
      addNotification({
        type: 'info',
        title: '移动端提示',
        message: '移动端暂不支持源码模式，已切换到可视化模式。'
      });
    }
  }, [isMobileEditor, editorMode, addNotification]);

  // 当生成完成时切换到编辑模式
  useEffect(() => {
    if (generationComplete && !isGenerating) {
      console.log('[SkillEditor] Generation complete, switching to manual mode');
      console.log('[SkillEditor] Current skillData after generation:', skillData);
      setEditorMode('manual');
      setGenerationComplete(false);
    }
  }, [generationComplete, isGenerating, skillData]);

  // 监听 prompt 变化，更新智能推荐
  useEffect(() => {
    if (prompt.trim().length > 10) {
      const recommendations = getSmartRecommendations(prompt);
      setSmartRecommendations(recommendations);
    } else {
      setSmartRecommendations([]);
    }
  }, [prompt]);

  // 加载 plugins 和 projects 列表
  useEffect(() => {
    pluginsApi.list()
      .then((data: any) => {
        const pluginItems = Array.isArray(data) ? data : (data?.items || []);
        setPlugins(pluginItems);
      })
      .catch(console.error);

    projectPathsApi.listProjectPaths()
      .then(data => setProjects(data.items))
      .catch(console.error);
  }, []);

  // 创建新 Plugin
  const handleCreatePlugin = async () => {
    if (!newPluginName.trim()) {
      setGenerateError('请输入 Plugin 名称');
      return;
    }

    if (!/^[a-z][a-z0-9-]*$/.test(newPluginName)) {
      setGenerateError('Plugin 名称格式错误：只能包含小写字母、数字和连字符，且必须以字母开头');
      return;
    }

    try {
      const newPlugin = await pluginsApi.create({
        name: newPluginName,
        description: newPluginDescription || undefined
      });

      const updatedPluginsResponse = await pluginsApi.list();
      const updatedPlugins = Array.isArray(updatedPluginsResponse)
        ? updatedPluginsResponse
        : (updatedPluginsResponse as any)?.items || [];
      setPlugins(updatedPlugins);
      setSelectedPlugin(newPlugin.name);
      setIsCreatingPlugin(false);
      setNewPluginName('');
      setNewPluginDescription('');

      addNotification({
        type: 'success',
        title: 'Plugin 创建成功',
        message: `已创建 plugin: ${newPlugin.name}`
      });
    } catch (err) {
      console.error('Failed to create plugin:', err);
      setGenerateError(err instanceof Error ? err.message : 'Plugin 创建失败');
    }
  };

  const readFileAsDataUrl = (file: File) => {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('读取图标文件失败'));
      reader.readAsDataURL(file);
    });
  };

  const handleApplyIconFile = async (file: File) => {
    if (!isValidIconFile(file)) {
      addNotification({
        type: 'error',
        title: '图标格式不支持',
        message: '仅支持 png/jpg/jpeg/webp/svg/ico 格式'
      });
      return;
    }

    if (file.size > MAX_ICON_SIZE) {
      addNotification({
        type: 'error',
        title: '图标文件过大',
        message: '图标大小不能超过 1MB'
      });
      return;
    }

    try {
      const dataUrl = await readFileAsDataUrl(file);
      setIconPreview(dataUrl);
      setIconFileName(file.name);
      setIsDragOver(false);
    } catch (err) {
      console.error('[SkillEditor] Failed to read icon file:', err);
      addNotification({
        type: 'error',
        title: '图标上传失败',
        message: err instanceof Error ? err.message : '读取图标文件失败'
      });
    }
  };

  const handleIconInputChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    await handleApplyIconFile(file);
    event.target.value = '';
  };

  const handleIconDrop = async (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragOver(false);
    const file = event.dataTransfer.files?.[0];
    if (!file) return;
    await handleApplyIconFile(file);
  };

  const handleClearIcon = () => {
    setIconPreview('');
    setIconFileName('');
    setIsDragOver(false);
  };

  const steps = [
    "Analyzing intent...",
    "Calling Claude AI...",
    "Generating skill structure...",
    "Processing scripts...",
    "Finalizing artifact..."
  ];

  // 将 API 返回的文件转换为 SkillFile 格式
  const convertToSkillFile = (item: SkillFileItem): SkillFile => {
    let fileType: 'md' | 'js' | 'json' | 'asset' = 'asset';
    if (item.name.endsWith('.md')) fileType = 'md';
    else if (item.name.endsWith('.js') || item.name.endsWith('.ts') || item.name.endsWith('.py')) fileType = 'js';
    else if (item.name.endsWith('.json') || item.name.endsWith('.yaml') || item.name.endsWith('.yml')) fileType = 'json';
    
    return {
      name: item.name,
      content: item.content,
      type: fileType
    };
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) return;

    const notificationId = addNotification({
      type: 'loading',
      title: 'Generating skill',
      message: 'Using Claude AI to generate skill...',
    });

    setIsGenerating(true);
    setGenerateError(null);

    try {
      console.log('[SkillEditor] Calling generateWithClaude API with prompt:', prompt);

      // 调用真实 API
      const response = await skillsApi.generateWithClaude({
        description: prompt,
        save_to_global: false  // 先预览，用户确认后再保存
      });

      console.log('[SkillEditor] API Response:', response);

      if (response.success) {
        updateNotification(notificationId, {
          type: 'success',
          title: 'Skill generated',
          message: `Successfully generated: ${response.name || 'new-skill'}`,
        });

        // 保存生成的技能名称
        setGeneratedSkillName(response.name);
        console.log('[SkillEditor] Generated skill name:', response.name);

        // 将 API 响应转换为编辑器数据结构
        const newSkillData: SkillStructure = {
          'SKILL.md': response.skill_md || '',
          'scripts': (response.scripts || []).map(convertToSkillFile),
          'references': (response.references || []).map(convertToSkillFile),
          'assets': (response.assets || []).map(convertToSkillFile)
        };

        console.log('[SkillEditor] Setting skillData:', newSkillData);

        // 批量更新状态
        setSkillData(newSkillData);

        // 延迟一下让动画完成，然后标记生成完成
        setTimeout(() => {
          setIsGenerating(false);
          setGenerationComplete(true);
          console.log('[SkillEditor] Generation finished, triggering mode switch');
        }, 800);
      } else {
        console.error('[SkillEditor] Generation failed:', response.message);

        updateNotification(notificationId, {
          type: 'error',
          title: 'Generation failed',
          message: response.message || 'Unknown error',
        });

        throw new Error(response.message || '生成失败');
      }
    } catch (err) {
      setIsGenerating(false);
      const errorMessage = err instanceof Error ? err.message : '生成 Skill 失败，请稍后重试';
      setGenerateError(errorMessage);

      updateNotification(notificationId, {
        type: 'error',
        title: 'Generation error',
        message: errorMessage,
      });

      console.error('[SkillEditor] Failed to generate skill:', err);
    }
  };

  // 保存 Skill 到全局目录
  const handleSave = async () => {
    console.log('[SkillEditor] handleSave called');
    console.log('[SkillEditor] Current skillData:', skillData);

    // 验证 scope 相关的选择
    if (scope === 'plugin' && !selectedPlugin) {
      setGenerateError('请选择或创建插件');
      return;
    }
    if (scope === 'project' && !selectedProject) {
      setGenerateError('请选择项目');
      return;
    }

    setIsSaving(true);
    setGenerateError(null);

    try {
      // 从 SKILL.md 中提取技能名称
      const skillMdContent = skillData['SKILL.md'];
      console.log('[SkillEditor] SKILL.md content length:', skillMdContent?.length || 0);
      console.log('[SkillEditor] SKILL.md content preview:', skillMdContent?.substring(0, 200));

      let skillName = generatedSkillName;
      console.log('[SkillEditor] Initial skill name from state:', skillName);

      // 尝试从 frontmatter 中提取 name
      const nameMatch = skillMdContent.match(/^---[\s\S]*?name:\s*(.+?)[\s\n]/m);
      if (nameMatch) {
        skillName = nameMatch[1].trim();
        console.log('[SkillEditor] Extracted skill name from frontmatter:', skillName);
      }

      // 如果没有名称，从标题提取
      if (!skillName) {
        const titleMatch = skillMdContent.match(/^#\s+(.+?)$/m);
        if (titleMatch) {
          skillName = titleMatch[1].toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
          console.log('[SkillEditor] Extracted skill name from title:', skillName);
        }
      }

      if (!skillName) {
        skillName = 'new-skill';
        console.log('[SkillEditor] Using default skill name:', skillName);
      }

      // 验证 SKILL.md 内容不能为空或仅为模板
      const defaultContent = '# New Skill\n\nDescribe your skill here...';
      if (!skillMdContent || skillMdContent.trim() === defaultContent.trim()) {
        console.error('[SkillEditor] SKILL.md content is empty or default template');
        throw new Error('请先生成或编辑 Skill 内容后再保存');
      }

      // 构建保存请求
      const iconAsset: SkillFile | null = iconPreview
        ? {
            name: SKILL_ICON_ASSET_NAME,
            content: JSON.stringify({
              fileName: iconFileName || 'skill-icon',
              mimeType: getMimeTypeFromDataUrl(iconPreview),
              dataUrl: iconPreview
            }),
            type: 'asset'
          }
        : null;

      const assetsToSave = [
        ...skillData.assets.filter(asset => asset.name !== SKILL_ICON_ASSET_NAME),
        ...(iconAsset ? [iconAsset] : [])
      ];

      const saveRequest: SaveSkillRequest = {
        name: skillName,
        skill_md: skillMdContent,
        scripts: skillData.scripts.map(s => ({
          name: s.name,
          content: s.content,
          type: s.type
        })),
        references: skillData.references.map(r => ({
          name: r.name,
          content: r.content,
          type: r.type
        })),
        assets: assetsToSave.map(a => ({
          name: a.name,
          content: a.content,
          type: a.type
        })),
        scope,
        plugin_name: scope === 'plugin' ? selectedPlugin : undefined,
        project_path: scope === 'project' ? selectedProject : undefined
      };

      console.log('[SkillEditor] Calling saveToGlobal API with:', saveRequest);

      // 调用保存 API
      const response = await skillsApi.saveToGlobal(saveRequest);

      console.log('[SkillEditor] saveToGlobal response:', response);

      if (response.success) {
        console.log('[SkillEditor] Skill saved successfully to:', response.saved_path);

        // 自动对新创建的 Skill 进行分类
        try {
          // 获取刚保存的 Skill（通过名称查找）
          const skillsResponse = await skillsApi.list({ limit: 1000 });
          const savedSkill = skillsResponse.items.find(s => s.name === skillName);

          if (savedSkill) {
            console.log('[SkillEditor] Auto-classifying skill:', savedSkill.id);
            // 调用分类 API（不等待结果，后台执行）
            skillsApi.classify(savedSkill.id).catch(err => {
              console.warn('[SkillEditor] Auto-classification failed:', err);
              addNotification({
                type: 'warning',
                title: '自动分类失败',
                message: 'Skill 已保存成功，但自动分类失败，可稍后在技能列表手动触发分类。'
              });
            });
          }
        } catch (err) {
          console.warn('[SkillEditor] Failed to auto-classify skill:', err);
          addNotification({
            type: 'warning',
            title: '自动分类失败',
            message: 'Skill 已保存成功，但自动分类失败，可稍后在技能列表手动触发分类。'
          });
        }

        setSaveSuccess(true);
        setTimeout(() => {
          onBack();  // 返回技能列表
        }, 1500);
      } else {
        throw new Error(response.message || '保存失败');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '保存 Skill 失败';
      setGenerateError(errorMessage);
      console.error('[SkillEditor] Failed to save skill:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const FileIcon = ({ type, className }: { type: string, className?: string }) => {
    switch (type) {
      case 'md': return <FileText size={16} className={cn("text-blue-400", className)} />;
      case 'js': return <FileCode size={16} className={cn("text-yellow-400", className)} />;
      case 'json': return <FileJson size={16} className={cn("text-purple-400", className)} />;
      case 'asset': return <ImageIcon size={16} className={cn("text-green-400", className)} />;
      default: return <FileText size={16} className={className} />;
    }
  };

  // 加载现有技能时显示加载状态
  if (isLoadingSkill) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        <p className="text-gray-400">加载技能内容...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto pb-20 px-4 md:px-0">
      {/* 头部 */}
      <header className="flex flex-col md:flex-row items-start md:items-center gap-4 mb-8">
        <div className="flex items-center gap-4 flex-1 w-full md:w-auto">
          <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl flex items-center justify-center bg-purple-500/20 border border-purple-500/30">
            <Sparkles size={24} className="text-purple-400 md:hidden" />
            <Sparkles size={28} className="text-purple-400 hidden md:block" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight truncate uppercase">
              {editingSkillId ? '编辑技能' : '创建新技能'}
            </h1>
            <p className="text-sm md:text-base text-gray-400 mt-1 line-clamp-1 md:line-clamp-none">
              {editingSkillId ? (skillPath || `~/.claude/skills/${generatedSkillName}`) : '配置你的 AI 技能'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          {/* 模式切换 */}
          <div className="flex bg-white/5 rounded-xl p-1 flex-1 md:flex-initial">
            <button
              onClick={() => setEditorMode('visual')}
              className={`px-3 md:px-4 py-2 rounded-lg text-xs md:text-sm font-bold transition-all flex items-center gap-2 flex-1 md:flex-initial justify-center ${editorMode === 'visual' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white'}`}
            >
              <Settings size={14} className="md:w-4 md:h-4" />
              <span className="hidden sm:inline">可视化</span>
            </button>
            <button
              onClick={() => setEditorMode('manual')}
              disabled={isMobileEditor}
              title={isMobileEditor ? '移动端暂不支持源码模式' : '切换到源码模式'}
              className={`px-3 md:px-4 py-2 rounded-lg text-xs md:text-sm font-bold transition-all flex items-center gap-2 flex-1 md:flex-initial justify-center ${editorMode === 'manual' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white'} ${isMobileEditor ? 'opacity-50 cursor-not-allowed hover:text-gray-400' : ''}`}
            >
              <Code2 size={14} className="md:w-4 md:h-4" />
              <span className="hidden sm:inline">源码</span>
            </button>
          </div>

          <button
            onClick={handleSave}
            disabled={isSaving || saveSuccess}
            className="flex items-center gap-2 px-4 md:px-6 py-2 md:py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 disabled:from-gray-600 disabled:to-gray-600 disabled:cursor-not-allowed rounded-xl font-bold transition-all shadow-lg text-sm md:text-base"
          >
            {isSaving ? (
              <>
                <Loader2 size={16} className="animate-spin md:w-5 md:h-5" />
                <span className="hidden sm:inline">保存中...</span>
              </>
            ) : saveSuccess ? (
              <>
                <CheckCircle2 size={16} className="md:w-5 md:h-5" />
                <span className="hidden sm:inline">已保存</span>
              </>
            ) : (
              <>
                <Save size={20} />
                {editingSkillId ? '保存' : '创建'}
              </>
            )}
          </button>
        </div>
      </header>

      {/* 左右两栏布局 - 移动端单列，桌面端双列 */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* 左侧主内容区 */}
        <div className="flex-1 min-w-0">
          {/* Skill 生成卡片 - 在可视化模式显示 */}
          {editorMode === 'visual' && (
            <GlassCard className="p-4 md:p-6 border-2 border-purple-500/30 mb-6 md:mb-8">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
                  <Sparkles className="text-purple-400" size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-sm md:text-base">Skill生成</h3>
                  <p className="text-xs text-gray-400 hidden sm:block">
                    描述你的技能，让 AI 帮你生成完整的 Skill 结构
                  </p>
                </div>
              </div>

              {/* 生成中提示 */}
              {isGenerating && (
                <div className="flex items-center gap-3 p-3 md:p-4 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-400 mb-4">
                  <Loader2 size={16} className="animate-spin md:w-5 md:h-5 flex-shrink-0" />
                  <span className="text-xs md:text-sm flex-1">
                    AI 正在生成技能结构...
                  </span>
                </div>
              )}

              {/* 错误提示 */}
              {generateError && (
                <div className="flex items-center gap-3 p-3 md:p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 mb-4">
                  <AlertCircle size={16} className="flex-shrink-0 md:w-5 md:h-5" />
                  <span className="text-xs md:text-sm flex-1">{generateError}</span>
                  <button
                    onClick={() => setGenerateError(null)}
                    className="text-red-400 hover:text-red-300 flex-shrink-0"
                  >
                    <X size={14} className="md:w-4 md:h-4" />
                  </button>
                </div>
              )}

              <div className="flex flex-col gap-3 mb-4">
                <textarea
                  placeholder="例如：一个能够总结技术博客并生成周报的技能\n支持抓取链接、提炼重点并输出周报 Markdown"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  onKeyDown={(e) => {
                    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && prompt.trim() && !isGenerating) {
                      e.preventDefault();
                      handleGenerate();
                    }
                  }}
                  rows={4}
                  className="w-full px-3 md:px-4 py-2 md:py-3 bg-white/5 border border-white/10 rounded-xl text-sm md:text-base text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50 transition-all resize-y min-h-[110px]"
                  disabled={isGenerating}
                />
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[11px] text-gray-500">快捷键：Ctrl/Cmd + Enter 生成，Enter 换行</p>
                  <button
                    onClick={handleGenerate}
                    disabled={isGenerating || !prompt.trim()}
                    className="flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-500 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-xl font-bold transition-all"
                  >
                    {isGenerating ? (
                      <Loader2 size={20} className="animate-spin" />
                    ) : (
                      <Wand2 size={20} />
                    )}
                    生成
                  </button>
                </div>
              </div>

              {/* 推荐区域 */}
              {showRecommendations && smartRecommendations.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-blue-400 flex items-center gap-2">
                      <Sparkles size={14} />
                      智能推荐
                    </h4>
                    <button
                      onClick={() => setShowRecommendations(false)}
                      className="text-xs text-gray-500 hover:text-gray-300"
                    >
                      隐藏
                    </button>
                  </div>
                  <div className="space-y-2">
                    {smartRecommendations.map((rec, i) => (
                      <button
                        key={i}
                        onClick={() => setPrompt(rec)}
                        className="w-full p-3 rounded-xl border border-blue-500/20 bg-blue-500/5 hover:bg-blue-500/10 transition-all text-left group"
                      >
                        <p className="text-xs text-gray-300 group-hover:text-blue-300">{rec}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {!showRecommendations && (
                <button
                  onClick={() => setShowRecommendations(true)}
                  className="text-sm text-gray-500 hover:text-gray-300 flex items-center gap-2 mx-auto"
                >
                  <Sparkles size={14} />
                  显示推荐
                </button>
              )}
            </GlassCard>
          )}

          {/* 内容区域 */}
          <div className="relative">
            <AnimatePresence mode="wait">
              {editorMode === 'visual' ? (
            <motion.div
              key="visual-mode"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-6"
            >
              {/* 基本信息卡片 */}
              <GlassCard className="p-6">
                <div className="flex items-center gap-2 mb-6">
                  <FileText size={18} className="text-blue-400" />
                  <h3 className="font-bold">基本信息</h3>
                  <span className="text-xs text-red-400">* 必填</span>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-400 mb-2">技能名称 *</label>
                    <input
                      type="text"
                      value={generatedSkillName}
                      onChange={(e) => setGeneratedSkillName(e.target.value)}
                      placeholder="my-skill"
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-purple-500/50 transition-all"
                    />
                    <p className="text-xs text-gray-500 mt-1">小写字母、数字和连字符</p>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-400 mb-2">描述 *</label>
                    <textarea
                      value={skillData['SKILL.md']}
                      onChange={(e) => setSkillData({ ...skillData, 'SKILL.md': e.target.value })}
                      placeholder="描述你的技能功能..."
                      rows={6}
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-purple-500/50 resize-none transition-all"
                    />
                  </div>
                </div>
              </GlassCard>

              {/* 图标上传卡片 */}
              <GlassCard className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Upload size={18} className="text-cyan-400" />
                  <h3 className="font-bold">图标上传</h3>
                  <span className="text-xs text-gray-500">png/jpg/jpeg/webp/svg/ico，≤ 1MB</span>
                </div>

                <input
                  ref={iconInputRef}
                  type="file"
                  accept=".png,.jpg,.jpeg,.webp,.svg,.ico,image/png,image/jpeg,image/webp,image/svg+xml,image/x-icon"
                  className="hidden"
                  onChange={handleIconInputChange}
                />

                <div
                  onClick={() => iconInputRef.current?.click()}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragOver(true);
                  }}
                  onDragLeave={(e) => {
                    e.preventDefault();
                    setIsDragOver(false);
                  }}
                  onDrop={handleIconDrop}
                  className={cn(
                    "rounded-xl border-2 border-dashed p-5 transition-all cursor-pointer",
                    isDragOver ? "border-cyan-400 bg-cyan-500/10" : "border-white/15 bg-white/5 hover:bg-white/10"
                  )}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-xl bg-black/30 border border-white/10 flex items-center justify-center overflow-hidden">
                      {iconPreview ? (
                        <img src={iconPreview} alt="Skill icon preview" className="w-full h-full object-cover" />
                      ) : (
                        <ImageIcon size={20} className="text-gray-500" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-white">点击或拖拽上传图标</p>
                      <p className="text-xs text-gray-400 mt-1 truncate">
                        {iconFileName || '未选择图标文件'}
                      </p>
                    </div>
                    {iconPreview && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleClearIcon();
                        }}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold bg-red-500/15 text-red-300 hover:bg-red-500/25 transition-all"
                      >
                        清除
                      </button>
                    )}
                  </div>
                </div>
              </GlassCard>

              {/* Scripts 卡片 */}
              <GlassCard className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2">
                    <FileCode size={18} className="text-yellow-400" />
                    <h3 className="font-bold">脚本文件</h3>
                  </div>
                  <button
                    onClick={() => {
                      const newScript: SkillFile = {
                        name: `script-${skillData.scripts.length + 1}.js`,
                        content: '// 新脚本\n',
                        type: 'js'
                      };
                      setSkillData({ ...skillData, scripts: [...skillData.scripts, newScript] });
                    }}
                    className="flex items-center gap-2 px-3 py-2 bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-500/30 rounded-lg text-sm font-bold text-yellow-400 transition-all"
                  >
                    <Plus size={16} />
                    添加脚本
                  </button>
                </div>

                <div className="space-y-3">
                  {skillData.scripts.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <p className="text-sm">暂无脚本文件</p>
                    </div>
                  ) : (
                    skillData.scripts.map((script, index) => (
                      <div key={index} className="p-4 bg-white/5 border border-white/10 rounded-xl">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <FileCode size={16} className="text-yellow-400" />
                            <input
                              type="text"
                              value={script.name}
                              onChange={(e) => {
                                const newScripts = [...skillData.scripts];
                                newScripts[index].name = e.target.value;
                                setSkillData({ ...skillData, scripts: newScripts });
                              }}
                              className="bg-transparent text-sm font-medium focus:outline-none"
                            />
                          </div>
                          <button
                            onClick={() => {
                              const newScripts = skillData.scripts.filter((_, i) => i !== index);
                              setSkillData({ ...skillData, scripts: newScripts });
                            }}
                            className="text-red-400 hover:text-red-300"
                          >
                            <X size={16} />
                          </button>
                        </div>
                        <textarea
                          value={script.content}
                          onChange={(e) => {
                            const newScripts = [...skillData.scripts];
                            newScripts[index].content = e.target.value;
                            setSkillData({ ...skillData, scripts: newScripts });
                          }}
                          rows={4}
                          className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-lg text-xs font-mono focus:outline-none focus:border-yellow-500/50 resize-none"
                        />
                      </div>
                    ))
                  )}
                </div>
              </GlassCard>

              {/* References 卡片 */}
              <GlassCard className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2">
                    <Library size={18} className="text-green-400" />
                    <h3 className="font-bold">参考文档</h3>
                  </div>
                  <button
                    onClick={() => {
                      const newRef: SkillFile = {
                        name: `reference-${skillData.references.length + 1}.md`,
                        content: '# 参考文档\n\n',
                        type: 'md'
                      };
                      setSkillData({ ...skillData, references: [...skillData.references, newRef] });
                    }}
                    className="flex items-center gap-2 px-3 py-2 bg-green-500/10 hover:bg-green-500/20 border border-green-500/30 rounded-lg text-sm font-bold text-green-400 transition-all"
                  >
                    <Plus size={16} />
                    添加文档
                  </button>
                </div>

                <div className="space-y-3">
                  {skillData.references.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <p className="text-sm">暂无参考文档</p>
                    </div>
                  ) : (
                    skillData.references.map((ref, index) => (
                      <div key={index} className="p-4 bg-white/5 border border-white/10 rounded-xl">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <FileText size={16} className="text-green-400" />
                            <input
                              type="text"
                              value={ref.name}
                              onChange={(e) => {
                                const newRefs = [...skillData.references];
                                newRefs[index].name = e.target.value;
                                setSkillData({ ...skillData, references: newRefs });
                              }}
                              className="bg-transparent text-sm font-medium focus:outline-none"
                            />
                          </div>
                          <button
                            onClick={() => {
                              const newRefs = skillData.references.filter((_, i) => i !== index);
                              setSkillData({ ...skillData, references: newRefs });
                            }}
                            className="text-red-400 hover:text-red-300"
                          >
                            <X size={16} />
                          </button>
                        </div>
                        <textarea
                          value={ref.content}
                          onChange={(e) => {
                            const newRefs = [...skillData.references];
                            newRefs[index].content = e.target.value;
                            setSkillData({ ...skillData, references: newRefs });
                          }}
                          rows={4}
                          className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-lg text-xs font-mono focus:outline-none focus:border-green-500/50 resize-none"
                        />
                      </div>
                    ))
                  )}
                </div>
              </GlassCard>

              {/* Assets 卡片 */}
              <GlassCard className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2">
                    <ImageIcon size={18} className="text-orange-400" />
                    <h3 className="font-bold">资源文件</h3>
                  </div>
                  <button
                    onClick={() => {
                      const newAsset: SkillFile = {
                        name: `asset-${visibleAssets.length + 1}.txt`,
                        content: '',
                        type: 'asset'
                      };
                      setSkillData({ ...skillData, assets: [...skillData.assets, newAsset] });
                    }}
                    className="flex items-center gap-2 px-3 py-2 bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/30 rounded-lg text-sm font-bold text-orange-400 transition-all"
                  >
                    <Plus size={16} />
                    添加资源
                  </button>
                </div>

                <div className="space-y-3">
                  {visibleAssets.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <p className="text-sm">暂无资源文件</p>
                    </div>
                  ) : (
                    visibleAssets.map((asset) => (
                      <div key={asset.name} className="p-4 bg-white/5 border border-white/10 rounded-xl">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <ImageIcon size={16} className="text-orange-400" />
                            <input
                              type="text"
                              value={asset.name}
                              onChange={(e) => {
                                setSkillData(prev => ({
                                  ...prev,
                                  assets: prev.assets.map(item => item.name === asset.name ? { ...item, name: e.target.value } : item)
                                }));
                              }}
                              className="bg-transparent text-sm font-medium focus:outline-none"
                            />
                          </div>
                          <button
                            onClick={() => {
                              setSkillData(prev => ({
                                ...prev,
                                assets: prev.assets.filter(item => item.name !== asset.name)
                              }));
                            }}
                            className="text-red-400 hover:text-red-300"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </GlassCard>
            </motion.div>
          ) : editorMode === 'manual' ? (
            <motion.div
              key="manual-mode"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {/* Manual 模式的文件编辑器 */}
              <div className="flex h-[600px] bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl overflow-hidden shadow-xl">
                {/* Sidebar File Tree */}
                <div className="w-64 border-r shrink-0 flex flex-col border-white/5 overflow-hidden">
                  <div className="p-4 flex items-center justify-between border-b border-white/5">
                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">Explorer</span>
                    <Plus
                      size={14}
                      className="text-gray-500 hover:text-white cursor-pointer"
                      onClick={() => setShowLocationConfigInManual(prev => !prev)}
                      title="配置保存位置"
                    />
                  </div>

                  {showLocationConfigInManual && (
                    <div className="m-2 p-3 rounded-xl border border-blue-500/30 bg-blue-500/10 space-y-3">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-blue-300">保存位置</p>

                      <div>
                        <label className="block text-[10px] font-bold text-gray-300 mb-1">配置层级</label>
                        <div className="grid grid-cols-3 gap-1">
                          {[
                            { value: 'user', label: '用户级' },
                            { value: 'plugin', label: '插件级' },
                            { value: 'project', label: '项目级' }
                          ].map(option => (
                            <button
                              key={option.value}
                              onClick={() => {
                                setScope(option.value as 'user' | 'project' | 'plugin');
                                if (option.value !== 'plugin') setIsCreatingPlugin(false);
                              }}
                              className={cn(
                                'px-2 py-1 rounded text-[10px] font-bold transition-all',
                                scope === option.value
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-white/10 text-gray-300 hover:bg-white/20'
                              )}
                            >
                              {option.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {scope === 'plugin' && (
                        <div className="space-y-2">
                          {!isCreatingPlugin ? (
                            <>
                              <select
                                value={selectedPlugin}
                                onChange={(e) => setSelectedPlugin(e.target.value)}
                                className="w-full px-2 py-1.5 bg-white/10 border border-white/20 rounded text-[11px]"
                              >
                                <option value="">-- 选择插件 --</option>
                                {Array.isArray(plugins) && plugins.map(plugin => (
                                  <option key={plugin.name} value={plugin.name}>
                                    {plugin.name}
                                  </option>
                                ))}
                              </select>
                              <button
                                onClick={() => setIsCreatingPlugin(true)}
                                className="w-full px-2 py-1.5 rounded bg-green-500/20 border border-green-500/40 text-green-300 text-[10px] font-bold"
                              >
                                创建新 Plugin
                              </button>
                            </>
                          ) : (
                            <div className="space-y-2">
                              <input
                                type="text"
                                value={newPluginName}
                                onChange={(e) => setNewPluginName(e.target.value.toLowerCase())}
                                placeholder="my-plugin"
                                className="w-full px-2 py-1.5 bg-white/10 border border-white/20 rounded text-[11px]"
                              />
                              <input
                                type="text"
                                value={newPluginDescription}
                                onChange={(e) => setNewPluginDescription(e.target.value)}
                                placeholder="Plugin 描述（可选）"
                                className="w-full px-2 py-1.5 bg-white/10 border border-white/20 rounded text-[11px]"
                              />
                              <div className="grid grid-cols-2 gap-2">
                                <button
                                  onClick={() => {
                                    setIsCreatingPlugin(false);
                                    setNewPluginName('');
                                    setNewPluginDescription('');
                                  }}
                                  className="px-2 py-1 rounded bg-white/10 text-gray-300 text-[10px]"
                                >
                                  取消
                                </button>
                                <button
                                  onClick={handleCreatePlugin}
                                  className="px-2 py-1 rounded bg-green-600 text-white text-[10px]"
                                >
                                  创建
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {scope === 'project' && (
                        <select
                          value={selectedProject}
                          onChange={(e) => setSelectedProject(e.target.value)}
                          className="w-full px-2 py-1.5 bg-white/10 border border-white/20 rounded text-[11px]"
                        >
                          <option value="">-- 选择项目 --</option>
                          {projects.map(project => (
                            <option key={project.id} value={project.path}>
                              {project.alias || project.path}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  )}

                  <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1">
                    {/* Root Files */}
                    <button
                      onClick={() => { setSelectedFile('SKILL.md'); setSelectedFolder(null); }}
                      className={cn(
                        "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-all",
                        selectedFile === 'SKILL.md' ? "bg-white/10 text-white" : "text-gray-500 hover:bg-white/5 hover:text-gray-300"
                      )}
                    >
                      <FileText size={14} className="text-blue-400" />
                      SKILL.md
                    </button>

                    {/* Folders */}
                    {(['scripts', 'references', 'assets'] as const).map(folder => (
                      <div key={folder} className="space-y-1">
                        <button
                          onClick={() => setSelectedFolder(selectedFolder === folder ? null : folder)}
                          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-gray-500 hover:bg-white/5 hover:text-gray-300 transition-all"
                        >
                          <FolderOpen size={14} className={selectedFolder === folder ? "text-yellow-500" : "text-gray-600"} />
                          <span className="capitalize">{folder}</span>
                          <ChevronRight size={12} className={cn("ml-auto transition-transform", selectedFolder === folder && "rotate-90")} />
                        </button>

                        {selectedFolder === folder && (
                          <div className="pl-6 space-y-1">
                            {skillData[folder].map(file => (
                              <button
                                key={file.name}
                                onClick={() => setSelectedFile(`${folder}/${file.name}`)}
                                className={cn(
                                  "w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-[11px] transition-all",
                                  selectedFile === `${folder}/${file.name}` ? "bg-white/10 text-white" : "text-gray-500 hover:bg-white/5 hover:text-gray-300"
                                )}
                              >
                                <FileIcon type={file.type} />
                                {file.name}
                              </button>
                            ))}
                            <button className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] text-gray-600 hover:text-gray-400 italic">
                              <Plus size={12} />
                              Add item...
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="p-4 border-t border-white/5">
                    <div className="flex items-center gap-3 bg-white/5 p-3 rounded-xl border border-white/5">
                      <div className="w-8 h-8 rounded-lg bg-blue-600/20 flex items-center justify-center text-blue-400">
                        <Settings size={16} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-bold text-white truncate">Skill Settings</p>
                        <p className="text-[9px] text-gray-500 truncate">Metadata & Env</p>
                      </div>
                    </div>
                  </div>
                </div>

              {/* Main Editor Area */}
              <div className="flex-1 flex flex-col relative border-r border-white/5">
                {/* Editor Tabs */}
                <div className="h-10 flex items-center bg-black/40 border-b border-white/5 px-2">
                  <div className="flex items-center gap-1 h-full">
                    <div className="bg-white/5 border-t-2 border-blue-500 px-4 h-full flex items-center gap-2 text-xs font-medium text-white">
                      {selectedFile.split('/').pop()}
                      <X size={12} className="text-gray-500 hover:text-white cursor-pointer" />
                    </div>
                  </div>
                </div>

                {/* Editor Surface */}
                <div className="flex-1 relative overflow-hidden flex flex-col">
                  <div className="flex-1 relative overflow-hidden">
                    <textarea 
                      value={
                        selectedFile === 'SKILL.md' 
                          ? skillData['SKILL.md'] 
                          : skillData[selectedFile.split('/')[0] as 'scripts' | 'references'].find(f => f.name === selectedFile.split('/')[1])?.content || ''
                      }
                      onChange={(e) => {
                        const newValue = e.target.value;
                        if (selectedFile === 'SKILL.md') {
                          setSkillData(prev => ({ ...prev, 'SKILL.md': newValue }));
                        } else {
                          const [folder, name] = selectedFile.split('/');
                          setSkillData(prev => ({
                            ...prev,
                            [folder]: prev[folder as 'scripts' | 'references'].map(f => f.name === name ? { ...f, content: newValue } : f)
                          }));
                        }
                      }}
                      className="w-full h-full bg-transparent p-8 pl-16 text-sm font-mono text-gray-300 focus:outline-none resize-none leading-relaxed"
                      spellCheck={false}
                    />
                    
                    {/* Line Numbers Simulation */}
                    <div className="absolute left-0 top-0 bottom-0 w-12 bg-black/20 border-r border-white/5 flex flex-col items-center pt-8 text-[10px] text-gray-600 font-mono select-none">
                      {Array.from({ length: 50 }).map((_, i) => (
                        <div key={i} className="h-[1.625rem] flex items-center">{i + 1}</div>
                      ))}
                    </div>
                  </div>

                  {/* Status Bar */}
                  <div className="h-6 flex items-center justify-between px-4 bg-black/60 border-t border-white/5 text-[10px] text-gray-500 font-mono shrink-0">
                    <div className="flex items-center gap-4">
                      <span className="flex items-center gap-1"><CheckCircle2 size={10} className="text-green-500" /> Ready</span>
                      <span>UTF-8</span>
                      <span>{selectedFile.endsWith('.js') ? 'JavaScript (Node.js)' : selectedFile.endsWith('.md') ? 'Markdown' : 'JSON'}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span>Line 12, Column 45</span>
                      <span>2 Spaces</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Dedicated AI Assistant Panel */}
              <div className={cn(
                "w-80 shrink-0 flex flex-col",
                false ? "bg-[#0c0c1a]" : "bg-black/20"
              )}>
                <div className="p-4 border-b border-white/5 flex items-center gap-2">
                  <div className={cn(
                    "w-6 h-6 rounded-lg flex items-center justify-center",
                    false ? "bg-yellow-500 text-black" : "bg-blue-600 text-white"
                  )}>
                    <Sparkles size={12} />
                  </div>
                  <span className="text-xs font-black uppercase tracking-widest text-white">Artifact Assistant</span>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  <div className={cn(
                    "p-4 rounded-xl border leading-relaxed",
                    false ? "bg-[#121225] border-yellow-500/20" : "bg-white/5 border-white/10"
                  )}>
                    <div className="flex items-center gap-2 mb-2">
                      <Bot size={14} className="text-blue-400" />
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">AI Suggestion</span>
                    </div>
                    <p className="text-xs text-gray-300">I can help you modify the current file. Try asking me to add error handling, optimize the logic, or add more documentation.</p>
                  </div>

                  <div className="space-y-2">
                    <span className="text-[10px] font-black uppercase text-gray-500 tracking-widest">Quick Commands</span>
                    <div className="grid grid-cols-1 gap-2">
                      {[
                        "Add Try/Catch Block",
                        "Optimize Performance",
                        "Generate README",
                        "Add Type Definitions"
                      ].map((cmd) => (
                        <button key={cmd} className="text-left px-3 py-2 rounded-lg bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10 text-[11px] text-gray-400 transition-all">
                          {cmd}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="p-4 border-t border-white/5 bg-black/20">
                  <div className="relative">
                    <textarea 
                      placeholder="Ask AI to edit this artifact..."
                      className="w-full bg-black/40 border border-white/10 rounded-xl py-3 pl-3 pr-10 text-xs text-white focus:outline-none focus:border-blue-500/50 resize-none h-24"
                    />
                    <button className="absolute right-2 bottom-3 text-blue-400 hover:text-blue-300">
                      <Send size={16} />
                    </button>
                  </div>
                  <p className="text-[9px] text-gray-600 mt-2 text-center uppercase font-bold tracking-tighter">Powered by Claude 3.5 Sonnet</p>
                </div>
              </div>
            </div>
          </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </div>

    {/* 右侧配置区 - 移动端全宽，桌面端固定宽度 */}
    {editorMode !== 'manual' && (
    <div className="w-full lg:w-80 shrink-0">
      <GlassCard className="p-4 md:p-5 sticky top-8">
        <h3 className="text-base md:text-lg font-bold mb-3 md:mb-4 flex items-center gap-2">
          <FolderOpen size={18} className="md:w-5 md:h-5" />
          保存位置
        </h3>

        {/* Scope 选择 */}
        <div className="mb-3 md:mb-4">
          <label className="block text-xs font-bold text-gray-400 uppercase mb-2">
            配置层级
          </label>
          <div className="grid grid-cols-3 lg:grid-cols-1 gap-2 md:gap-3">
            {[
              { value: 'user', label: '用户级', desc: '所有项目可用', icon: User },
              { value: 'plugin', label: '插件级', desc: '插件内可用', icon: Package },
              { value: 'project', label: '项目级', desc: '仅当前项目', icon: FolderOpen }
            ].map(option => {
              const IconComp = option.icon;
              const isSelected = scope === option.value;
              return (
                <button
                  key={option.value}
                  onClick={() => {
                    setScope(option.value as 'user' | 'project' | 'plugin');
                    if (option.value === 'plugin') setSelectedPlugin('');
                    if (option.value === 'project') setSelectedProject('');
                  }}
                  className={`p-3 md:p-4 rounded-xl border transition-all ${
                    isSelected
                      ? 'bg-blue-500/20 border-blue-500/50'
                      : 'bg-white/5 border-white/10 hover:border-white/20'
                  }`}
                >
                  <IconComp size={16} className="mx-auto mb-1 md:mb-2 md:w-5 md:h-5" />
                  <p className="font-bold text-xs md:text-sm">{option.label}</p>
                  <p className="text-[10px] md:text-xs text-gray-500 hidden lg:block">{option.desc}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Plugin 选择器 */}
        {scope === 'plugin' && (
          <div className="mb-3 md:mb-4">
            <label className="block text-xs font-bold text-gray-400 uppercase mb-2">
              选择或创建插件
            </label>

            {!isCreatingPlugin ? (
              <>
                <select
                  value={selectedPlugin}
                  onChange={(e) => setSelectedPlugin(e.target.value)}
                  className="w-full px-3 md:px-4 py-2 md:py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-blue-500/50 mb-2 text-sm"
                >
                  <option value="">-- 请选择插件 --</option>
                  {plugins.map(plugin => (
                    <option key={plugin.name} value={plugin.name}>
                      {plugin.name}
                    </option>
                  ))}
                </select>

                <button
                  onClick={() => setIsCreatingPlugin(true)}
                  className="w-full px-3 md:px-4 py-2 bg-green-500/20 hover:bg-green-500/30 border border-green-500/30 rounded-xl text-xs md:text-sm font-bold text-green-400 transition-all flex items-center justify-center gap-2"
                >
                  <Plus size={14} className="md:w-4 md:h-4" />
                  创建新 Plugin
                </button>
              </>
            ) : (
              <div className="p-3 md:p-4 bg-white/5 border border-white/10 rounded-xl">
                <div className="mb-3">
                  <label className="block text-xs text-gray-400 mb-1">Plugin 名称 *</label>
                  <input
                    type="text"
                    value={newPluginName}
                    onChange={(e) => setNewPluginName(e.target.value.toLowerCase())}
                    placeholder="my-plugin"
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-blue-500/50 text-sm"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    只能包含小写字母、数字和连字符
                  </p>
                </div>

                <div className="mb-3">
                  <label className="block text-xs text-gray-400 mb-1">描述（可选）</label>
                  <input
                    type="text"
                    value={newPluginDescription}
                    onChange={(e) => setNewPluginDescription(e.target.value)}
                    placeholder="Plugin 功能描述"
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-blue-500/50 text-sm"
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setIsCreatingPlugin(false);
                      setNewPluginName('');
                      setNewPluginDescription('');
                    }}
                    className="flex-1 px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-sm font-bold transition-all"
                  >
                    取消
                  </button>
                  <button
                    onClick={handleCreatePlugin}
                    className="flex-1 px-3 py-2 bg-green-600 hover:bg-green-500 rounded-lg text-sm font-bold transition-all"
                  >
                    创建
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Project 选择器 */}
        {scope === 'project' && (
          <div className="mb-4">
            <label className="block text-xs font-bold text-gray-400 uppercase mb-2">
              选择项目
            </label>
            <select
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-blue-500/50"
            >
              <option value="">-- 请选择项目 --</option>
              {projects.map(project => (
                <option key={project.id} value={project.path}>
                  {project.alias} ({project.path})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* 保存路径预览 */}
        <div className="p-3 bg-white/5 rounded-xl">
          <p className="text-xs text-gray-400 mb-1">保存路径</p>
          <p className="text-sm font-mono text-gray-300 break-all">
            {scope === 'user' && '~/.claude/skills/'}
            {scope === 'plugin' && selectedPlugin && `~/.claude/plugins/${selectedPlugin}/skills/`}
            {scope === 'plugin' && !selectedPlugin && (
              <span className="text-yellow-400">请先选择或创建插件</span>
            )}
            {scope === 'project' && selectedProject && `${selectedProject}/.claude/skills/`}
            {scope === 'project' && !selectedProject && (
              <span className="text-yellow-400">请先选择项目</span>
            )}
          </p>
        </div>
      </GlassCard>
    </div>
    )}
  </div>
</div>
  );
};
