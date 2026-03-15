/**
 * Agent 头像配置
 * 使用 Godot Microverse 项目中的角色头像
 */

export interface Avatar {
  id: string;
  name: string;
  path: string;
  description?: string;
}

export const AVATARS: Avatar[] = [
  {
    id: 'alice',
    name: 'Alice',
    path: '/avatars/AliceP32.png',
    description: '友好的助手'
  },
  {
    id: 'grace',
    name: 'Grace',
    path: '/avatars/GraceP32.png',
    description: '优雅的顾问'
  },
  {
    id: 'jack',
    name: 'Jack',
    path: '/avatars/JackP32.png',
    description: '技术专家'
  },
  {
    id: 'joe',
    name: 'Joe',
    path: '/avatars/JoeP32.png',
    description: '经验丰富的导师'
  },
  {
    id: 'lea',
    name: 'Lea',
    path: '/avatars/LeaP32.png',
    description: '创意设计师'
  },
  {
    id: 'monica',
    name: 'Monica',
    path: '/avatars/MonicaP32.png',
    description: '项目经理'
  },
  {
    id: 'stephen',
    name: 'Stephen',
    path: '/avatars/StephenP32.png',
    description: '研究员'
  },
  {
    id: 'tom',
    name: 'Tom',
    path: '/avatars/TomP32.png',
    description: '开发者'
  }
];

// 根据ID获取头像
export const getAvatarById = (id: string): Avatar | undefined => {
  return AVATARS.find(avatar => avatar.id === id);
};

// 获取随机头像
export const getRandomAvatar = (): Avatar => {
  return AVATARS[Math.floor(Math.random() * AVATARS.length)];
};

// 默认头像（如果没有指定）
export const DEFAULT_AVATAR = AVATARS[0];
