import React, { useState } from 'react';
import { ArrowUp, ArrowDown, Layers } from 'lucide-react';

export type ShortcutType = 'insert' | 'control' | 'command' | 'history';
export type ShortcutMode = 'basic' | 'advanced' | 'custom';

export interface Shortcut {
  id: string;
  label: string;
  type: ShortcutType;
  value: string;
  icon?: React.ReactNode;
  mode?: ShortcutMode[];
}

interface TerminalShortcutBarProps {
  onShortcutClick: (shortcut: Shortcut) => void;
  className?: string;
}

const allShortcuts: Shortcut[] = [
  // 历史命令 - 所有模式
  { id: 'history-up', label: '↑', type: 'history', value: 'up', icon: <ArrowUp className="w-4 h-4" />, mode: ['basic', 'advanced', 'custom'] },
  { id: 'history-down', label: '↓', type: 'history', value: 'down', icon: <ArrowDown className="w-4 h-4" />, mode: ['basic', 'advanced', 'custom'] },

  // 基础插入类 - basic + advanced
  { id: 'pipe', label: '|', type: 'insert', value: ' | ', mode: ['basic', 'advanced'] },
  { id: 'and', label: '&&', type: 'insert', value: ' && ', mode: ['basic', 'advanced'] },
  { id: 'redirect', label: '>', type: 'insert', value: ' > ', mode: ['basic', 'advanced'] },
  { id: 'help', label: '--help', type: 'insert', value: ' --help', mode: ['basic', 'advanced'] },

  // 高级插入类 - advanced only
  { id: 'or', label: '||', type: 'insert', value: ' || ', mode: ['advanced'] },
  { id: 'append', label: '>>', type: 'insert', value: ' >> ', mode: ['advanced'] },
  { id: 'stderr', label: '2>', type: 'insert', value: ' 2> ', mode: ['advanced'] },
  { id: 'both', label: '&>', type: 'insert', value: ' &> ', mode: ['advanced'] },

  // 基础控制类 - basic + advanced
  { id: 'tab', label: 'Tab', type: 'control', value: 'tab', mode: ['basic', 'advanced'] },
  { id: 'ctrl-c', label: 'Ctrl+C', type: 'control', value: 'ctrl-c', mode: ['basic', 'advanced'] },

  // 高级控制类 - advanced only
  { id: 'ctrl-d', label: 'Ctrl+D', type: 'control', value: 'ctrl-d', mode: ['advanced'] },
  { id: 'esc', label: 'Esc', type: 'control', value: 'esc', mode: ['advanced'] },
  { id: 'ctrl-z', label: 'Ctrl+Z', type: 'control', value: 'ctrl-z', mode: ['advanced'] },

  // 基础命令类 - basic + advanced
  { id: 'ls', label: 'ls', type: 'command', value: 'ls', mode: ['basic', 'advanced'] },
  { id: 'clear', label: 'clear', type: 'command', value: 'clear', mode: ['basic', 'advanced'] },
  { id: 'pwd', label: 'pwd', type: 'command', value: 'pwd', mode: ['basic', 'advanced'] },

  // 高级命令类 - advanced only
  { id: 'cd-up', label: 'cd ..', type: 'command', value: 'cd ..', mode: ['advanced'] },
  { id: 'history', label: 'history', type: 'command', value: 'history', mode: ['advanced'] },
  { id: 'grep', label: 'grep', type: 'command', value: 'grep ', mode: ['advanced'] },
];

const modeOrder: ShortcutMode[] = ['basic', 'advanced', 'custom'];

export const TerminalShortcutBar: React.FC<TerminalShortcutBarProps> = ({
  onShortcutClick,
  className = '',
}) => {
  const [currentMode, setCurrentMode] = useState<ShortcutMode>('basic');

  const getShortcutStyle = (type: ShortcutType) => {
    switch (type) {
      case 'history':
        return 'bg-purple-500/20 text-purple-300 border-purple-500/30 hover:bg-purple-500/30 active:bg-purple-500/40';
      case 'insert':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/30 hover:bg-blue-500/30 active:bg-blue-500/40';
      case 'control':
        return 'bg-orange-500/20 text-orange-300 border-orange-500/30 hover:bg-orange-500/30 active:bg-orange-500/40';
      case 'command':
        return 'bg-green-500/20 text-green-300 border-green-500/30 hover:bg-green-500/30 active:bg-green-500/40';
      default:
        return 'bg-gray-500/20 text-gray-300 border-gray-500/30 hover:bg-gray-500/30 active:bg-gray-500/40';
    }
  };

  const getModeIcon = (mode: ShortcutMode) => {
    switch (mode) {
      case 'basic': return '1';
      case 'advanced': return '2';
      case 'custom': return '3';
    }
  };

  const getModeTooltip = (mode: ShortcutMode) => {
    switch (mode) {
      case 'basic': return '基础模式';
      case 'advanced': return '高级模式';
      case 'custom': return '自定义模式';
    }
  };

  const cycleMode = () => {
    const currentIndex = modeOrder.indexOf(currentMode);
    const nextIndex = (currentIndex + 1) % modeOrder.length;
    setCurrentMode(modeOrder[nextIndex]);
  };

  const filteredShortcuts = allShortcuts.filter(
    shortcut => shortcut.mode?.includes(currentMode)
  );

  return (
    <div className={`flex items-center gap-2 p-2 ${className}`}>
      {/* 快捷键横向滚动区域 */}
      <div 
        className="flex-1 min-w-0 overflow-x-auto"
        style={{
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}
      >
        <style>{`
          .shortcut-scroll-container::-webkit-scrollbar {
            display: none;
          }
        `}</style>
        <div className="shortcut-scroll-container flex gap-1.5 flex-nowrap">
          {filteredShortcuts.map((shortcut) => (
            <button
              key={shortcut.id}
              onClick={() => onShortcutClick(shortcut)}
              className={`
                flex items-center gap-1 px-2.5 py-1.5 rounded-lg
                text-xs font-medium border
                transition-colors whitespace-nowrap flex-shrink-0
                touch-manipulation
                ${getShortcutStyle(shortcut.type)}
              `}
              title={`${shortcut.type}: ${shortcut.value}`}
            >
              {shortcut.icon}
              <span>{shortcut.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 模式切换按钮 - 固定右侧 */}
      <button
        onClick={cycleMode}
        className="
          flex-shrink-0 w-9 h-9 rounded-lg
          flex items-center justify-center
          bg-white/10 border border-white/20
          text-white/80 hover:text-white hover:bg-white/15
          active:bg-white/20
          transition-colors touch-manipulation
        "
        title={getModeTooltip(currentMode)}
      >
        <div className="relative">
          <Layers className="w-4 h-4" />
          <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-blue-500 text-[9px] font-bold flex items-center justify-center">
            {getModeIcon(currentMode)}
          </span>
        </div>
      </button>
    </div>
  );
};
