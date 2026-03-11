import React, { useState, useEffect } from 'react';
import { Plus, Trash2, RefreshCw, GitBranch, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { useMode } from '../contexts/ModeContext';
import { useNotifications } from '../contexts/NotificationContext';

interface MarketplaceRepo {
  id: string;
  git_repo_url: string;
  branch: string;
  auto_update: boolean;
  last_sync_time: string | null;
}

export const MarketplacePluginsManager: React.FC = () => {
  
  const { addNotification } = useNotifications();
  const [repos, setRepos] = useState<MarketplaceRepo[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState<string | null>(null);

  // Form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [newRepoUrl, setNewRepoUrl] = useState('');
  const [newRepoBranch, setNewRepoBranch] = useState('main');
  const [newRepoAutoUpdate, setNewRepoAutoUpdate] = useState(false);

  const accentColor = 'blue';

  useEffect(() => {
    loadRepos();
  }, []);

  const loadRepos = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/settings/marketplace-repos');
      if (!response.ok) throw new Error('Failed to load repos');
      const data = await response.json();
      setRepos(data);
    } catch (error) {
      console.error('Failed to load marketplace repos:', error);
      addNotification({ title: '错误', message: '加载 Marketplace 配置失败', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleAddRepo = async () => {
    if (!newRepoUrl.trim()) {
      addNotification({ title: '错误', message: '请输入 Git Repository URL', type: 'error' });
      return;
    }

    try {
      const response = await fetch('/api/settings/marketplace-repos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          git_repo_url: newRepoUrl,
          branch: newRepoBranch,
          auto_update: newRepoAutoUpdate
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail?.message || 'Failed to add repo');
      }

      const newRepo = await response.json();
      setRepos([...repos, newRepo]);
      setShowAddForm(false);
      setNewRepoUrl('');
      setNewRepoBranch('main');
      setNewRepoAutoUpdate(false);
      addNotification({ title: '成功', message: '添加 Marketplace 配置成功', type: 'success' });
    } catch (error: any) {
      console.error('Failed to add repo:', error);
      addNotification({ title: '错误', message: error.message || '添加 Marketplace 配置失败', type: 'error' });
    }
  };

  const handleDeleteRepo = async (repoId: string) => {
    if (!confirm('确定要删除这个 Marketplace 配置吗？')) return;

    try {
      const response = await fetch(`/api/settings/marketplace-repos/${repoId}`, {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error('Failed to delete repo');

      setRepos(repos.filter(r => r.id !== repoId));
      addNotification({ title: '成功', message: '删除 Marketplace 配置成功', type: 'success' });
    } catch (error) {
      console.error('Failed to delete repo:', error);
      addNotification({ title: '错误', message: '删除 Marketplace 配置失败', type: 'error' });
    }
  };

  const handleSyncRepo = async (repoId: string) => {
    setSyncing(repoId);
    try {
      const response = await fetch(`/api/settings/marketplace-repos/${repoId}/sync`, {
        method: 'POST'
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail?.message || 'Failed to sync repo');
      }

      const result = await response.json();

      // 更新 repos 列表中的 last_sync_time
      setRepos(repos.map(r =>
        r.id === repoId
          ? { ...r, last_sync_time: result.data.last_sync_time }
          : r
      ));

      addNotification({ title: '成功', message: `同步成功: ${result.data.repo_name}`, type: 'success' });
    } catch (error: any) {
      console.error('Failed to sync repo:', error);
      addNotification({ title: '错误', message: error.message || '同步失败', type: 'error' });
    } finally {
      setSyncing(null);
    }
  };

  const formatLastSyncTime = (time: string | null) => {
    if (!time) return '从未同步';
    const date = new Date(time);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return '刚刚';
    if (diffMins < 60) return `${diffMins} 分钟前`;
    if (diffHours < 24) return `${diffHours} 小时前`;
    return `${diffDays} 天前`;
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold">Marketplace Plugins</h3>
          <p className="text-sm text-gray-400 mt-1">
            配置 Git Repository 地址，自动拉取和安装 plugins
          </p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all ${
            false
              ? 'bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30 border border-yellow-500/30'
              : 'bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 border border-blue-500/30'
          }`}
        >
          <Plus size={18} />
          添加 Repository
        </button>
      </div>

      {/* Add Form */}
      {showAddForm && (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-400">Git Repository URL</label>
            <input
              type="text"
              value={newRepoUrl}
              onChange={(e) => setNewRepoUrl(e.target.value)}
              placeholder="https://github.com/username/repo.git"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 transition-all font-mono"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-400">Branch</label>
              <input
                type="text"
                value={newRepoBranch}
                onChange={(e) => setNewRepoBranch(e.target.value)}
                placeholder="main"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 transition-all font-mono"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-400">自动更新</label>
              <div className="flex items-center gap-3 h-[48px]">
                <button
                  onClick={() => setNewRepoAutoUpdate(!newRepoAutoUpdate)}
                  className={`w-12 h-6 rounded-full p-1 transition-all ${
                    newRepoAutoUpdate
                      ? false ? 'bg-yellow-600' : 'bg-blue-600'
                      : 'bg-gray-600'
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full bg-white transition-transform ${
                      newRepoAutoUpdate ? 'translate-x-6' : 'translate-x-0'
                    }`}
                  />
                </button>
                <span className="text-sm text-gray-400">
                  {newRepoAutoUpdate ? '启用' : '禁用'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={() => {
                setShowAddForm(false);
                setNewRepoUrl('');
                setNewRepoBranch('main');
                setNewRepoAutoUpdate(false);
              }}
              className="px-4 py-2 rounded-xl text-sm font-medium text-gray-400 hover:bg-white/5 transition-all"
            >
              取消
            </button>
            <button
              onClick={handleAddRepo}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                false
                  ? 'bg-yellow-500 text-black hover:bg-yellow-400'
                  : 'bg-blue-600 text-white hover:bg-blue-500'
              }`}
            >
              添加
            </button>
          </div>
        </div>
      )}

      {/* Repos List */}
      {loading ? (
        <div className="text-center py-12 text-gray-400">
          <RefreshCw className="animate-spin mx-auto mb-2" size={24} />
          加载中...
        </div>
      ) : repos.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <AlertCircle className="mx-auto mb-2" size={32} />
          <p>暂无 Marketplace 配置</p>
          <p className="text-sm mt-1">点击上方按钮添加 Git Repository</p>
        </div>
      ) : (
        <div className="space-y-3">
          {repos.map((repo) => (
            <div
              key={repo.id}
              className="bg-white/5 border border-white/10 rounded-2xl p-4 hover:bg-white/[0.07] transition-all"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <GitBranch size={16} className={`text-${accentColor}-500 flex-shrink-0`} />
                    <code className="text-sm font-mono text-white truncate">
                      {repo.git_repo_url}
                    </code>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-gray-400">
                    <span className="flex items-center gap-1">
                      <GitBranch size={12} />
                      {repo.branch}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock size={12} />
                      {formatLastSyncTime(repo.last_sync_time)}
                    </span>
                    {repo.auto_update && (
                      <span className={`flex items-center gap-1 text-${accentColor}-400`}>
                        <CheckCircle size={12} />
                        自动更新
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => handleSyncRepo(repo.id)}
                    disabled={syncing === repo.id}
                    className={`p-2 rounded-xl transition-all ${
                      syncing === repo.id
                        ? 'bg-gray-600/50 text-gray-400 cursor-not-allowed'
                        : false
                        ? 'bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30'
                        : 'bg-blue-600/20 text-blue-400 hover:bg-blue-600/30'
                    }`}
                    title="同步"
                  >
                    <RefreshCw
                      size={16}
                      className={syncing === repo.id ? 'animate-spin' : ''}
                    />
                  </button>
                  <button
                    onClick={() => handleDeleteRepo(repo.id)}
                    className="p-2 rounded-xl bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-all"
                    title="删除"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
