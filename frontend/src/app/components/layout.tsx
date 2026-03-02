import React from "react";
import { NavLink, Outlet, useNavigate, useLocation } from "react-router";
import {
  LayoutDashboard,
  Wrench,
  Users,
  UsersRound,
  GitBranch,
  History,
  Settings,
  Zap,
  Sword,
  Shield,
  BookOpen,
  Map,
  Trophy,
  Search,
  User,
  Menu,
  X,
  Target,
  Sparkles,
  PanelLeftClose,
  PanelLeftOpen,
  ChevronLeft,
  ChevronRight,
  Terminal,
  Network,
  Activity,
  Loader,
  Bell,
} from "lucide-react";
import { useMode } from "../contexts/ModeContext";
import { useTranslation } from "../hooks/useTranslation";
import { motion, AnimatePresence } from "motion/react";
import { ActionButton } from "./ui-shared";
import { useExecutionContext } from "../contexts/ExecutionContext";
import { useNotifications } from "../contexts/NotificationContext";

const Navigation = ({ collapsed = false }: { collapsed?: boolean }) => {
  const { mode } = useMode();
  const { t } = useTranslation();

  const navItems = [
    {
      name: t("dashboard"),
      path: "/",
      icon: mode === "adventure" ? Sword : LayoutDashboard,
    },
    {
      name: t("skills"),
      path: "/skills",
      icon: mode === "adventure" ? BookOpen : Wrench,
    },
    {
      name: t("agents"),
      path: "/agents",
      icon: mode === "adventure" ? Shield : Users,
    },
    {
      name: t("teams"),
      path: "/teams",
      icon: mode === "adventure" ? UsersRound : Network,
    },
    {
      name: t("workflows"),
      path: "/workflows",
      icon: mode === "adventure" ? Map : GitBranch,
    },
    {
      name: "OPP",
      path: "/workflows/opp",
      icon: Target,
    },
    {
      name: t("executions"),
      path: "/executions",
      icon: mode === "adventure" ? Trophy : History,
    },
    {
      name: t("terminal"),
      path: "/terminal",
      icon: Terminal,
    },
  ];

  return (
    <nav className={`flex flex-col gap-2 ${collapsed ? 'p-2' : 'p-4'}`}>
      {navItems.map((item) => (
        <NavLink
          key={item.path}
          to={item.path}
          title={collapsed ? item.name : undefined}
          className={({ isActive }) => `
            flex items-center ${collapsed ? 'justify-center' : 'gap-3'} ${collapsed ? 'px-3' : 'px-4'} py-3 rounded-xl transition-all
            ${
              isActive
                ? mode === "adventure"
                  ? "bg-yellow-500/20 text-yellow-400 border border-yellow-500/50 shadow-[0_0_10px_rgba(234,179,8,0.2)]"
                  : "bg-blue-600/20 text-blue-400 border border-blue-500/30"
                : "text-gray-400 hover:bg-white/5 hover:text-white"
            }
          `}
        >
          <item.icon size={20} />
          {!collapsed && (
            <span className="font-medium whitespace-nowrap overflow-hidden text-ellipsis">
              {item.name}
            </span>
          )}
        </NavLink>
      ))}
      <div className={`mt-auto pt-4 border-t border-white/10 ${collapsed ? 'mx-1' : ''}`}>
        <NavLink
          to="/settings"
          title={collapsed ? t("settings") : undefined}
          className={({ isActive }) => `
            flex items-center ${collapsed ? 'justify-center' : 'gap-3'} ${collapsed ? 'px-3' : 'px-4'} py-3 rounded-xl transition-all
            ${
              isActive
                ? mode === "adventure"
                  ? "bg-yellow-500/20 text-yellow-400"
                  : "bg-blue-600/20 text-blue-400"
                : "text-gray-400 hover:bg-white/5 hover:text-white"
            }
          `}
        >
          <Settings size={20} />
          {!collapsed && <span className="font-medium">{t("settings")}</span>}
        </NavLink>
      </div>
    </nav>
  );
};

