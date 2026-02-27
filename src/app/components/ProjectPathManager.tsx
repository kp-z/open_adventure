/**
 * 项目路径管理组件
 * 用于在设置页面管理项目路径配置
 */
import React, { useState, useEffect } from 'react';
import { Plus, Trash2, FolderOpen, Check, X, RefreshCw } from 'lucide-react';
import { projectPathsApi, type ProjectPath, type ProjectPathCreate } from '../../lib/api';

interface ProjectPathManagerProps {
  onPathsChange?: () => void;
}

export const ProjectPathManager: React.FC<ProjectPathManagerProps> = ({ onPathsChange }) => {
  const [paths, setPaths] = useState<ProjectPath[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [newPath, setNewPath] = useState('');
  const [newAlias, setNewAlias] = useState('');
  const [newRecursive, setNewRecursive] = useState(true);

  console.log('[ProjectPathManager] Component mounted, paths:', paths, 'loading:', loading);

  // 加载项目路径列表
  const loadPaths = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await projectPathsApi.listProjectPaths();
      setPaths(response?.items || []);
    } catch (err) {
      console.error('Failed to load project paths:', err);
      setError(err instanceof Error ? err.message : '加载失败');
      setPaths([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPaths();
  }, []);

  // 添加新路径
  const handleAdd = async () => {
    if (!newPath.trim()) {
      setError('请输入项目路径');
      return;
    }

    try {
      setError(null);
      const data: ProjectPathCreate = {
        path: newPath.trim(),
        alias: newAlias.trim() || null,
        enabled: true,
        recursive_scan: newRecursive,
      };

      await projectPathsApi.createProjectPath(data);
      await loadPaths();
      onPathsChange?.();

      // 重置表单
      setNewPath('');
      setNewAlias('');
      setNewRecursive(true);
      setIsAdding(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : '添加失败');
    }
  };

  // 切换启用状态
  const handleToggle = async (id: number) => {
    try {
      setError(null);
      await projectPathsApi.toggleProjectPath(id);
      await loadPaths();
      onPathsChange?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : '切换失败');
    }
  };

  // 删除路径
  const handleDelete = async (id: number) => {
    if (!confirm('确定要删除这个项目路径吗？')) {
      return;
    }

    try {
      setError(null);
      await projectPathsApi.deleteProjectPath(id);
      await loadPaths();
      onPathsChange?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : '删除失败');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="animate-spin text-blue-500" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 添加按钮 */}
      <div className="flex items-center justify-end">
        {!isAdding && (
          <button
            onClick={() => setIsAdding(true)}
            className="px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 rounded-lg text-blue-400 font-bold transition-colors flex items-center gap-2"
          >
            <Plus size={16} />
            添加路径
          </button>
        )}
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* 添加表单 */}
      {isAdding && (
        <div className="p-6 bg-white/5 border border-white/10 rounded-xl space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-300">项目路径 *</label>
            <input
              type="text"
              value={newPath}
              onChange={(e) => setNewPath(e.target.value)}
              placeholder="/path/to/project"
              className="w-full px-4 py-2 bg-black/30 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-300">别名（可选）</label>
            <input
              type="text"
              value={newAlias}
              onChange={(e) => setNewAlias(e.target.value)}
              placeholder="项目名称"
              className="w-full px-4 py-2 bg-black/30 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="recursive"
              checked={newRecursive}
              onChange={(e) => setNewRecursive(e.target.checked)}
              className="w-4 h-4 rounded border-white/10 bg-black/30 text-blue-500 focus:ring-2 focus:ring-blue-500/50"
            />
            <label htmlFor="recursive" className="text-sm text-gray-300">
              递归扫描子目录
            </label>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleAdd}
              className="px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 rounded-lg text-blue-400 font-bold transition-colors flex items-center gap-2"
            >
              <Check size={16} />
              确认
            </button>
            <button
              onClick={() => {
                setIsAdding(false);
                setNewPath('');
                setNewAlias('');
                setNewRecursive(true);
                setError(null);
              }}
              className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-gray-400 font-bold transition-colors flex items-center gap-2"
            >
              <X size={16} />
              取消
            </button>
          </div>
        </div>
      )}

      {/* 路径列表 */}
      <div className="space-y-3">
        {paths.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <FolderOpen size={48} className="mx-auto mb-4 opacity-50" />
            <p>暂无配置的项目路径</p>
            <p className="text-sm mt-2">点击"添加路径"按钮开始配置</p>
          </div>
        ) : (
          paths.map((path) => (
            <div
              key={path.id}
              className={`p-4 rounded-xl border transition-all ${
                path.enabled
                  ? 'bg-white/5 border-white/10'
                  : 'bg-white/[0.02] border-white/5 opacity-60'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <FolderOpen
                      size={20}
                      className={path.enabled ? 'text-blue-400' : 'text-gray-500'}
                    />
                    <h4 className="font-bold text-white truncate">
                      {path.alias || path.path.split('/').pop()}
                    </h4>
                    {path.recursive_scan && (
                      <span className="px-2 py-0.5 bg-purple-500/20 border border-purple-500/30 rounded text-xs text-purple-400 font-bold">
                        递归
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-400 truncate">{path.path}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    创建于 {new Date(path.created_at).toLocaleString('zh-CN')}
                  </p>
                </div>

                <div className="flex items-center gap-2 ml-4">
                  <button
                    onClick={() => handleToggle(path.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                      path.enabled
                        ? 'bg-green-500/20 border border-green-500/30 text-green-400 hover:bg-green-500/30'
                        : 'bg-gray-500/20 border border-gray-500/30 text-gray-400 hover:bg-gray-500/30'
                    }`}
                  >
                    {path.enabled ? '已启用' : '已禁用'}
                  </button>
                  <button
                    onClick={() => handleDelete(path.id)}
                    className="p-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded-lg text-red-400 transition-colors"
                    title="删除"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
