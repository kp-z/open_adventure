/**
 * AgentTestPanel - Agent 测试面板
 * 提供 Agent 测试功能，包括输入测试、历史记录和 Agent 信息显示
 */

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft,
  Play,
  Loader,
  CheckCircle,
  XCircle,
  Clock,
  Send,
  Sparkles,
  Copy,
  RotateCcw,
  Cpu,
  Shield,
  Wrench,
  Zap,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Terminal,
  MessageSquare,
  Check,
  TrendingUp,
  Activity,
  Timer,
  BarChart3,
  Lightbulb,
  Edit3,
  Settings,
  FileText,
  Code,
  Save,
  X as XIcon,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import type { Agent, Skill } from '@/lib/api';
import { agentsApi, skillsApi } from '@/lib/api';
import { GlassCard } from './ui-shared';
import { PromptOptimizeButton } from './PromptOptimizeButton';
import { useNotifications } from '../contexts/NotificationContext';
import { ChatView } from './agent-test/ChatView';
import { TerminalView } from './agent-test/TerminalView';
import type { ViewMode } from './agent-test/types';
import 'highlight.js/styles/github-dark.css';
import '../../styles/markdown.css';

interface AgentTestPanelProps {
  agent: Agent;
  onBack: () => void;
  onEdit?: (agent: Agent) => void;
}

interface TestResult {
  id: string;
  input: string;
  output: string;
  success: boolean;
  duration: number;
  timestamp: string;
  model: string;
  agentId: number;
}

// 模型颜色映射
const modelColors: Record<string, string> = {
  inherit: 'text-gray-400',
  sonnet: 'text-blue-400',
  opus: 'text-purple-400',
  haiku: 'text-green-400'
};

// 从路径中提取项目名称
const extractProjectName = (path: string): string => {
  const pathParts = path.split('/');
  // 查找常见的项目目录标识
  const projectDirNames = ['项目', 'Proj', 'projects', 'Projects', 'workspace', 'Workspace'];
  const projectIndex = pathParts.findIndex(p => projectDirNames.includes(p));

  if (projectIndex >= 0 && projectIndex < pathParts.length - 1) {
    return pathParts[projectIndex + 1];
  }

  // 如果找不到，尝试从 .claude 前面的目录获取
  const claudeIndex = pathParts.findIndex(p => p === '.claude');
  if (claudeIndex > 0) {
    return pathParts[claudeIndex - 1];
  }

  // 默认返回倒数第三个目录（通常是项目根目录）
  return pathParts.length >= 3 ? pathParts[pathParts.length - 3] : 'project';
};

// localStorage key for test history
const TEST_HISTORY_KEY = 'agent-test-history';

// 从 localStorage 加载测试历史
const loadTestHistory = (agentId: number): TestResult[] => {
  try {
    const stored = localStorage.getItem(TEST_HISTORY_KEY);
    if (stored) {
      const allHistory: TestResult[] = JSON.parse(stored);
      return allHistory.filter(t => t.agentId === agentId);
    }
  } catch (e) {
    console.error('Failed to load test history:', e);
  }
  return [];
};

// 保存测试历史到 localStorage
const saveTestHistory = (history: TestResult[]) => {
  try {
    // 获取所有历史记录
    const stored = localStorage.getItem(TEST_HISTORY_KEY);
    let allHistory: TestResult[] = stored ? JSON.parse(stored) : [];

    // 获取当前 agent 的 ID（从新历史中）
    if (history.length > 0) {
      const agentId = history[0].agentId;
      // 移除当前 agent 的旧记录
      allHistory = allHistory.filter(t => t.agentId !== agentId);
      // 添加新记录
      allHistory = [...history, ...allHistory];
    }

    // 限制总历史记录数量（最多保留 500 条）
    allHistory = allHistory.slice(0, 500);

    localStorage.setItem(TEST_HISTORY_KEY, JSON.stringify(allHistory));
  } catch (e) {
    console.error('Failed to save test history:', e);
  }
};

