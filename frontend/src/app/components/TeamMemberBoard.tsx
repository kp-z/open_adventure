/**
 * TeamMemberBoard - 棋盘格成员编辑器
 *
 * 以游戏化的棋盘格形式展示和编辑团队成员
 * - 拖拽调整成员位置
 * - 点击编辑成员详情
 * - 空格子显示"+"添加按钮
 */
import React, { useState } from 'react';
import {
  Plus,
  Edit2,
  Trash2,
  GripVertical,
  Bot,
  Shield,
  Zap,
  Brain
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import type { TeamMember, Agent } from '@/lib/api';

interface TeamMemberBoardProps {
  members: TeamMember[];
  availableAgents: Agent[];
  onAddMember: () => void;
  onEditMember: (member: TeamMember, index: number) => void;
  onRemoveMember: (index: number) => void;
  onReorderMembers: (members: TeamMember[]) => void;
  gridSize?: number; // 网格大小，默认 4x4
}

export const TeamMemberBoard: React.FC<TeamMemberBoardProps> = ({
  members,
  availableAgents,
  onAddMember,
  onEditMember,
  onRemoveMember,
  onReorderMembers,
  gridSize = 4
}) => {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const totalCells = gridSize * gridSize;

  // 获取 Agent 信息
  const getAgentInfo = (agentId: number) => {
    const agent = availableAgents.find(a => a.id === agentId);
    return {
      name: agent?.name || `Agent #${agentId}`,
      color: agent?.meta?.color || 'blue',
      icon: agent?.meta?.icon || 'bot'
    };
  };

  // 获取图标组件
  const getIconComponent = (iconName: string) => {
    const icons: Record<string, any> = {
      bot: Bot,
      shield: Shield,
      zap: Zap,
      brain: Brain
    };
    return icons[iconName] || Bot;
  };

  // 处理拖拽开始
  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  // 处理拖拽结束
  const handleDragEnd = () => {
    setDraggedIndex(null);
    setHoveredIndex(null);
  };

  // 处理拖拽悬停
  const handleDragOver = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === targetIndex) return;
    setHoveredIndex(targetIndex);
  };

  // 处理放置
  const handleDrop = (targetIndex: number) => {
    if (draggedIndex === null || draggedIndex === targetIndex) return;

    const newMembers = [...members];
    const [draggedMember] = newMembers.splice(draggedIndex, 1);

    // 如果目标位置有成员，插入到该位置
    if (targetIndex < newMembers.length) {
      newMembers.splice(targetIndex, 0, draggedMember);
    } else {
      newMembers.push(draggedMember);
    }

    // 更新优先级
    newMembers.forEach((m, i) => {
      m.priority = i + 1;
    });

    onReorderMembers(newMembers);
    setDraggedIndex(null);
    setHoveredIndex(null);
  };

  // 渲染单个格子
  const renderCell = (index: number) => {
    const member = members[index];
    const isEmpty = !member;
    const isDragging = draggedIndex === index;
    const isHovered = hoveredIndex === index;

    if (isEmpty) {
      // 空格子
      return (
        <motion.div
          key={`empty-${index}`}
          className={`aspect-square rounded-2xl border-2 border-dashed border-white/10 flex items-center justify-center cursor-pointer hover:border-purple-500/50 hover:bg-purple-500/5 transition-all ${
            isHovered ? 'border-purple-500/50 bg-purple-500/10 scale-105' : ''
          }`}
          onClick={onAddMember}
          onDragOver={(e) => handleDragOver(e, index)}
          onDrop={() => handleDrop(index)}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <div className="text-center">
            <Plus size={32} className="text-gray-500 mx-auto mb-2" />
            <p className="text-xs text-gray-500 font-bold">添加成员</p>
          </div>
        </motion.div>
      );
    }

    // 有成员的格子
    const agentInfo = getAgentInfo(member.agent_id);
    const IconComponent = getIconComponent(agentInfo.icon);

    return (
      <motion.div
        key={`member-${member.agent_id}-${index}`}
        draggable
        onDragStart={() => handleDragStart(index)}
        onDragEnd={handleDragEnd}
        onDragOver={(e) => handleDragOver(e, index)}
        onDrop={() => handleDrop(index)}
        className={`aspect-square rounded-2xl border-2 p-4 cursor-move relative group ${
          isDragging
            ? 'opacity-50 scale-95'
            : isHovered
            ? 'border-purple-500/50 bg-purple-500/10 scale-105'
            : `border-${agentInfo.color}-500/30 bg-${agentInfo.color}-500/10`
        } transition-all`}
        style={{
          borderColor: isDragging || isHovered ? undefined : `color-mix(in srgb, var(--${agentInfo.color}-500, #3b82f6) 30%, transparent)`,
          backgroundColor: isDragging || isHovered ? undefined : `color-mix(in srgb, var(--${agentInfo.color}-500, #3b82f6) 10%, transparent)`
        }}
        whileHover={{ scale: 1.05 }}
        layout
      >
        {/* 拖拽手柄 */}
        <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <GripVertical size={16} className="text-gray-400" />
        </div>

        {/* 操作按钮 */}
        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEditMember(member, index);
            }}
            className="p-1 bg-white/10 hover:bg-white/20 rounded-lg transition-all"
          >
            <Edit2 size={12} className="text-white" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRemoveMember(index);
            }}
            className="p-1 bg-red-500/20 hover:bg-red-500/30 rounded-lg transition-all"
          >
            <Trash2 size={12} className="text-red-400" />
          </button>
        </div>

        {/* 成员信息 */}
        <div className="flex flex-col items-center justify-center h-full">
          <div
            className={`w-12 h-12 rounded-xl bg-${agentInfo.color}-500/20 flex items-center justify-center mb-2`}
            style={{
              backgroundColor: `color-mix(in srgb, var(--${agentInfo.color}-500, #3b82f6) 20%, transparent)`
            }}
          >
            <IconComponent size={24} className={`text-${agentInfo.color}-400`} />
          </div>
          <p className="text-xs font-bold text-center truncate w-full mb-1">
            {member.role}
          </p>
          <p className="text-[10px] text-gray-500 text-center truncate w-full">
            {agentInfo.name}
          </p>
          <div className="mt-2 px-2 py-0.5 bg-white/5 rounded-full">
            <p className="text-[10px] text-gray-400">P{member.priority}</p>
          </div>
        </div>
      </motion.div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-bold text-lg">团队阵容</h3>
          <p className="text-xs text-gray-400">拖拽调整成员位置和优先级</p>
        </div>
        <div className="text-sm text-gray-400">
          {members.length} / {totalCells} 成员
        </div>
      </div>

      {/* 棋盘格 */}
      <div
        className="grid gap-4"
        style={{
          gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))`
        }}
      >
        {Array.from({ length: totalCells }).map((_, index) => (
          <div key={index}>{renderCell(index)}</div>
        ))}
      </div>

      {/* 提示信息 */}
      <div className="flex items-center gap-2 text-xs text-gray-500 bg-white/5 rounded-xl p-3">
        <GripVertical size={14} />
        <span>拖拽成员卡片可调整位置和优先级</span>
      </div>
    </div>
  );
};
