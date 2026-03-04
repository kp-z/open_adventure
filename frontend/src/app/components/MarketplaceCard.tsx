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
        return <CheckCircle size={16} className="text-green-500" />;
      case 'update_available':
        return <AlertCircle size={16} className="text-yellow-500" />;
      case 'installing':
      case 'updating':
        return <Loader2 size={16} className="text-blue-500 animate-spin" />;
      case 'error':
        return <AlertCircle size={16} className="text-red-500" />;
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

  return (
    <GlassCard className="md:col-span-2 lg:col-span-2">
      <div className="flex justify-between items-start mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-purple-500/20 border border-purple-500/50 text-purple-500 flex items-center justify-center">
            <Package size={24} />
          </div>
          <div>
            <h2 className="text-base md:text-lg font-bold">Marketplace Plugins</h2>
            <p className="text-xs text-gray-400">
              {plugins.length} plugin{plugins.length !== 1 ? 's' : ''} available
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ActionButton
            variant="secondary"
            onClick={handleCheckUpdates}
            disabled={checking || loading}
            className="px-3 py-2 text-xs"
          >
            <RefreshCw size={14} className={checking ? 'animate-spin' : ''} />
            <span className="hidden md:inline ml-2">Check Updates</span>
          </ActionButton>
          <ActionButton
            variant="secondary"
            onClick={handleScan}
            disabled={loading}
            className="px-3 py-2 text-xs"
          >
            <Package size={14} />
            <span className="hidden md:inline ml-2">Scan</span>
          </ActionButton>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
          {error}
        </div>
      )}

      <div className="space-y-3 max-h-96 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 size={24} className="animate-spin text-gray-400" />
          </div>
        ) : plugins.length === 0 ? (
          <div className="text-center py-8 text-gray-400 text-sm">
            No plugins found. Click "Scan" to discover plugins.
          </div>
        ) : (
          plugins.map((plugin) => (
            <div
              key={plugin.id}
              className="bg-white/5 rounded-lg p-4 hover:bg-white/10 transition-colors"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-sm font-bold text-white truncate">
                      {plugin.display_name}
                    </h3>
                    <div className="flex items-center gap-1">
                      {getStatusIcon(plugin.status)}
                      <span className="text-xs text-gray-400">
                        {getStatusText(plugin.status)}
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-gray-400 mb-2 line-clamp-2">
                    {plugin.description}
                  </p>
                  {plugin.git_repo_url && (
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <ExternalLink size={12} />
                      <span className="truncate">{plugin.git_repo_url}</span>
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-2 shrink-0">
                  {plugin.status === 'update_available' && (
                    <ActionButton
                      onClick={() => handleUpdate(plugin.id)}
                      disabled={operatingPluginId === plugin.id}
                      className="px-3 py-1 text-xs"
                    >
                      {operatingPluginId === plugin.id ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : (
                        <Download size={12} />
                      )}
                      <span className="ml-1">Update</span>
                    </ActionButton>
                  )}
                  {!plugin.local_path && plugin.git_repo_url && (
                    <ActionButton
                      onClick={() => handleInstall(plugin.id)}
                      disabled={operatingPluginId === plugin.id}
                      className="px-3 py-1 text-xs"
                    >
                      {operatingPluginId === plugin.id ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : (
                        <Download size={12} />
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
    </GlassCard>
  );
};