export const AgentTestPanel: React.FC<AgentTestPanelProps> = ({
  agent,
  onBack,
  onEdit,
}) => {
  // 是否可以编辑（非内置 agent 可以编辑）
  const canEdit = !agent.is_builtin;
  const { addNotification, updateNotification } = useNotifications();
  const [input, setInput] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [currentOutput, setCurrentOutput] = useState<string | null>(null);
  const [currentSuccess, setCurrentSuccess] = useState<boolean | null>(null);
  const [testHistory, setTestHistory] = useState<TestResult[]>([]);
  const [isUsageExpanded, setIsUsageExpanded] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showMarkdownView, setShowMarkdownView] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('chat');
  const outputRef = useRef<HTMLDivElement>(null);
  const [consoleLogs, setConsoleLogs] = useState<string[]>([]);

  // Skill 配置相关状态
  const [availableSkills, setAvailableSkills] = useState<Skill[]>([]);
  const [selectedSkills, setSelectedSkills] = useState<string[]>(agent.skills || []);
  const [isSkillsModified, setIsSkillsModified] = useState(false);
  const [isSavingSkills, setIsSavingSkills] = useState(false);
  const [showSkillSelector, setShowSkillSelector] = useState(false);
  const skillSelectorRef = useRef<HTMLDivElement>(null);

  // 点击外部关闭 Skill 选择器
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (skillSelectorRef.current && !skillSelectorRef.current.contains(event.target as Node)) {
        setShowSkillSelector(false);
      }
    };

    if (showSkillSelector) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showSkillSelector]);

  // 加载持久化的测试历史
  useEffect(() => {
    const history = loadTestHistory(agent.id);
    setTestHistory(history);
    // 如果有历史记录，显示最近一次的输出
    if (history.length > 0) {
      setCurrentOutput(history[0].output);
      setCurrentSuccess(history[0].success);
    }
  }, [agent.id]);

  // 加载可用的 Skills
  useEffect(() => {
    const loadSkills = async () => {
      try {
        const response = await skillsApi.list({ limit: 1000 });
        setAvailableSkills(response.items);
      } catch (error) {
        console.error('Failed to load skills:', error);
      }
    };
    loadSkills();
  }, []);

  // 检测 Skills 是否被修改
  useEffect(() => {
    const originalSkills = agent.skills || [];
    const isModified =
      selectedSkills.length !== originalSkills.length ||
      selectedSkills.some(s => !originalSkills.includes(s));
    setIsSkillsModified(isModified);
  }, [selectedSkills, agent.skills]);

  // 计算性能统计
  const performanceStats = useMemo(() => {
    if (testHistory.length === 0) {
      return {
        totalTests: 0,
        successRate: 0,
        avgDuration: 0,
        minDuration: 0,
        maxDuration: 0,
        successCount: 0,
        failCount: 0,
      };
    }

    const successCount = testHistory.filter(t => t.success).length;
    const durations = testHistory.map(t => t.duration);
    const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;

    return {
      totalTests: testHistory.length,
      successRate: (successCount / testHistory.length) * 100,
      avgDuration,
      minDuration: Math.min(...durations),
      maxDuration: Math.max(...durations),
      successCount,
      failCount: testHistory.length - successCount,
    };
  }, [testHistory]);

  // 滚动到输出区域
  useEffect(() => {
    if (currentOutput && outputRef.current) {
      outputRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [currentOutput]);

  // 处理测试完成回调（供 ChatView 和 TerminalView 使用）
  const handleTestComplete = (result: TestResult) => {
    const newHistory = [result, ...testHistory];
    setTestHistory(newHistory);
    saveTestHistory(newHistory);
  };

  // 测试 Agent - 使用流式 API
  const handleTest = async () => {
    if (!input.trim() || isRunning) return;

    setIsRunning(true);
    setCurrentOutput(null);
    setCurrentSuccess(null);
    setConsoleLogs([]); // 清空控制台日志

    // 添加运行中通知
    const notificationId = addNotification({
      type: 'loading',
      title: `Agent ${agent.name} 运行中`,
      message: `正在执行测试: ${input.substring(0, 50)}${input.length > 50 ? '...' : ''}`,
    });

    const startTime = Date.now();

    try {
      // 使用流式 API
      agentsApi.testStream(
        agent.id,
        input,
        // onLog - 实时日志回调
        (message: string) => {
          setConsoleLogs(prev => [...prev, message]);
        },
        // onComplete - 完成回调
        (data) => {
          const duration = (Date.now() - startTime) / 1000;

          const testResult: TestResult = {
            id: `test-${Date.now()}`,
            input,
            output: data.output,
            success: data.success,
            duration: data.duration,
            timestamp: new Date().toISOString(),
            model: data.model,
            agentId: agent.id,
          };

          setCurrentOutput(data.output);
          setCurrentSuccess(data.success);
          const newHistory = [testResult, ...testHistory];
          setTestHistory(newHistory);
          saveTestHistory(newHistory);
          setInput('');
          setIsRunning(false);

          // 更新通知为成功状态
          updateNotification(notificationId, {
            type: data.success ? 'success' : 'error',
            title: `Agent ${agent.name} ${data.success ? '执行成功' : '执行失败'}`,
            message: `耗时 ${data.duration.toFixed(2)}s · 模型: ${data.model}`,
          });
        },
        // onError - 错误回调
        (error: string) => {
          const duration = (Date.now() - startTime) / 1000;
          setCurrentOutput(error);
          setCurrentSuccess(false);

          const testResult: TestResult = {
            id: `test-${Date.now()}`,
            input,
            output: error,
            success: false,
            duration,
            timestamp: new Date().toISOString(),
            model: agent.model || 'inherit',
            agentId: agent.id,
          };
          const newHistory = [testResult, ...testHistory];
          setTestHistory(newHistory);
          saveTestHistory(newHistory);
          setIsRunning(false);

          // 更新通知为失败状态
          updateNotification(notificationId, {
            type: 'error',
            title: `Agent ${agent.name} 执行失败`,
            message: error.substring(0, 100),
          });
        }
      );
    } catch (error) {
      console.error('Test failed:', error);
      const errorMessage = error instanceof Error ? error.message : '测试执行失败，请检查后端服务';
      setCurrentOutput(errorMessage);
      setCurrentSuccess(false);
      setIsRunning(false);

      const testResult: TestResult = {
        id: `test-${Date.now()}`,
        input,
        output: errorMessage,
        success: false,
        duration: 0,
        timestamp: new Date().toISOString(),
        model: agent.model || 'inherit',
        agentId: agent.id,
      };
      const newHistory = [testResult, ...testHistory];
      setTestHistory(newHistory);
      saveTestHistory(newHistory);

      // 更新通知为失败状态
      updateNotification(notificationId, {
        type: 'error',
        title: `Agent ${agent.name} 执行失败`,
        message: errorMessage.substring(0, 100),
      });
    }
  };

  // 清除历史记录
  const handleClearHistory = () => {
    setTestHistory([]);
    setCurrentOutput(null);
    setCurrentSuccess(null);
    // 从 localStorage 中移除当前 agent 的记录
    try {
      const stored = localStorage.getItem(TEST_HISTORY_KEY);
      if (stored) {
        const allHistory: TestResult[] = JSON.parse(stored);
        const filtered = allHistory.filter(t => t.agentId !== agent.id);
        localStorage.setItem(TEST_HISTORY_KEY, JSON.stringify(filtered));
      }
    } catch (e) {
      console.error('Failed to clear test history:', e);
    }
  };

  // 复制输出到剪贴板
  const handleCopyOutput = (text: string, id?: string) => {
    navigator.clipboard.writeText(text);
    if (id) {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  // 切换 Skill 选择
  const toggleSkill = (skillName: string) => {
    setSelectedSkills(prev =>
      prev.includes(skillName)
        ? prev.filter(s => s !== skillName)
        : [...prev, skillName]
    );
  };

  // 移除 Skill
  const removeSkill = (skillName: string) => {
    setSelectedSkills(prev => prev.filter(s => s !== skillName));
  };

  // 添加 Skill
  const addSkill = (skillName: string) => {
    if (!selectedSkills.includes(skillName)) {
      setSelectedSkills(prev => [...prev, skillName]);
    }
    setShowSkillSelector(false);
  };

  // 保存 Skills 配置到 Agent
  const handleSaveSkills = async () => {
    if (!canEdit || !isSkillsModified) return;

    setIsSavingSkills(true);
    try {
      await agentsApi.update(agent.id, { skills: selectedSkills });
      // 更新本地 agent 对象
      agent.skills = selectedSkills;
      setIsSkillsModified(false);
      // 可以添加成功提示
      console.log('Skills saved successfully');
    } catch (error) {
      console.error('Failed to save skills:', error);
      // 可以添加错误提示
    } finally {
      setIsSavingSkills(false);
    }
  };

  // 检测输出是否为 Markdown 格式
  const isMarkdownContent = (text: string): boolean => {
    if (!text) return false;

    // 检测常见的 Markdown 语法
    const markdownPatterns = [
      /^#{1,6}\s+.+$/m,           // 标题
      /\*\*.+\*\*/,                // 粗体
      /\*.+\*/,                    // 斜体
      /\[.+\]\(.+\)/,              // 链接
      /```[\s\S]*?```/,            // 代码块
      /^\s*[-*+]\s+/m,             // 无序列表
      /^\s*\d+\.\s+/m,             // 有序列表
      /^\s*>\s+/m,                 // 引用
      /^\s*\|.+\|.+\|$/m,          // 表格
    ];

    return markdownPatterns.some(pattern => pattern.test(text));
  };

  // 建议的测试提示 - 根据 agent 类型动态生成
  const getSuggestedTests = () => {
    const baseSuggestions = [
      '你能干什么？请介绍一下你的能力',
      '帮我分析一下当前项目的结构',
    ];

    // 根据 agent 的工具和描述添加特定建议
    if (agent.tools.some(t => t.toLowerCase().includes('read') || t.toLowerCase().includes('grep'))) {
      baseSuggestions.push('搜索项目中所有 TODO 注释');
    }
    if (agent.tools.some(t => t.toLowerCase().includes('write') || t.toLowerCase().includes('edit'))) {
      baseSuggestions.push('创建一个简单的 hello world 示例');
    }
    if (agent.tools.some(t => t.toLowerCase().includes('bash'))) {
      baseSuggestions.push('运行 git status 查看当前状态');
    }

    return baseSuggestions.slice(0, 5);
  };

  // 生成使用说明的 Prompt (用于 Claude Code)
  const getUsagePrompt = () => {
    return `请为以下 Agent 生成详细的使用说明文档：

Agent 名称: ${agent.name}
Agent 描述: ${agent.description}
可用工具: ${agent.tools.length > 0 ? agent.tools.join(', ') : '继承全部工具'}
模型: ${agent.model || 'inherit'}
权限模式: ${agent.permission_mode || 'default'}
技能: ${agent.skills?.join(', ') || '无'}
系统提示: ${agent.system_prompt || '无'}

请生成包含以下内容的使用说明：
1. Agent 概述和主要用途
2. 适用场景（何时使用此 Agent）
3. 基本使用方法和示例命令
4. 高级用法和技巧
5. 注意事项和限制
6. 常见问题解答

请用中文编写，格式清晰，便于用户理解。`;
  };

  // 获取 Agent 颜色
  const getAgentColor = () => {
    if (agent.meta?.color) return agent.meta.color;
    switch (agent.scope) {
      case 'builtin': return '#3b82f6';
      case 'user': return '#22c55e';
      case 'project': return '#a855f7';
      case 'plugin': return '#f97316';
      default: return '#6b7280';
    }
  };

  const agentColor = getAgentColor();

  return (
    <div className="max-w-7xl mx-auto pb-20">
      {/* 头部 - 融入 Agent 信息 */}
      <div className="flex items-start gap-4 mb-8">
        {/* Agent 图标 */}
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center border-2 flex-shrink-0"
          style={{
            backgroundColor: `${agentColor}20`,
            borderColor: agentColor
          }}
        >
          {agent.is_builtin ? (
            <Shield size={32} style={{ color: agentColor }} />
          ) : (
            <Cpu size={32} style={{ color: agentColor }} />
          )}
        </div>

        {/* Agent 信息 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold tracking-tight truncate">{agent.name}</h1>
            {/* 标签 */}
            <span
              className="px-2 py-0.5 rounded-full text-xs font-bold capitalize"
              style={{
                backgroundColor: `${agentColor}20`,
                color: agentColor
              }}
            >
              {agent.scope}
            </span>
            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${modelColors[agent.model || 'inherit']} bg-white/5`}>
              {(agent.model || 'inherit').toUpperCase()}
            </span>
            {/* Plugin name 或 Project name */}
            {agent.scope === 'plugin' && agent.meta?.plugin_name && (
              <span className="px-2 py-0.5 text-xs font-bold bg-orange-500/10 text-orange-400 border border-orange-500/20 rounded-md">
                {agent.meta.plugin_name}
              </span>
            )}
            {agent.scope === 'project' && agent.meta?.path && (
              <span className="px-2 py-0.5 text-xs font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded-md">
                {extractProjectName(agent.meta.path)}
              </span>
            )}
          </div>
          <p className="text-gray-400 text-sm line-clamp-2">{agent.description}</p>
        </div>

        {/* 右侧操作区 */}
        <div className="flex items-center gap-3 flex-shrink-0">
          {/* 测试次数 */}
          <div className="flex items-center gap-2 text-sm text-gray-400 px-3 py-2 bg-white/5 rounded-xl">
            <Clock size={16} />
            <span>{testHistory.length} 次测试</span>
          </div>

          {/* 编辑按钮 */}
          {canEdit && onEdit && (
            <button
              onClick={() => onEdit(agent)}
              className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-xl transition-all text-sm"
            >
              <Edit3 size={16} />
              编辑
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* 左侧 - 测试区域 */}
        <div className="lg:col-span-2 space-y-6">
          {/* 统一的测试卡片 - 输入和输出在一起 */}
          <GlassCard className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold flex items-center gap-2">
                <Terminal size={16} />
                测试控制台
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setViewMode('chat')}
                  className={`p-2 rounded-lg transition-all ${
                    viewMode === 'chat'
                      ? 'bg-blue-500/20 text-blue-400'
                      : 'bg-white/5 text-gray-400 hover:bg-white/10'
                  }`}
                  title="对话框模式"
                >
                  <MessageSquare size={16} />
                </button>
                <button
                  onClick={() => setViewMode('terminal')}
                  className={`p-2 rounded-lg transition-all ${
                    viewMode === 'terminal'
                      ? 'bg-green-500/20 text-green-400'
                      : 'bg-white/5 text-gray-400 hover:bg-white/10'
                  }`}
                  title="终端模式"
                >
                  <Terminal size={16} />
                </button>
              </div>
            </div>

            <AnimatePresence mode="wait">
              {viewMode === 'chat' ? (
                <motion.div
                  key="chat"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.2 }}
                >
                  <ChatView
                    agentId={agent.id}
                    agentName={agent.name}
                    onTestComplete={handleTestComplete}
                  />
                </motion.div>
              ) : (
                <motion.div
                  key="terminal"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                >
                  <TerminalView
                    agentId={agent.id}
                    agentName={agent.name}
                    onTestComplete={handleTestComplete}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </GlassCard>

          {/* 建议的测试 */}
          <GlassCard className="p-6">
            <h3 className="font-bold mb-4 text-sm text-gray-400 uppercase tracking-wider flex items-center gap-2">
              <Sparkles size={14} />
              建议的测试
            </h3>
            <div className="flex flex-wrap gap-2">
              {getSuggestedTests().map((test, index) => (
                <button
                  key={index}
                  onClick={() => setInput(test)}
                  disabled={isRunning}
                  className="px-4 py-2 bg-white/5 hover:bg-white/10 disabled:hover:bg-white/5 rounded-xl border border-white/10 hover:border-blue-500/30 transition-all text-sm"
                >
                  {test}
                </button>
              ))}
            </div>
          </GlassCard>

          {/* 测试历史 - 始终显示 */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold flex items-center gap-2">
                <Clock size={16} />
                测试历史
              </h3>
              {testHistory.length > 0 && (
                <button
                  onClick={handleClearHistory}
                  className="flex items-center gap-2 px-3 py-1.5 text-xs bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-all"
                >
                  <RotateCcw size={14} />
                  清除
                </button>
              )}
            </div>

            <div className="space-y-3">
              <AnimatePresence mode="popLayout">
                {testHistory.length === 0 ? (
                  <div className="text-center py-12 border-2 border-dashed border-white/10 rounded-xl">
                    <Play size={40} className="text-gray-600 mx-auto mb-3" />
                    <p className="text-gray-400 text-sm">还没有测试记录</p>
                    <p className="text-gray-500 text-xs mt-1">
                      运行测试后结果将显示在这里
                    </p>
                  </div>
                ) : (
                  testHistory.map((test, index) => (
                    <motion.div
                      key={test.id}
                      initial={{ opacity: 0, y: -20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -100 }}
                      transition={{ delay: index * 0.03 }}
                    >
                      <GlassCard
                        className={`p-4 border ${
                          test.success
                            ? 'border-green-500/20'
                            : 'border-red-500/20'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2">
                            {test.success ? (
                              <CheckCircle className="text-green-400" size={16} />
                            ) : (
                              <XCircle className="text-red-400" size={16} />
                            )}
                            <span className="text-xs text-gray-500">
                              {new Date(test.timestamp).toLocaleString()} · {test.duration.toFixed(2)}s · {test.model}
                            </span>
                          </div>
                          <button
                            onClick={() => handleCopyOutput(test.output, test.id)}
                            className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                          >
                            {copiedId === test.id ? (
                              <Check size={14} className="text-green-400" />
                            ) : (
                              <Copy size={14} className="text-gray-400" />
                            )}
                          </button>
                        </div>

                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <span className="text-xs text-gray-500 block mb-1">输入</span>
                            <p className="text-gray-300 line-clamp-2">{test.input}</p>
                          </div>
                          <div>
                            <span className="text-xs text-gray-500 block mb-1">输出</span>
                            <p className="text-gray-300 line-clamp-2">{test.output}</p>
                          </div>
                        </div>
                      </GlassCard>
                    </motion.div>
                  ))
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* 右侧 - Agent 信息和使用说明 */}
        <div className="space-y-6">
          {/* Skill 配置卡片 */}
          <GlassCard className="p-6 border-cyan-500/20">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-sm text-cyan-400 uppercase tracking-wider flex items-center gap-2">
                <Zap size={14} />
                Skill 配置
              </h3>
              <div className="flex items-center gap-2">
                {/* 添加按钮 */}
                <button
                  onClick={() => setShowSkillSelector(!showSkillSelector)}
                  disabled={isRunning}
                  className="p-1.5 bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/30 hover:border-cyan-500/50 rounded-lg transition-all disabled:opacity-50"
                  title="添加 Skill"
                >
                  <Sparkles size={16} className="text-cyan-400" />
                </button>

                {/* 保存按钮 */}
                {canEdit && isSkillsModified && (
                  <button
                    onClick={handleSaveSkills}
                    disabled={isSavingSkills}
                    className="flex items-center gap-1 px-3 py-1.5 bg-cyan-500/20 hover:bg-cyan-500/30 disabled:opacity-50 text-cyan-400 rounded-lg transition-all text-xs"
                  >
                    {isSavingSkills ? (
                      <>
                        <Loader size={12} className="animate-spin" />
                        保存
                      </>
                    ) : (
                      <>
                        <Save size={12} />
                        保存
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>

            {/* Skills 便签展示 */}
            <div className="min-h-[80px]">
              {selectedSkills.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {selectedSkills.map((skillName) => {
                    const skill = availableSkills.find(s => s.full_name === skillName);
                    return (
                      <div
                        key={skillName}
                        className="group relative inline-flex items-center gap-1.5 px-3 py-1.5 bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/30 rounded-lg transition-all"
                      >
                        <span className="text-xs font-medium text-cyan-300">
                          {skill?.name || skillName}
                        </span>
                        <button
                          onClick={() => removeSkill(skillName)}
                          disabled={isRunning}
                          className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-red-500/30 text-red-400 rounded transition-all disabled:opacity-50"
                        >
                          <XIcon size={12} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex items-center justify-center h-20 border-2 border-dashed border-cyan-500/20 rounded-xl">
                  <p className="text-xs text-gray-500">点击 + 添加 Skill</p>
                </div>
              )}
            </div>

            {/* Skill 选择器下拉菜单 */}
            <AnimatePresence>
              {showSkillSelector && (
                <motion.div
                  ref={skillSelectorRef}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="mt-3 p-3 bg-black/60 border border-cyan-500/30 rounded-xl shadow-2xl max-h-64 overflow-y-auto"
                >
                  {availableSkills.length === 0 ? (
                    <div className="text-xs text-gray-500 text-center py-4">
                      <Loader size={16} className="animate-spin mx-auto mb-2" />
                      加载 Skills...
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {availableSkills
                        .filter(skill => !selectedSkills.includes(skill.full_name))
                        .map((skill) => (
                          <button
                            key={skill.id}
                            onClick={() => addSkill(skill.full_name)}
                            className="w-full text-left p-2 hover:bg-cyan-500/10 rounded-lg transition-all"
                          >
                            <p className="text-sm font-bold text-white">{skill.name}</p>
                            {skill.description && (
                              <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">
                                {skill.description}
                              </p>
                            )}
                          </button>
                        ))}
                      {availableSkills.filter(skill => !selectedSkills.includes(skill.full_name)).length === 0 && (
                        <div className="text-xs text-gray-500 text-center py-4">
                          所有 Skill 已添加
                        </div>
                      )}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* 状态提示 */}
            {isSkillsModified && (
              <div className="mt-3 pt-3 border-t border-cyan-500/20">
                <div className="text-xs text-cyan-400 flex items-center gap-1">
                  <Activity size={12} />
                  配置已修改，点击保存按钮持久化
                </div>
              </div>
            )}
          </GlassCard>

          {/* 目录配置卡片 */}
          <GlassCard className="p-6 border-blue-500/20">
            <h3 className="font-bold mb-4 text-sm text-blue-400 uppercase tracking-wider flex items-center gap-2">
              <Settings size={14} />
              目录配置
            </h3>
            <div className="space-y-3">
              {/* Scope */}
              <div className="p-3 bg-white/5 rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-gray-400 uppercase">Scope</span>
                  <span
                    className="px-2 py-0.5 rounded-full text-xs font-bold capitalize"
                    style={{
                      backgroundColor: `${agentColor}20`,
                      color: agentColor
                    }}
                  >
                    {agent.scope}
                  </span>
                </div>
                <p className="text-xs text-gray-300 font-mono break-all">
                  {(() => {
                    if (agent.scope === 'builtin') return '系统内置';

                    const path = agent.meta?.path;
                    if (!path) {
                      // 没有路径时的后备显示
                      if (agent.scope === 'user') return '~/.claude/agents/';
                      if (agent.scope === 'plugin') return '~/.claude/plugins/*/agents/';
                      if (agent.scope === 'project') return '.claude/agents/ (项目级)';
                      return '';
                    }

                    // 显示完整路径到 agents 目录
                    if (path.includes('/.claude/agents/')) {
                      return path.substring(0, path.lastIndexOf('/.claude/agents/') + 16);
                    } else if (path.includes('/.claude/plugins/')) {
                      // plugin 路径：显示到 /agents/ 目录
                      const agentsIndex = path.lastIndexOf('/agents/');
                      if (agentsIndex !== -1) {
                        return path.substring(0, agentsIndex + 8);
                      }
                      return path.substring(0, path.lastIndexOf('/.claude/plugins/') + 17);
                    }

                    return path;
                  })()}
                </p>
              </div>

              {/* 文件路径 */}
              {agent.meta?.path && (
                <div className="p-3 bg-white/5 rounded-xl">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText size={12} className="text-gray-400" />
                    <span className="text-xs text-gray-400 uppercase">完整路径</span>
                  </div>
                  <p className="text-xs text-gray-300 font-mono break-all">
                    {agent.meta.path}
                  </p>
                </div>
              )}

              {/* Plugin 名称 */}
              {agent.scope === 'plugin' && agent.meta?.plugin_name && (
                <div className="p-3 bg-white/5 rounded-xl">
                  <div className="flex items-center gap-2 mb-2">
                    <Wrench size={12} className="text-orange-400" />
                    <span className="text-xs text-gray-400 uppercase">插件名称</span>
                  </div>
                  <p className="text-sm font-bold text-orange-400">
                    {agent.meta.plugin_name}
                  </p>
                </div>
              )}

              {/* Project 名称 */}
              {agent.scope === 'project' && agent.meta?.path && (
                <div className="p-3 bg-white/5 rounded-xl">
                  <div className="flex items-center gap-2 mb-2">
                    <Code size={12} className="text-purple-400" />
                    <span className="text-xs text-gray-400 uppercase">项目名称</span>
                  </div>
                  <p className="text-sm font-bold text-purple-400">
                    {extractProjectName(agent.meta.path)}
                  </p>
                </div>
              )}

              {/* 优先级 */}
              {agent.priority !== undefined && (
                <div className="p-3 bg-white/5 rounded-xl">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-400 uppercase">优先级</span>
                    <span className="text-sm font-bold text-blue-400">
                      {agent.priority}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    数字越大优先级越高
                  </p>
                </div>
              )}
            </div>
          </GlassCard>

          {/* 性能统计卡片 */}
          <GlassCard className="p-6 border-purple-500/20">
            <h3 className="font-bold mb-4 text-sm text-purple-400 uppercase tracking-wider flex items-center gap-2">
              <BarChart3 size={14} />
              性能统计
            </h3>
            <div className="space-y-3">
              {/* 总测试次数和成功率 */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-white/5 rounded-xl text-center">
                  <div className="text-2xl font-black text-white">
                    {performanceStats.totalTests}
                  </div>
                  <div className="text-xs text-gray-500">总测试次数</div>
                </div>
                <div className="p-3 bg-white/5 rounded-xl text-center">
                  <div className={`text-2xl font-black ${
                    performanceStats.successRate >= 80 ? 'text-green-400' :
                    performanceStats.successRate >= 50 ? 'text-yellow-400' : 'text-red-400'
                  }`}>
                    {performanceStats.successRate.toFixed(0)}%
                  </div>
                  <div className="text-xs text-gray-500">成功率</div>
                </div>
              </div>

              {/* 成功/失败计数 */}
              <div className="flex items-center gap-2 p-3 bg-white/5 rounded-xl">
                <div className="flex-1 flex items-center gap-2">
                  <CheckCircle size={14} className="text-green-400" />
                  <span className="text-sm text-gray-400">成功</span>
                  <span className="text-sm font-bold text-green-400 ml-auto">
                    {performanceStats.successCount}
                  </span>
                </div>
                <div className="w-px h-4 bg-white/10" />
                <div className="flex-1 flex items-center gap-2">
                  <XCircle size={14} className="text-red-400" />
                  <span className="text-sm text-gray-400">失败</span>
                  <span className="text-sm font-bold text-red-400 ml-auto">
                    {performanceStats.failCount}
                  </span>
                </div>
              </div>

              {/* 响应时间统计 */}
              <div className="p-3 bg-white/5 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <Timer size={14} className="text-blue-400" />
                  <span className="text-xs text-gray-400">响应时间</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <div className="text-sm font-bold text-green-400">
                      {performanceStats.minDuration.toFixed(2)}s
                    </div>
                    <div className="text-xs text-gray-500">最快</div>
                  </div>
                  <div>
                    <div className="text-sm font-bold text-blue-400">
                      {performanceStats.avgDuration.toFixed(2)}s
                    </div>
                    <div className="text-xs text-gray-500">平均</div>
                  </div>
                  <div>
                    <div className="text-sm font-bold text-orange-400">
                      {performanceStats.maxDuration.toFixed(2)}s
                    </div>
                    <div className="text-xs text-gray-500">最慢</div>
                  </div>
                </div>
              </div>
            </div>
          </GlassCard>

          {/* Agent 配置卡片（精简版） */}
          <GlassCard className="p-6">
            <h3 className="font-bold mb-4 text-sm text-gray-400 uppercase tracking-wider flex items-center gap-2">
              <Settings size={14} />
              配置信息
            </h3>
            <div className="space-y-2">
              <div className="flex justify-between p-3 bg-white/5 rounded-xl">
                <span className="text-sm text-gray-400">Permission</span>
                <span className={`text-sm font-black ${
                  agent.permission_mode === 'bypassPermissions' ? 'text-red-400' :
                  agent.permission_mode === 'plan' ? 'text-purple-400' : 'text-gray-400'
                }`}>
                  {agent.permission_mode || 'default'}
                </span>
              </div>
              {agent.max_turns && (
                <div className="flex justify-between p-3 bg-white/5 rounded-xl">
                  <span className="text-sm text-gray-400">Max Turns</span>
                  <span className="text-sm font-black text-blue-400">
                    {agent.max_turns}
                  </span>
                </div>
              )}
              {agent.memory && (
                <div className="flex justify-between p-3 bg-white/5 rounded-xl">
                  <span className="text-sm text-gray-400">Memory</span>
                  <span className="text-sm font-black text-cyan-400">
                    {agent.memory}
                  </span>
                </div>
              )}
              {agent.isolation && (
                <div className="flex justify-between p-3 bg-white/5 rounded-xl">
                  <span className="text-sm text-gray-400">Isolation</span>
                  <span className="text-sm font-black text-orange-400">
                    {agent.isolation}
                  </span>
                </div>
              )}
            </div>
          </GlassCard>

          {/* 测试提示卡片 */}
          <GlassCard className="p-6 bg-blue-500/5 border-blue-500/20">
            <h3 className="font-bold mb-3 text-sm text-blue-400 uppercase tracking-wider flex items-center gap-2">
              <Lightbulb size={14} />
              测试提示
            </h3>
            <ul className="space-y-2 text-xs text-gray-400">
              <li className="flex gap-2">
                <span className="text-blue-400">•</span>
                <span>使用具体、详细的提示获得更好的结果</span>
              </li>
              <li className="flex gap-2">
                <span className="text-blue-400">•</span>
                <span>测试边界情况以验证健壮性</span>
              </li>
              <li className="flex gap-2">
                <span className="text-blue-400">•</span>
                <span>比较不同模型的输出结果</span>
              </li>
              <li className="flex gap-2">
                <span className="text-blue-400">•</span>
                <span>监控响应时间以优化性能</span>
              </li>
              <li className="flex gap-2">
                <span className="text-blue-400">•</span>
                <span>测试历史会自动保存，刷新后仍可查看</span>
              </li>
            </ul>
          </GlassCard>

          {/* Agent 使用说明卡片 */}
          <GlassCard className="p-6 border-green-500/20">
            <button
              onClick={() => setIsUsageExpanded(!isUsageExpanded)}
              className="w-full flex items-center justify-between mb-4"
            >
              <h3 className="font-bold text-sm text-green-400 uppercase tracking-wider flex items-center gap-2">
                <BookOpen size={14} />
                使用说明
              </h3>
              {isUsageExpanded ? (
                <ChevronUp size={16} className="text-gray-400" />
              ) : (
                <ChevronDown size={16} className="text-gray-400" />
              )}
            </button>

            <AnimatePresence>
              {isUsageExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="space-y-4 text-sm">
                    {/* 概述 */}
                    <div>
                      <h4 className="font-bold text-white mb-2">概述</h4>
                      <p className="text-gray-400">{agent.description}</p>
                    </div>

                    {/* 使用方法 */}
                    <div>
                      <h4 className="font-bold text-white mb-2">如何使用</h4>
                      <div className="space-y-2 text-gray-400">
                        <p>在 Claude Code 中通过以下方式调用此 Agent：</p>
                        <div className="p-3 bg-black/40 rounded-lg font-mono text-xs">
                          <span className="text-purple-400">/agents</span>
                          <span className="text-gray-500"> → 选择 </span>
                          <span className="text-green-400">{agent.name}</span>
                        </div>
                        <p className="text-xs text-gray-500">或直接在对话中 @ 引用此 Agent</p>
                      </div>
                    </div>

                    {/* 生成详细说明的提示 */}
                    <div className="pt-3 border-t border-white/10">
                      <p className="text-xs text-gray-500 mb-2">需要更详细的使用说明？</p>
                      <button
                        onClick={() => handleCopyOutput(getUsagePrompt(), 'usage-prompt')}
                        className="flex items-center gap-2 px-3 py-2 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-lg transition-all text-xs w-full justify-center"
                      >
                        {copiedId === 'usage-prompt' ? (
                          <>
                            <Check size={14} />
                            已复制 Prompt
                          </>
                        ) : (
                          <>
                            <Copy size={14} />
                            复制生成 Prompt
                          </>
                        )}
                      </button>
                      <p className="text-xs text-gray-500 mt-2 text-center">
                        在 Claude Code 中粘贴此 Prompt 生成详细说明
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </GlassCard>

          {/* 工具 */}
          <GlassCard className="p-6">
            <h3 className="font-bold mb-4 text-sm text-gray-400 uppercase tracking-wider flex items-center gap-2">
              <Wrench size={14} />
              可用工具
            </h3>
            {agent.tools.length === 0 ? (
              <p className="text-sm text-gray-500">继承全部工具</p>
            ) : (
              <div className="space-y-2">
                {agent.tools.slice(0, 8).map((tool) => (
                  <div
                    key={tool}
                    className="p-3 bg-white/5 rounded-xl border border-white/10"
                  >
                    <p className="text-sm font-bold">{tool}</p>
                  </div>
                ))}
                {agent.tools.length > 8 && (
                  <p className="text-xs text-gray-500 text-center">
                    还有 {agent.tools.length - 8} 个工具...
                  </p>
                )}
              </div>
            )}
          </GlassCard>
        </div>
      </div>
    </div>
  );
};
