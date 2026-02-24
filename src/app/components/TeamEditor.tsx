/**
 * TeamEditor - Agent Team 编辑器组件
 *
 * 统一的创建/编辑界面
 * - 创建模式：team 为 null
 * - 编辑模式：team 不为 null
 */
import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Save,
  AlertCircle,
  CheckCircle2,
  Plus,
  X,
  UsersRound,
  Shield,
  Trash2,
  GripVertical,
  Sparkles,
  Wand2,
  Grid3x3,
  List,
  TestTube
} from 'lucide-react';
import { motion } from 'motion/react';
import { GlassCard } from './ui-shared';
import { TeamMemberBoard } from './TeamMemberBoard';
import { TeamTestPanel } from './TeamTestPanel';
import { teamsApi, agentsApi } from '@/lib/api';
import type { Team, TeamMember, Agent } from '@/lib/api';

type ViewMode = 'form' | 'board' | 'test';

interface TeamEditorProps {
  team: Team | null;
  onBack: () => void;
  onSave: () => void;
}

export const TeamEditor: React.FC<TeamEditorProps> = ({
  team,
  onBack,
  onSave
}) => {
  const isCreateMode = team === null;

  // === 视图模式 ===
  const [viewMode, setViewMode] = useState<ViewMode>('form');

  // === 必填字段 ===
  const [name, setName] = useState(team?.name || '');
  const [description, setDescription] = useState(team?.description || '');

  // === 成员管理 ===
  const [members, setMembers] = useState<TeamMember[]>(team?.members || []);
  const [availableAgents, setAvailableAgents] = useState<Agent[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState<number | null>(null);
  const [memberRole, setMemberRole] = useState('');

  // === 标签 ===
  const [tags, setTags] = useState<string[]>(team?.tags || []);
  const [newTag, setNewTag] = useState('');

  // === 状态 ===
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // === AI 生成 ===
  const [aiPrompt, setAiPrompt] = useState('');
  const [generating, setGenerating] = useState(false);

  // 加载可用 Agents
  useEffect(() => {
    loadAvailableAgents();
  }, []);

  const loadAvailableAgents = async () => {
    try {
      setLoading(true);
      const response = await agentsApi.list({ limit: 100 });
      setAvailableAgents(response.items);
    } catch (err) {
      console.error('Failed to load agents:', err);
      setError('加载 Agents 失败');
    } finally {
      setLoading(false);
    }
  };

  // 添加成员
  const handleAddMember = () => {
    if (!selectedAgentId || !memberRole.trim()) {
      setError('请选择 Agent 并输入角色');
      return;
    }

    // 检查是否已存在
    if (members.some(m => m.agent_id === selectedAgentId)) {
      setError('该 Agent 已在团队中');
      return;
    }

    const newMember: TeamMember = {
      agent_id: selectedAgentId,
      role: memberRole.trim(),
      priority: members.length + 1
    };

    setMembers([...members, newMember]);
    setSelectedAgentId(null);
    setMemberRole('');
    setError(null);
  };

  // 删除成员
  const handleRemoveMember = (agentId: number) => {
    setMembers(members.filter(m => m.agent_id !== agentId));
  };

  // 调整成员优先级
  const handleMoveMember = (index: number, direction: 'up' | 'down') => {
    const newMembers = [...members];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;

    if (targetIndex < 0 || targetIndex >= newMembers.length) return;

    [newMembers[index], newMembers[targetIndex]] = [newMembers[targetIndex], newMembers[index]];

    // 更新优先级
    newMembers.forEach((m, i) => {
      m.priority = i + 1;
    });

    setMembers(newMembers);
  };

  // 添加标签
  const handleAddTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()]);
      setNewTag('');
    }
  };

  // 删除标签
  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter(t => t !== tag));
  };

  // 获取 Agent 名称
  const getAgentName = (agentId: number): string => {
    const agent = availableAgents.find(a => a.id === agentId);
    return agent?.name || `Agent #${agentId}`;
  };

  // AI 生成配置
  const handleAIGenerate = async () => {
    if (!aiPrompt.trim()) return;

    try {
      setGenerating(true);
      setError(null);

      const result = await teamsApi.generate({
        description: aiPrompt.trim(),
        member_count: 3,
        save_immediately: false
      });

      // 更新表单字段
      setName(result.team.name);
      setDescription(result.team.description || '');
      setMembers(result.team.members || []);
      setTags(result.team.tags || []);

      setAiPrompt('');
    } catch (err) {
      console.error('Failed to generate:', err);
      setError(err instanceof Error ? err.message : 'AI 生成失败');
    } finally {
      setGenerating(false);
    }
  };

  // 编辑成员（从棋盘格）
  const handleEditMemberFromBoard = (member: TeamMember, index: number) => {
    setSelectedAgentId(member.agent_id);
    setMemberRole(member.role);
    // 可以打开一个模态框或切换到表单视图
    setViewMode('form');
  };

  // 重新排序成员（从棋盘格）
  const handleReorderMembers = (newMembers: TeamMember[]) => {
    setMembers(newMembers);
  };

  // 保存
  const handleSave = async () => {
    // 验证
    if (!name.trim()) {
      setError('请输入团队名称');
      return;
    }
    if (!description.trim()) {
      setError('请输入团队描述');
      return;
    }
    if (members.length < 2) {
      setError('团队至少需要 2 个成员');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      if (isCreateMode) {
        await teamsApi.create({
          name: name.trim(),
          description: description.trim(),
          members,
          tags,
          meta: {}
        });
      } else {
        await teamsApi.update(team!.id, {
          name: name.trim(),
          description: description.trim(),
          members,
          tags,
          meta: {}
        });
      }

      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onSave();
      }, 1500);
    } catch (err) {
      console.error('Failed to save team:', err);
      setError(err instanceof Error ? err.message : '保存失败');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto pb-20">
      {/* 头部 */}
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={onBack}
          className="p-3 hover:bg-white/10 rounded-xl transition-colors"
        >
          <ArrowLeft size={24} />
        </button>
        <div className="flex items-center gap-4 flex-1">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-purple-500/20 border border-purple-500/30">
            <UsersRound size={28} className="text-purple-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {isCreateMode ? '创建新团队' : '编辑团队'}
            </h1>
            <p className="text-gray-400 mt-1">
              {isCreateMode ? '配置你的 Agent 协作团队' : team?.name}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* 视图切换 */}
          <div className="flex bg-white/5 rounded-xl p-1">
            <button
              onClick={() => setViewMode('form')}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${viewMode === 'form' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}
            >
              <List size={16} />
              表单
            </button>
            <button
              onClick={() => setViewMode('board')}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${viewMode === 'board' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}
            >
              <Grid3x3 size={16} />
              棋盘
            </button>
            {!isCreateMode && (
              <button
                onClick={() => setViewMode('test')}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${viewMode === 'test' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}
              >
                <TestTube size={16} />
                测试
              </button>
            )}
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

      {/* AI 助手区域 */}
      {viewMode === 'form' && (
        <GlassCard className="p-6 border-2 border-purple-500/30 mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
              <Sparkles className="text-purple-400" size={20} />
            </div>
            <div className="flex-1">
              <h3 className="font-bold">AI 助手</h3>
              <p className="text-xs text-gray-400">
                描述你的团队需求，让 AI 帮你生成配置
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <input
              type="text"
              placeholder="例如：'创建一个前端开发团队，包含 Lead、开发者和 QA'"
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
      )}

      {/* 根据视图模式渲染不同内容 */}
      {viewMode === 'test' && !isCreateMode && team ? (
        <TeamTestPanel team={team} availableAgents={availableAgents} />
      ) : viewMode === 'board' ? (
        <TeamMemberBoard
          members={members}
          availableAgents={availableAgents}
          onAddMember={() => setViewMode('form')}
          onEditMember={handleEditMemberFromBoard}
          onRemoveMember={handleRemoveMember}
          onReorderMembers={handleReorderMembers}
          gridSize={4}
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* 左侧：基本信息 */}
          <div className="space-y-6">
            {/* 基本信息 */}
            <GlassCard className="p-6">
              <div className="flex items-center gap-2 mb-6">
                <Shield size={18} className="text-blue-400" />
                <h3 className="font-bold">基本信息</h3>
                <span className="text-xs text-red-400">* 必填</span>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-400 mb-2">团队名称 *</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="frontend-dev-team"
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-blue-500/50 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-400 mb-2">团队描述 *</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="负责前端开发和 UI 实现的团队..."
                    rows={4}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-blue-500/50 resize-none transition-all"
                  />
                </div>
              </div>
            </GlassCard>

            {/* 标签 */}
            <GlassCard className="p-6">
              <div className="flex items-center gap-2 mb-6">
                <h3 className="font-bold">标签</h3>
              </div>

              <div className="flex flex-wrap gap-2 mb-3">
                {tags.map(tag => (
                  <span key={tag} className="inline-flex items-center gap-1 px-3 py-1 bg-cyan-500/20 text-cyan-400 rounded-lg text-sm border border-cyan-500/30">
                    {tag}
                    <button onClick={() => handleRemoveTag(tag)} className="hover:text-white"><X size={14} /></button>
                  </span>
                ))}
                {tags.length === 0 && <span className="text-gray-500 text-sm">暂无标签</span>}
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
                  placeholder="添加标签..."
                  className="flex-1 px-4 py-2 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-blue-500/50"
                />
                <button
                  onClick={handleAddTag}
                  disabled={!newTag.trim()}
                  className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:bg-gray-600 rounded-xl text-sm font-bold transition-all"
                >
                  <Plus size={16} />
                </button>
              </div>
            </GlassCard>
          </div>

          {/* 右侧：成员管理 */}
          <div className="space-y-6">
            {/* 添加成员 */}
            <GlassCard className="p-6">
              <div className="flex items-center gap-2 mb-6">
                <Plus size={18} className="text-green-400" />
                <h3 className="font-bold">添加成员</h3>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-400 mb-2">选择 Agent</label>
                  <select
                    value={selectedAgentId || ''}
                    onChange={(e) => setSelectedAgentId(e.target.value ? parseInt(e.target.value) : null)}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-blue-500/50"
                    disabled={loading}
                  >
                    <option value="">选择一个 Agent...</option>
                    {availableAgents
                      .filter(agent => !members.some(m => m.agent_id === agent.id))
                      .map(agent => (
                        <option key={agent.id} value={agent.id}>
                          {agent.name} - {agent.description}
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-400 mb-2">角色</label>
                  <input
                    type="text"
                    value={memberRole}
                    onChange={(e) => setMemberRole(e.target.value)}
                    placeholder="例如：Lead Developer, QA Engineer"
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-blue-500/50"
                  />
                </div>

                <button
                  onClick={handleAddMember}
                  disabled={!selectedAgentId || !memberRole.trim()}
                  className="w-full py-3 bg-green-600 hover:bg-green-500 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-xl font-bold transition-all"
                >
                  添加到团队
                </button>
              </div>
            </GlassCard>

            {/* 团队成员列表 */}
            <GlassCard className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <UsersRound size={18} className="text-purple-400" />
                  <h3 className="font-bold">团队成员</h3>
                  <span className="px-2 py-0.5 bg-purple-500/20 rounded-full text-xs font-black text-purple-400">
                    {members.length}
                  </span>
                </div>
                {members.length < 2 && (
                  <span className="text-xs text-red-400">至少需要 2 个成员</span>
                )}
              </div>

              {members.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-8">暂无成员，请添加</p>
              ) : (
                <div className="space-y-3">
                  {members.map((member, index) => (
                    <motion.div
                      key={member.agent_id}
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center gap-3 p-4 bg-white/5 border border-white/10 rounded-xl"
                    >
                      <div className="flex flex-col gap-1">
                        <button
                          onClick={() => handleMoveMember(index, 'up')}
                          disabled={index === 0}
                          className="text-gray-500 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          <GripVertical size={14} />
                        </button>
                        <button
                          onClick={() => handleMoveMember(index, 'down')}
                          disabled={index === members.length - 1}
                          className="text-gray-500 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          <GripVertical size={14} />
                        </button>
                      </div>

                      <div className="flex-1">
                        <p className="font-bold text-sm">{getAgentName(member.agent_id)}</p>
                        <p className="text-xs text-gray-400">{member.role}</p>
                        <p className="text-xs text-gray-500">优先级: {member.priority}</p>
                      </div>

                      <button
                        onClick={() => handleRemoveMember(member.agent_id)}
                        className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-all"
                      >
                        <Trash2 size={16} />
                      </button>
                    </motion.div>
                  ))}
                </div>
              )}
            </GlassCard>
          </div>
        </div>
      )}
    </div>
  );
};
