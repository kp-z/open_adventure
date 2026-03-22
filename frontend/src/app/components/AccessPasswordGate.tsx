import React, { useState } from 'react';
import { Lock } from 'lucide-react';
import { apiClient } from '../../lib/api';

interface AccessPasswordGateProps {
  onSuccess: () => void;
}

/**
 * 全屏访问密码输入界面
 *
 * 当后端启用 ACCESS_PASSWORD 时显示，用户输入正确密码后
 * 将 token 存入 localStorage，后续 API 请求自动携带。
 */
export const AccessPasswordGate: React.FC<AccessPasswordGateProps> = ({ onSuccess }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) return;

    setLoading(true);
    setError('');

    try {
      const result = await apiClient.post<{ access_token: string; token_type: string }>(
        '/auth/access-token',
        { password }
      );
      localStorage.setItem('access_token', result.access_token);
      onSuccess();
    } catch {
      setError('密码错误，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950">
      <div className="w-full max-w-sm px-8">
        {/* Logo / 标题区 */}
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600/20 ring-1 ring-indigo-500/30">
            <Lock className="h-7 w-7 text-indigo-400" />
          </div>
          <h1 className="text-xl font-semibold text-white">Open Adventure</h1>
          <p className="text-center text-sm text-gray-400">
            此实例受密码保护，请输入访问密码继续
          </p>
        </div>

        {/* 表单 */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="访问密码"
              autoFocus
              className="w-full rounded-lg border border-gray-700 bg-gray-900 px-4 py-3 text-sm text-white placeholder-gray-500 outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          {error && (
            <p className="text-center text-sm text-red-400">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || !password.trim()}
            className="w-full rounded-lg bg-indigo-600 px-4 py-3 text-sm font-medium text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? '验证中...' : '进入'}
          </button>
        </form>
      </div>
    </div>
  );
};
