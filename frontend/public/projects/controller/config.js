// Controller 配置管理
class ControllerConfig {
  constructor() {
    this.config = this.loadConfig();
  }

  loadConfig() {
    const saved = localStorage.getItem('controller_config');
    return saved ? JSON.parse(saved) : this.getDefaultConfig();
  }

  saveConfig() {
    localStorage.setItem('controller_config', JSON.stringify(this.config));
  }

  getBinding(id) {
    return this.config.bindings.find(b => b.id === id);
  }

  updateBinding(id, data) {
    const index = this.config.bindings.findIndex(b => b.id === id);
    if (index >= 0) {
      this.config.bindings[index] = { ...this.config.bindings[index], ...data };
    } else {
      this.config.bindings.push({ id, ...data });
    }
    this.saveConfig();
  }

  deleteBinding(id) {
    this.config.bindings = this.config.bindings.filter(b => b.id !== id);
    this.saveConfig();
  }

  getDefaultConfig() {
    return {
      version: "1.0",
      bindings: [
        {
          id: "button-rec",
          type: "button",
          name: "启动后端",
          description: "启动 FastAPI 后端服务",
          action: {
            type: "shell",
            command: "cd ~/项目/Proj/open_adventure/backend && ./start.sh"
          },
          enabled: true
        },
        {
          id: "button-play",
          type: "button",
          name: "启动前端",
          description: "启动 React 前端开发服务器",
          action: {
            type: "shell",
            command: "cd ~/项目/Proj/open_adventure/frontend && npm run dev"
          },
          enabled: true
        },
        {
          id: "button-loop",
          type: "button",
          name: "运行测试",
          description: "执行后端单元测试",
          action: {
            type: "shell",
            command: "cd ~/项目/Proj/open_adventure/backend && pytest"
          },
          enabled: true
        }
      ]
    };
  }
}

// 初始化配置
const config = new ControllerConfig();

// 可配置控制器列表（25 个，不包括 Setting 按钮）
const AVAILABLE_CONTROLLERS = [
  // 按钮
  { id: 'button-rec', type: 'button', label: 'REC' },
  { id: 'button-play', type: 'button', label: 'PLAY' },
  { id: 'button-loop', type: 'button', label: 'LOOP' },
  { id: 'button-stop', type: 'button', label: 'STOP' },
  { id: 'button-m1', type: 'button', label: 'M1' },
  { id: 'button-m2', type: 'button', label: 'M2' },
  { id: 'button-forward', type: 'button', label: 'FORWARD' },
  { id: 'button-shift', type: 'button', label: 'SHIFT' },
  // 推子
  { id: 'fader-1', type: 'fader', label: 'Fader 1' },
  { id: 'fader-2', type: 'fader', label: 'Fader 2' },
  { id: 'fader-3', type: 'fader', label: 'Fader 3' },
  { id: 'fader-4', type: 'fader', label: 'Fader 4' },
  { id: 'fader-5', type: 'fader', label: 'Fader 5' },
  { id: 'fader-6', type: 'fader', label: 'Fader 6' },
  { id: 'fader-7', type: 'fader', label: 'Fader 7' },
  { id: 'fader-8', type: 'fader', label: 'Fader 8' },
  // 旋钮（不包括 Setting 按钮）
  { id: 'knob-1', type: 'knob', label: 'Pan' },
  { id: 'knob-2', type: 'knob', label: 'Tilt' },
  { id: 'knob-3', type: 'knob', label: 'Dimmer' },
  { id: 'knob-4', type: 'knob', label: 'FX Rate' },
];

// 配置管理器状态
let currentFilters = {
  search: '',
  type: '',
  status: ''
};

// Toast 提示
function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

// 配置对话框
function openConfigModal(id) {
  const binding = config.getBinding(id) || {
    id,
    type: getTypeFromId(id),
    enabled: true
  };

  document.getElementById('config-target').textContent = id;
  document.getElementById('config-name').value = binding.name || '';
  document.getElementById('config-description').value = binding.description || '';
  document.getElementById('config-command').value = binding.action?.command || '';
  document.getElementById('config-enabled').checked = binding.enabled !== false;

  document.getElementById('config-modal').classList.remove('hidden');
}

function closeConfigModal() {
  document.getElementById('config-modal').classList.add('hidden');
}

function getTypeFromId(id) {
  if (id.startsWith('button-')) return 'button';
  if (id.startsWith('fader-')) return 'fader';
  if (id.startsWith('knob-')) return 'knob';
  return 'unknown';
}