export const Layout = () => {
  const { mode, toggleMode, lang } = useMode();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { runningExecutions } = useExecutionContext();
  const { notifications, removeNotification } = useNotifications();
  // 检测是否为移动端，移动端默认隐藏侧边栏
  const [isMobile, setIsMobile] = React.useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(true);
  const [isSearchOpen, setIsSearchOpen] = React.useState(false);
  const [showExecutions, setShowExecutions] = React.useState(false);
  const [showNotifications, setShowNotifications] = React.useState(false);
  const searchInputRef = React.useRef<HTMLInputElement>(null);
  const [canGoBack, setCanGoBack] = React.useState(false);
  const [canGoForward, setCanGoForward] = React.useState(false);
  const [activeBottomMenu, setActiveBottomMenu] = React.useState<string | null>(null);

  // 定义导航分组
  const agentMenuItems = [
    {
      name: t("skills"),
      path: "/skills",
      icon: mode === "adventure" ? BookOpen : Wrench,
    },
    {
      name: t("agents"),
      path: "/agents",
      icon: mode === "adventure" ? Shield : Users,
    },
    {
      name: t("teams"),
      path: "/teams",
      icon: mode === "adventure" ? UsersRound : Network,
    },
    {
      name: t("terminal"),
      path: "/terminal",
      icon: Terminal,
    },
  ];

  const workflowMenuItems = [
    {
      name: t("workflows"),
      path: "/workflows",
      icon: mode === "adventure" ? Map : GitBranch,
    },
    {
      name: t("executions"),
      path: "/executions",
      icon: mode === "adventure" ? Trophy : History,
    },
  ];

  // 获取当前激活的菜单项
  const getActiveMenuItem = (items: typeof agentMenuItems) => {
    return items.find(item => item.path === location.pathname);
  };

  const activeAgentItem = getActiveMenuItem(agentMenuItems);
  const activeWorkflowItem = getActiveMenuItem(workflowMenuItems);

  // 动态更新浏览器标签栏颜色
  React.useEffect(() => {
    const themeColor = mode === "adventure" ? "#0a0a14" : "#0f111a";

    // 更新 meta theme-color
    let metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (!metaThemeColor) {
      metaThemeColor = document.createElement('meta');
      metaThemeColor.setAttribute('name', 'theme-color');
      document.head.appendChild(metaThemeColor);
    }
    metaThemeColor.setAttribute('content', themeColor);
  }, [mode]);

  // 检测移动端并设置侧边栏初始状态
  React.useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768; // md breakpoint
      setIsMobile(mobile);
      // 仅在首次加载时根据设备类型设置侧边栏状态
      if (mobile && isSidebarOpen) {
        setIsSidebarOpen(false);
      }
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []); // 空依赖数组，仅在组件挂载时执行

  // 检查是否是 Terminal 页面
  const isTerminalPage = location.pathname === '/terminal';

  // 监听浏览器历史变化
  React.useEffect(() => {
    const updateNavigationState = () => {
      setCanGoBack(window.history.length > 1);
      // 注意：浏览器不提供直接检测 forward 的 API，这里简化处理
      setCanGoForward(false);
    };

    updateNavigationState();
    window.addEventListener('popstate', updateNavigationState);
    return () => window.removeEventListener('popstate', updateNavigationState);
  }, []);

  const handleGoBack = () => {
    if (canGoBack) {
      navigate(-1);
    }
  };

  const handleGoForward = () => {
    navigate(1);
  };

  // 点击外部关闭搜索框
  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (isSearchOpen && searchInputRef.current && !searchInputRef.current.parentElement?.contains(e.target as Node)) {
        setIsSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isSearchOpen]);

  // 搜索框展开时自动聚焦
  React.useEffect(() => {
    if (isSearchOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isSearchOpen]);

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (seconds < 60) return `${seconds}秒前`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}分钟前`;
    return `${Math.floor(seconds / 3600)}小时前`;
  };

  const handleExecutionClick = (execution: any) => {
    if (execution.execution_type === 'agent_test') {
      navigate('/agents');
    } else {
      navigate('/workflows');
    }
    setShowExecutions(false);
    setIsSidebarOpen(false);
  };

  return (
    <div
      className={`min-h-screen flex text-white overflow-hidden transition-colors duration-500 ${mode === "adventure" ? "bg-[#0a0a14]" : "bg-[#0f111a]"}`}
    >
      {/* 桌面端侧边栏 - 仅在 ≥md 显示，保持原样 */}
      <aside
        className={`
        ${isSidebarOpen ? "w-72" : "w-20"}
        hidden md:flex flex-col border-r border-white/5 transition-all duration-300 relative z-50
        ${mode === "adventure" ? "bg-[#121225]" : "bg-[#0a0b14]/80 backdrop-blur-2xl"}
      `}
      >
        {/* Logo / Mode Switcher */}
        <button
          onClick={toggleMode}
          className={`
            h-20 flex items-center px-6 gap-4 group transition-all duration-500 hover:bg-white/5
            ${mode === "adventure" ? "border-b border-yellow-500/20" : "border-b border-blue-500/20"}
          `}
        >
          <div
            className={`
              w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500 group-hover:scale-110 shadow-lg relative overflow-hidden
              ${
                mode === "adventure"
                  ? "bg-gradient-to-br from-yellow-400 to-orange-600 shadow-yellow-500/20"
                  : "bg-blue-500/10 backdrop-blur-xl border border-blue-400/30 shadow-blue-500/10"
              }
            `}
          >
            {mode === "adventure" ? (
              <>
                <div className="absolute inset-0 flex items-center justify-center opacity-40">
                   <Sparkles className="w-10 h-10 scale-125 rotate-12" />
                </div>
                <div className="relative z-10 flex items-center justify-center">
                  <Sword
                    size={24}
                    className="text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]"
                  />
                  <motion.div
                    animate={{ 
                      scale: [1, 1.5, 1],
                      opacity: [0.3, 0.8, 0.3],
                      rotate: [0, 90, 180] 
                    }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="absolute -top-1 -right-1 text-yellow-200"
                  >
                    <Sparkles size={12} fill="currentColor" />
                  </motion.div>
                </div>
              </>
            ) : (
              <div className="relative">
                <Zap
                  size={24}
                  fill="currentColor"
                  className="text-blue-400 drop-shadow-[0_0_15px_rgba(96,165,250,0.6)] animate-pulse"
                />
                <div className="absolute inset-0 bg-blue-400/20 blur-xl scale-150 rounded-full" />
              </div>
            )}
          </div>

          {isSidebarOpen && (
            <div className="flex flex-col items-start overflow-hidden">
              <motion.div
                key={`${mode}-${lang}`}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex flex-col"
              >
                <span
                  className={`
                  text-lg font-black tracking-tighter uppercase italic leading-[0.85]
                  ${
                    mode === "adventure"
                      ? "text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500"
                      : "text-white"
                  }
                `}
                >
                  Claude
                </span>
                <span
                  className={`
                  text-sm font-black tracking-[0.2em] uppercase leading-tight
                  ${
                    mode === "adventure"
                      ? "text-yellow-500/80 italic"
                      : "text-blue-500/80"
                  }
                `}
                >
                  {mode === "adventure"
                    ? lang === "zh"
                      ? "大冒险"
                      : "Adventure"
                    : lang === "zh"
                      ? "管理器"
                      : "Manager"}
                </span>
              </motion.div>
            </div>
          )}
        </button>

        <Navigation collapsed={!isSidebarOpen} />
      </aside>

      {/* 移动端抽屉侧边栏 - 仅在 <md 显示 */}
      <AnimatePresence>
        {isSidebarOpen && (
          <>
            {/* 遮罩层 */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSidebarOpen(false)}
              className="md:hidden fixed inset-0 bg-black/50 z-40"
            />
            {/* 抽屉侧边栏 */}
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'tween', duration: 0.3 }}
              className={`
                md:hidden fixed inset-y-0 left-0 w-64 z-50 border-r border-white/5 flex flex-col
                ${mode === "adventure" ? "bg-[#121225]" : "bg-[#0a0b14]"}
              `}
            >
              {/* Logo / Mode Switcher */}
              <button
                onClick={toggleMode}
                className={`
                  h-14 flex items-center px-4 gap-3 group transition-all duration-500 hover:bg-white/5
                  ${mode === "adventure" ? "border-b border-yellow-500/20" : "border-b border-blue-500/20"}
                `}
              >
                <div
                  className={`
                    w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-500 group-hover:scale-110 shadow-lg relative overflow-hidden
                    ${
                      mode === "adventure"
                        ? "bg-gradient-to-br from-yellow-400 to-orange-600 shadow-yellow-500/20"
                        : "bg-blue-500/10 backdrop-blur-xl border border-blue-400/30 shadow-blue-500/10"
                    }
                  `}
                >
                  {mode === "adventure" ? (
                    <>
                      <div className="absolute inset-0 flex items-center justify-center opacity-40">
                        <Sparkles className="w-8 h-8 scale-125 rotate-12" />
                      </div>
                      <div className="relative z-10 flex items-center justify-center">
                        <Sword
                          size={20}
                          className="text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]"
                        />
                      </div>
                    </>
                  ) : (
                    <div className="relative">
                      <Zap
                        size={20}
                        fill="currentColor"
                        className="text-blue-400 drop-shadow-[0_0_15px_rgba(96,165,250,0.6)] animate-pulse"
                      />
                      <div className="absolute inset-0 bg-blue-400/20 blur-xl scale-150 rounded-full" />
                    </div>
                  )}
                </div>

                <div className="flex flex-col items-start overflow-hidden">
                  <span
                    className={`
                    text-base font-black tracking-tighter uppercase italic leading-[0.85]
                    ${
                      mode === "adventure"
                        ? "text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500"
                        : "text-white"
                    }
                  `}
                  >
                    Claude
                  </span>
                  <span
                    className={`
                    text-xs font-black tracking-[0.2em] uppercase leading-tight
                    ${
                      mode === "adventure"
                        ? "text-yellow-500/80 italic"
                        : "text-blue-500/80"
                    }
                  `}
                  >
                    {mode === "adventure"
                      ? lang === "zh"
                        ? "大冒险"
                        : "Adventure"
                      : lang === "zh"
                        ? "管理器"
                        : "Manager"}
                  </span>
                </div>
              </button>

              <Navigation collapsed={false} />

              {/* 移动端消息按钮 - 显示运行中的任务 */}
              {runningExecutions.length > 0 && (
                <div className="px-4 pb-4">
                  <button
                    onClick={() => setShowExecutions(!showExecutions)}
                    className={`
                      w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl transition-all
                      ${showExecutions
                        ? mode === "adventure"
                          ? "bg-yellow-500/20 text-yellow-400 border border-yellow-500/50"
                          : "bg-blue-600/20 text-blue-400 border border-blue-500/30"
                        : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white"
                      }
                    `}
                  >
                    <div className="flex items-center gap-3">
                      <Activity size={20} />
                      <span className="font-medium">运行中的任务</span>
                    </div>
                    <span className="bg-red-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
                      {runningExecutions.length}
                    </span>
                  </button>

                  {/* 任务列表 */}
                  <AnimatePresence>
                    {showExecutions && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-2 space-y-2 overflow-hidden"
                      >
                        {runningExecutions.map(execution => (
                          <button
                            key={execution.id}
                            onClick={() => handleExecutionClick(execution)}
                            className="w-full text-left p-3 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10"
                          >
                            <div className="flex items-center gap-2 mb-1">
                              <Loader size={14} className="animate-spin text-blue-400" />
                              <p className="text-xs font-medium truncate">
                                {execution.execution_type === 'agent_test' ? `Agent 运行 #${execution.agent_id}` : `Workflow #${execution.workflow_id}`}
                              </p>
                            </div>
                            <p className="text-[10px] text-gray-500">
                              开始于 {execution.started_at ? formatRelativeTime(execution.started_at) : '刚刚'}
                            </p>
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              {/* 关闭按钮 */}
              <button
                onClick={() => setIsSidebarOpen(false)}
                className="absolute top-4 right-4 p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* TopBar - 仅桌面端显示 */}
        <header
          className={`
          hidden md:flex h-20 items-center justify-between px-8 border-b border-white/5
          ${mode === "adventure" ? "bg-[#121225]" : "bg-white/[0.02] backdrop-blur-xl"}
        `}
        >
          <div className="flex items-center gap-4 flex-1">
            {/* 侧边栏收起/展开按钮 - 仅桌面端显示 */}
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className={`
                hidden md:flex p-2.5 rounded-xl transition-all duration-200
                ${isSidebarOpen
                  ? 'hover:bg-white/5 text-gray-400 hover:text-white'
                  : mode === "adventure"
                    ? 'bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20'
                    : 'bg-blue-500/10 text-blue-400 hover:bg-blue-500/20'
                }
              `}
              title={isSidebarOpen ? '收起侧边栏' : '展开侧边栏'}
            >
              {isSidebarOpen ? (
                <PanelLeftClose size={20} />
              ) : (
                <PanelLeftOpen size={20} />
              )}
            </button>

            {/* 前进/后退按钮 */}
            <div className="hidden sm:flex items-center gap-1">
              <button
                onClick={handleGoBack}
                disabled={!canGoBack}
                className={`
                  p-2 rounded-lg transition-all duration-200
                  ${canGoBack
                    ? 'hover:bg-white/5 text-gray-400 hover:text-white'
                    : 'text-gray-600 cursor-not-allowed opacity-40'
                  }
                `}
                title="后退"
              >
                <ChevronLeft size={20} />
              </button>
              <button
                onClick={handleGoForward}
                className="p-2 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white transition-all duration-200"
                title="前进"
              >
                <ChevronRight size={20} />
              </button>
            </div>

            {/* 搜索框 - 可收起展开 */}
            <div className="relative hidden sm:flex items-center">
              <motion.div
                initial={false}
                animate={{
                  width: isSearchOpen ? 320 : 42,
                }}
                transition={{ duration: 0.2, ease: "easeInOut" }}
                className={`
                  relative flex items-center overflow-hidden rounded-xl
                  ${isSearchOpen 
                    ? 'bg-white/5 border border-white/10' 
                    : 'hover:bg-white/5'
                  }
                `}
              >
                <button
                  onClick={() => setIsSearchOpen(!isSearchOpen)}
                  className={`
                    flex-shrink-0 p-3 transition-colors
                    ${isSearchOpen ? 'text-gray-400' : 'text-gray-400 hover:text-white'}
                  `}
                >
                  <Search size={18} />
                </button>
                
                <AnimatePresence>
                  {isSearchOpen && (
                    <motion.input
                      ref={searchInputRef}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      type="text"
                      placeholder={t("search")}
                      onKeyDown={(e) => {
                        if (e.key === 'Escape') {
                          setIsSearchOpen(false);
                        }
                      }}
                      className="flex-1 bg-transparent py-2 pr-4 focus:outline-none text-sm"
                    />
                  )}
                </AnimatePresence>
              </motion.div>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3 pl-6 border-l border-white/10">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-bold">Local</p>
                {mode === "adventure" ? (
                  <div className="flex items-center gap-1 justify-end">
                    <span className="text-[10px] text-yellow-500 font-bold uppercase">
                      LVL 42
                    </span>
                    <div className="w-16 h-1 bg-white/10 rounded-full overflow-hidden">
                      <div className="w-3/4 h-full bg-yellow-500"></div>
                    </div>
                  </div>
                ) : (
                  <p className="text-[10px] text-gray-400">
                    {t("userRole")}
                  </p>
                )}
              </div>
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 p-0.5">
                <div className="w-full h-full rounded-full bg-[#0a0a0a] flex items-center justify-center overflow-hidden">
                  <User size={20} />
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Scrollable Page Content - 移动端添加底部间距（为浮动导航栏留空间） */}
        <div className={`flex-1 overflow-y-auto relative ${isTerminalPage ? '' : 'p-4 md:p-8'} pb-24 md:pb-4`}>
          <AnimatePresence mode="wait">
            <motion.div
              key={mode}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className={isTerminalPage ? 'h-full' : ''}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* 移动端底部导航栏 - iOS 液态玻璃风格浮动导航栏 */}
      <nav className="md:hidden fixed bottom-4 left-4 right-4 z-50 safe-area-bottom">
        {/* 二级菜单和通知弹出层 */}
        <AnimatePresence>
          {(activeBottomMenu || showNotifications) && (
            <>
              {/* 遮罩层 */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => {
                  setActiveBottomMenu(null);
                  setShowNotifications(false);
                }}
                className="fixed inset-0 bg-black/30 -z-10"
              />

              {/* 通知列表 */}
              {showNotifications && (
                <motion.div
                  initial={{ opacity: 0, y: 30, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 30, scale: 0.9 }}
                  transition={{
                    type: "spring",
                    bounce: 0.25,
                    duration: 0.5,
                    opacity: { duration: 0.3 }
                  }}
                  className={`
                    absolute bottom-20 left-0 right-0 mx-4 p-3 rounded-2xl max-h-[400px] overflow-y-auto
                    backdrop-blur-2xl backdrop-saturate-150
                    border border-white/20 shadow-2xl
                    ${mode === "adventure"
                      ? "bg-gradient-to-br from-yellow-500/20 via-orange-500/20 to-yellow-500/20"
                      : "bg-white/15"
                    }
                  `}
                >
                  {notifications.length === 0 ? (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.1 }}
                      className="text-center py-8 text-gray-400"
                    >
                      <Bell size={32} className="mx-auto mb-2 opacity-50" />
                      <p className="text-sm">暂无通知</p>
                    </motion.div>
                  ) : (
                    <div className="space-y-2">
                      {notifications.map((notification, index) => (
                        <motion.div
                          key={notification.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className="p-3 bg-white/10 hover:bg-white/15 rounded-xl border border-white/10 transition-all"
                        >
                          <div className="flex items-start gap-3">
                            <div className="mt-0.5 flex-shrink-0">
                              {notification.type === 'success' && <span className="text-green-400 text-lg">✓</span>}
                              {notification.type === 'error' && <span className="text-red-400 text-lg">✕</span>}
                              {notification.type === 'loading' && <Loader size={16} className="animate-spin text-blue-400" />}
                              {notification.type === 'info' && <Bell size={16} className="text-gray-400" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-white mb-1">{notification.title}</p>
                              <p className="text-xs text-gray-300 line-clamp-3">{notification.message}</p>
                            </div>
                            <button
                              onClick={() => removeNotification(notification.id)}
                              className="text-gray-400 hover:text-white transition-colors flex-shrink-0"
                            >
                              <X size={16} />
                            </button>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}

              {/* 二级菜单 */}
              {activeBottomMenu && (
                <motion.div
                  initial={{ opacity: 0, y: 30, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 30, scale: 0.9 }}
                  transition={{
                    type: "spring",
                    bounce: 0.25,
                    duration: 0.5,
                    opacity: { duration: 0.3 }
                  }}
                  className={`
                    absolute bottom-20 left-0 right-0 mx-4 p-2 rounded-2xl
                    backdrop-blur-2xl backdrop-saturate-150
                    border border-white/20 shadow-2xl
                    ${mode === "adventure"
                      ? "bg-gradient-to-br from-yellow-500/20 via-orange-500/20 to-yellow-500/20"
                      : "bg-white/15"
                    }
                  `}
                >
                  <div className="space-y-1">
                    {activeBottomMenu === 'agent' && agentMenuItems.map((item, index) => (
                      <motion.div
                        key={item.path}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        <NavLink
                          to={item.path}
                          onClick={() => setActiveBottomMenu(null)}
                          className={({ isActive }) => `
                            flex items-center gap-3 px-4 py-3 rounded-xl transition-all
                            ${
                              isActive
                                ? "bg-gradient-to-r from-white/40 to-white/20 text-white shadow-[0_0_15px_rgba(255,255,255,0.2)]"
                                : "bg-white/5 text-gray-300 hover:bg-white/15 hover:text-white active:scale-[0.98]"
                            }
                          `}
                        >
                          <item.icon size={20} className="shrink-0" />
                          <span className="text-sm font-medium">{item.name}</span>
                        </NavLink>
                      </motion.div>
                    ))}

                    {activeBottomMenu === 'workflow' && workflowMenuItems.map((item, index) => (
                      <motion.div
                        key={item.path}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        <NavLink
                          to={item.path}
                          onClick={() => setActiveBottomMenu(null)}
                          className={({ isActive }) => `
                            flex items-center gap-3 px-4 py-3 rounded-xl transition-all
                            ${
                              isActive
                                ? "bg-gradient-to-r from-white/40 to-white/20 text-white shadow-[0_0_15px_rgba(255,255,255,0.2)]"
                                : "bg-white/5 text-gray-300 hover:bg-white/15 hover:text-white active:scale-[0.98]"
                            }
                          `}
                        >
                          <item.icon size={20} className="shrink-0" />
                          <span className="text-sm font-medium">{item.name}</span>
                        </NavLink>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}
            </>
          )}
        </AnimatePresence>

        {/* 主导航栏 */}
        <div className={`
          flex items-center justify-between gap-1 px-2 h-16 rounded-3xl
          backdrop-blur-2xl backdrop-saturate-150
          border border-white/20 shadow-2xl
          ${mode === "adventure"
            ? "bg-gradient-to-r from-yellow-500/10 via-orange-500/10 to-yellow-500/10"
            : "bg-white/10"
          }
        `}>
          {/* 菜单按钮 */}
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="relative flex flex-col items-center justify-center gap-1 p-2 flex-1 rounded-2xl transition-all duration-300 text-gray-400 hover:text-white"
          >
            <Menu size={20} />
            <span className="text-[10px] font-medium">菜单</span>
          </button>

          {/* Dashboard */}
          <NavLink
            to="/"
            onClick={() => {
              // 点击 Dashboard 时关闭所有二级菜单
              setActiveBottomMenu(null);
              setShowNotifications(false);
            }}
            className={({ isActive }) => `
              relative flex flex-col items-center justify-center gap-1 p-2 flex-1 rounded-2xl transition-all duration-300
              ${isActive ? "text-white" : "text-gray-400 hover:text-white"}
            `}
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/40 via-white/20 to-white/10 shadow-[0_0_20px_rgba(255,255,255,0.3)]"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                  />
                )}
                {mode === "adventure" ? <Sword size={20} className="relative z-10" /> : <LayoutDashboard size={20} className="relative z-10" />}
                <span className="text-[10px] font-medium relative z-10">{t("dashboard")}</span>
              </>
            )}
          </NavLink>

          {/* Agent 分组 */}
          <button
            onClick={() => {
              setActiveBottomMenu(activeBottomMenu === 'agent' ? null : 'agent');
              setShowNotifications(false);
            }}
            className={`
              relative flex flex-col items-center justify-center gap-1 p-2 flex-1 rounded-2xl transition-all duration-300
              ${
                activeAgentItem || activeBottomMenu === 'agent'
                  ? "text-white"
                  : "text-gray-400 hover:text-white"
              }
            `}
          >
            {(activeAgentItem || activeBottomMenu === 'agent') && (
              <motion.div
                layoutId="activeTab"
                className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/40 via-white/20 to-white/10 shadow-[0_0_20px_rgba(255,255,255,0.3)]"
                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
              />
            )}
            {activeAgentItem ? (
              <activeAgentItem.icon size={20} className="relative z-10" />
            ) : (
              mode === "adventure" ? <Shield size={20} className="relative z-10" /> : <Users size={20} className="relative z-10" />
            )}
            <span className="text-[10px] font-medium relative z-10">
              {activeAgentItem ? activeAgentItem.name : 'Agent'}
            </span>
          </button>

          {/* Workflow 分组 */}
          <button
            onClick={() => {
              setActiveBottomMenu(activeBottomMenu === 'workflow' ? null : 'workflow');
              setShowNotifications(false);
            }}
            className={`
              relative flex flex-col items-center justify-center gap-1 p-2 flex-1 rounded-2xl transition-all duration-300
              ${
                activeWorkflowItem || activeBottomMenu === 'workflow'
                  ? "text-white"
                  : "text-gray-400 hover:text-white"
              }
            `}
          >
            {(activeWorkflowItem || activeBottomMenu === 'workflow') && (
              <motion.div
                layoutId="activeTab"
                className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/40 via-white/20 to-white/10 shadow-[0_0_20px_rgba(255,255,255,0.3)]"
                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
              />
            )}
            {activeWorkflowItem ? (
              <activeWorkflowItem.icon size={20} className="relative z-10" />
            ) : (
              mode === "adventure" ? <Map size={20} className="relative z-10" /> : <GitBranch size={20} className="relative z-10" />
            )}
            <span className="text-[10px] font-medium relative z-10">
              {activeWorkflowItem ? activeWorkflowItem.name : 'Workflow'}
            </span>
          </button>

          {/* 通知按钮 */}
          <button
            onClick={() => {
              setShowNotifications(!showNotifications);
              setActiveBottomMenu(null);
            }}
            className={`
              relative flex flex-col items-center justify-center gap-1 p-2 flex-1 rounded-2xl transition-all duration-300
              ${showNotifications ? "text-white" : "text-gray-400 hover:text-white"}
            `}
          >
            {showNotifications && (
              <motion.div
                layoutId="activeTab"
                className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/40 via-white/20 to-white/10 shadow-[0_0_20px_rgba(255,255,255,0.3)]"
                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
              />
            )}
            <Bell size={20} className="relative z-10" />
            <span className="text-[10px] font-medium relative z-10">通知</span>

            {/* 通知徽章 */}
            {notifications.length > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-[9px] font-bold text-white border-2 border-[#1a1b26]">
                {notifications.length > 99 ? '99+' : notifications.length}
              </span>
            )}
          </button>
        </div>
      </nav>
    </div>
  );
};