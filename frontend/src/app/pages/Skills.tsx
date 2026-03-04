import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router';
import {
  Search,
  Filter,
  Plus,
  MoreVertical,
  Code2,
  FileText,
  Wrench,
  Globe,
  Star,
  BookOpen,
  Zap,
  CheckCircle2,
  XCircle,
  Clock,
  ExternalLink,
  Loader2,
  AlertCircle,
  RefreshCw,
  Edit3,
  Trash2,
  Power,
  PowerOff,
  Rocket,
  Copy,
  Pin,
  PinOff
} from 'lucide-react';
import { useMode } from '../contexts/ModeContext';
import { useTranslation } from '../hooks/useTranslation';
import { useNotifications } from '../contexts/NotificationContext';
import { GlassCard, GameCard, ActionButton } from '../components/ui-shared';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { CategoryFilter, type CategoryType } from '../components/CategoryFilter';
import { TagFilter } from '../components/TagFilter';
import { motion, AnimatePresence } from 'motion/react';
import { SkillEditor } from '../components/SkillEditor';
import { TagBadge } from '../components/TagBadge';
import { QualityBadge } from '../components/QualityBadge';
import { SkillQualityDialog } from '../components/SkillQualityDialog';
import { getSkillIcon } from '../lib/skill-icons';
import { getCategoryConfig } from '../../lib/category-icons';
import { skillsApi, claudeApi, transformSkillsToUI, type UISkill } from '@/lib/api';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../components/ui/alert-dialog';

