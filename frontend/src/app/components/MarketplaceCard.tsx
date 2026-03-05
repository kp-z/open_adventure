import React, { useState, useEffect } from 'react';
import { Package, RefreshCw, Download, CheckCircle, AlertCircle, Loader2, ExternalLink } from 'lucide-react';
import { GlassCard, ActionButton } from './ui-shared';
import { pluginsApi, type Plugin, type PluginStatus } from '@/lib/api';

export const MarketplaceCard: React.FC = () => {
  const [plugins, setPlugins] = useState<Plugin[]>([]);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [operatingPluginId, setOperatingPluginId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchPlugins = async () => {
    try {
      setLoading(true);
      const response = await pluginsApi.list();
      setPlugins(response.items);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch plugins:', err);
      setError('Failed to load plugins');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckUpdates = async () => {
    try {
      setChecking(true);
      const response = await pluginsApi.checkAllUpdates();
      setPlugins(response.items);
      setError(null);
    } catch (err) {
      console.error('Failed to check updates:', err);
      setError('Failed to check updates');
    } finally {
      setChecking(false);
    }
  };

  const handleInstall = async (pluginId: number) => {
    try {
      setOperatingPluginId(pluginId);
      const updatedPlugin = await pluginsApi.install(pluginId);
      setPlugins(prev => prev.map(p => p.id === pluginId ? updatedPlugin : p));
      setError(null);
    } catch (err) {
      console.error('Failed to install plugin:', err);
      setError('Failed to install plugin');
    } finally {
      setOperatingPluginId(null);
    }
  };

  const handleUpdate = async (pluginId: number) => {
    try {
      setOperatingPluginId(pluginId);
      const updatedPlugin = await pluginsApi.updateFiles(pluginId);
      setPlugins(prev => prev.map(p => p.id === pluginId ? updatedPlugin : p));
      setError(null);
    } catch (err) {
      console.error('Failed to update plugin:', err);
      setError('Failed to update plugin');
    } finally {
      setOperatingPluginId(null);
    }
  };

  const handleScan = async () => {
    try {
      setLoading(true);
      const response = await pluginsApi.scan();
      setPlugins(response.items);
      setError(null);
    } catch (err) {
      console.error('Failed to scan marketplace:', err);
      setError('Failed to scan marketplace');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlugins();
  }, []);

  const getStatusIcon = (status: PluginStatus) => {
    switch (status) {
      case 'installed':
        return <CheckCircle size={12} className="text-green-500" />;
      case 'update_available':
        return <AlertCircle size={12} className="text-yellow-500" />;
      case 'installing':
      case 'updating':
        return <Loader2 size={12} className="text-blue-500 animate-spin" />;
      case 'error':
        return <AlertCircle size={12} className="text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusText = (status: PluginStatus) => {
    switch (status) {
      case 'installed':
        return 'Installed';
      case 'update_available':
        return 'Update Available';
      case 'installing':
        return 'Installing...';
      case 'updating':
        return 'Updating...';
      case 'error':
        return 'Error';
      default:
        return 'Unknown';
    }
  };

  const pluginSummaryText = loading
    ? '正在加载插件...'
    : `${plugins.length} plugin${plugins.length !== 1 ? 's' : ''} available`;

  return (
    <GlassCard className="flex flex-col h-full p-3 md:p-4">
      <div className="flex items-start justify-between gap-3 pb-2 border-b border-white/10">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-9 h-9 rounded-lg bg-purple-500/20 border border-purple-500/40 text-purple-400 flex items-center justify-center shrink-0">
            <Package size={18} />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm md:text-base font-bold leading-tight">Marketplace Plugins</h2>
            <p className="text-[11px] text-gray-400 truncate mt-0.5">{pluginSummaryText}</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <ActionButton
            variant="secondary"
            onClick={handleCheckUpdates}
            disabled={checking || loading}
            title="Check updates"
            className="h-8 px-2 md:px-2.5 text-[11px]"
          >
            <RefreshCw size={12} className={checking ? 'animate-spin' : ''} />
            <span className="hidden md:inline ml-1">Check</span>
          </ActionButton>
          <ActionButton
            variant="secondary"
            onClick={handleScan}
            disabled={loading}
            title="Scan marketplace"
            className="h-8 px-2 md:px-2.5 text-[11px]"
          >
            <Package size={12} />
            <span className="hidden md:inline ml-1">Scan</span>
          </ActionButton>
        </div>
      </div>

      {error && (
        <div className="mt-2 mb-2 p-2.5 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-xs">
          {error}
        </div>
      )}

      <div className="flex-1 min-h-0">
        <div className="space-y-1.5 overflow-y-auto min-h-0 marketplace-scroll-area h-full lg:max-h-[calc(var(--dashboard-row-h)-96px)]">
          {loading ? (
            <div className="flex items-center justify-center h-full min-h-[140px]">
              <Loader2 size={22} className="animate-spin text-gray-400" />
            </div>
          ) : plugins.length === 0 ? (
            <div className="text-center py-6 text-gray-400 text-xs">
              No plugins found. Click "Scan" to discover plugins.
            </div>
          ) : (
            plugins.map((plugin) => (
              <div
                key={plugin.id}
                className="bg-white/5 rounded-lg p-2 hover:bg-white/10 transition-colors"
              >
                <div className="flex items-start justify-between gap-1.5">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1 mb-0.5">
                      <h3 className="text-[10px] font-semibold text-white truncate leading-tight">
                        {plugin.display_name}
                      </h3>
                      <div className="flex items-center gap-1 shrink-0">
                        {getStatusIcon(plugin.status)}
                        <span className="text-[9px] text-gray-400 leading-tight">
                          {getStatusText(plugin.status)}
                        </span>
                      </div>
                    </div>
                    <p className="text-[9px] text-gray-400 mb-0.5 line-clamp-2 leading-tight">
                      {plugin.description}
                    </p>
                    {plugin.git_repo_url && (
                      <div className="flex items-center gap-1 text-[9px] text-gray-500 leading-tight">
                        <ExternalLink size={11} />
                        <span className="truncate">{plugin.git_repo_url}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-1.5 shrink-0">
                    {plugin.status === 'update_available' && (
                      <ActionButton
                        onClick={() => handleUpdate(plugin.id)}
                        disabled={operatingPluginId === plugin.id}
                        className="px-1 py-0.5 text-[9px]"
                      >
                        {operatingPluginId === plugin.id ? (
                          <Loader2 size={11} className="animate-spin" />
                        ) : (
                          <Download size={11} />
                        )}
                        <span className="ml-1">Update</span>
                      </ActionButton>
                    )}
                    {!plugin.local_path && plugin.git_repo_url && (
                      <ActionButton
                        onClick={() => handleInstall(plugin.id)}
                        disabled={operatingPluginId === plugin.id}
                        className="px-1 py-0.5 text-[9px]"
                      >
                        {operatingPluginId === plugin.id ? (
                          <Loader2 size={11} className="animate-spin" />
                        ) : (
                          <Download size={11} />
                        )}
                        <span className="ml-1">Install</span>
                      </ActionButton>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
      <style>{`
        .marketplace-scroll-area {
          scrollbar-width: thin;
          scrollbar-color: rgba(148, 163, 184, 0.45) rgba(255, 255, 255, 0.06);
        }

        .marketplace-scroll-area::-webkit-scrollbar {
          width: 8px;
        }

        .marketplace-scroll-area::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.06);
          border-radius: 9999px;
        }

        .marketplace-scroll-area::-webkit-scrollbar-thumb {
          background: rgba(148, 163, 184, 0.45);
          border-radius: 9999px;
          border: 2px solid transparent;
          background-clip: padding-box;
        }

        .marketplace-scroll-area::-webkit-scrollbar-thumb:hover {
          background: rgba(148, 163, 184, 0.7);
          background-clip: padding-box;
        }
      `}</style>
    </GlassCard>
  );
};
