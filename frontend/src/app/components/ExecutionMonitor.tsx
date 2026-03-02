import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Activity, Loader, ChevronDown } from 'lucide-react';
import { useExecutionContext } from '../contexts/ExecutionContext';
import { useNavigate } from 'react-router';

export const ExecutionMonitor: React.FC = () => {
  const { runningExecutions } = useExecutionContext();
  const [expanded, setExpanded] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const navigate = useNavigate();

  // 检测移动端
  React.useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768); // md breakpoint
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // 移动端不显示（已集成到菜单中）
  if (runningExecutions.length === 0 || isMobile) return null;

  const handleExecutionClick = (execution: any) => {
    if (execution.execution_type === 'agent_test') {
      navigate('/agents');
    } else {
      navigate('/workflows');
    }
    setExpanded(false);
  };

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (seconds < 60) return `${seconds}秒前`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}分钟前`;
    return `${Math.floor(seconds / 3600)}小时前`;
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <AnimatePresence mode="wait">
        {expanded ? (
          <motion.div
            key="expanded"
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="bg-gray-900/95 backdrop-blur-xl border border-white/20 rounded-2xl p-4 w-80 shadow-2xl"
          >
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <Activity size={16} className="text-blue-400" />
                运行中的任务
              </h3>
              <button onClick={() => setExpanded(false)} className="p-1 hover:bg-white/10 rounded-lg">
                <ChevronDown size={16} className="text-gray-400" />
              </button>
            </div>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {runningExecutions.map(execution => (
                <button
                  key={execution.id}
                  onClick={() => handleExecutionClick(execution)}
                  className="w-full text-left p-3 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Loader size={14} className="animate-spin text-blue-400" />
                    <p className="text-xs font-medium truncate">
                      {execution.execution_type === 'agent_test' ? `Agent 运行 #${execution.agent_id}` : `Workflow #${execution.workflow_id}`}
                    </p>
                  </div>
                  <p className="text-[10px] text-gray-500">
                    开始于 {execution.started_at ? formatRelativeTime(execution.started_at) : '刚刚'}
                  </p>
                </button>
              ))}
            </div>
          </motion.div>
        ) : (
          <motion.button
            key="collapsed"
            onClick={() => setExpanded(true)}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            className="relative bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white rounded-full p-4 shadow-2xl"
          >
            <Activity size={24} />
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center border-2 border-gray-900">
              {runningExecutions.length}
            </span>
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
};
