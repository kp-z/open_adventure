# Godot Microverse "Secure Context" 错误修复

**创建日期**: 2026-03-13  
**状态**: 已完成

## 问题描述

用户通过 `http://10.12.70.37:8443/microverse` 访问 Godot Web 游戏时，持续收到错误：

```
Error
The following features required to run Godot projects on the Web are missing:
Secure Context - Check web server configuration (use HTTPS)
```

## 根本原因

在 `frontend/public/microverse/index.js` 的 `getMissingFeatures` 函数中，Secure Context 检查是**无条件执行的**：

```javascript
if (!Features.isSecureContext()) {
    missing.push('Secure Context - Check web server configuration (use HTTPS)');
}
```

即使设置了 `threads: false`，仍然会检查 Secure Context。而 `window.isSecureContext` 在非 HTTPS、非 localhost 的情况下返回 `false`。

## 解决方案

修改 `frontend/public/microverse/index.js` 第 93 行，让 Secure Context 检查只在需要线程支持时执行：

```javascript
// 修改前
if (!Features.isSecureContext()) {
    missing.push('Secure Context - Check web server configuration (use HTTPS)');
}

// 修改后
if (supportsThreads && !Features.isSecureContext()) {
    missing.push('Secure Context - Check web server configuration (use HTTPS)');
}
```

## 修改的文件

- `/Users/kp/项目/Proj/claude_manager/frontend/public/microverse/index.js` (第 93 行)

## 验证步骤

1. **清除浏览器缓存**
   - 打开开发者工具 (F12)
   - 右键点击刷新按钮，选择"清空缓存并硬性重新加载"
   - 或在 Network 标签页勾选 "Disable cache"

2. **访问游戏**
   ```
   http://10.12.70.37:8443/microverse
   ```

3. **预期结果**
   - ✅ 不再显示 "Secure Context" 错误
   - ✅ Godot 游戏开始加载
   - ✅ 可以看到加载进度条

## 技术细节

### Secure Context 的定义

根据 Web 标准，以下情况被视为 Secure Context：
- HTTPS 协议
- `localhost` 域名
- `127.0.0.1` IP 地址

### 为什么需要 Secure Context

Godot 的 Web 导出在使用多线程（SharedArrayBuffer）时需要 Secure Context，因为：
1. SharedArrayBuffer 需要 Cross-Origin Isolation
2. Cross-Origin Isolation 需要特定的 HTTP 响应头
3. 这些响应头只在 Secure Context 中有效

### 为什么禁用线程后仍需修改

虽然 `index.html` 中设置了 `threads: false`，但 `index.js` 中的 Secure Context 检查是独立的，不受 `supportsThreads` 参数控制。这是 Godot 导出模板的一个设计问题。

## 相关配置

### export_presets.cfg
```ini
variant/thread_support=false
```

### index.html
```javascript
const missing = Engine.getMissingFeatures({
    threads: false,
});
```

### Caddyfile
```
:8443 {
    reverse_proxy localhost:5173
}
```

## 备选方案

如果上述修改不work，可以考虑：

1. **使用 localhost 访问**: `http://localhost:8443/microverse`
2. **配置 HTTPS**: 使用 mkcert 生成本地信任的证书
3. **修改 Godot 导出模板**: 从源码重新编译（较复杂）

## 参考资料

- [Godot Web Export Documentation](https://docs.godotengine.org/en/stable/tutorials/export/exporting_for_web.html)
- [MDN: Secure Contexts](https://developer.mozilla.org/en-US/docs/Web/Security/Secure_Contexts)
- [SharedArrayBuffer and Cross-Origin Isolation](https://web.dev/coop-coep/)
