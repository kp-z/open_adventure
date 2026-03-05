import { useState } from 'react';
import { Activity, Terminal as TerminalIcon } from 'lucide-react';
import { ProcessTab } from '../components/ProcessTab';
import { TerminalTab } from '../components/TerminalTab';

type TabType = 'process' | 'terminal';

const Executions = () => {
  const [activeTab, setActiveTab] = useState<TabType>('process');

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <header className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight uppercase">EXECUTIONS</h1>
          <p className="text-sm md:text-base text-gray-400 line-clamp-1 md:line-clamp-none">
            监控运行中的 Claude Code 进程和终端执行历史
          </p>
        </div>
      </header>

      {/* Tab 切换 */}
      <div className="flex gap-2 bg-white/5 rounded-xl p-1">
        <button
          onClick={() => setActiveTab('process')}
          className={`flex items-center gap-2 px-6 py-3 rounded-lg transition-all flex-1 justify-center ${
            activeTab === 'process'
              ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <Activity size={20} />
          <span className="font-bold">Process</span>
        </button>
        <button
          onClick={() => setActiveTab('terminal')}
          className={`flex items-center gap-2 px-6 py-3 rounded-lg transition-all flex-1 justify-center ${
            activeTab === 'terminal'
              ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <TerminalIcon size={20} />
          <span className="font-bold">Terminal</span>
        </button>
      </div>

      {/* Tab 内容 */}
      {activeTab === 'process' ? <ProcessTab /> : <TerminalTab />}
    </div>
  );
};

export default Executions;
