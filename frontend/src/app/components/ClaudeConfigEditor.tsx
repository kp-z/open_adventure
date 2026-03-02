import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Settings,
  ChevronDown,
  ChevronRight,
  Save,
  X,
  Plus,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Loader2
} from 'lucide-react';
import { claudeApi } from '@/lib/api';
import type { ClaudeSettings } from '@/lib/api';

interface ClaudeConfigEditorProps {
  onClose: () => void;
  onSaved?: () => void;
}

export const ClaudeConfigEditor: React.FC<ClaudeConfigEditorProps> = ({ onClose, onSaved }) => {
  const [settings, setSettings] = useState<ClaudeSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // 展开/折叠状态
  const [expandedSections, setExpandedSections] = useState({
    basic: true,
    env: false,
    permissions: false,
    plugins: false,
  });

  // 新增项的临时状态
  const [newEnvKey, setNewEnvKey] = useState('');
  const [newEnvValue, setNewEnvValue] = useState('');
  const [newAllowRule, setNewAllowRule] = useState('');
  const [newDenyRule, setNewDenyRule] = useState('');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await claudeApi.getSettings();
      setSettings(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!settings) return;

    try {
      setSaving(true);
      setError(null);
      await claudeApi.updateSettings(settings);
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onSaved?.();
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const updateBasicField = (field: 'model' | 'language' | 'effortLevel', value: string) => {
    setSettings(prev => prev ? { ...prev, [field]: value } : null);
  };

  const updateEnvVar = (key: string, value: string) => {
    setSettings(prev => ({
      ...prev!,
      env: { ...prev?.env, [key]: value }
    }));
  };

  const addEnvVar = () => {
    if (!newEnvKey.trim()) return;
    setSettings(prev => ({
      ...prev!,
      env: { ...prev?.env, [newEnvKey]: newEnvValue }
    }));
    setNewEnvKey('');
    setNewEnvValue('');
  };

  const removeEnvVar = (key: string) => {
    setSettings(prev => {
      const newEnv = { ...prev?.env };
      delete newEnv[key];
      return { ...prev!, env: newEnv };
    });
  };

  const addPermissionRule = (type: 'allow' | 'deny', rule: string) => {
    if (!rule.trim()) return;
    setSettings(prev => ({
      ...prev!,
      permissions: {
        allow: prev?.permissions?.allow || [],
        deny: prev?.permissions?.deny || [],
        [type]: [...(prev?.permissions?.[type] || []), rule]
      }
    }));
    if (type === 'allow') setNewAllowRule('');
    else setNewDenyRule('');
  };

  const removePermissionRule = (type: 'allow' | 'deny', index: number) => {
    setSettings(prev => ({
      ...prev!,
      permissions: {
        ...prev?.permissions!,
        [type]: prev?.permissions?.[type].filter((_, i) => i !== index) || []
      }
    }));
  };

  const togglePlugin = (pluginKey: string) => {
    setSettings(prev => ({
      ...prev!,
      enabledPlugins: {
        ...prev?.enabledPlugins,
        [pluginKey]: !prev?.enabledPlugins?.[pluginKey]
      }
    }));
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center">
        <div className="bg-[#1a1b26] rounded-2xl p-8 border border-white/10">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500 mx-auto" />
          <p className="text-gray-400 mt-4">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-[#1a1b26] rounded-2xl border border-white/10 w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-500/50 flex items-center justify-center">
              <Settings size={20} className="text-blue-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Claude Configuration</h2>
              <p className="text-xs text-gray-400">Edit ~/.claude/settings.json</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-white/10 flex items-center justify-center transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-center gap-3">
              <AlertCircle size={20} className="text-red-400" />
              <span className="text-red-400 text-sm">{error}</span>
            </div>
          )}

          {success && (
            <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 flex items-center gap-3">
              <CheckCircle2 size={20} className="text-green-400" />
              <span className="text-green-400 text-sm">Settings saved successfully!</span>
            </div>
          )}

          {/* Basic Settings */}
          <ConfigSection
            title="Basic Settings"
            expanded={expandedSections.basic}
            onToggle={() => toggleSection('basic')}
          >
            <div className="space-y-4">
              <div>
                <label className="text-xs text-gray-400 uppercase font-bold tracking-widest block mb-2">
                  Model
                </label>
                <select
                  value={settings?.model || ''}
                  onChange={(e) => updateBasicField('model', e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500/50"
                >
                  <option value="">Default (Sonnet)</option>
                  <option value="opus">Opus</option>
                  <option value="opus[1m]">Opus (1M context)</option>
                  <option value="sonnet">Sonnet</option>
                  <option value="haiku">Haiku</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-gray-400 uppercase font-bold tracking-widest block mb-2">
                  Language
                </label>
                <input
                  type="text"
                  value={settings?.language || ''}
                  onChange={(e) => updateBasicField('language', e.target.value)}
                  placeholder="e.g., 简体中文, English"
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500/50"
                />
              </div>

              <div>
                <label className="text-xs text-gray-400 uppercase font-bold tracking-widest block mb-2">
                  Effort Level
                </label>
                <select
                  value={settings?.effortLevel || ''}
                  onChange={(e) => updateBasicField('effortLevel', e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500/50"
                >
                  <option value="">Default</option>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
            </div>
          </ConfigSection>

          {/* Environment Variables */}
          <ConfigSection
            title="Environment Variables"
            subtitle={`${Object.keys(settings?.env || {}).length} variables`}
            expanded={expandedSections.env}
            onToggle={() => toggleSection('env')}
          >
            <div className="space-y-2">
              {Object.entries(settings?.env || {}).map(([key, value]) => (
                <div key={key} className="flex items-center gap-2 bg-white/5 rounded-lg p-3">
                  <div className="flex-1 grid grid-cols-2 gap-2">
                    <span className="text-sm font-mono text-blue-400">{key}</span>
                    <input
                      type="text"
                      value={value}
                      onChange={(e) => updateEnvVar(key, e.target.value)}
                      className="text-sm font-mono text-gray-300 bg-white/5 border border-white/10 rounded px-2 py-1 focus:outline-none focus:border-blue-500/50"
                    />
                  </div>
                  <button
                    onClick={() => removeEnvVar(key)}
                    className="w-8 h-8 rounded-lg hover:bg-red-500/20 flex items-center justify-center transition-colors"
                  >
                    <Trash2 size={14} className="text-red-400" />
                  </button>
                </div>
              ))}

              <div className="flex gap-2 mt-4">
                <input
                  type="text"
                  value={newEnvKey}
                  onChange={(e) => setNewEnvKey(e.target.value)}
                  placeholder="KEY"
                  className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500/50"
                />
                <input
                  type="text"
                  value={newEnvValue}
                  onChange={(e) => setNewEnvValue(e.target.value)}
                  placeholder="value"
                  className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500/50"
                />
                <button
                  onClick={addEnvVar}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg flex items-center gap-2 transition-colors"
                >
                  <Plus size={16} />
                  Add
                </button>
              </div>
            </div>
          </ConfigSection>

          {/* Permissions */}
          <ConfigSection
            title="Permissions"
            subtitle={`${(settings?.permissions?.allow?.length || 0) + (settings?.permissions?.deny?.length || 0)} rules`}
            expanded={expandedSections.permissions}
            onToggle={() => toggleSection('permissions')}
          >
            <div className="space-y-4">
              {/* Allow Rules */}
              <div>
                <h4 className="text-xs text-green-400 uppercase font-bold tracking-widest mb-2">Allow Rules</h4>
                <div className="space-y-2">
                  {settings?.permissions?.allow?.map((rule, index) => (
                    <div key={index} className="flex items-center gap-2 bg-green-500/10 border border-green-500/30 rounded-lg p-3">
                      <span className="flex-1 text-sm font-mono text-gray-300">{rule}</span>
                      <button
                        onClick={() => removePermissionRule('allow', index)}
                        className="w-8 h-8 rounded-lg hover:bg-red-500/20 flex items-center justify-center transition-colors"
                      >
                        <Trash2 size={14} className="text-red-400" />
                      </button>
                    </div>
                  ))}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newAllowRule}
                      onChange={(e) => setNewAllowRule(e.target.value)}
                      placeholder="e.g., Bash(echo hello)"
                      className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500/50"
                    />
                    <button
                      onClick={() => addPermissionRule('allow', newAllowRule)}
                      className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg flex items-center gap-2 transition-colors"
                    >
                      <Plus size={16} />
                      Add
                    </button>
                  </div>
                </div>
              </div>

              {/* Deny Rules */}
              <div>
                <h4 className="text-xs text-red-400 uppercase font-bold tracking-widest mb-2">Deny Rules</h4>
                <div className="space-y-2">
                  {settings?.permissions?.deny?.map((rule, index) => (
                    <div key={index} className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                      <span className="flex-1 text-sm font-mono text-gray-300">{rule}</span>
                      <button
                        onClick={() => removePermissionRule('deny', index)}
                        className="w-8 h-8 rounded-lg hover:bg-red-500/20 flex items-center justify-center transition-colors"
                      >
                        <Trash2 size={14} className="text-red-400" />
                      </button>
                    </div>
                  ))}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newDenyRule}
                      onChange={(e) => setNewDenyRule(e.target.value)}
                      placeholder="e.g., Bash(rm -rf)"
                      className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-red-500/50"
                    />
                    <button
                      onClick={() => addPermissionRule('deny', newDenyRule)}
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg flex items-center gap-2 transition-colors"
                    >
                      <Plus size={16} />
                      Add
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </ConfigSection>

          {/* Enabled Plugins */}
          <ConfigSection
            title="Enabled Plugins"
            subtitle={`${Object.values(settings?.enabledPlugins || {}).filter(Boolean).length} enabled`}
            expanded={expandedSections.plugins}
            onToggle={() => toggleSection('plugins')}
          >
            <div className="space-y-2">
              {Object.entries(settings?.enabledPlugins || {}).map(([key, enabled]) => (
                <div
                  key={key}
                  className="flex items-center justify-between bg-white/5 rounded-lg p-3 hover:bg-white/10 transition-colors"
                >
                  <span className="text-sm font-mono text-gray-300">{key}</span>
                  <button
                    onClick={() => togglePlugin(key)}
                    className={`w-12 h-6 rounded-full transition-colors ${
                      enabled ? 'bg-green-600' : 'bg-gray-600'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 bg-white rounded-full transition-transform ${
                        enabled ? 'translate-x-6' : 'translate-x-0.5'
                      }`}
                    />
                  </button>
                </div>
              ))}
            </div>
          </ConfigSection>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-white/10">
          <button
            onClick={onClose}
            className="px-6 py-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            {saving ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save size={16} />
                Save Changes
              </>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

// Section Component
interface ConfigSectionProps {
  title: string;
  subtitle?: string;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

const ConfigSection: React.FC<ConfigSectionProps> = ({ title, subtitle, expanded, onToggle, children }) => {
  return (
    <div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-3">
          {expanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
          <div className="text-left">
            <h3 className="font-bold">{title}</h3>
            {subtitle && <p className="text-xs text-gray-400">{subtitle}</p>}
          </div>
        </div>
      </button>
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            className="overflow-hidden"
          >
            <div className="p-4 border-t border-white/10">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
