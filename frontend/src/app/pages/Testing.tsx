import React, { useState, useEffect } from 'react';
import { Play, CheckCircle, XCircle, Clock, AlertCircle, RefreshCw, Folder, FileText } from 'lucide-react';

interface TestNode {
  id: string;
  name: string;
  type: 'category' | 'test_suite' | 'test_case';
  children?: TestNode[];
  enabled: boolean;
  test_file?: string;
  test_command?: string;
  last_execution?: {
    id: number;
    status: string;
    duration: number;
    passed: number;
    failed: number;
    total: number;
    started_at: string;
  };
}

interface TestExecution {
  id: number;
  node_id: string;
  status: string;
  started_at: string;
  completed_at?: string;
  duration?: number;
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  output?: string;
  error_message?: string;
}

export default function Testing() {
  const [testTree, setTestTree] = useState<TestNode[]>([]);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [running, setRunning] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTestTree();
  }, []);

  const loadTestTree = async () => {
    try {
      const response = await fetch('/api/testing/tree');
      const data = await response.json();
      setTestTree(data.tree);
    } catch (error) {
      console.error('Failed to load test tree:', error);
    } finally {
      setLoading(false);
    }
  };

  const runTest = async (nodeId: string) => {
    setRunning(prev => new Set(prev).add(nodeId));

    try {
      const response = await fetch(`/api/testing/run/${nodeId}`, {
        method: 'POST'
      });
      const result = await response.json();

      // 重新加载测试树以更新状态
      await loadTestTree();
    } catch (error) {
      console.error('Failed to run test:', error);
    } finally {
      setRunning(prev => {
        const next = new Set(prev);
        next.delete(nodeId);
        return next;
      });
    }
  };

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'running':
        return <Clock className="text-blue-500 animate-spin" size={16} />;
      case 'passed':
        return <CheckCircle className="text-green-500" size={16} />;
      case 'failed':
        return <XCircle className="text-red-500" size={16} />;
      case 'error':
        return <AlertCircle className="text-orange-500" size={16} />;
      default:
        return null;
    }
  };

  const renderTestNode = (node: TestNode, level: number = 0) => {
    const isRunning = running.has(node.id);
    const isSelected = selectedNode === node.id;

    return (
      <div key={node.id} style={{ marginLeft: `${level * 20}px` }}>
        <div
          className={`flex items-center gap-2 p-2 rounded cursor-pointer hover:bg-white/5 ${
            isSelected ? 'bg-blue-500/20 border-l-2 border-blue-500' : ''
          }`}
          onClick={() => setSelectedNode(node.id)}
        >
          {node.type === 'category' ? (
            <Folder size={16} className="text-gray-400" />
          ) : (
            <FileText size={16} className="text-gray-400" />
          )}

          <span className="flex-1 text-sm">{node.name}</span>

          {node.last_execution && getStatusIcon(node.last_execution.status)}

          {node.type !== 'category' && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                runTest(node.id);
              }}
              disabled={isRunning}
              className="p-1 rounded hover:bg-white/10 disabled:opacity-50"
            >
              {isRunning ? (
                <RefreshCw size={14} className="animate-spin" />
              ) : (
                <Play size={14} />
              )}
            </button>
          )}
        </div>

        {node.children && node.children.map(child => renderTestNode(child, level + 1))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-400">加载测试树...</div>
      </div>
    );
  }

  if (!loading && testTree.length === 0) {
    return (
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">测试功能</h1>
        <div className="bg-white/5 rounded-xl p-8 text-center">
          <p className="text-gray-400">暂无测试数据</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* 页面标题 */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">测试功能</h1>
        <p className="text-gray-400">管理和执行项目测试</p>
      </div>

      {/* 测试内容 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 左侧：测试树 */}
        <div className="bg-white/5 rounded-xl p-4 border border-white/10">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold">测试功能树</h3>
            <button
              onClick={loadTestTree}
              className="p-2 rounded hover:bg-white/10"
              title="刷新测试树"
            >
              <RefreshCw size={16} />
            </button>
          </div>

          <div className="space-y-1 max-h-[600px] overflow-y-auto">
            {testTree.map(node => renderTestNode(node))}
          </div>
        </div>

        {/* 右侧：测试详情 */}
        <div className="bg-white/5 rounded-xl p-4 border border-white/10">
          {selectedNode ? (
            <TestDetails nodeId={selectedNode} />
          ) : (
            <div className="flex items-center justify-center h-full text-gray-400">
              选择一个测试节点查看详情
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TestDetails({ nodeId }: { nodeId: string }) {
  const [node, setNode] = useState<any>(null);
  const [executions, setExecutions] = useState<TestExecution[]>([]);
  const [selectedExecution, setSelectedExecution] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadNodeDetails();
  }, [nodeId]);

  const loadNodeDetails = async () => {
    try {
      const response = await fetch(`/api/testing/nodes/${nodeId}`);
      const data = await response.json();
      setNode(data);
      setExecutions(data.recent_executions || []);
    } catch (error) {
      console.error('Failed to load node details:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-gray-400">加载中...</div>;
  }

  if (!node) {
    return <div className="text-gray-400">节点不存在</div>;
  }

  return (
    <div className="space-y-4">
      {/* 节点信息 */}
      <div>
        <h3 className="text-lg font-bold mb-2">{node.name}</h3>

        <div className="space-y-1 text-sm">
          <div className="flex gap-2">
            <span className="text-gray-400">类型:</span>
            <span>{node.type}</span>
          </div>

          {node.test_file && (
            <div className="flex gap-2">
              <span className="text-gray-400">文件:</span>
              <span className="font-mono text-xs">{node.test_file}</span>
            </div>
          )}

          {node.test_command && (
            <div className="flex gap-2">
              <span className="text-gray-400">命令:</span>
              <span className="font-mono text-xs">{node.test_command}</span>
            </div>
          )}
        </div>
      </div>

      {/* 执行历史 */}
      {executions.length > 0 && (
        <div>
          <h4 className="font-bold mb-2">执行历史</h4>

          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {executions.map(execution => (
              <div
                key={execution.id}
                className={`p-3 border rounded cursor-pointer hover:bg-white/5 ${
                  selectedExecution === execution.id ? 'border-blue-500 bg-blue-500/10' : 'border-white/10'
                }`}
                onClick={() => setSelectedExecution(execution.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {execution.status === 'passed' && (
                      <CheckCircle className="text-green-500" size={16} />
                    )}
                    {execution.status === 'failed' && (
                      <XCircle className="text-red-500" size={16} />
                    )}
                    {execution.status === 'running' && (
                      <Clock className="text-blue-500" size={16} />
                    )}

                    <div>
                      <div className="text-sm font-medium">{execution.status}</div>
                      <div className="text-xs text-gray-400">
                        {new Date(execution.started_at).toLocaleString()}
                      </div>
                    </div>
                  </div>

                  <div className="text-right text-xs">
                    <div>
                      <span className="text-green-500">{execution.passed}</span>
                      {' / '}
                      <span className="text-red-500">{execution.failed}</span>
                      {' / '}
                      <span className="text-gray-400">{execution.total}</span>
                    </div>
                    {execution.duration && (
                      <div className="text-gray-400">
                        {(execution.duration / 1000).toFixed(2)}s
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 执行详情 */}
      {selectedExecution && (
        <ExecutionDetails executionId={selectedExecution} />
      )}
    </div>
  );
}

function ExecutionDetails({ executionId }: { executionId: number }) {
  const [execution, setExecution] = useState<TestExecution | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadExecutionDetails();
  }, [executionId]);

  const loadExecutionDetails = async () => {
    try {
      const response = await fetch(`/api/testing/executions/${executionId}`);
      const data = await response.json();
      setExecution(data);
    } catch (error) {
      console.error('Failed to load execution details:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-gray-400 text-sm">加载执行详情...</div>;
  }

  if (!execution) {
    return null;
  }

  return (
    <div>
      <h4 className="font-bold mb-2">执行输出</h4>

      {execution.output && (
        <div className="bg-black/50 text-gray-100 p-3 rounded font-mono text-xs overflow-x-auto max-h-[200px] overflow-y-auto">
          <pre className="whitespace-pre-wrap">{execution.output}</pre>
        </div>
      )}

      {execution.error_message && (
        <div className="mt-2 p-3 bg-red-500/10 border border-red-500/20 rounded">
          <div className="font-bold text-red-400 text-sm mb-1">错误信息</div>
          <div className="text-red-300 text-xs">{execution.error_message}</div>
        </div>
      )}
    </div>
  );
}