// 执行绑定
function executeBinding(id) {
  const binding = config.getBinding(id);
  if (!binding || !binding.enabled) {
    showToast('未配置或已禁用', 'error');
    return;
  }

  const command = binding.action?.command;
  if (!command) {
    showToast('未配置命令', 'error');
    return;
  }

  // 复制到剪贴板
  navigator.clipboard.writeText(command).then(() => {
    showToast(`已复制: ${binding.name}`, 'success');
  }).catch(() => {
    showToast('复制失败', 'error');
  });
}

// 更新控制器标签
function updateControllerLabels() {
  config.config.bindings.forEach(binding => {
    const el = document.getElementById(binding.id) ||
               document.querySelector(`[data-id="${binding.id}"]`);
    if (!el) return;

    // 添加配置状态类
    el.classList.add('configured');
    if (!binding.enabled) {
      el.classList.add('disabled');
    }

    // 添加标签（如果不存在）
    let label = el.parentElement.querySelector('.binding-label');
    if (!label) {
      label = document.createElement('div');
      label.className = 'binding-label';
      el.parentElement.style.position = 'relative';
      el.parentElement.appendChild(label);
    }
    label.textContent = binding.name || binding.id;
  });
}

// 配置管理器函数
function openConfigManager() {
  document.getElementById('config-manager-modal').classList.remove('hidden');
  renderControllerPreview();
  renderConfigList();
}

function closeConfigManager() {
  document.getElementById('config-manager-modal').classList.add('hidden');
}

function renderControllerPreview() {
  const container = document.getElementById('controller-preview');
  container.textContent = '';

  AVAILABLE_CONTROLLERS.forEach(controller => {
    const binding = config.getBinding(controller.id);
    const item = document.createElement('div');
    item.className = 'preview-item';
    if (binding) {
      item.classList.add('configured');
    }
    item.textContent = `${controller.label} (${controller.id})`;
    item.addEventListener('click', () => {
      openConfigModal(controller.id);
    });
    container.appendChild(item);
  });
}

function renderConfigList() {
  const container = document.getElementById('config-list');
  container.textContent = '';

  // 获取所有配置
  let bindings = config.config.bindings;

  // 应用过滤
  if (currentFilters.search) {
    const search = currentFilters.search.toLowerCase();
    bindings = bindings.filter(b =>
      b.id.toLowerCase().includes(search) ||
      (b.name && b.name.toLowerCase().includes(search)) ||
      (b.description && b.description.toLowerCase().includes(search))
    );
  }

  if (currentFilters.type) {
    bindings = bindings.filter(b => b.type === currentFilters.type);
  }

  if (currentFilters.status) {
    const enabled = currentFilters.status === 'enabled';
    bindings = bindings.filter(b => b.enabled === enabled);
  }

  // 渲染配置项
  if (bindings.length === 0) {
    const emptyState = document.createElement('div');
    emptyState.className = 'empty-state';

    const icon = document.createElement('div');
    icon.className = 'empty-state-icon';
    icon.textContent = '📋';

    const text = document.createElement('div');
    text.className = 'empty-state-text';
    text.textContent = '暂无配置';

    emptyState.appendChild(icon);
    emptyState.appendChild(text);
    container.appendChild(emptyState);
    return;
  }

  bindings.forEach(binding => {
    const item = document.createElement('div');
    item.className = 'config-item';

    const header = document.createElement('div');
    header.className = 'config-item-header';

    const id = document.createElement('div');
    id.className = 'config-item-id';
    id.textContent = binding.id;

    const actions = document.createElement('div');
    actions.className = 'config-item-actions';

    const editBtn = document.createElement('button');
    editBtn.className = 'config-item-btn edit';
    editBtn.textContent = '编辑';
    editBtn.addEventListener('click', () => {
      openConfigModal(binding.id);
    });

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'config-item-btn delete';
    deleteBtn.textContent = '删除';
    deleteBtn.addEventListener('click', () => {
      if (confirm(`确定删除 ${binding.id} 的配置吗？`)) {
        config.deleteBinding(binding.id);
        updateControllerLabels();
        renderConfigList();
        renderControllerPreview();
        showToast('配置已删除', 'success');
      }
    });

    actions.appendChild(editBtn);
    actions.appendChild(deleteBtn);
    header.appendChild(id);
    header.appendChild(actions);

    const name = document.createElement('div');
    name.className = 'config-item-name';
    name.textContent = binding.name || '未命名';

    const description = document.createElement('div');
    description.className = 'config-item-description';
    description.textContent = binding.description || '无描述';

    const command = document.createElement('div');
    command.className = 'config-item-command';
    command.textContent = binding.action?.command || '无命令';

    const status = document.createElement('div');
    status.className = `config-item-status ${binding.enabled ? 'enabled' : 'disabled'}`;
    status.textContent = binding.enabled ? '✓ 已启用' : '✗ 已禁用';

    item.appendChild(header);
    item.appendChild(name);
    item.appendChild(description);
    item.appendChild(command);
    item.appendChild(status);

    container.appendChild(item);
  });
}

