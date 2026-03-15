import React from 'react';
import { useNavigate } from 'react-router';
import { AgentEditor } from '../components/AgentEditor';

export default function AgentCreatePage() {
  const navigate = useNavigate();

  const handleSave = () => {
    navigate('/agents');
  };

  return (
    <AgentEditor
      agent={null}
      onSave={handleSave}
    />
  );
}