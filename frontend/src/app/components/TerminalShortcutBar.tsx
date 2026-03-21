import React, { useState } from 'react';
import { Layers } from 'lucide-react';

// 快捷键类型：char 为普通字符，control 为控制码
export type ShortcutType = 'char' | 'control';

// 快捷键分组
export type ShortcutGroup = 'mode' | 'control' | 'nav' | 'command';

// 快捷键模式
export type ShortcutMode = 'basic' | 'extended' | 'claude';

export interface Shortcut {
  id: string;
  label: string;           // 显示文本
  type: ShortcutType;
  value: string;           // 发送到终端的值
  doubleClickValue?: string; // 双击时发送的值（可选）
  group: ShortcutGroup;
  modes: ShortcutMode[];   // 在哪些模式下显示
}

interface TerminalShortcutBarProps {
  onShortcutClick: (shortcut: Shortcut) => void;
  className?: string;
}

// 所有快捷键配置 - 每个模式独立，不重叠
const allShortcuts: Shortcut[] = [
  // ===== Basic 模式：最基础、最常用的快捷键 =====
  // 符号区
  { id: 'bash', label: '!', type: 'char', value: '!', group: 'mode', modes: ['basic'] },
  { id: 'cmd', label: '/', type: 'char', value: '/', group: 'mode', modes: ['basic'] },
  { id: 'file', label: '@', type: 'char', value: '@', group: 'mode', modes: ['basic'] },
  // 导航区
  { id: 'up', label: '↑', type: 'control', value: '\x1b[A', group: 'nav', modes: ['basic'] },
  { id: 'down', label: '↓', type: 'control', value: '\x1b[B', group: 'nav', modes: ['basic'] },
  { id: 'tab', label: 'Tab', type: 'control', value: '\t', group: 'nav', modes: ['basic'] },
  { id: 'newline', label: '⏎', type: 'control', value: '\n', group: 'nav', modes: ['basic'] },
  // 控制区
  { id: 'ctrl-c', label: '^C', type: 'control', value: '\x03', group: 'control', modes: ['basic'] },
  { id: 'ctrl-z', label: '^Z', type: 'control', value: '\x1a', group: 'control', modes: ['basic'] },
  { id: 'esc', label: 'Esc', type: 'control', value: '\x1b', doubleClickValue: '\x1b\x1b', group: 'control', modes: ['basic'] },

  // ===== Extended 模式：扩展快捷键 =====
  // 符号区
  { id: 'bg', label: '&', type: 'char', value: '&', group: 'mode', modes: ['extended'] },
  { id: 'pipe', label: '|', type: 'char', value: '|', group: 'mode', modes: ['extended'] },
  { id: 'tilde', label: '~', type: 'char', value: '~', group: 'mode', modes: ['extended'] },
  // 导航区
  { id: 'left', label: '←', type: 'control', value: '\x1b[D', group: 'nav', modes: ['extended'] },
  { id: 'right', label: '→', type: 'control', value: '\x1b[C', group: 'nav', modes: ['extended'] },
  { id: 'shift-tab', label: '⇧⇥', type: 'control', value: '\x1b[Z', group: 'nav', modes: ['extended'] },
  { id: 'home', label: 'Home', type: 'control', value: '\x1b[H', group: 'nav', modes: ['extended'] },
  { id: 'end', label: 'End', type: 'control', value: '\x1b[F', group: 'nav', modes: ['extended'] },
  // 控制区
  { id: 'ctrl-l', label: '^L', type: 'control', value: '\x0c', group: 'control', modes: ['extended'] },
  { id: 'ctrl-v', label: '^V', type: 'control', value: '\x16', group: 'control', modes: ['extended'] },
  { id: 'ctrl-a', label: '^A', type: 'control', value: '\x01', group: 'control', modes: ['extended'] },
  { id: 'ctrl-e', label: '^E', type: 'control', value: '\x05', group: 'control', modes: ['extended'] },

  // ===== Claude 模式：Claude Code 专用快捷键 =====
  // 控制区
  { id: 'ctrl-o', label: '^O', type: 'control', value: '\x0f', group: 'control', modes: ['claude'] },
  { id: 'ctrl-t', label: '^T', type: 'control', value: '\x14', group: 'control', modes: ['claude'] },
  { id: 'ctrl-s', label: '^S', type: 'control', value: '\x13', group: 'control', modes: ['claude'] },
  // 命令区
  { id: 'btw', label: '/btw', type: 'char', value: '/btw ', group: 'command', modes: ['claude'] },
  { id: 'help', label: '/help', type: 'char', value: '/help\n', group: 'command', modes: ['claude'] },
  { id: 'clear', label: '/clear', type: 'char', value: '/clear\n', group: 'command', modes: ['claude'] },
  { id: 'diff', label: '/diff', type: 'char', value: '/diff\n', group: 'command', modes: ['claude'] },
  { id: 'model', label: '/model', type: 'char', value: '/model\n', group: 'command', modes: ['claude'] },
];

