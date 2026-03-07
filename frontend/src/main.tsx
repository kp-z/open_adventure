import { createRoot } from "react-dom/client";
import App from "./app/App.tsx";
import "./styles/index.css";

// 在应用渲染前同步 theme-color，避免与页面背景色不一致
const syncInitialThemeColor = () => {
  const mode = localStorage.getItem('open-adventure-mode');
  const themeColor = mode === 'adventure' ? '#0a0a14' : '#0f111a';

  let metaThemeColor = document.querySelector('meta[name="theme-color"]');
  if (!metaThemeColor) {
    metaThemeColor = document.createElement('meta');
    metaThemeColor.setAttribute('name', 'theme-color');
    document.head.appendChild(metaThemeColor);
  }
  metaThemeColor.setAttribute('content', themeColor);
};

syncInitialThemeColor();

// 注册 Service Worker（PWA 支持）
if ('serviceWorker' in navigator) {
  if (import.meta.env.DEV) {
    navigator.serviceWorker.getRegistrations()
      .then((registrations) => Promise.all(registrations.map((registration) => registration.unregister())))
      .catch((error) => {
        console.warn('⚠️ 清理开发环境 Service Worker 失败', error);
      });
  } else {
    // 使用 try-catch 确保注册失败不影响应用启动
    try {
      // 动态导入 PWA 注册模块（避免在不支持的环境中报错）
      import('virtual:pwa-register').then(({ registerSW }) => {
        const updateSW = registerSW({
          onNeedRefresh() {
            // 提示用户有新版本（可选）
            if (confirm('发现新版本，是否立即更新？')) {
              updateSW(true);
            }
          },
          onOfflineReady() {
            console.log('✅ 应用已准备好离线使用');
          },
          onRegisterError(error) {
            console.warn('⚠️ Service Worker 注册失败，应用将正常运行', error);
          },
        });
      }).catch((error) => {
        console.warn('⚠️ PWA 模块加载失败，应用将正常运行', error);
      });
    } catch (error) {
      console.warn('⚠️ Service Worker 不可用，应用将正常运行', error);
    }
  }
}

createRoot(document.getElementById("root")!).render(<App />);
