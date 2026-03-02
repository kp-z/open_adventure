import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Target, Calendar, TrendingUp, FileDown, ExternalLink } from 'lucide-react';
import { GlassCard } from '../components/ui-shared';
import OKRView from '../components/opp/OKRView';
import PlanView from '../components/opp/PlanView';
import ProgressView from '../components/opp/ProgressView';
import FeishuImportDialog from '../components/opp/FeishuImportDialog';

type TabType = 'okr' | 'plan' | 'progress';

export default function OPP() {
  const [activeTab, setActiveTab] = useState<TabType>('okr');
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);

  const handleFeishuImport = () => {
    setIsImportDialogOpen(true);
  };

  useEffect(() => {
    // Listen for navigation events from child components
    const handleNavigateToPlan = () => setActiveTab('plan');
    const handleNavigateToProgress = () => setActiveTab('progress');
    const handleNavigateToOKR = () => setActiveTab('okr');

    window.addEventListener('navigate-to-plan', handleNavigateToPlan);
    window.addEventListener('navigate-to-progress', handleNavigateToProgress);
    window.addEventListener('navigate-to-okr', handleNavigateToOKR);

    return () => {
      window.removeEventListener('navigate-to-plan', handleNavigateToPlan);
      window.removeEventListener('navigate-to-progress', handleNavigateToProgress);
      window.removeEventListener('navigate-to-okr', handleNavigateToOKR);
    };
  }, []);

  const tabs = [
    {
      id: 'okr' as TabType,
      label: 'OKR',
      description: 'Objectives & Key Results',
      icon: Target,
      activeClass: 'bg-purple-500/20 border-purple-500/50 shadow-purple-500/20',
      inactiveClass: 'bg-white/5 border-white/10',
      iconColor: 'text-purple-400',
    },
    {
      id: 'plan' as TabType,
      label: 'Plan',
      description: 'Task Planning & Scheduling',
      icon: Calendar,
      activeClass: 'bg-blue-500/20 border-blue-500/50 shadow-blue-500/20',
      inactiveClass: 'bg-white/5 border-white/10',
      iconColor: 'text-blue-400',
    },
    {
      id: 'progress' as TabType,
      label: 'Progress',
      description: 'Execution Monitoring',
      icon: TrendingUp,
      activeClass: 'bg-green-500/20 border-green-500/50 shadow-green-500/20',
      inactiveClass: 'bg-white/5 border-white/10',
      iconColor: 'text-green-400',
    },
  ];

  return (
    <div className="max-w-[1800px] mx-auto">
      {/* Header */}
      <div className="mb-8">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">OPP Command Center</h1>
            <p className="text-gray-400">
              AI Task Orchestration Platform - Objectives, Planning & Progress
            </p>
          </div>
          <motion.button
            onClick={handleFeishuImport}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 rounded-xl font-bold shadow-lg shadow-blue-500/30 transition-all group"
          >
            <FileDown size={18} className="text-white group-hover:animate-bounce" />
            <span className="text-white">从飞书导入</span>
            <ExternalLink size={14} className="text-white/80" />
          </motion.button>
        </header>

        {/* Tab Navigation */}
        <div className="grid grid-cols-3 gap-4">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <motion.button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={`relative p-4 rounded-xl transition-all border-2 ${
                  isActive ? tab.activeClass : tab.inactiveClass
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      isActive ? 'bg-white/10' : 'bg-white/5'
                    }`}
                  >
                    <Icon size={20} className={isActive ? tab.iconColor : 'text-white/60'} />
                  </div>
                  <div className="text-left">
                    <div className={`font-bold ${isActive ? 'text-white' : 'text-white/60'}`}>
                      {tab.label}
                    </div>
                    <div className="text-xs text-white/40">{tab.description}</div>
                  </div>
                </div>
                {isActive && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute inset-0 rounded-xl border-2 border-white/20"
                    transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                  />
                )}
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === 'okr' && <OKRView />}
          {activeTab === 'plan' && <PlanView />}
          {activeTab === 'progress' && <ProgressView />}
        </motion.div>
      </AnimatePresence>

      {/* Feishu Import Dialog */}
      <FeishuImportDialog
        isOpen={isImportDialogOpen}
        onClose={() => setIsImportDialogOpen(false)}
      />
    </div>
  );
}
