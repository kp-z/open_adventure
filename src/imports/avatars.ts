/**
 * Agent 头像资源
 * 使用 DiceBear API 生成 3D 卡通头像
 */

// 3D 卡通风格的头像样式
const avatar3DStyles = [
  'avataaars-neutral',  // 3D 卡通人物（中性表情）
  'big-ears-neutral',   // 大耳朵 3D 卡通
  'lorelei-neutral',    // 3D 女性卡通
  'notionists-neutral', // Notion 风格 3D 头像
  'open-peeps',         // 开放式 3D 人物
  'personas',           // 3D 人物角色
];

/**
 * 根据 agent ID 和名称生成 3D 卡通头像 URL
 * 使用 DiceBear API 生成一致的 3D 卡通头像
 */
export function getAgentAvatarUrl(agentId: number, agentName: string): string {
  const style = avatar3DStyles[agentId % avatar3DStyles.length];
  // 使用 agent 名称作为 seed，确保同一个 agent 总是生成相同的头像
  const seed = encodeURIComponent(agentName);
  // 添加 3D 效果的背景色
  return `https://api.dicebear.com/7.x/${style}/svg?seed=${seed}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf&radius=50`;
}

/**
 * 获取 agent 名称的首字母（作为备用方案）
 */
export function getAgentInitials(name: string): string {
  const words = name.split(/[-_\s]+/).filter(w => w.length > 0);
  if (words.length === 0) return '?';
  if (words.length === 1) return words[0].substring(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

// 12 种渐变色方案（作为备用方案）
export const avatarGradients = [
  'from-blue-500 to-cyan-500',
  'from-purple-500 to-pink-500',
  'from-green-500 to-emerald-500',
  'from-orange-500 to-red-500',
  'from-indigo-500 to-purple-500',
  'from-yellow-500 to-orange-500',
  'from-pink-500 to-rose-500',
  'from-teal-500 to-cyan-500',
  'from-red-500 to-pink-500',
  'from-lime-500 to-green-500',
  'from-violet-500 to-purple-500',
  'from-amber-500 to-yellow-500',
];

export function getAgentGradient(agentId: number): string {
  return avatarGradients[agentId % avatarGradients.length];
}


