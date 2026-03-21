import React from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { AgentEditor } from '../components/AgentEditor';

export default function AgentCreatePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  // 从 URL 参数获取关联的 Project 信息
  const projectId = searchParams.get('projectId');
  const projectName = searchParams.get('projectName');

  const handleSave = () => {
    // 如果是从 Project 页面创建的，返回 Projects 页面
    if (projectId) {
      navigate('/projects');
    } else {
      navigate('/agents');
    }
  };

  return (
    <AgentEditor
      agent={null}
      onSave={handleSave}
      initialProjectId={projectId ? parseInt(projectId, 10) : undefined}
      initialProjectName={projectName || undefined}
    />
  );
}