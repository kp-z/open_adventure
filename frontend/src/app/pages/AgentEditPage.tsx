/**
 * Agent 编辑页面
 * 从 URL 路径获取 agent ID 并加载 Agent 数据
 */
import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { AgentEditor } from '../components/AgentEditor';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { agentsApi } from '@/lib/api';
import type { Agent } from '@/lib/api';

export default function AgentEditPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [agent, setAgent] = useState<Agent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setError('缺少 Agent ID');
      setLoading(false);
      return;
    }

    const loadAgent = async () => {
      try {
        const data = await agentsApi.get(parseInt(id, 10));
        setAgent(data);
      } catch (err) {
        console.error('Failed to load agent:', err);
        setError(err instanceof Error ? err.message : '加载 Agent 失败');
      } finally {
        setLoading(false);
      }
    };

    loadAgent();
  }, [id]);

  const handleSave = () => {
    navigate('/agents');
  };

  if (loading) {
    return <LoadingSpinner text="加载 Agent 配置..." />;
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-red-400 mb-4">{error}</p>
          <button
            onClick={() => navigate('/agents')}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-xl font-bold"
          >
            返回 Agents 列表
          </button>
        </div>
      </div>
    );
  }

  return (
    <AgentEditor
      agent={agent}
      onSave={handleSave}
    />
  );
}