const Skills = () => {
  const { mode, lang } = useMode();
  const { t } = useTranslation();
  const { addNotification, updateNotification } = useNotifications();
  const [searchParams, setSearchParams] = useSearchParams();

  // ========== API 数据状态 ==========
  const [skills, setSkills] = useState<UISkill[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);

  // ========== 置顶状态 ==========
  const [pinnedSkills, setPinnedSkills] = useState<Set<number>>(() => {
    const saved = localStorage.getItem('pinnedSkills');
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });

  // 保存置顶状态到 localStorage
  useEffect(() => {
    localStorage.setItem('pinnedSkills', JSON.stringify(Array.from(pinnedSkills)));
  }, [pinnedSkills]);

  // 切换置顶状态
  const togglePin = (skillId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setPinnedSkills(prev => {
      const newSet = new Set(prev);
      if (newSet.has(skillId)) {
        newSet.delete(skillId);
      } else {
        newSet.add(skillId);
      }
      return newSet;
    });
  };

  // ========== 分类数据 ==========
  const [categories, setCategories] = useState<{
    counts: { builtin: number; user: number; project: number };
    projects: Array<{ id: string; name: string; count: number }>;
  } | null>(null);

  // ========== 语义化分类数据 ==========
  const [semanticCategories, setSemanticCategories] = useState<{
    categories: Record<string, number>;
    total_skills: number;
    classified_skills: number;
  } | null>(null);

  // ========== UI 交互状态 ==========
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<CategoryType>('all');
  const [selectedSubCategories, setSelectedSubCategories] = useState<string[]>([]);
  const [selectedSemanticCategories, setSelectedSemanticCategories] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isTagFilterExpanded, setIsTagFilterExpanded] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [initialEditorMode, setInitialEditorMode] = useState<'ai' | 'manual'>('ai');
  const [editingSkillId, setEditingSkillId] = useState<number | undefined>(undefined);
  
  // ========== 删除确认对话框状态 ==========
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [skillToDelete, setSkillToDelete] = useState<{ id: number; name: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);  // 当前打开的菜单ID

  // ========== 质量评估详情弹窗状态 ==========
  const [qualityDialogOpen, setQualityDialogOpen] = useState(false);
  const [selectedSkillForQuality, setSelectedSkillForQuality] = useState<UISkill | null>(null);

  // ========== 获取技能列表 ==========
  const fetchSkills = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await skillsApi.list({ limit: 1000 });
      const transformed = transformSkillsToUI(response.items);
      setSkills(transformed);
    } catch (err) {
      const message = err instanceof Error ? err.message : '获取技能列表失败';
      setError(message);
      addNotification({
        type: 'error',
        title: 'Failed to load skills',
        message,
      });
      console.error('Failed to fetch skills:', err);
    } finally {
      setLoading(false);
    }
  }, [addNotification]);

  // ========== 获取分类数据 ==========
  const fetchCategories = useCallback(async () => {
    try {
      const data = await skillsApi.getCategories();

      // 将 plugin scope 的 skill 重新分类到 user 或 project
      // 需要获取所有 skills 来重新统计
      const allSkillsResponse = await skillsApi.list({ limit: 1000 });
      const allSkills = allSkillsResponse.items;

      let userCount = data.counts.user || 0;
      let projectCount = data.counts.project || 0;

      // 遍历所有 plugin scope 的 skills,根据路径重新分类
      allSkills.forEach(skill => {
        if (skill.source === 'plugin') {
          const path = (skill as any).meta?.path || '';
          // 判断是否在用户主目录下
          const isUserPlugin = path.startsWith('/Users/') && path.includes('/.claude/plugins/') && !path.includes('/项目/') && !path.includes('/Proj/');

          if (isUserPlugin) {
            userCount++;
          } else {
            projectCount++;
          }
        }
      });

      const transformedData = {
        counts: {
          builtin: data.counts.builtin,
          user: userCount,
          project: projectCount
        },
        projects: data.projects
      };
      setCategories(transformedData);
    } catch (err) {
      console.error('Failed to fetch categories:', err);
    }
  }, []);

  // ========== 获取语义化分类数据 ==========
  const fetchSemanticCategories = useCallback(async () => {
    try {
      const data = await skillsApi.getSemanticCategories();
      setSemanticCategories(data);
    } catch (err) {
      console.error('Failed to fetch semantic categories:', err);
    }
  }, []);

  // ========== 初始加载 ==========
  useEffect(() => {
    fetchSkills();
    fetchCategories();
    fetchSemanticCategories();
  }, [fetchSkills, fetchCategories, fetchSemanticCategories]);

  // ========== 检测 URL 参数，自动打开创建表单 ==========
  useEffect(() => {
    const action = searchParams.get('action');
    if (action === 'create') {
      setIsCreating(true);
      setInitialEditorMode('ai');
      // 清除 URL 参数
      setSearchParams({});
    }
  }, [searchParams, setSearchParams]);

  // ========== 同步技能 ==========
  const handleSync = async () => {
    const notificationId = addNotification({
      type: 'loading',
      title: 'Syncing skills',
      message: 'Scanning local skills...',
    });

    setSyncing(true);
    setError(null);
    try {
      await claudeApi.syncSkills();
      await fetchSkills();
      await fetchCategories();
      await fetchSemanticCategories();

      updateNotification(notificationId, {
        type: 'success',
        title: 'Sync completed',
        message: 'Skills synchronized successfully',
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : '同步失败';
      setError(message);
      updateNotification(notificationId, {
        type: 'error',
        title: 'Sync failed',
        message,
      });
      console.error('Failed to sync skills:', err);
    } finally {
      setSyncing(false);
    }
  };

  // ========== 删除技能 ==========
  // 打开删除确认对话框
  const handleDeleteClick = (e: React.MouseEvent, skill: UISkill) => {
    e.stopPropagation();
    e.preventDefault();
    
    console.log('[Skills] Opening delete dialog for skill:', skill.id, skill.name);
    
    // 关闭菜单
    setOpenMenuId(null);
    
    // 设置要删除的技能并打开对话框
    setSkillToDelete({ id: skill.id, name: skill.name[lang] || skill.name.en });
    setDeleteDialogOpen(true);
  };
  
  // 执行删除操作
  const handleConfirmDelete = async () => {
    if (!skillToDelete) return;
    
    console.log('[Skills] Proceeding to delete skill:', skillToDelete.id);
    setIsDeleting(true);
    
    try {
      await skillsApi.delete(skillToDelete.id);
      console.log('[Skills] Skill deleted successfully');
      setSkills(prev => prev.filter(s => s.id !== skillToDelete.id));
      setDeleteDialogOpen(false);
      setSkillToDelete(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : '删除失败';
      setError(message);
      console.error('[Skills] Failed to delete skill:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  // ========== 切换启用状态 ==========
  const handleToggleEnabled = async (skillId: number, currentStatus: string) => {
    try {
      const newEnabled = currentStatus !== 'enabled';
      await skillsApi.toggleEnabled(skillId, newEnabled);
      setSkills(prev =>
        prev.map(s =>
          s.id === skillId ? { ...s, status: newEnabled ? 'enabled' : 'disabled' } : s
        )
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : '更新状态失败';
      setError(message);
      console.error('Failed to toggle skill status:', err);
    }
  };

  // ========== 创建/编辑回调 ==========
  const handleSkillSaved = async () => {
    setIsCreating(false);
    setEditingSkillId(undefined);
    // 强制刷新所有数据
    await Promise.all([
      fetchSkills(),
      fetchCategories(),
      fetchSemanticCategories()
    ]);
  };

  // ========== 点击卡片进入编辑 ==========
  const handleEditSkill = (skillId: number) => {
    setEditingSkillId(skillId);
    setIsCreating(true);
    setInitialEditorMode('manual');
    setOpenMenuId(null);
  };

  // ========== 菜单操作 ==========
  const handleMenuToggle = (e: React.MouseEvent, skillId: number) => {
    e.stopPropagation();
    setOpenMenuId(openMenuId === skillId ? null : skillId);
  };

  // 点击页面其他地方关闭菜单
  useEffect(() => {
    if (openMenuId === null) return;
    
    const handleClickOutside = (e: MouseEvent) => {
      // 检查点击目标是否在菜单内
      const target = e.target as HTMLElement;
      const menuElement = document.querySelector('[data-skill-menu]');
      if (menuElement && menuElement.contains(target)) {
        // 点击在菜单内，不关闭
        return;
      }
      setOpenMenuId(null);
    };
    
    // 使用 setTimeout 延迟添加监听器，避免立即触发
    const timer = setTimeout(() => {
      document.addEventListener('click', handleClickOutside);
    }, 0);
    
    return () => {
      clearTimeout(timer);
      document.removeEventListener('click', handleClickOutside);
    };
  }, [openMenuId]);

  // ========== 过滤和排序逻辑 ==========
  const filteredSkills = skills
    .filter(s => {
      const name = s.name[lang] || s.name.en;
      const matchesSearch = name.toLowerCase().includes(search.toLowerCase());

      // Category filter
      let matchesCategory = true;
      if (selectedCategory !== 'all') {
        // Map source to category
        let source = s.source.toLowerCase();

        // 将 global 映射到 builtin
        if (source === 'global') source = 'builtin';

        matchesCategory = source === selectedCategory;

        // Sub-category filter (multi-select)
        if (matchesCategory && selectedSubCategories.length > 0) {
          if (selectedCategory === 'project') {
            const path = (s as any).meta?.path || '';
            const projectName = path.split('/.claude/')[0].split('/').pop();
            matchesCategory = selectedSubCategories.includes(projectName);
          }
        }
      }

      // Semantic category filter (multi-select)
      let matchesSemanticCategory = true;
      if (selectedSemanticCategories.length > 0) {
        const skillTags = (s._raw as any).tags || [];

        // 如果 Skill 有任何一个选中的标签，就显示
        matchesSemanticCategory = selectedSemanticCategories.some(selectedTag =>
          Array.isArray(skillTags) && skillTags.includes(selectedTag)
        );
      }

      return matchesSearch && matchesCategory && matchesSemanticCategory;
    })
    .sort((a, b) => {
      // 置顶的排在前面
      const aPinned = pinnedSkills.has(a.id);
      const bPinned = pinnedSkills.has(b.id);
      if (aPinned && !bPinned) return -1;
      if (!aPinned && bPinned) return 1;
      return 0;
    });

  // ========== Loading 状态 ==========
  if (loading && skills.length === 0) {
    return <LoadingSpinner text={t('loading' as any) || '加载中...'} />;
  }

  // ========== 错误状态 ==========
  if (error && skills.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <AlertCircle className="w-12 h-12 text-red-500" />
        <p className="text-red-400">{error}</p>
        <ActionButton onClick={fetchSkills}>{t('retry' as any) || '重试'}</ActionButton>
      </div>
    );
  }

  // ========== 编辑器视图 ==========
  if (isCreating) {
    return <SkillEditor onBack={handleSkillSaved} initialMode={initialEditorMode} editingSkillId={editingSkillId} />;
  }

  if (mode === 'adventure') {
    return (
      <div className="space-y-8 pb-20">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-4xl font-black italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-yellow-600 uppercase">
              {t('skillsTitle' as any)}
            </h1>
            <p className="text-gray-400 font-medium">{t('skillsDesc' as any)}</p>
          </div>
          <ActionButton onClick={() => { setIsCreating(true); setInitialEditorMode('ai'); }}>{t('forgeSkill' as any)}</ActionButton>
        </header>

        {/* Search & Filter */}
        <div className="flex flex-col sm:flex-row gap-4 bg-[#121225] p-4 rounded-xl border border-yellow-500/20 shadow-[0_0_20px_rgba(0,0,0,0.3)]">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-yellow-500/50" size={18} />
            <input 
              type="text" 
              placeholder={t('searchScrolls' as any)}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-black/40 border border-yellow-500/30 rounded-lg py-2 pl-10 pr-4 text-yellow-100 placeholder:text-yellow-500/30 focus:outline-none focus:border-yellow-500 transition-all"
            />
          </div>
          <div className="flex gap-2">
            {['All', 'Global', 'Plugin', 'Project'].map(f => (
              <button 
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all ${
                  filter === f ? 'bg-yellow-500 text-black' : 'bg-black/40 text-yellow-500/60 hover:bg-black/60'
                }`}
              >
                {t(f.toLowerCase() as any)}
              </button>
            ))}
          </div>
        </div>

        {/* Library Shelves */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          <AnimatePresence>
            {filteredSkills.map((skill, idx) => (
              <motion.div
                key={skill.id}
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
              >
                <GameCard 
                  rarity={skill.rarity as any} 
                  className="group h-full flex flex-col p-0 overflow-visible cursor-pointer relative"
                  onClick={() => handleEditSkill(skill.id)}
                >
                  {/* 重复标记 */}
                  {skill.isDuplicate && (
                    <div 
                      className="absolute top-2 left-2 z-20 flex items-center gap-1 bg-orange-500/90 text-white text-[10px] font-bold px-2 py-1 rounded-lg shadow-lg"
                      title={`重复 ${skill.duplicateCount} 处: ${skill.duplicateLocations.join(', ')}`}
                    >
                      <Copy size={10} />
                      <span>×{skill.duplicateCount}</span>
                    </div>
                  )}

                  {/* Card Front */}
                  <div className="p-6 flex-1 flex flex-col items-center text-center">
                    <div className="w-24 h-24 relative mb-6 group-hover:scale-110 transition-transform duration-500">
                      <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${
                        skill.rarity === 'legendary' ? 'from-yellow-400/20 to-yellow-600/20 shadow-[0_0_20px_rgba(234,179,8,0.3)]' :
                        skill.rarity === 'epic' ? 'from-purple-500/20 to-purple-700/20' :
                        skill.rarity === 'rare' ? 'from-blue-500/20 to-blue-700/20' : 'from-gray-500/20 to-gray-700/20'
                      } blur-xl`} />
                      <img 
                        src={getSkillIcon(skill.advIcon || 'trophy')} 
                        alt={skill.name[lang]}
                        className="w-full h-full object-contain relative z-10 drop-shadow-[0_10px_10px_rgba(0,0,0,0.5)]"
                      />
                    </div>
                    
                    <h3 className="text-xl font-black uppercase italic text-white tracking-widest mb-1">{skill.name[lang]}</h3>
                    <div className="flex gap-1 mb-3">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} size={12} className={i < (skill.level / 3) ? 'fill-yellow-500 text-yellow-500' : 'text-gray-600'} />
                      ))}
                    </div>
                    
                    {/* 显示完整 description */}
                    <p className="text-xs text-gray-400 line-clamp-3 mb-2 leading-relaxed italic">"{skill.desc[lang] || (skill._raw as any)?.description || '无描述'}"</p>
                    
                    {(skill as any).projectName && (
                      <div className="text-[10px] text-green-500/80 font-bold uppercase mb-4 flex items-center gap-1">
                        <BookOpen size={10} /> {(skill as any).projectName}
                      </div>
                    )}
                    {(skill as any).pluginNamespace && (
                      <div className="text-[10px] text-orange-500/80 font-bold uppercase mb-4 flex items-center gap-1">
                        <Zap size={10} /> {(skill as any).pluginNamespace}
                      </div>
                    )}

                    <div className="w-full mt-auto space-y-2">
                      <div className="flex justify-between text-[10px] font-black uppercase tracking-tighter">
                        <span className="text-yellow-500">{t('lvl' as any)} {skill.level}</span>
                        <span className="text-gray-500">{skill.xp}/100 {t('xp' as any)}</span>
                      </div>
                      <div className="w-full h-1.5 bg-black/40 rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${skill.xp}%` }}
                          transition={{ duration: 1, delay: 0.5 }}
                          className={`h-full bg-gradient-to-r ${
                            skill.rarity === 'legendary' ? 'from-yellow-600 to-yellow-300' :
                            skill.rarity === 'epic' ? 'from-purple-600 to-purple-300' : 'from-blue-600 to-blue-300'
                          }`}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Card Actions */}
                  <div className="bg-black/40 p-4 border-t border-white/5 flex justify-between items-center rounded-b-xl">
                    <div className="flex gap-2">
                      {skill.tags[lang].map(t => (
                        <span key={t} className="text-[9px] font-bold text-gray-500 bg-white/5 px-2 py-0.5 rounded border border-white/5 uppercase">{t}</span>
                      ))}
                    </div>
                    {/* 三点菜单 */}
                    <div className="relative">
                      <button 
                        className="text-yellow-500 hover:text-yellow-400 transition-colors p-1 rounded hover:bg-yellow-500/10"
                        onClick={(e) => handleMenuToggle(e, skill.id)}
                      >
                        <MoreVertical size={16} />
                      </button>
                      
                      {/* 下拉菜单 */}
                      <AnimatePresence>
                        {openMenuId === skill.id && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: -10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: -10 }}
                            transition={{ duration: 0.15 }}
                            className="absolute right-0 bottom-full mb-1 w-40 bg-[#1a1a2e]/95 backdrop-blur-xl border border-yellow-500/20 rounded-xl shadow-xl z-50 overflow-hidden"
                            data-skill-menu="true"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {/* 编辑 */}
                            <button
                              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-yellow-500/80 hover:bg-yellow-500/20 hover:text-yellow-400 transition-colors"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditSkill(skill.id);
                              }}
                            >
                              <Edit3 size={14} />
                              编辑
                            </button>
                            
                            {/* 启用/禁用 */}
                            <button
                              className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                                skill.status === 'enabled' 
                                  ? 'text-yellow-500/80 hover:bg-orange-500/20 hover:text-orange-400' 
                                  : 'text-yellow-500/80 hover:bg-green-500/20 hover:text-green-400'
                              }`}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleEnabled(skill.id, skill.status);
                                setOpenMenuId(null);
                              }}
                            >
                              {skill.status === 'enabled' ? <PowerOff size={14} /> : <Power size={14} />}
                              {skill.status === 'enabled' ? '禁用' : '启用'}
                            </button>
                            
                            {/* 部署/同步 */}
                            <button
                              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-yellow-500/80 hover:bg-purple-500/20 hover:text-purple-400 transition-colors"
                              onClick={async (e) => {
                                e.stopPropagation();
                                setOpenMenuId(null);
                                await handleSync();
                              }}
                            >
                              <Rocket size={14} />
                              同步部署
                            </button>
                            
                            {/* 分割线 */}
                            <div className="border-t border-yellow-500/20 my-1" />
                            
                            {/* 删除 */}
                            <button
                              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/20 transition-colors"
                              onClick={(e) => handleDeleteClick(e, skill)}
                            >
                              <Trash2 size={14} />
                              删除
                            </button>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </GameCard>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
        
        {/* 删除确认对话框 */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent className="bg-[#1a1a2e] border-yellow-500/20">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-yellow-400">确认删除</AlertDialogTitle>
              <AlertDialogDescription className="text-gray-400">
                确定要删除技能 <span className="text-yellow-300 font-semibold">"{skillToDelete?.name}"</span> 吗？
                <br />
                此操作不可恢复。
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel 
                className="bg-gray-800 border-yellow-500/20 text-white hover:bg-gray-700"
                disabled={isDeleting}
              >
                取消
              </AlertDialogCancel>
              <AlertDialogAction
                className="bg-red-600 text-white hover:bg-red-700"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    删除中...
                  </>
                ) : (
                  '确认删除'
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-8">
      <header className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight uppercase">SKILLS</h1>
          <p className="text-sm md:text-base text-gray-400 line-clamp-1 md:line-clamp-none">
            {mode === 'adventure'
              ? '收集和强化技能宝珠，赋予英雄强大能力'
              : '创建和管理可复用的 AI 技能模块，扩展系统能力'}
          </p>
        </div>
        <div className="flex md:flex-row flex-col gap-2 shrink-0">
          <ActionButton
            variant="secondary"
            onClick={handleSync}
            disabled={syncing}
            className="md:px-4 px-2 py-2 text-sm min-w-0"
          >
            {syncing ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span className="hidden md:inline ml-2">同步中...</span>
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4" />
                <span className="hidden md:inline ml-2">同步</span>
              </>
            )}
          </ActionButton>
          <ActionButton onClick={() => { setIsCreating(true); setInitialEditorMode('ai'); }} className="md:px-4 px-2 py-2 text-sm min-w-0">
            <Plus className="w-4 h-4" />
            <span className="hidden md:inline ml-2">新建</span>
          </ActionButton>
        </div>
        {error && (
          <div className="text-red-400 text-sm flex items-center gap-2 mt-2">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}
      </header>

      {/* Category Filter */}
      {categories && (
        <CategoryFilter
          selectedCategory={selectedCategory}
          selectedSubCategories={selectedSubCategories}
          counts={categories.counts}
          projectSubCategories={categories.projects}
          pluginSubCategories={[]}
          onCategoryChange={setSelectedCategory}
          onSubCategoriesChange={setSelectedSubCategories}
        />
      )}

      {/* Semantic Category Filter */}
      {semanticCategories && Object.keys(semanticCategories.categories).length > 0 && (() => {
        // 根据当前选中的 Scope 动态计算每个分类的数量
        const filteredCategoryCounts: Record<string, number> = {};

        skills.forEach(skill => {
          // 检查是否匹配当前选中的 Scope
          let matchesScope = true;
          if (selectedCategory !== 'all') {
            let source = skill.source.toLowerCase();
            if (source === 'global') source = 'builtin';
            matchesScope = source === selectedCategory;

            // Sub-category filter
            if (matchesScope && selectedSubCategories.length > 0) {
              if (selectedCategory === 'plugin') {
                const pluginName = (skill as any).pluginNamespace || (skill as any).meta?.plugin_name;
                matchesScope = selectedSubCategories.includes(pluginName);
              } else if (selectedCategory === 'project') {
                const path = (skill as any).meta?.path || '';
                const projectName = path.split('/.claude/')[0].split('/').pop();
                matchesScope = selectedSubCategories.includes(projectName);
              }
            }
          }

          if (matchesScope) {
            // 统计该 Skill 的所有标签（不再限制 category: 前缀）
            const skillTags = (skill._raw as any).tags || [];
            if (Array.isArray(skillTags)) {
              skillTags.forEach((tag: string) => {
                // 统计所有标签，不再限制 category: 前缀
                filteredCategoryCounts[tag] = (filteredCategoryCounts[tag] || 0) + 1;
              });
            }
          }
        });

        return (
          <div className="space-y-2">
            <button
              onClick={() => setIsTagFilterExpanded(!isTagFilterExpanded)}
              className="w-full flex items-center justify-between text-sm font-bold text-gray-400 uppercase tracking-wider hover:text-gray-300 transition-colors"
            >
              <span>按 TAG 分类</span>
              <motion.div
                animate={{ rotate: isTagFilterExpanded ? 180 : 0 }}
                transition={{ duration: 0.2 }}
              >
                <Filter size={14} />
              </motion.div>
            </button>

            <AnimatePresence>
              {isTagFilterExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(filteredCategoryCounts)
                      .sort(([, a], [, b]) => b - a)
                      .map(([tagName, count]) => {
                        const isSelected = selectedSemanticCategories.includes(tagName);

                        return (
                          <button
                            key={tagName}
                            onClick={() => {
                              if (isSelected) {
                                setSelectedSemanticCategories(
                                  selectedSemanticCategories.filter(c => c !== tagName)
                                );
                              } else {
                                setSelectedSemanticCategories([...selectedSemanticCategories, tagName]);
                              }
                            }}
                            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                              isSelected
                                ? 'bg-blue-500/20 border-2 border-blue-500 text-blue-400'
                                : 'bg-white/5 border border-white/10 hover:bg-white/10 text-gray-400'
                            }`}
                          >
                            <span>{tagName}</span>
                            <span className="text-[10px] opacity-60">({count})</span>
                          </button>
                        );
                      })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })()}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
        <input
          type="text"
          placeholder={t('searchScrolls' as any)}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-white/5 border border-white/10 rounded-xl py-2 pl-10 pr-4 focus:outline-none focus:border-blue-500/50 transition-all"
        />
      </div>

      {/* Grid */}
      {/* Skills Grid - 响应式网格 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
        <AnimatePresence>
          {filteredSkills.map((skill, idx) => (
            <motion.div
              key={skill.id}
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
            >
              <GlassCard
                className="h-full flex flex-col group cursor-pointer hover:border-blue-500/50 transition-colors"
                onClick={() => handleEditSkill(skill.id)}
              >
                <div className="flex justify-between items-start mb-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    skill.status === 'enabled' ? 'bg-blue-600/20 text-blue-400' : 'bg-gray-700/20 text-gray-500'
                  }`}>
                    <skill.icon size={20} />
                  </div>
                  <div className="flex gap-2">
                    {/* 置顶按钮 */}
                    <button
                      className={`p-1.5 rounded-lg transition-all ${
                        pinnedSkills.has(skill.id)
                          ? 'text-yellow-400'
                          : 'text-gray-500 hover:text-yellow-400'
                      }`}
                      onClick={(e) => togglePin(skill.id, e)}
                      title={pinnedSkills.has(skill.id) ? '取消置顶' : '置顶'}
                    >
                      <Pin size={14} className={pinnedSkills.has(skill.id) ? 'fill-current' : ''} />
                    </button>

                    {/* 重复标记 */}
                    {skill.isDuplicate && (
                      <div
                        className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-orange-500/20 text-orange-400 border border-orange-500/30"
                        title={`重复 ${skill.duplicateCount} 处: ${skill.duplicateLocations.join(', ')}`}
                      >
                        <Copy size={10} />
                        <span>×{skill.duplicateCount}</span>
                      </div>
                    )}
                    <div className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      skill.source === 'Global' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' :
                      skill.source === 'Plugin' ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' :
                      'bg-green-500/20 text-green-400 border border-green-500/30'
                    }`}>
                      {t(skill.source.toLowerCase() as any)}
                    </div>
                    {/* 三点菜单 */}
                    <div className="relative">
                      <button
                        className="text-gray-500 hover:text-white transition-colors p-1 rounded hover:bg-white/10"
                        onClick={(e) => handleMenuToggle(e, skill.id)}
                      >
                        <MoreVertical size={16} />
                      </button>

                      {/* 下拉菜单 */}
                      <AnimatePresence>
                        {openMenuId === skill.id && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: -10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: -10 }}
                            transition={{ duration: 0.15 }}
                            className="absolute right-0 top-full mt-1 w-40 bg-gray-900/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-xl z-50 overflow-hidden"
                            data-skill-menu="true"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {/* 编辑 */}
                            <button
                              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-300 hover:bg-blue-500/20 hover:text-blue-400 transition-colors"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditSkill(skill.id);
                              }}
                            >
                              <Edit3 size={14} />
                              编辑
                            </button>

                            {/* 启用/禁用 */}
                            <button
                              className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                                skill.status === 'enabled'
                                  ? 'text-gray-300 hover:bg-orange-500/20 hover:text-orange-400'
                                  : 'text-gray-300 hover:bg-green-500/20 hover:text-green-400'
                              }`}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleEnabled(skill.id, skill.status);
                                setOpenMenuId(null);
                              }}
                            >
                              {skill.status === 'enabled' ? <PowerOff size={14} /> : <Power size={14} />}
                              {skill.status === 'enabled' ? '禁用' : '启用'}
                            </button>

                            {/* 部署/同步 */}
                            <button
                              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-300 hover:bg-purple-500/20 hover:text-purple-400 transition-colors"
                              onClick={async (e) => {
                                e.stopPropagation();
                                setOpenMenuId(null);
                                await handleSync();
                              }}
                            >
                              <Rocket size={14} />
                              同步部署
                            </button>

                            {/* 分割线 */}
                            <div className="border-t border-white/10 my-1" />

                            {/* 删除 */}
                            <button
                              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/20 transition-colors"
                              onClick={(e) => handleDeleteClick(e, skill)}
                            >
                              <Trash2 size={14} />
                              删除
                            </button>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </div>

                <h3 className="text-lg font-bold mb-1">{skill.name[lang]}</h3>

                {/* 质量评分 - 简洁一行 */}
                {(skill._raw as any)?.quality_grade && (
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedSkillForQuality(skill);
                      setQualityDialogOpen(true);
                    }}
                    className="text-xs text-gray-400 mb-2 cursor-pointer hover:text-gray-300 transition-colors flex items-center gap-1.5"
                  >
                    <span>质量评分:</span>
                    <span className={`font-medium ${
                      (skill._raw as any).quality_grade === 'A' ? 'text-green-400' :
                      (skill._raw as any).quality_grade === 'B' ? 'text-blue-400' :
                      (skill._raw as any).quality_grade === 'C' ? 'text-yellow-400' :
                      (skill._raw as any).quality_grade === 'D' ? 'text-orange-400' :
                      'text-red-400'
                    }`}>
                      {(skill._raw as any).quality_grade} ({(skill._raw as any).quality_score}/100)
                    </span>
                  </div>
                )}

                { (skill as any).projectName && (
                  <p className="text-[10px] text-green-500 font-bold uppercase mb-2 flex items-center gap-1 opacity-70">
                    <BookOpen size={10} /> {(skill as any).projectName}
                  </p>
                )}
                { (skill as any).pluginNamespace && (
                  <p className="text-[10px] text-orange-500 font-bold uppercase mb-2 flex items-center gap-1 opacity-70">
                    <Zap size={10} /> {(skill as any).pluginNamespace}
                  </p>
                )}
                {/* 显示完整 description */}
                <p className="text-xs text-gray-400 line-clamp-3 mb-4">{skill.desc[lang] || (skill._raw as any)?.description || '无描述'}</p>

                <div className="flex flex-wrap gap-2 mb-6 mt-auto">
                  {/* 分类标签 */}
                  {((skill._raw as any)?.tags || [])
                    .filter((tag: string) => tag.startsWith('category:'))
                    .map((tag: string) => {
                      const categoryId = tag.replace('category:', '');
                      const config = getCategoryConfig(categoryId);
                      if (!config) return null;
                      const Icon = config.icon;
                      return (
                        <span
                          key={tag}
                          className={`text-[10px] font-bold px-2 py-1 rounded border flex items-center gap-1 ${config.color} bg-current/10 border-current/30`}
                          title={config.description}
                        >
                          <Icon size={10} />
                          {config.name}
                        </span>
                      );
                    })}
                  {/* 普通标签 */}
                  {skill.tags[lang]
                    .filter(t => !t.startsWith('category:'))
                    .map(t => (
                      <span key={t} className="text-[10px] text-gray-400 bg-white/5 px-2 py-0.5 rounded border border-white/5">{t}</span>
                    ))}
                </div>

                <div className="flex justify-between items-center pt-4 border-t border-white/5">
                  <div className="items-center gap-2 flex">
                    <span className={`w-2 h-2 rounded-full ${skill.status === 'enabled' ? 'bg-green-500' : 'bg-red-500'}`} />
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{t(skill.status as any)}</span>
                  </div>
                  <span className="text-[10px] text-gray-500 font-mono">{skill.usage.toLocaleString()} {t('runs' as any)}</span>
                </div>
              </GlassCard>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Create Card */}
        <button 
          onClick={() => { setIsCreating(true); setInitialEditorMode('manual'); }}
          className="group border-2 border-dashed border-white/10 rounded-2xl p-6 flex flex-col items-center justify-center gap-3 hover:border-blue-500/50 hover:bg-blue-500/5 transition-all cursor-pointer"
        >
          <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center text-gray-400 group-hover:bg-blue-500 group-hover:text-white transition-all">
            <Plus size={24} />
          </div>
          <p className="font-bold text-gray-400 group-hover:text-blue-400">{t('addSkill' as any)}</p>
        </button>
      </div>
      
      {/* 删除确认对话框 */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="bg-gray-900 border-white/10">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">确认删除</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              确定要删除技能 <span className="text-white font-semibold">"{skillToDelete?.name}"</span> 吗？
              <br />
              此操作不可恢复。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel 
              className="bg-gray-800 border-white/10 text-white hover:bg-gray-700"
              disabled={isDeleting}
            >
              取消
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 text-white hover:bg-red-700"
              onClick={handleConfirmDelete}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  删除中...
                </>
              ) : (
                '确认删除'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 质量评估详情弹窗 */}
      {qualityDialogOpen && selectedSkillForQuality && (selectedSkillForQuality._raw as any)?.quality_evaluation && (
        <SkillQualityDialog
          skillName={selectedSkillForQuality.name[lang]}
          evaluation={(selectedSkillForQuality._raw as any).quality_evaluation}
          onClose={() => {
            setQualityDialogOpen(false);
            setSelectedSkillForQuality(null);
          }}
        />
      )}
    </div>
  );
};

export default Skills;
