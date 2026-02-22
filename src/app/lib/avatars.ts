import {
  Shield,
  Zap,
  Sparkles,
  Code,
  Database,
  Sword,
  Cloud,
  Terminal,
  Flame,
  Crown,
  Wand2,
  Brain
} from 'lucide-react';

export const heroAvatars = [
  { id: 'vanguard_1', name: 'Elite Guardian', icon: Shield, rarity: 'rare' },
  { id: 'vanguard_2', name: 'Cyber Rogue', icon: Zap, rarity: 'rare' },
  { id: 'vanguard_3', name: 'Neo Sage', icon: Sparkles, rarity: 'legendary' },
  { id: 'vanguard_4', name: 'Tech Weaver', icon: Code, rarity: 'epic' },
  { id: 'vanguard_5', name: 'Data Sentinel', icon: Database, rarity: 'epic' },
  { id: 'vanguard_6', name: 'Bit Paladin', icon: Sword, rarity: 'legendary' },
  { id: 'vanguard_7', name: 'Cloud Oracle', icon: Cloud, rarity: 'legendary' },
  { id: 'vanguard_8', name: 'Script Assassin', icon: Terminal, rarity: 'epic' },
  { id: 'vanguard_9', name: 'Flux Warden', icon: Flame, rarity: 'epic' },
  { id: 'vanguard_10', name: 'Kernel Knight', icon: Crown, rarity: 'legendary' },
  { id: 'vanguard_11', name: 'Macro Mage', icon: Wand2, rarity: 'epic' },
  { id: 'vanguard_12', name: 'Logic Lord', icon: Brain, rarity: 'legendary' },
];

export const getRandomAvatar = () => {
  return heroAvatars[Math.floor(Math.random() * heroAvatars.length)];
};

export const getAvatarById = (id: string) => {
  return heroAvatars.find(a => a.id === id) || heroAvatars[0];
};
