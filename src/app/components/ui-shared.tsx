import React from 'react';
import { motion } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useMode } from '../contexts/ModeContext';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const GlassCard = ({ children, className, onClick }: { children: React.ReactNode; className?: string; onClick?: () => void }) => {
  return (
    <motion.div
      whileHover={{ y: -5, scale: 1.01 }}
      onClick={onClick}
      className={cn(
        "bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 shadow-xl",
        "hover:border-white/20 transition-all duration-300 cursor-pointer overflow-hidden relative group",
        className
      )}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
      {children}
    </motion.div>
  );
};

export const GameCard = ({ children, rarity = 'common', className, onClick }: { 
  children: React.ReactNode; 
  rarity?: 'common' | 'rare' | 'epic' | 'legendary';
  className?: string; 
  onClick?: () => void 
}) => {
  const rarityColors = {
    common: "border-gray-500 shadow-[0_0_10px_rgba(107,114,128,0.3)]",
    rare: "border-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.4)]",
    epic: "border-purple-500 shadow-[0_0_20px_rgba(168,85,247,0.5)]",
    legendary: "border-yellow-500 shadow-[0_0_30px_rgba(234,179,8,0.6)]",
  };

  return (
    <motion.div
      whileHover={{ scale: 1.05, rotateY: 5, rotateX: -5 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className={cn(
        "relative bg-[#1a1a2e] border-2 rounded-xl p-4 cursor-pointer overflow-hidden transition-all duration-300",
        rarityColors[rarity],
        className
      )}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.1),transparent)]" />
      {children}
    </motion.div>
  );
};

export const UniversalCard = (props: any) => {
  const { mode } = useMode();
  return mode === 'professional' ? <GlassCard {...props} /> : <GameCard {...props} />;
};

export const ActionButton = ({ children, className, onClick, variant = 'primary' }: { 
  children: React.ReactNode; 
  className?: string; 
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'danger' 
}) => {
  const { mode } = useMode();
  
  if (mode === 'adventure') {
    return (
      <motion.button
        whileHover={{ scale: 1.05, boxShadow: "0 0 15px rgba(255,215,0,0.5)" }}
        whileTap={{ scale: 0.95 }}
        onClick={onClick}
        className={cn(
          "px-6 py-2 rounded-lg font-bold uppercase tracking-wider border-2 transition-all",
          variant === 'primary' ? "bg-yellow-600 border-yellow-400 text-white" : "bg-gray-700 border-gray-500 text-gray-200",
          className
        )}
      >
        {children}
      </motion.button>
    );
  }

  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={cn(
        "px-6 py-2 rounded-xl font-medium transition-all shadow-lg",
        variant === 'primary' ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white" : "bg-white/10 text-white hover:bg-white/20",
        className
      )}
    >
      {children}
    </motion.button>
  );
};
