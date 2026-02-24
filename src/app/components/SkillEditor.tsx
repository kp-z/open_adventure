import React, { useState, useEffect } from 'react';
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
  Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useMode } from '../contexts/ModeContext';
import { GlassCard, GameCard, ActionButton } from './ui-shared';
import { cn } from '../lib/utils';
import { skillsApi, type ClaudeGenerateResponse, type SkillFileItem, type SaveSkillRequest, type SkillContentResponse } from '@/lib/api';

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
  const [editorMode, setEditorMode] = useState<'ai' | 'manual'>(editingSkillId ? 'manual' : initialMode);
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState(0);
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

  // 加载现有技能数据
  useEffect(() => {
    if (editingSkillId) {
      setIsLoadingSkill(true);
      skillsApi.getContent(editingSkillId)
        .then((content: SkillContentResponse) => {
          console.log('[SkillEditor] Loaded skill content:', content);
          setGeneratedSkillName(content.name);
          setSkillPath(content.path);  // 设置实际路径
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
            'assets': content.assets.map((a: SkillFileItem) => ({
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

  // 当生成完成时切换到编辑模式
  useEffect(() => {
    if (generationComplete && !isGenerating) {
      console.log('[SkillEditor] Generation complete, switching to manual mode');
      console.log('[SkillEditor] Current skillData after generation:', skillData);
      setEditorMode('manual');
      setGenerationComplete(false);
    }
  }, [generationComplete, isGenerating, skillData]);

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
    
    setIsGenerating(true);
    setGenerationStep(0);
    setGenerateError(null);
    
    // 启动进度动画
    const interval = setInterval(() => {
      setGenerationStep(prev => {
        if (prev >= steps.length - 1) return prev;
        return prev + 1;
      });
    }, 2000);
    
    try {
      console.log('[SkillEditor] Calling generateWithClaude API with prompt:', prompt);
      
      // 调用真实 API
      const response = await skillsApi.generateWithClaude({
        description: prompt,
        save_to_global: false  // 先预览，用户确认后再保存
      });
      
      console.log('[SkillEditor] API Response:', response);
      
      clearInterval(interval);
      
      if (response.success) {
        // 保存生成的技能名称
        setGeneratedSkillName(response.name);
        console.log('[SkillEditor] Generated skill name:', response.name);
        console.log('[SkillEditor] SKILL.md content length:', response.skill_md?.length || 0);
        console.log('[SkillEditor] SKILL.md content preview:', response.skill_md?.substring(0, 200));
        
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
        setGenerationStep(steps.length - 1);
        
        // 延迟一下让动画完成，然后标记生成完成
        setTimeout(() => {
          setIsGenerating(false);
          setGenerationComplete(true);
          console.log('[SkillEditor] Generation finished, triggering mode switch');
        }, 800);
      } else {
        console.error('[SkillEditor] Generation failed:', response.message);
        throw new Error(response.message || '生成失败');
      }
    } catch (err) {
      clearInterval(interval);
      setIsGenerating(false);
      const errorMessage = err instanceof Error ? err.message : '生成 Skill 失败，请稍后重试';
      setGenerateError(errorMessage);
      console.error('[SkillEditor] Failed to generate skill:', err);
    }
  };

  // 保存 Skill 到全局目录
  const handleSave = async () => {
    console.log('[SkillEditor] handleSave called');
    console.log('[SkillEditor] Current skillData:', skillData);
    
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
        assets: skillData.assets.map(a => ({
          name: a.name,
          content: a.content,
          type: a.type
        }))
      };
      
      console.log('[SkillEditor] Calling saveToGlobal API with:', saveRequest);
      
      // 调用保存 API
      const response = await skillsApi.saveToGlobal(saveRequest);
      
      console.log('[SkillEditor] saveToGlobal response:', response);
      
      if (response.success) {
        console.log('[SkillEditor] Skill saved successfully to:', response.saved_path);
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
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className={cn(
        "h-16 flex items-center justify-between px-6 border-b shrink-0",
        mode === 'adventure' ? "bg-[#121225] border-yellow-500/20" : "bg-white/[0.02] border-white/5 backdrop-blur-md"
      )}>
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack}
            className="p-2 hover:bg-white/5 rounded-lg transition-colors text-gray-400 hover:text-white"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h2 className={cn(
              "font-bold",
              mode === 'adventure' ? "text-yellow-500 uppercase tracking-widest text-sm" : "text-lg"
            )}>
              {editingSkillId ? `Edit: ${generatedSkillName || 'Skill'}` : (editorMode === 'ai' ? 'Forge Skill with AI' : 'Skill Editor')}
            </h2>
            <p className="text-[10px] text-gray-500 font-mono">{editingSkillId ? (skillPath || `~/.claude/skills/${generatedSkillName}`) : '~/.claude/skills/new_skill'}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex bg-black/20 rounded-lg p-1 border border-white/5">
            <button 
              onClick={() => setEditorMode('ai')}
              className={cn(
                "px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-2",
                editorMode === 'ai' 
                  ? (mode === 'adventure' ? "bg-yellow-600 text-white" : "bg-blue-600 text-white") 
                  : "text-gray-500 hover:text-gray-300"
              )}
            >
              <Sparkles size={14} />
              AI Generate
            </button>
            <button 
              onClick={() => setEditorMode('manual')}
              className={cn(
                "px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-2",
                editorMode === 'manual' 
                  ? (mode === 'adventure' ? "bg-yellow-600 text-white" : "bg-blue-600 text-white") 
                  : "text-gray-500 hover:text-gray-300"
              )}
            >
              <Code2 size={14} />
              Direct Edit
            </button>
          </div>
          
          <div className="h-8 w-[1px] bg-white/10 mx-2" />
          
          <ActionButton 
            className="h-9 px-4 py-0 text-xs"
            onClick={handleSave}
            disabled={isSaving || saveSuccess}
          >
            {isSaving ? (
              <>
                <Loader2 size={14} className="mr-2 animate-spin" />
                Saving...
              </>
            ) : saveSuccess ? (
              <>
                <CheckCircle2 size={14} className="mr-2" />
                Saved!
              </>
            ) : (
              <>
                <Save size={14} className="mr-2" />
                Deploy Skill
              </>
            )}
          </ActionButton>
        </div>
      </div>

      <div className="flex-1 relative overflow-hidden">
        <AnimatePresence mode="wait">
          {editorMode === 'ai' ? (
            <motion.div 
              key="ai-mode"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="h-full flex flex-col items-center justify-center p-8 max-w-4xl mx-auto"
            >
              {!isGenerating ? (
                <div className="w-full space-y-8">
                  <div className="text-center space-y-2">
                    <div className={cn(
                      "w-16 h-16 rounded-2xl mx-auto flex items-center justify-center mb-6",
                      mode === 'adventure' ? "bg-yellow-500 shadow-[0_0_30px_rgba(234,179,8,0.4)]" : "bg-blue-600 shadow-xl"
                    )}>
                      <Sparkles size={32} className="text-white" />
                    </div>
                    <h1 className={cn(
                      "text-3xl font-black italic tracking-tighter uppercase",
                      mode === 'adventure' ? "text-yellow-500" : "text-white"
                    )}>
                      Describe your creation
                    </h1>
                    <p className="text-gray-400">The AI will generate the documentation, code, and resources needed for your skill.</p>
                  </div>

                  {/* 错误提示 */}
                  {generateError && (
                    <div className="flex items-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400">
                      <AlertCircle size={20} />
                      <span className="text-sm flex-1">{generateError}</span>
                      <button 
                        onClick={() => setGenerateError(null)}
                        className="text-red-400 hover:text-red-300"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  )}

                  <div className={cn(
                    "relative p-1 rounded-2xl border transition-all duration-500",
                    mode === 'adventure' ? "bg-black/60 border-yellow-500/30" : "bg-white/5 border-white/10"
                  )}>
                    <textarea 
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.ctrlKey && e.key === 'Enter' && prompt.trim()) {
                          handleGenerate();
                        }
                      }}
                      placeholder="e.g., A skill that summarizes daily news from tech blogs and formats them into a weekly digest PDF..."
                      className="w-full h-40 bg-transparent p-6 text-white placeholder:text-gray-600 focus:outline-none resize-none"
                    />
                    <div className="absolute bottom-4 right-4 flex items-center gap-3">
                      <span className="text-[10px] text-gray-600 font-mono">CTRL + ENTER to forge</span>
                      <button 
                        onClick={handleGenerate}
                        disabled={!prompt.trim()}
                        className={cn(
                          "flex items-center gap-2 px-6 py-2 rounded-xl font-black uppercase tracking-widest transition-all",
                          prompt.trim() 
                            ? (mode === 'adventure' ? "bg-yellow-500 text-black hover:scale-105 active:scale-95" : "bg-blue-600 text-white hover:bg-blue-500") 
                            : "bg-white/5 text-gray-600 cursor-not-allowed"
                        )}
                      >
                        Forge Artifact
                        <Zap size={16} />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {[
                      { title: "Smart Summarizer", desc: "A skill that processes long documents and extracts key points into concise bullet summaries." },
                      { title: "Code Auditor", desc: "A skill that reviews code for security vulnerabilities, code smells, and best practice violations." },
                      { title: "API Doc Generator", desc: "A skill that generates API documentation from code comments and function signatures." }
                    ].map((example, i) => (
                      <button 
                        key={i}
                        onClick={() => setPrompt(example.desc)}
                        className="p-4 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/5 transition-all text-left group"
                      >
                        <p className="text-xs font-bold text-gray-400 group-hover:text-blue-400 mb-1">{example.title}</p>
                        <p className="text-[10px] text-gray-500 line-clamp-2">{example.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-8">
                  <div className="relative">
                    <div className={cn(
                      "w-32 h-32 rounded-full border-4 border-t-transparent animate-spin",
                      mode === 'adventure' ? "border-yellow-500 shadow-[0_0_50px_rgba(234,179,8,0.2)]" : "border-blue-600 shadow-xl"
                    )} />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Zap size={40} className={cn(
                        "animate-pulse",
                        mode === 'adventure' ? "text-yellow-500" : "text-blue-500"
                      )} />
                    </div>
                  </div>
                  
                  <div className="text-center space-y-4">
                    <h3 className={cn(
                      "text-xl font-black italic tracking-widest uppercase",
                      mode === 'adventure' ? "text-yellow-500" : "text-white"
                    )}>
                      {steps[generationStep]}
                    </h3>
                    <div className="flex gap-2 justify-center">
                      {steps.map((_, i) => (
                        <div 
                          key={i} 
                          className={cn(
                            "w-8 h-1 rounded-full transition-all duration-500",
                            i <= generationStep 
                              ? (mode === 'adventure' ? "bg-yellow-500" : "bg-blue-600") 
                              : "bg-white/10"
                          )} 
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div 
              key="manual-mode"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="h-full flex"
            >
              {/* Sidebar File Tree */}
              <div className={cn(
                "w-64 border-r shrink-0 flex flex-col",
                mode === 'adventure' ? "bg-[#0c0c1a] border-yellow-500/10" : "bg-black/20 border-white/5"
              )}>
                <div className="p-4 flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">Explorer</span>
                  <Plus size={14} className="text-gray-500 hover:text-white cursor-pointer" />
                </div>
                
                <div className="flex-1 overflow-y-auto px-2 space-y-1">
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
                mode === 'adventure' ? "bg-[#0c0c1a]" : "bg-black/20"
              )}>
                <div className="p-4 border-b border-white/5 flex items-center gap-2">
                  <div className={cn(
                    "w-6 h-6 rounded-lg flex items-center justify-center",
                    mode === 'adventure' ? "bg-yellow-500 text-black" : "bg-blue-600 text-white"
                  )}>
                    <Sparkles size={12} />
                  </div>
                  <span className="text-xs font-black uppercase tracking-widest text-white">Artifact Assistant</span>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  <div className={cn(
                    "p-4 rounded-xl border leading-relaxed",
                    mode === 'adventure' ? "bg-[#121225] border-yellow-500/20" : "bg-white/5 border-white/10"
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
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