// 模式配置
const modeConfig: Record<ShortcutMode, { label: string; icon: string }> = {
  basic: { label: '基础', icon: '1' },
  extended: { label: '扩展', icon: '2' },
  claude: { label: 'Claude', icon: 'C' },
};

// 模式顺序
const modeOrder: ShortcutMode[] = ['basic', 'extended', 'claude'];

// 根据分组获取样式
const getGroupStyle = (group: ShortcutGroup): string => {
  switch (group) {
    case 'mode':
      // 青色 - 模式/符号区
      return 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30 hover:bg-cyan-500/30 active:bg-cyan-500/40';
    case 'control':
      // 橙色 - 控制区
      return 'bg-orange-500/20 text-orange-300 border-orange-500/30 hover:bg-orange-500/30 active:bg-orange-500/40';
    case 'nav':
      // 紫色 - 导航区
      return 'bg-purple-500/20 text-purple-300 border-purple-500/30 hover:bg-purple-500/30 active:bg-purple-500/40';
    case 'command':
      // 灰色 - 命令区
      return 'bg-gray-500/20 text-gray-300 border-gray-500/30 hover:bg-gray-500/30 active:bg-gray-500/40';
    default:
      return 'bg-gray-500/20 text-gray-300 border-gray-500/30 hover:bg-gray-500/30 active:bg-gray-500/40';
  }
};

// 分组分隔符组件
const GroupSeparator: React.FC = () => (
  <div className="w-px h-6 bg-white/20 mx-1 flex-shrink-0" />
);

export const TerminalShortcutBar: React.FC<TerminalShortcutBarProps> = ({
  onShortcutClick,
  className = '',
}) => {
  const [currentMode, setCurrentMode] = useState<ShortcutMode>('basic');

  // 切换到下一个模式
  const handleModeSwitch = (e: React.PointerEvent | React.TouchEvent) => {
    e.preventDefault();
    const currentIndex = modeOrder.indexOf(currentMode);
    const nextIndex = (currentIndex + 1) % modeOrder.length;
    setCurrentMode(modeOrder[nextIndex]);
  };

  // 获取当前模式的快捷键
  const getShortcutsForMode = (mode: ShortcutMode): Shortcut[] => {
    return allShortcuts.filter(s => s.modes.includes(mode));
  };

  // 将快捷键按分组排列，并在分组之间插入分隔符
  const renderShortcuts = () => {
    const shortcuts = getShortcutsForMode(currentMode);
    const elements: React.ReactNode[] = [];
    let lastGroup: ShortcutGroup | null = null;

    shortcuts.forEach((shortcut, index) => {
      // 在分组变化时插入分隔符
      if (lastGroup !== null && shortcut.group !== lastGroup) {
        elements.push(<GroupSeparator key={`sep-${index}`} />);
      }
      lastGroup = shortcut.group;

      elements.push(
        <button
          key={shortcut.id}
          type="button"
          onPointerDown={(e) => {
            e.preventDefault();
            onShortcutClick(shortcut);
          }}
          onTouchEnd={(e) => e.preventDefault()}
          className={`
            flex items-center justify-center px-2.5 py-1.5 rounded-lg
            text-xs font-medium border
            transition-colors whitespace-nowrap flex-shrink-0
            touch-manipulation min-w-[32px]
            ${getGroupStyle(shortcut.group)}
          `}
          title={shortcut.doubleClickValue ? `${shortcut.label} (双击: 清空)` : shortcut.label}
        >
          <span>{shortcut.label}</span>
        </button>
      );
    });

    return elements;
  };

  return (
    <div className={`flex items-center gap-1 p-2 ${className}`}>
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
        <div className="shortcut-scroll-container flex gap-1 flex-nowrap items-center">
          {renderShortcuts()}
        </div>
      </div>

      {/* 分隔线 */}
      <div className="w-px h-6 bg-white/20 flex-shrink-0" />

      {/* 模式切换按钮 - 固定在右侧 */}
      <button
        type="button"
        onPointerDown={handleModeSwitch}
        onTouchEnd={(e) => e.preventDefault()}
        className="
          flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg
          text-xs font-medium border flex-shrink-0
          bg-blue-500/20 text-blue-300 border-blue-500/30
          hover:bg-blue-500/30 active:bg-blue-500/40
          touch-manipulation min-w-[40px]
        "
        title={`当前模式: ${modeConfig[currentMode].label}，点击切换`}
      >
        <Layers size={12} />
        <span>{modeConfig[currentMode].icon}</span>
      </button>
    </div>
  );
};
