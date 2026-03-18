import React, { useState, useEffect } from 'react';
import {
  Settings as SettingsIcon,
  Monitor,
  Database,
  Zap,
  Globe,
  Bell,
  Lock,
  ShieldCheck,
  Check,
  Languages,
  FolderGit2,
  Info,
  Package,
  Trash2,
  HardDrive,
  FileText,
  Save,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  Plus,
  Palette,
} from 'lucide-react';
import { useMode } from '../contexts/ModeContext';
import { useTranslation } from '../hooks/useTranslation';
import { GlassCard, ActionButton } from '../components/ui-shared';
import { ProjectPathManager } from '../components/ProjectPathManager';
import { MarketplacePluginsManager } from '../components/MarketplacePluginsManager';
import { motion } from 'motion/react';
import { useLocation } from 'react-router';
import { cache } from '../../lib/storage';
import { configApi, type AppConfig, type ModelConfig } from '@/lib/api';

const Settings = () => {
  const { lang, setLang } = useMode();
  const { t } = useTranslation();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState('general');
  const [isClearing, setIsClearing] = useState(false);

  // 折叠状态
  const [isAppConfigCollapsed, setIsAppConfigCollapsed] = useState(true);

  // 配置管理状态
  const [config, setConfig] = useState<AppConfig>({});
  const [configFile, setConfigFile] = useState<string>('');
  const [isLoadingConfig, setIsLoadingConfig] = useState(false);
  const [isSavingConfig, setIsSavingConfig] = useState(false);

  // 模型配置状态
  const [availableModels, setAvailableModels] = useState<any[]>([]);
  const [currentModel, setCurrentModel] = useState<string>('');
  const [customModels, setCustomModels] = useState<ModelConfig[]>([]);
  const [customFile, setCustomFile] = useState<string>('');
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [isSavingModels, setIsSavingModels] = useState(false);

  // tmux 设置状态
  const [tmuxSettings, setTmuxSettings] = useState<{
    defaultCloseAction: 'detach' | 'kill';
    autoRestoreOnRefresh: boolean;
  }>({
    defaultCloseAction: 'detach',
    autoRestoreOnRefresh: false
  });

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tab = params.get('tab');
    if (tab === 'general' || tab === 'appearance' || tab === 'integration' || tab === 'data' || tab === 'marketplace' || tab === 'about') {
      setActiveTab(tab);
    }
  }, [location.search]);

  // 加载 tmux 设置
  useEffect(() => {
    const loadTmuxSettings = () => {
      try {
        const data = localStorage.getItem('tmux_settings');
        if (data) {
          setTmuxSettings(JSON.parse(data));
        }
      } catch (error) {
        console.error('Failed to load tmux settings:', error);
      }
    };
    loadTmuxSettings();
  }, []);

  // 加载配置
  useEffect(() => {
    if (activeTab === 'general') {
      loadConfig();
      loadModels();
    }
  }, [activeTab]);

  const loadConfig = async () => {
    setIsLoadingConfig(true);
    try {
      const response = await configApi.getConfig();
      setConfig(response.config);
      setConfigFile(response.config_file);
    } catch (error) {
      console.error('Failed to load config:', error);
    } finally {
      setIsLoadingConfig(false);
    }
  };

  const loadModels = async () => {
    setIsLoadingModels(true);
    try {
      // 1. 从 health API 获取当前可用的所有模型（默认 + 自定义合并后的）
      const healthData = await claudeApi.health();
      setAvailableModels(healthData.model_info?.available_models || []);
      setCurrentModel(healthData.model_info?.current_model || '');

      // 2. 从 config API 获取自定义模型配置
      const configData = await configApi.getModels();
      setCustomModels(configData.custom_models || []);
      setCustomFile(configData.custom_file);
    } catch (error) {
      console.error('Failed to load models:', error);
    } finally {
      setIsLoadingModels(false);
    }
  };

  const handleConfigChange = (key: keyof AppConfig, value: string) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  const handleSaveConfig = async () => {
    setIsSavingConfig(true);
    try {
      await configApi.updateConfig(config);
      alert('✅ 配置已保存成功！');
    } catch (error) {
      console.error('Failed to save config:', error);
      alert('❌ 保存配置失败，请重试');
    } finally {
      setIsSavingConfig(false);
    }
  };

  const handleResetConfig = async () => {
    if (!confirm('确定要重置配置为默认值吗？这将清除所有自定义配置。')) {
      return;
    }

    try {
      await configApi.resetConfig();
      await loadConfig();
      alert('✅ 配置已重置为默认值！');
    } catch (error) {
      console.error('Failed to reset config:', error);
      alert('❌ 重置配置失败，请重试');
    }
  };

  const handleTmuxSettingsChange = (key: 'defaultCloseAction' | 'autoRestoreOnRefresh', value: any) => {
    const newSettings = { ...tmuxSettings, [key]: value };
    setTmuxSettings(newSettings);
    try {
      localStorage.setItem('tmux_settings', JSON.stringify(newSettings));
      console.log('[Settings] Saved tmux settings:', newSettings);
    } catch (error) {
      console.error('[Settings] Failed to save tmux settings:', error);
    }
  };

  const handleModelChange = (index: number, field: keyof ModelConfig, value: string) => {
    setCustomModels(prev => {
      if (!Array.isArray(prev)) return [];
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleAddModel = () => {
    setCustomModels(prev => {
      if (!Array.isArray(prev)) return [{ alias: '', full_name: '', description: '' }];
      return [...prev, { alias: '', full_name: '', description: '' }];
    });
  };

  const handleRemoveModel = (index: number) => {
    setCustomModels(prev => {
      if (!Array.isArray(prev)) return [];
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleSaveModels = async () => {
    // 验证模型配置
    const invalidModels = customModels.filter(m => !m.alias || !m.full_name);
    if (invalidModels.length > 0) {
      alert('❌ 请填写所有模型的 alias 和 full_name');
      return;
    }

    setIsSavingModels(true);
    try {
      await configApi.updateModels(customModels);
      alert('✅ 自定义模型配置已保存成功！');
    } catch (error) {
      console.error('Failed to save models:', error);
      alert('❌ 保存模型配置失败，请重试');
    } finally {
      setIsSavingModels(false);
    }
  };

  const handleResetModels = async () => {
    if (!confirm('确定要清空自定义模型配置吗？')) {
      return;
    }

    try {
      await configApi.resetModels();
      await loadModels();
      alert('✅ 自定义模型配置已清空！');
    } catch (error) {
      console.error('Failed to reset models:', error);
      alert('❌ 清空模型配置失败，请重试');
    }
  };

  const handleClearCache = async () => {
    if (!confirm('确定要清除所有缓存吗？这将删除 Service Worker 缓存、IndexedDB 数据和 Microverse 游戏缓存，下次加载时间会变长。')) {
      return;
    }

    setIsClearing(true);
    try {
      // 清除 IndexedDB 缓存
      await cache.clear();

      // 清除 Service Worker 缓存
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
        console.log('✅ Service Worker 缓存已清除');
      }

      // 清除 Microverse 游戏缓存
      try {
        localStorage.removeItem('microverse_game_loaded');
        console.log('✅ Microverse 游戏缓存已清除');
      } catch (error) {
        console.warn('清除 Microverse 缓存失败:', error);
      }

      alert('✅ 缓存已清除成功！');
    } catch (error) {
      console.error('清除缓存失败', error);
      alert('❌ 清除缓存失败，请刷新页面重试');
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20 pt-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight uppercase">SETTINGS</h1>
        <p className="text-gray-400 line-clamp-1 md:line-clamp-none">个性化配置界面、语言、集成和数据管理</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        {/* Sidebar Navigation */}
        <div className="space-y-1">
          {[
            { id: 'general', name: t("general"), icon: SettingsIcon },
            { id: 'appearance', name: t("appearance"), icon: Palette },
            { id: 'integration', name: t("integration"), icon: Monitor },
            { id: 'data', name: t("dataManagement"), icon: Database },
            { id: 'marketplace', name: 'Marketplace', icon: Package },
            { id: 'about', name: lang === 'zh' ? '关于' : 'About', icon: Info },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                activeTab === item.id
                  ? (false ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' : 'bg-blue-600/20 text-blue-400 border border-blue-500/30')
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
              {/* 应用配置 */}
              <section className="space-y-4">
                <div
                  className="flex items-center justify-between cursor-pointer"
                  onClick={() => setIsAppConfigCollapsed(!isAppConfigCollapsed)}
                >
                  <h2 className="text-xl font-bold flex items-center gap-2">
                    <FileText size={20} className={false ? 'text-yellow-500' : 'text-blue-500'} />
                    应用配置
                  </h2>
                  <div className="flex items-center gap-2">
                    {!isAppConfigCollapsed && (
                      <>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleResetConfig();
                          }}
                          className="flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all"
                        >
                          <RotateCcw size={16} />
                          重置
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSaveConfig();
                          }}
                          disabled={isSavingConfig}
                          className={`flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg transition-all ${
                            isSavingConfig
                              ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                              : false
                              ? 'bg-yellow-500 hover:bg-yellow-600 text-black'
                              : 'bg-blue-500 hover:bg-blue-600 text-white'
                          }`}
                        >
                          <Save size={16} />
                          {isSavingConfig ? '保存中...' : '保存'}
                        </button>
                      </>
                    )}
                    {isAppConfigCollapsed ? <ChevronDown size={20} /> : <ChevronUp size={20} />}
                  </div>
                </div>

                {!isAppConfigCollapsed && (
                  <>
                    {isLoadingConfig ? (
                      <div className="text-center py-8 text-gray-400">加载配置中...</div>
                    ) : (
                      <div className="space-y-4">
                        <div className="text-xs text-gray-500 mb-4">
                          配置文件: {configFile}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* APP_NAME */}
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-300">应用名称</label>
                            <input
                              type="text"
                              value={config.APP_NAME || ''}
                              onChange={(e) => handleConfigChange('APP_NAME', e.target.value)}
                              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 transition-all"
                              placeholder="Open Adventure"
                            />
                          </div>

                          {/* APP_VERSION */}
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-300">应用版本</label>
                            <input
                              type="text"
                              value={config.APP_VERSION || ''}
                              onChange={(e) => handleConfigChange('APP_VERSION', e.target.value)}
                              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 transition-all"
                              placeholder="0.2.0"
                            />
                          </div>

                          {/* ENV */}
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-300">运行环境</label>
                            <select
                              value={config.ENV || 'production'}
                              onChange={(e) => handleConfigChange('ENV', e.target.value)}
                              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 transition-all"
                            >
                              <option value="development">development</option>
                              <option value="production">production</option>
                            </select>
                          </div>

                          {/* DEBUG */}
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-300">调试模式</label>
                            <select
                              value={config.DEBUG || 'false'}
                              onChange={(e) => handleConfigChange('DEBUG', e.target.value)}
                              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 transition-all"
                            >
                              <option value="false">关闭</option>
                              <option value="true">开启</option>
                            </select>
                          </div>

                          {/* LOG_LEVEL */}
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-300">日志级别</label>
                            <select
                              value={config.LOG_LEVEL || 'INFO'}
                              onChange={(e) => handleConfigChange('LOG_LEVEL', e.target.value)}
                              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 transition-all"
                            >
                              <option value="DEBUG">DEBUG</option>
                              <option value="INFO">INFO</option>
                              <option value="WARNING">WARNING</option>
                              <option value="ERROR">ERROR</option>
                            </select>
                          </div>

                          {/* CLAUDE_CLI_PATH */}
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-300">Claude CLI 路径</label>
                            <input
                              type="text"
                              value={config.CLAUDE_CLI_PATH || ''}
                              onChange={(e) => handleConfigChange('CLAUDE_CLI_PATH', e.target.value)}
                              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 transition-all font-mono"
                              placeholder="claude"
                            />
                          </div>

                          {/* ANTHROPIC_API_KEY */}
                          <div className="space-y-2 md:col-span-2">
                            <label className="text-sm font-medium text-gray-300">Anthropic API Key</label>
                            <input
                              type="password"
                              value={config.ANTHROPIC_API_KEY || ''}
                              onChange={(e) => handleConfigChange('ANTHROPIC_API_KEY', e.target.value)}
                              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 transition-all font-mono"
                              placeholder="sk-ant-..."
                            />
                            <p className="text-xs text-gray-500">留空则使用 Claude Code CLI 的默认配置</p>
                          </div>

                          {/* SECRET_KEY */}
                          <div className="space-y-2 md:col-span-2">
                            <label className="text-sm font-medium text-gray-300">Secret Key（安全密钥）</label>
                            <input
                              type="password"
                              value={config.SECRET_KEY || ''}
                              onChange={(e) => handleConfigChange('SECRET_KEY', e.target.value)}
                              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 transition-all font-mono"
                              placeholder="change-this-to-a-random-secret-key-in-production"
                            />
                            <p className="text-xs text-gray-500">用于加密和签名，生产环境请修改为随机字符串</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </section>

              {/* Language Settings */}
              <section className="space-y-4">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <Languages size={20} className={false ? 'text-yellow-500' : 'text-blue-500'} />
                  {t("langSettings")}
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <button
                    onClick={() => setLang('en')}
                    className={`relative p-6 rounded-2xl border-2 transition-all text-left group overflow-hidden ${
                      lang === 'en'
                        ? (false ? 'border-yellow-500 bg-yellow-500/5 shadow-[0_0_20px_rgba(234,179,8,0.2)]' : 'border-blue-500 bg-blue-500/5 shadow-[0_0_20px_rgba(59,130,246,0.2)]')
                        : 'border-white/10 bg-white/5 hover:border-white/20'
                    }`}
                  >
                    {lang === 'en' && <div className={`absolute top-4 right-4 ${false ? 'text-yellow-500' : 'text-blue-500'}`}><Check size={20} /></div>}
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${lang === 'en' ? (false ? 'bg-yellow-500 text-black' : 'bg-blue-600 text-white') : 'bg-white/10 text-gray-400'}`}>
                      EN
                    </div>
                    <h3 className="font-bold text-lg">{t("enLang")}</h3>
                    <p className="text-xs text-gray-400 mt-1">English Interface (US/UK)</p>
                  </button>

                  <button
                    onClick={() => setLang('zh')}
                    className={`relative p-6 rounded-2xl border-2 transition-all text-left group overflow-hidden ${
                      lang === 'zh'
                        ? (false ? 'border-yellow-500 bg-yellow-500/5 shadow-[0_0_20px_rgba(234,179,8,0.2)]' : 'border-blue-500 bg-blue-500/5 shadow-[0_0_20px_rgba(59,130,246,0.2)]')
                        : 'border-white/10 bg-white/5 hover:border-white/20'
                    }`}
                  >
                    {lang === 'zh' && <div className={`absolute top-4 right-4 ${false ? 'text-yellow-500' : 'text-blue-500'}`}><Check size={20} /></div>}
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${lang === 'zh' ? (false ? 'bg-yellow-500 text-black' : 'bg-blue-600 text-white') : 'bg-white/10 text-gray-400'}`}>
                      ZH
                    </div>
                    <h3 className="font-bold text-lg">{t("zhLang")}</h3>
                    <p className="text-xs text-gray-400 mt-1">中文简体界面</p>
                  </button>
                </div>
              </section>

              {/* Developer Tools */}
              <section className="space-y-4 pt-8 border-t border-white/10">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <ShieldCheck size={20} className="text-blue-500" />
                  开发者工具
                </h2>
                <div className="space-y-4">
                  {/* 开发者工具说明 */}
                  <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                    <p className="text-sm text-gray-400">
                      开发者工具已移至测试页面。点击左下角的紫色烧杯图标打开测试页面，在那里可以管理所有开发工具。
                    </p>
                  </div>
                </div>
              </section>

              {/* Terminal (tmux) Settings */}
              <section className="space-y-4 pt-8 border-t border-white/10">
                <div>
                  <h2 className="text-xl font-bold flex items-center gap-2">
                    <Monitor size={20} className="text-blue-500" />
                    终端设置
                  </h2>
                  <p className="text-sm text-gray-400 mt-2">
                    配置 tmux 终端的行为和会话管理
                  </p>
                </div>

                <div className="space-y-4">
                  {/* 关闭终端时的默认行为 */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-300">关闭终端时的默认行为</label>
                    <p className="text-xs text-gray-500">
                      选择关闭 tmux 终端时的默认操作
                    </p>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="defaultCloseAction"
                          value="detach"
                          checked={tmuxSettings.defaultCloseAction === 'detach'}
                          onChange={(e) => handleTmuxSettingsChange('defaultCloseAction', e.target.value)}
                          className="w-4 h-4 text-blue-500 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-300">
                          暂离（Detach）
                          <span className="text-xs text-gray-500 ml-2">保持会话运行，可稍后恢复</span>
                        </span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="defaultCloseAction"
                          value="kill"
                          checked={tmuxSettings.defaultCloseAction === 'kill'}
                          onChange={(e) => handleTmuxSettingsChange('defaultCloseAction', e.target.value)}
                          className="w-4 h-4 text-blue-500 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-300">
                          退出（Kill）
                          <span className="text-xs text-gray-500 ml-2">完全终止会话</span>
                        </span>
                      </label>
                    </div>
                  </div>

                  {/* 刷新页面时自动恢复会话 */}
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={tmuxSettings.autoRestoreOnRefresh}
                        onChange={(e) => handleTmuxSettingsChange('autoRestoreOnRefresh', e.target.checked)}
                        className="w-4 h-4 text-blue-500 focus:ring-blue-500 rounded"
                      />
                      <span className="text-sm font-medium text-gray-300">刷新页面时自动恢复会话</span>
                    </label>
                    <p className="text-xs text-gray-500 ml-6">
                      开启后，刷新页面时会自动恢复所有暂离的 tmux 会话，无需手动选择
                    </p>
                  </div>
                </div>
              </section>

              {/* Model Configuration */}
              <section className="space-y-4 pt-8 border-t border-white/10">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold flex items-center gap-2">
                      <Zap size={20} className={false ? 'text-yellow-500' : 'text-blue-500'} />
                      模型配置
                    </h2>
                    <p className="text-sm text-gray-400 mt-2">
                      配置可用的 Claude 模型列表，用于 Agent 和 Workflow 选择
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleResetModels}
                      className="flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all"
                    >
                      <RotateCcw size={16} />
                      清空自定义
                    </button>
                    <button
                      onClick={handleSaveModels}
                      disabled={isSavingModels}
                      className={`flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg transition-all ${
                        isSavingModels
                          ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                          : false
                          ? 'bg-yellow-500 hover:bg-yellow-600 text-black'
                          : 'bg-blue-500 hover:bg-blue-600 text-white'
                      }`}
                    >
                      <Save size={16} />
                      {isSavingModels ? '保存中...' : '保存'}
                    </button>
                  </div>
                </div>

                {isLoadingModels ? (
                  <div className="text-center py-8 text-gray-400">加载模型配置中...</div>
                ) : (
                  <div className="space-y-6">
                    {/* 当前可用模型（只读） */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-bold text-gray-300">当前可用模型</h3>
                        <span className="text-xs text-gray-500">来自 default_models.json + custom_models.json</span>
                      </div>
                      <div className="space-y-2">
                        {availableModels && availableModels.length > 0 ? (
                          availableModels.map((model, index) => (
                            <div
                              key={index}
                              className={`border rounded-lg p-3 ${
                                model.alias === currentModel || model.full_name === currentModel
                                  ? false
                                    ? 'bg-yellow-500/10 border-yellow-500/30'
                                    : 'bg-blue-500/10 border-blue-500/30'
                                  : 'bg-white/5 border-white/10'
                              }`}
                            >
                              <div className="grid grid-cols-4 gap-3 text-sm items-center">
                                <div>
                                  <span className="text-gray-500">Alias:</span>
                                  <span className="ml-2 text-gray-300">{model.alias}</span>
                                  {(model.alias === currentModel || model.full_name === currentModel) && (
                                    <span className={`ml-2 text-xs px-2 py-0.5 rounded ${
                                      false ? 'bg-yellow-500 text-black' : 'bg-blue-500 text-white'
                                    }`}>
                                      当前
                                    </span>
                                  )}
                                </div>
                                <div>
                                  <span className="text-gray-500">Model:</span>
                                  <span className="ml-2 text-gray-300 font-mono text-xs">{model.full_name}</span>
                                </div>
                                <div>
                                  <span className="text-gray-500">描述:</span>
                                  <span className="ml-2 text-gray-400">{model.description}</span>
                                </div>
                                <div className="text-right">
                                  {model.available ? (
                                    <span className="text-xs text-green-400">✓ 可用</span>
                                  ) : (
                                    <span className="text-xs text-red-400">✗ 不可用</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="text-center py-4 text-gray-500 text-sm">
                            暂无可用模型
                          </div>
                        )}
                      </div>
                    </div>

                    {/* 自定义模型编辑区（可编辑） */}
                    <div className="space-y-3 pt-6 border-t border-white/10">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-sm font-bold text-gray-300">编辑自定义模型</h3>
                          <p className="text-xs text-gray-500 mt-1">修改后需要保存并刷新页面才能在上方列表中看到</p>
                        </div>
                        <span className="text-xs text-gray-500">{customFile}</span>
                      </div>

                      {customModels && customModels.length === 0 ? (
                        <div className="text-center py-6 text-gray-500 text-sm">
                          暂无自定义模型，点击下方按钮添加
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {customModels && customModels.map((model, index) => (
                            <div key={index} className="bg-white/5 border border-white/10 rounded-lg p-4 space-y-3">
                              <div className="flex items-center justify-between">
                                <div className="text-sm font-medium text-gray-300">自定义模型 #{index + 1}</div>
                                <button
                                  onClick={() => handleRemoveModel(index)}
                                  className="text-red-400 hover:text-red-300 transition-all"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                <div className="space-y-1">
                                  <label className="text-xs text-gray-400">Alias (别名)</label>
                                  <input
                                    type="text"
                                    value={model.alias}
                                    onChange={(e) => handleModelChange(index, 'alias', e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 transition-all"
                                    placeholder="my-model"
                                  />
                                </div>

                                <div className="space-y-1">
                                  <label className="text-xs text-gray-400">Full Name (完整名称)</label>
                                  <input
                                    type="text"
                                    value={model.full_name}
                                    onChange={(e) => handleModelChange(index, 'full_name', e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 transition-all font-mono"
                                    placeholder="claude-custom-20260101"
                                  />
                                </div>

                                <div className="space-y-1">
                                  <label className="text-xs text-gray-400">Description (描述)</label>
                                  <input
                                    type="text"
                                    value={model.description}
                                    onChange={(e) => handleModelChange(index, 'description', e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 transition-all"
                                    placeholder="My custom model"
                                  />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      <button
                        onClick={handleAddModel}
                        className={`w-full py-3 rounded-xl border-2 border-dashed transition-all flex items-center justify-center gap-2 ${
                          false
                            ? 'border-yellow-500/30 hover:border-yellow-500 hover:bg-yellow-500/5 text-yellow-400'
                            : 'border-blue-500/30 hover:border-blue-500 hover:bg-blue-500/5 text-blue-400'
                        }`}
                      >
                        <Plus size={18} />
                        添加自定义模型
                      </button>
                    </div>
                  </div>
                )}
              </section>
            </>
          )}

          {/* Integration Tab */}
          {activeTab === 'integration' && (
            <section className="space-y-4">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Monitor size={20} className={false ? 'text-yellow-500' : 'text-blue-500'} />
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
                    <Globe size={20} className={false ? 'text-yellow-500' : 'text-blue-400'} />
                    <div>
                      <p className="font-bold text-sm">Auto-Sync Skills</p>
                      <p className="text-xs text-gray-500">Automatically update local skills from cloud.</p>
                    </div>
                  </div>
                  <div className={`w-12 h-6 rounded-full ${false ? 'bg-yellow-600' : 'bg-blue-600'} p-1 flex justify-end cursor-pointer`}>
                    <div className="w-4 h-4 rounded-full bg-white" />
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Data Management Tab */}
          {activeTab === 'data' && (
            <>
              <section className="space-y-4">
                <div>
                  <h2 className="text-xl font-bold flex items-center gap-2">
                    <FolderGit2 size={20} className={false ? 'text-yellow-500' : 'text-blue-500'} />
                    项目路径配置
                  </h2>
                  <p className="text-sm text-gray-400 mt-2">
                    配置需要扫描的项目路径，只有配置的路径才会被检索 project 级别的 skills 和 agents
                  </p>
                  <div className="mt-3 p-3 bg-purple-500/10 border border-purple-500/30 rounded-lg">
                    <p className="text-xs text-purple-300">
                      💡 <span className="font-bold">自动扫描范围：</span>点击"扫描 Git 仓库"按钮将自动扫描以下目录（最大深度 3 层）：
                    </p>
                    <ul className="text-xs text-purple-300/80 mt-2 ml-4 space-y-1">
                      <li>• <code className="px-1 py-0.5 bg-black/30 rounded">/mnt</code> - 挂载点目录</li>
                      <li>• <code className="px-1 py-0.5 bg-black/30 rounded">~</code> - 用户主目录（{typeof window !== 'undefined' ? window.location.hostname === 'localhost' ? '当前用户' : '服务器用户' : '当前用户'}）</li>
                    </ul>
                  </div>
                </div>
                <ProjectPathManager />
              </section>

              {/* 缓存管理 */}
              <section className="space-y-4 pt-8 border-t border-white/10">
                <div>
                  <h2 className="text-xl font-bold flex items-center gap-2">
                    <HardDrive size={20} className={false ? 'text-yellow-500' : 'text-blue-500'} />
                    缓存管理
                  </h2>
                  <p className="text-sm text-gray-400 mt-2">
                    管理应用缓存，包括 Service Worker 缓存和本地数据存储
                  </p>
                </div>

                <div className="bg-white/5 rounded-2xl border border-white/10 p-6 space-y-4">
                  <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-xl ${false ? 'bg-yellow-500/10' : 'bg-blue-500/10'}`}>
                      <Database size={24} className={false ? 'text-yellow-500' : 'text-blue-500'} />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-lg mb-2">PWA 缓存</h3>
                      <p className="text-sm text-gray-400 mb-4">
                        应用使用 Service Worker 和 IndexedDB 缓存静态资源和 API 数据，提升加载速度和离线体验。
                        清除缓存会删除所有缓存数据，下次访问时需要重新加载。
                      </p>
                      <ul className="text-sm text-gray-400 space-y-1 mb-4">
                        <li>• 静态资源缓存：JS、CSS、图片等文件</li>
                        <li>• API 数据缓存：Skills、Agents、Teams 等数据（5 分钟有效期）</li>
                        <li>• 用户偏好设置：主题、语言、置顶项等</li>
                      </ul>
                      <button
                        onClick={handleClearCache}
                        disabled={isClearing}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all ${
                          isClearing
                            ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                            : 'bg-red-500 hover:bg-red-600 text-white'
                        }`}
                      >
                        <Trash2 size={18} />
                        {isClearing ? '清除中...' : '清除所有缓存'}
                      </button>
                    </div>
                  </div>
                </div>
              </section>
            </>
          )}

          {/* Marketplace Tab */}
          {activeTab === 'marketplace' && (
            <section className="space-y-4">
              <div>
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <Package size={20} className={false ? 'text-yellow-500' : 'text-blue-500'} />
                  Marketplace Plugins
                </h2>
                <p className="text-sm text-gray-400 mt-2">
                  管理 Marketplace Plugin Repositories，自动拉取和安装 plugins
                </p>
              </div>
              <MarketplacePluginsManager />
            </section>
          )}

          {/* About Tab */}
          {activeTab === 'about' && (
            <section className="space-y-6">
              <div>
                <h2 className="text-3xl font-bold mb-3">Open Adventure</h2>
                <p className="text-gray-400 text-lg">
                  统一管理 Claude AI 生态的专业工具 - Skills、Agents、Teams、Workflows 一站式解决方案
                </p>
              </div>

              <div className="space-y-4">
                <h3 className="text-2xl font-bold flex items-center gap-2">
                  <span className={false ? 'text-yellow-500' : 'text-blue-500'}>🎯</span>
                  设计理念
                </h3>

                <div className="space-y-8">
                  <div>
                    <h4 className="text-xl font-bold mb-3 flex items-center gap-2">
                      <span className={false ? 'text-yellow-500' : 'text-blue-500'}>🤖</span>
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
                      <span className={false ? 'text-yellow-500' : 'text-blue-500'}>📱</span>
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
                      <span className={false ? 'text-yellow-500' : 'text-blue-500'}>🎮</span>
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
                  <span className={false ? 'text-yellow-500' : 'text-blue-500'}>🏗️</span>
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
                  <span className={false ? 'text-yellow-500' : 'text-blue-500'}>⚙️</span>
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
                  <span className={false ? 'text-yellow-500' : 'text-blue-500'}>✨</span>
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
                <p className="text-sm pt-2">Made with ❤️ by Open Adventure Team</p>
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
