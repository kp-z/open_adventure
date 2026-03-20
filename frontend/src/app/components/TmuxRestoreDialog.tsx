import React, { useState, useEffect } from 'react';
import { Terminal, Clock, FolderOpen, X } from 'lucide-react';

interface TmuxRestoreDialogProps {
  isOpen: boolean;
  sessions: Array<{
    sessionName: string;
    projectPath?: string;
    lastDetachTime?: number;
  }>;
  onRestore: (sessionNames: string[]) => void;
  onIgnore: (sessionNames: string[]) => void;
}

const formatTime = (timestamp: number): string => {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  
  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes} 分钟前`;
  if (hours < 24) return `${hours} 小时前`;
  return `${days} 天前`;
};

export const TmuxRestoreDialog: React.FC<TmuxRestoreDialogProps> = ({
  isOpen,
  sessions,
  onRestore,
  onIgnore
}) => {
  // 默认全选所有会话
  const [selectedSessions, setSelectedSessions] = useState<string[]>([]);

  // 当 sessions 变化时，默认全选
  useEffect(() => {
    if (isOpen && sessions.length > 0) {
      setSelectedSessions(sessions.map(s => s.sessionName));
    }
  }, [isOpen, sessions]);

  if (!isOpen || sessions.length === 0) {
    return null;
  }

  const handleToggleSession = (sessionName: string) => {
    setSelectedSessions(prev => {
      if (prev.includes(sessionName)) {
        return prev.filter(s => s !== sessionName);
      } else {
        return [...prev, sessionName];
      }
    });
  };

  const handleRestoreSelected = () => {
    // 只恢复选中的会话（至少选一个）
    if (selectedSessions.length > 0) {
      onRestore(selectedSessions);
    }
  };

  const handleIgnoreAll = () => {
    // 忽略全部：删除所有 tmux 会话
    onIgnore(sessions.map(s => s.sessionName));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-gray-900 border border-white/10 rounded-lg shadow-2xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Terminal className="text-blue-500" size={24} />
              <div>
                <h2 className="text-xl font-bold text-white">检测到 tmux 会话</h2>
                <p className="text-sm text-gray-400 mt-1">
                  发现 {sessions.length} 个暂离的 tmux 会话，是否恢复连接？
                </p>
              </div>
            </div>
            <button
              onClick={handleIgnoreAll}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Session List */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
          {sessions.map(session => (
            <div
              key={session.sessionName}
              onClick={() => handleToggleSession(session.sessionName)}
              className={`border rounded-lg p-4 cursor-pointer transition-all ${
                selectedSessions.includes(session.sessionName)
                  ? 'bg-blue-500/10 border-blue-500/30'
                  : 'bg-white/5 border-white/10 hover:bg-white/10'
              }`}
            >
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={selectedSessions.includes(session.sessionName)}
                  onChange={() => handleToggleSession(session.sessionName)}
                  className="mt-1 w-4 h-4 text-blue-500 focus:ring-blue-500 rounded"
                  onClick={(e) => e.stopPropagation()}
                />
                <div className="flex-1">
                  <div className="font-medium text-white">{session.sessionName}</div>
                  <div className="flex items-center gap-4 mt-2 text-sm text-gray-400">
                    {session.projectPath && (
                      <div className="flex items-center gap-1">
                        <FolderOpen size={14} />
                        <span>{session.projectPath}</span>
                      </div>
                    )}
                    {session.lastDetachTime && (
                      <div className="flex items-center gap-1">
                        <Clock size={14} />
                        <span>暂离于 {formatTime(session.lastDetachTime)}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/10 flex items-center justify-between">
          <div className="text-sm text-gray-400">
            {selectedSessions.length > 0 ? (
              <span>已选择 {selectedSessions.length}/{sessions.length} 个会话</span>
            ) : (
              <span>请至少选择一个会话</span>
            )}
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleIgnoreAll}
              className="px-4 py-2 text-sm rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 border border-red-500/20 transition-all"
              title="删除所有暂离的 tmux 会话"
            >
              忽略全部
            </button>
            <button
              onClick={handleRestoreSelected}
              disabled={selectedSessions.length === 0}
              className={`px-4 py-2 text-sm rounded-lg transition-all ${
                selectedSessions.length > 0
                  ? 'bg-blue-500 hover:bg-blue-600 text-white'
                  : 'bg-gray-600 text-gray-400 cursor-not-allowed'
              }`}
            >
              恢复选中 ({selectedSessions.length})
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