// 页面加载时初始化
window.addEventListener('DOMContentLoaded', () => {
  // 更新标签
  updateControllerLabels();

  // 绑定配置管理按钮（右上角 Setting 按钮）
  const settingBtn = document.getElementById('setting-btn');
  if (settingBtn) {
    settingBtn.addEventListener('click', openConfigManager);
  }

  // 绑定配置管理弹窗按钮
  document.getElementById('close-manager-btn').addEventListener('click', closeConfigManager);
  document.getElementById('add-config-btn').addEventListener('click', () => {
    // 打开配置对话框，不指定 ID（让用户选择）
    openConfigModal('');
  });

  // 绑定搜索和过滤
  document.getElementById('search-input').addEventListener('input', (e) => {
    currentFilters.search = e.target.value;
    renderConfigList();
  });

  document.getElementById('type-filter').addEventListener('change', (e) => {
    currentFilters.type = e.target.value;
    renderConfigList();
  });

  document.getElementById('status-filter').addEventListener('change', (e) => {
    currentFilters.status = e.target.value;
    renderConfigList();
  });

  // 绑定右键菜单
  document.querySelectorAll('.btn-round, .fader-cap, .knob-cap').forEach(el => {
    el.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      const id = el.id || el.dataset.id;
      openConfigModal(id);
    });
  });

  // 绑定左键执行（仅按钮）
  document.querySelectorAll('.btn-round').forEach(btn => {
    const originalClick = btn.onclick;
    btn.addEventListener('click', (e) => {
      if (e.button === 0) { // 左键
        executeBinding(btn.id);
      }
      if (originalClick) originalClick.call(btn, e);
    });
  });

  // 配置表单提交
  document.getElementById('config-form').addEventListener('submit', (e) => {
    e.preventDefault();

    const id = document.getElementById('config-target').textContent;
    const data = {
      name: document.getElementById('config-name').value,
      description: document.getElementById('config-description').value,
      action: {
        type: 'shell',
        command: document.getElementById('config-command').value
      },
      enabled: document.getElementById('config-enabled').checked
    };

    config.updateBinding(id, data);
    updateControllerLabels();
    closeConfigModal();
    showToast('配置已保存', 'success');

    // 如果配置管理器打开，刷新列表
    if (!document.getElementById('config-manager-modal').classList.contains('hidden')) {
      renderConfigList();
      renderControllerPreview();
    }
  });

  // 测试按钮
  document.getElementById('test-btn').addEventListener('click', () => {
    const command = document.getElementById('config-command').value;
    if (!command) {
      showToast('请先输入命令', 'error');
      return;
    }
    navigator.clipboard.writeText(command).then(() => {
      showToast('命令已复制到剪贴板', 'success');
    }).catch(() => {
      showToast('复制失败', 'error');
    });
  });

  // 删除按钮
  document.getElementById('delete-btn').addEventListener('click', () => {
    const id = document.getElementById('config-target').textContent;
    if (confirm(`确定删除 ${id} 的配置吗？`)) {
      config.deleteBinding(id);
      updateControllerLabels();
      closeConfigModal();
      showToast('配置已删除', 'success');

      // 如果配置管理器打开，刷新列表
      if (!document.getElementById('config-manager-modal').classList.contains('hidden')) {
        renderConfigList();
        renderControllerPreview();
      }
    }
  });

  // 取消按钮
  document.getElementById('cancel-btn').addEventListener('click', closeConfigModal);

  // 点击模态框背景关闭
  document.getElementById('config-modal').addEventListener('click', (e) => {
    if (e.target.id === 'config-modal') {
      closeConfigModal();
    }
  });

  // 点击配置管理器背景关闭
  document.getElementById('config-manager-modal').addEventListener('click', (e) => {
    if (e.target.id === 'config-manager-modal') {
      closeConfigManager();
    }
  });
});
