import {
  User,
  Trophy,
  Table,
  Droplet,
  IceCream,
  Dumbbell,
  Gamepad2,
  Box,
  Brain,
  Target,
  Circle,
  Bell,
  Timer,
  Waves,
  CircleDot,
  Disc,
  type LucideIcon
} from 'lucide-react';

export const skillIcons: Record<string, LucideIcon> = {
  sportsperson2: User,
  sportsperson1: User,
  trophy: Trophy,
  tableTennis: Table,
  sportsBottle: Droplet,
  hockey: IceCream,
  rugby: Circle,
  gymming: Dumbbell,
  esports: Gamepad2,
  boxing: Box,
  chess: Brain,
  cricket: Target,
  baseball: Circle,
  whistle: Bell,
  stopwatch: Timer,
  swimming: Waves,
  tennis: CircleDot,
  badminton: Disc,
  basketball: Circle,
  football: Circle,
};

export const getSkillIcon = (key: string): LucideIcon => {
  return skillIcons[key] || Trophy;
};
