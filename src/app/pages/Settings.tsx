import React, { useState } from 'react';
import {
  Settings as SettingsIcon,
  Monitor,
  Palette,
  Database,
  Zap,
  Globe,
  Bell,
  Lock,
  ShieldCheck,
  Sword,
  LayoutDashboard,
  Check,
  Languages,
  FolderGit2,
  Info
} from 'lucide-react';
import { useMode } from '../contexts/ModeContext';
import { useTranslation } from '../hooks/useTranslation';
import { GlassCard, ActionButton } from '../components/ui-shared';
import { ProjectPathManager } from '../components/ProjectPathManager';
import { motion } from 'motion/react';

const Settings = () => {
  const { mode, setMode, lang, setLang } = useMode();
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('general');

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20">
      <header>
        <h1 className="text-3xl font-bold tracking-tight uppercase">SETTINGS</h1>
        <p className="text-gray-400">{t("advDesc")}</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        {/* Sidebar Navigation */}
        <div className="space-y-1">
          {[
            { id: 'general', name: t("general"), icon: SettingsIcon },
            { id: 'appearance', name: t("appearance"), icon: Palette },
            { id: 'integration', name: t("integration"), icon: Monitor },
            { id: 'data', name: t("dataManagement"), icon: Database },
            { id: 'about', name: lang === 'zh' ? '关于' : 'About', icon: Info },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                activeTab === item.id
                  ? (mode === 'adventure' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' : 'bg-blue-600/20 text-blue-400 border border-blue-500/30')
                  : 'text-gray-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              <item.icon size={18} />
              {item.name}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="md:col-span-3 space-y-8">
          {/* General Tab */}
          {activeTab === 'general' && (
            <>
              {/* Interface Mode */}
              <section className="space-y-4">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <Palette size={20} className={mode === 'adventure' ? 'text-yellow-500' : 'text-blue-500'} />
                  {t("interfaceMode")}
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <button
                    onClick={() => setMode('professional')}
                    className={`relative p-6 rounded-2xl border-2 transition-all text-left group overflow-hidden ${
                      mode === 'professional' ? 'border-blue-500 bg-blue-500/5 shadow-[0_0_20px_rgba(59,130,246,0.2)]' : 'border-white/10 bg-white/5 hover:border-white/20'
                    }`}
                  >
                    {mode === 'professional' && <div className="absolute top-4 right-4 text-blue-500"><Check size={20} /></div>}
                    <LayoutDashboard className={`mb-4 ${mode === 'professional' ? 'text-blue-500' : 'text-gray-500'}`} size={32} />
                    <h3 className="font-bold text-lg">{t("proTitle")}</h3>
                    <p className="text-xs text-gray-400 mt-1">{t("proDesc")}</p>
                  </button>

                  <button
                    onClick={() => setMode('adventure')}
                    className={`relative p-6 rounded-2xl border-2 transition-all text-left group overflow-hidden ${
                      mode === 'adventure' ? 'border-yellow-500 bg-yellow-500/5 shadow-[0_0_20px_rgba(234,179,8,0.2)]' : 'border-white/10 bg-white/5 hover:border-white/20'
                    }`}
                  >
                    {mode === 'adventure' && <div className="absolute top-4 right-4 text-yellow-500"><Check size={20} /></div>}
                    <Sword className={`mb-4 ${mode === 'adventure' ? 'text-yellow-500' : 'text-gray-500'}`} size={32} />
                    <h3 className="font-bold text-lg">{t("advTitle")}</h3>
                    <p className="text-xs text-gray-400 mt-1">{t("advDesc")}</p>
                    {mode === 'adventure' && <div className="absolute inset-0 bg-yellow-500/5 animate-pulse pointer-events-none" />}
                  </button>
                </div>
              </section>

              {/* Language Settings */}
              <section className="space-y-4">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <Languages size={20} className={mode === 'adventure' ? 'text-yellow-500' : 'text-blue-500'} />
                  {t("langSettings")}
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <button
                    onClick={() => setLang('en')}
                    className={`relative p-6 rounded-2xl border-2 transition-all text-left group overflow-hidden ${
                      lang === 'en'
                        ? (mode === 'adventure' ? 'border-yellow-500 bg-yellow-500/5 shadow-[0_0_20px_rgba(234,179,8,0.2)]' : 'border-blue-500 bg-blue-500/5 shadow-[0_0_20px_rgba(59,130,246,0.2)]')
                        : 'border-white/10 bg-white/5 hover:border-white/20'
                    }`}
                  >
                    {lang === 'en' && <div className={`absolute top-4 right-4 ${mode === 'adventure' ? 'text-yellow-500' : 'text-blue-500'}`}><Check size={20} /></div>}
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${lang === 'en' ? (mode === 'adventure' ? 'bg-yellow-500 text-black' : 'bg-blue-600 text-white') : 'bg-white/10 text-gray-400'}`}>
                      EN
                    </div>
                    <h3 className="font-bold text-lg">{t("enLang")}</h3>
                    <p className="text-xs text-gray-400 mt-1">English Interface (US/UK)</p>
                  </button>

                  <button
                    onClick={() => setLang('zh')}
                    className={`relative p-6 rounded-2xl border-2 transition-all text-left group overflow-hidden ${
                      lang === 'zh'
                        ? (mode === 'adventure' ? 'border-yellow-500 bg-yellow-500/5 shadow-[0_0_20px_rgba(234,179,8,0.2)]' : 'border-blue-500 bg-blue-500/5 shadow-[0_0_20px_rgba(59,130,246,0.2)]')
                        : 'border-white/10 bg-white/5 hover:border-white/20'
                    }`}
                  >
                    {lang === 'zh' && <div className={`absolute top-4 right-4 ${mode === 'adventure' ? 'text-yellow-500' : 'text-blue-500'}`}><Check size={20} /></div>}
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${lang === 'zh' ? (mode === 'adventure' ? 'bg-yellow-500 text-black' : 'bg-blue-600 text-white') : 'bg-white/10 text-gray-400'}`}>
                      ZH
                    </div>
                    <h3 className="font-bold text-lg">{t("zhLang")}</h3>
                    <p className="text-xs text-gray-400 mt-1">中文简体界面</p>
                  </button>
                </div>
              </section>
            </>
          )}

          {/* Integration Tab */}
          {activeTab === 'integration' && (
            <section className="space-y-4">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Monitor size={20} className={mode === 'adventure' ? 'text-yellow-500' : 'text-blue-500'} />
                {t("integration")}
              </h2>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-400">CLI Binary Path</label>
                  <input
                    type="text"
                    defaultValue="/usr/local/bin/claude"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 transition-all font-mono"
                  />
                </div>
                <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/10">
                  <div className="flex items-center gap-3">
                    <Globe size={20} className={mode === 'adventure' ? 'text-yellow-500' : 'text-blue-400'} />
                    <div>
                      <p className="font-bold text-sm">Auto-Sync Skills</p>
                      <p className="text-xs text-gray-500">Automatically update local skills from cloud.</p>
                    </div>
                  </div>
                  <div className={`w-12 h-6 rounded-full ${mode === 'adventure' ? 'bg-yellow-600' : 'bg-blue-600'} p-1 flex justify-end cursor-pointer`}>
                    <div className="w-4 h-4 rounded-full bg-white" />
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Data Management Tab */}
          {activeTab === 'data' && (
            <section className="space-y-4">
              <div>
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <FolderGit2 size={20} className={mode === 'adventure' ? 'text-yellow-500' : 'text-blue-500'} />
                  项目路径配置
                </h2>
                <p className="text-sm text-gray-400 mt-2">
                  配置需要扫描的项目路径，只有配置的路径才会被检索 project 级别的 skills 和 agents
                </p>
              </div>
              <ProjectPathManager />
            </section>
          )}

          {/* About Tab */}
          {activeTab === 'about' && (
            <section className="space-y-6">
              <div>
                <h2 className="text-3xl font-bold mb-3">Claude Manager</h2>
                <p className="text-gray-400 text-lg">
                  统一管理 Claude AI 生态的专业工具 - Skills、Agents、Teams、Workflows 一站式解决方案
                </p>
              </div>

              <div className="space-y-4">
                <h3 className="text-2xl font-bold flex items-center gap-2">
                  <span className={mode === 'adventure' ? 'text-yellow-500' : 'text-blue-500'}>🎯</span>
                  设计理念
                </h3>

                <div className="space-y-8">
                  <div>
                    <h4 className="text-xl font-bold mb-3 flex items-center gap-2">
                      <span className={mode === 'adventure' ? 'text-yellow-500' : 'text-blue-500'}>🤖</span>
                      AI Agent 管理与编排
                    </h4>
                    <p className="text-gray-300 mb-3">统一管理平台 - 一站式管理 Skills、Agents、Teams、Workflows 和 Tasks</p>
                    <ul className="space-y-1 text-gray-400 text-sm ml-6 mb-4">
                      <li>• 可视化编排：拖拽式工作流设计，DAG 流程可视化</li>
                      <li>• 多智能体协作：Team 机制支持多个 Agent 协同工作</li>
                      <li>• 实时监控：WebSocket 实时追踪执行状态，支持历史回放</li>
                      <li>• 深度集成：与 Claude Code CLI 无缝对接，自动同步配置</li>
                    </ul>
                    <div className="rounded-xl overflow-hidden border border-white/10">
                      <img
                        src="/images/screenshots/final-workflows.png"
                        alt="Workflow 编排界面"
                        className="w-full h-auto"
                      />
                      <p className="text-xs text-gray-500 p-3 bg-black/20">可视化工作流编排 - 支持 Agent、Skill、Condition、Parallel 等多种节点类型</p>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-xl font-bold mb-3 flex items-center gap-2">
                      <span className={mode === 'adventure' ? 'text-yellow-500' : 'text-blue-500'}>📱</span>
                      移动端优先设计
                    </h4>
                    <p className="text-gray-300 mb-3">响应式界面 - 完美适配桌面、平板和移动设备</p>
                    <ul className="space-y-1 text-gray-400 text-sm ml-6 mb-4">
                      <li>• 自适应布局：从手机到 4K 显示器，流畅体验</li>
                      <li>• 触控优化：针对触摸操作优化的交互设计</li>
                      <li>• 离线支持：本地数据库，无需联网即可管理配置</li>
                      <li>• 轻量快速：基于 Vite + React 19，秒级启动</li>
                    </ul>
                    <div className="rounded-xl overflow-hidden border border-white/10">
                      <img
                        src="/images/screenshots/final-agents.png"
                        alt="Agents 管理界面"
                        className="w-full h-auto"
                      />
                      <p className="text-xs text-gray-500 p-3 bg-black/20">Agents 管理界面 - 响应式设计，支持多端访问</p>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-xl font-bold mb-3 flex items-center gap-2">
                      <span className={mode === 'adventure' ? 'text-yellow-500' : 'text-blue-500'}>🎮</span>
                      游戏化体验
                    </h4>
                    <p className="text-gray-300 mb-3">双模式界面 - 专业模式 + 冒险模式，让 AI 管理更有趣</p>
                    <ul className="space-y-1 text-gray-400 text-sm ml-6 mb-4">
                      <li>• 冒险模式：游戏化 UI，将 Agent 视为角色，Skill 视为技能</li>
                      <li>• 专业模式：传统管理界面，适合企业和团队使用</li>
                      <li>• 动态效果：流畅的动画和交互反馈</li>
                      <li>• 主题切换：支持亮色/暗色主题，个性化定制</li>
                    </ul>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="rounded-xl overflow-hidden border border-white/10">
                        <img
                          src="/images/screenshots/final-teams.png"
                          alt="Teams 管理界面"
                          className="w-full h-auto"
                        />
                        <p className="text-xs text-gray-500 p-3 bg-black/20">Teams 管理 - 多智能体协作</p>
                      </div>
                      <div className="rounded-xl overflow-hidden border border-white/10">
                        <img
                          src="/images/screenshots/final-tasks.png"
                          alt="Tasks 执行界面"
                          className="w-full h-auto"
                        />
                        <p className="text-xs text-gray-500 p-3 bg-black/20">Tasks 执行监控 - 实时状态更新</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-2xl font-bold flex items-center gap-2">
                  <span className={mode === 'adventure' ? 'text-yellow-500' : 'text-blue-500'}>🏗️</span>
                  技术架构
                </h3>
                <div className="bg-black/30 rounded-xl p-6 font-mono text-sm text-gray-300 space-y-1">
                  <div>┌─────────────────────────────────────┐</div>
                  <div>│         UI Layer (React)            │  现代化 Web 界面</div>
                  <div>├─────────────────────────────────────┤</div>
                  <div>│      Service Layer (FastAPI)        │  业务逻辑和编排</div>
                  <div>├─────────────────────────────────────┤</div>
                  <div>│    Adapter Layer (Claude Code)      │  Claude 环境集成</div>
                  <div>└─────────────────────────────────────┘</div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-2xl font-bold flex items-center gap-2">
                  <span className={mode === 'adventure' ? 'text-yellow-500' : 'text-blue-500'}>⚙️</span>
                  技术栈
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-bold text-lg mb-3 text-gray-300">后端</h4>
                    <ul className="space-y-2 text-gray-400">
                      <li>• Python 3.14 + FastAPI</li>
                      <li>• SQLAlchemy 2.0 (async)</li>
                      <li>• WebSocket 实时通信</li>
                      <li>• SQLite/PostgreSQL</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-bold text-lg mb-3 text-gray-300">前端</h4>
                    <ul className="space-y-2 text-gray-400">
                      <li>• React 19 + Vite 6</li>
                      <li>• TypeScript</li>
                      <li>• Tailwind CSS 4</li>
                      <li>• Motion (Framer Motion)</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-2xl font-bold flex items-center gap-2">
                  <span className={mode === 'adventure' ? 'text-yellow-500' : 'text-blue-500'}>✨</span>
                  核心功能
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <h4 className="font-bold text-gray-300">📚 Skills 管理</h4>
                    <p className="text-sm text-gray-400">AI 辅助生成技能结构，支持全局/项目/插件三级作用域</p>
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-bold text-gray-300">🤖 Agents 管理</h4>
                    <p className="text-sm text-gray-400">可视化配置界面，支持工具、权限、模型选择</p>
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-bold text-gray-300">👥 Teams 管理</h4>
                    <p className="text-sm text-gray-400">成员角色管理，协作策略配置，团队执行监控</p>
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-bold text-gray-300">🔄 Workflows 管理</h4>
                    <p className="text-sm text-gray-400">DAG 流程编排，可视化执行追踪，模板库支持</p>
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-bold text-gray-300">📋 Tasks 管理</h4>
                    <p className="text-sm text-gray-400">实时执行状态，执行历史回放，后台执行支持</p>
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-bold text-gray-300">🔌 Claude 集成</h4>
                    <p className="text-sm text-gray-400">与 Claude Code CLI 深度集成，自动同步配置</p>
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-white/10 space-y-2 text-gray-400">
                <p><strong className="text-gray-300">版本：</strong> 0.2.0</p>
                <p><strong className="text-gray-300">更新：</strong> 2026-02-28</p>
                <p><strong className="text-gray-300">开源协议：</strong> MIT License</p>
                <p className="text-sm pt-2">Made with ❤️ by Claude Manager Team</p>
              </div>
            </section>
          )}

          {activeTab !== 'about' && (
            <div className="flex justify-end gap-4 pt-8">
              <ActionButton variant="secondary">{t("discard")}</ActionButton>
              <ActionButton>{t("save")}</ActionButton>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Settings;
