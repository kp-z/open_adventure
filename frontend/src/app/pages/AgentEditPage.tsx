import React, { useState, useEffect } from 'react';
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
    const fetchAgent = async () => {
      if (!id) {
        setError('Agent ID is required');
        setLoading(false);
        return;
      }

      try {
        const response = await agentsApi.list({ limit: 1000 });
        const foundAgent = response.items.find(a => a.id.toString() === id);

        if (!foundAgent) {
          setError('Agent not found');
        } else {
          setAgent(foundAgent);
        }
      } catch (err) {
        console.error('Failed to fetch agent:', err);
        setError('Failed to load agent');
      } finally {
        setLoading(false);
      }
    };

    fetchAgent();
  }, [id]);

  const handleSave = () => {
    navigate('/agents');
  };

  if (loading) {
    return <LoadingSpinner text="加载子代理..." />;
  }

  if (error || !agent) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <h2 className="text-xl font-bold text-red-400 mb-2">错误</h2>
          <p className="text-gray-400 mb-4">{error || '未找到子代理'}</p>
          <button
            onClick={handleBack}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
          >
            返回列表
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