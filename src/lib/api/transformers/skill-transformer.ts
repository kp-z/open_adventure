/**
 * Skill 数据转换器
 * 将后端 API 返回的 Skill 数据转换为 UI 组件所需的格式
 * 保持 UI 组件不变，仅在数据层做适配
 */

import type { Skill, SkillSource } from '../types';
import {
  Globe,
  Code2,
  FileText,
  Zap,
  Wrench,
  Clock,
  Brain,
  Database,
  Search,
  Bot,
  type LucideIcon,
} from 'lucide-react';

// ============ UI 层使用的 Skill 类型 ============
export interface UISkill {
  id: number;
  name: { en: string; zh: string };
  icon: LucideIcon;
  advIcon: string;
  desc: { en: string; zh: string };
  tags: { en: string[]; zh: string[] };
  source: 'Global' | 'Plugin' | 'Project';
  projectName?: string;
  pluginNamespace?: string;
  status: 'enabled' | 'disabled';
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  level: number;
  xp: number;
  usage: number;
  // 重复标记
  isDuplicate: boolean;
  duplicateCount: number;
  duplicateLocations: string[];
  // 保留原始数据供编辑使用
  _raw: Skill;
}

// ============ 映射配置 ============

// 后端 source -> UI source 映射
const SOURCE_MAP: Record<SkillSource, 'Global' | 'Plugin' | 'Project'> = {
  global: 'Global',
  plugin: 'Plugin',
  project: 'Project',
};

// 技能类型 -> 图标映射
const TYPE_ICON_MAP: Record<string, LucideIcon> = {
  analysis: Brain,
  search: Search,
  documentation: FileText,
  code: Code2,
  data: Database,
  web: Globe,
  api: Zap,
  tool: Wrench,
  monitor: Clock,
  agent: Bot,
};

// 技能类型 -> 游戏化图标映射（adventureIcon）
const TYPE_ADV_ICON_MAP: Record<string, string> = {
  analysis: 'chess',
  search: 'swimming',
  documentation: 'sportsBottle',
  code: 'esports',
  data: 'gymming',
  web: 'swimming',
  api: 'esports',
  tool: 'gymming',
  monitor: 'stopwatch',
  agent: 'trophy',
};

// ============ 工具函数 ============

/**
 * 根据使用次数计算稀有度（游戏化视图）
 */
function calculateRarity(usageCount: number): 'common' | 'rare' | 'epic' | 'legendary' {
  if (usageCount >= 5000) return 'legendary';
  if (usageCount >= 1000) return 'epic';
  if (usageCount >= 200) return 'rare';
  return 'common';
}

/**
 * 根据创建时间计算等级
 * 每周升一级，最高 12 级
 */
function calculateLevel(createdAt: string): number {
  const days = Math.floor(
    (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24)
  );
  return Math.min(Math.floor(days / 7) + 1, 12);
}

/**
 * 计算经验值（0-100）
 */
function calculateXP(usageCount: number): number {
  return usageCount % 100;
}

/**
 * 获取技能图标
 */
function getIcon(type: string): LucideIcon {
  return TYPE_ICON_MAP[type.toLowerCase()] || Zap;
}

/**
 * 获取游戏化图标 key
 */
function getAdvIcon(type: string): string {
  return TYPE_ADV_ICON_MAP[type.toLowerCase()] || 'trophy';
}

// ============ 转换函数 ============

/**
 * 将后端 Skill 转换为 UI 组件所需格式
 * @param skill 后端返回的 Skill 数据
 * @returns UI 层使用的 Skill 数据
 */
export function transformSkillToUI(skill: Skill): UISkill {
  const usageCount = skill.meta?.usage_count || 0;
  const meta = skill.meta || {};

  // 提取插件命名空间：优先 plugin_namespace，其次 plugin_name
  const pluginNamespace = meta.plugin_namespace || meta.plugin_name;
  
  // 提取项目名称：优先 project_name，其次从 path 中提取
  let projectName = meta.project_name;
  if (!projectName && skill.source === 'project' && meta.path) {
    // 尝试从路径提取项目名
    const pathParts = (meta.path as string).split('/');
    const projectIndex = pathParts.indexOf('.claude');
    if (projectIndex > 0) {
      projectName = pathParts[projectIndex - 1];
    }
  }

  return {
    id: skill.id,
    // 名称：优先使用 meta 中的多语言配置，否则使用 full_name
    name: {
      en: meta.name_en || skill.full_name,
      zh: meta.name_zh || skill.full_name,
    },
    // 图标
    icon: getIcon(skill.type),
    advIcon: meta.adv_icon || getAdvIcon(skill.type),
    // 描述
    desc: {
      en: meta.desc_en || skill.description,
      zh: meta.desc_zh || skill.description,
    },
    // 标签：保留原始标签，支持多语言配置
    tags: {
      en: meta.tags_en || skill.tags || [],
      zh: meta.tags_zh || skill.tags || [],
    },
    // 来源
    source: SOURCE_MAP[skill.source] || 'Global',
    // 项目/插件信息
    projectName: projectName,
    pluginNamespace: pluginNamespace,
    // 状态
    status: skill.enabled ? 'enabled' : 'disabled',
    // 游戏化属性
    rarity: calculateRarity(usageCount),
    level: calculateLevel(skill.created_at),
    xp: calculateXP(usageCount),
    usage: usageCount,
    // 重复标记
    isDuplicate: meta.is_duplicate || false,
    duplicateCount: meta.duplicate_count || 1,
    duplicateLocations: meta.duplicate_locations || [],
    // 原始数据
    _raw: skill,
  };
}

/**
 * 批量转换 Skill 列表
 */
export function transformSkillsToUI(skills: Skill[]): UISkill[] {
  return skills.map(transformSkillToUI);
}

/**
 * 将 UI 表单数据转换为后端 SkillCreate 格式
 */
export function transformUIToSkillCreate(formData: {
  name: string;
  fullName: string;
  type: string;
  description: string;
  tags: string[];
  enabled: boolean;
}) {
  return {
    name: formData.name,
    full_name: formData.fullName,
    type: formData.type,
    description: formData.description,
    tags: formData.tags,
    source: 'project' as SkillSource,
    enabled: formData.enabled,
    meta: {},
  };
}

/**
 * 将 UI 表单数据转换为后端 SkillUpdate 格式
 */
export function transformUIToSkillUpdate(formData: Partial<{
  name: string;
  fullName: string;
  type: string;
  description: string;
  tags: string[];
  enabled: boolean;
}>) {
  const result: Record<string, any> = {};
  
  if (formData.name !== undefined) result.name = formData.name;
  if (formData.fullName !== undefined) result.full_name = formData.fullName;
  if (formData.type !== undefined) result.type = formData.type;
  if (formData.description !== undefined) result.description = formData.description;
  if (formData.tags !== undefined) result.tags = formData.tags;
  if (formData.enabled !== undefined) result.enabled = formData.enabled;
  
  return result;
}
