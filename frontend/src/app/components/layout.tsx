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
  Search,
  User,
  X,
  Target,
  Sparkles,
  PanelLeftClose,
  PanelLeftOpen,
  ChevronLeft,
  ChevronRight,
  Terminal,
  Network,
  Loader,
  Bell,
  Gamepad2,
  TestTube,
  FlaskConical,
  FolderOpen,
  ExternalLink,
} from "lucide-react";
import { useMode } from "../contexts/ModeContext";
import { useTranslation } from "../hooks/useTranslation";
import { motion, AnimatePresence } from "motion/react";
import { ActionButton } from "./ui-shared";
import { useNotifications } from "../contexts/NotificationContext";
import { useNavigation, NavigationProvider } from "../contexts/NavigationContext";
import { useInitialization } from "../contexts/InitializationContext";
import { InitializationScreen } from "./InitializationScreen";
import { AccessPasswordGate } from "./AccessPasswordGate";
import Microverse from "../pages/Microverse";

const Navigation = ({ collapsed = false, onExpandSidebar }: { collapsed?: boolean; onExpandSidebar?: () => void }) => {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const [expandedMenus, setExpandedMenus] = React.useState<Set<string>>(new Set());

  const toggleMenu = (menuId: string) => {
    // 统一的展开/折叠菜单逻辑（折叠和展开状态都使用内联展开）
    setExpandedMenus(prev => {
      const next = new Set(prev);
      if (next.has(menuId)) {
        next.delete(menuId);
      } else {
        next.add(menuId);
      }
      return next;
    });
  };

  // 自动展开逻辑
  React.useEffect(() => {
    navItems.forEach(item => {
      if (item.subItems && item.id) {
        const hasActiveChild = item.subItems.some(
          (sub) =>
            !sub.external &&
            (location.pathname === sub.path ||
              (sub.path.length > 1 && location.pathname.startsWith(sub.path + '/')))
        );

        if (hasActiveChild && !collapsed) {
          setExpandedMenus(prev => new Set(prev).add(item.id!));
        }
      }
    });
  }, [location.pathname, collapsed]);

  const navItems = [
    {
      name: t("dashboard"),
      path: "/",
      icon: LayoutDashboard,
    },
    {
      name: t("library"),
      path: "/library",
      icon: Wrench,
      id: 'library',
      subItems: [
        {
          name: t("skills"),
          path: "/skills",
          icon: Wrench,
        },
        {
          name: t("agents"),
          path: "/agents",
          icon: Users,
        },
        {
          name: t("teams"),
          path: "/teams",
          icon: Network,
        },
        {
          name: t("projects"),
          path: "/projects",
          icon: FolderOpen,
        },
      ],
    },
    {
      name: t("automation"),
      path: "/automation",
      icon: GitBranch,
      id: 'automation',
      subItems: [
        {
          name: t("workflows"),
          path: "/workflows",
          icon: GitBranch,
        },
        {
          name: t("opp"),
          path: "/workflows/opp",
          icon: Target,
        },
        {
          name: t("history"),
          path: "/history",
          icon: History,
        },
      ],
    },
    {
      name: t("terminal"),
      path: "/terminal",
      icon: Terminal,
    },
  ];

  return (
    <nav className={`flex flex-col gap-2 ${collapsed ? 'px-4 py-2' : 'p-4'}`}>
      {navItems.map((item) => {
        const hasSubItems = item.subItems && item.subItems.length > 0;
        const isExpanded = expandedMenus.has(item.id || '');

        // 父菜单三态逻辑
        const isDirectActive = location.pathname === item.path;
        const hasActiveChild =
          hasSubItems &&
          item.subItems?.some((sub) => {
            if (sub.external) return false;
            return (
              location.pathname === sub.path ||
              (sub.path.length > 1 && location.pathname.startsWith(sub.path + '/'))
            );
          });

        // 确定父菜单状态：active（直接激活）、partial（子菜单激活）、inactive（未激活）
        const menuState = isDirectActive ? 'active' : hasActiveChild ? 'partial' : 'inactive';

        return (
          <div key={item.path}>
            {hasSubItems && !collapsed ? (
              // 有子菜单的项目
              <>
                <button
                  onClick={() => toggleMenu(item.id!)}
                  className={`
                    w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl transition-all
                    ${
                      menuState === 'active'
                        ? "bg-blue-600/30 text-blue-300 border border-blue-500/50"
                        : menuState === 'partial'
                        ? "bg-blue-600/10 text-blue-400 border border-blue-500/20"
                        : "text-gray-400 hover:bg-white/5 hover:text-white"
                    }
                  `}
                >
                  <div className="flex items-center gap-3">
                    <item.icon size={20} />
                    <span className="font-medium whitespace-nowrap overflow-hidden text-ellipsis">
                      {item.name}
                    </span>
                  </div>
                  <motion.div
                    animate={{ rotate: isExpanded ? 90 : 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ChevronRight size={16} />
                  </motion.div>
                </button>

                {/* 子菜单 */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden ml-4 mt-1 bg-white/[0.03] rounded-xl p-1.5 flex flex-col gap-1"
                    >
                      {item.subItems?.map((subItem) => {
                        // 如果是外部链接，使用 <a> 标签在新标签页打开
                        if (subItem.external) {
                          return (
                            <a
                              key={subItem.path}
                              href={subItem.path}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all text-gray-400 hover:bg-white/10 hover:text-white"
                            >
                              <subItem.icon size={18} />
                              <span className="font-medium text-sm whitespace-nowrap overflow-hidden text-ellipsis flex-1">
                                {subItem.name}
                              </span>
                              <ExternalLink size={14} className="opacity-50" />
                            </a>
                          );
                        }
                        // 普通内部链接
                        return (
                          <NavLink
                            key={subItem.path}
                            to={subItem.path}
                            end={subItem.path === '/workflows'}
                            className={({ isActive }) => `
                              flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all
                              ${
                                isActive
                                  ? "bg-blue-600/30 text-blue-400 border border-blue-500/50"
                                  : "text-gray-400 hover:bg-white/10 hover:text-white"
                              }
                            `}
                          >
                            <subItem.icon size={18} />
                            <span className="font-medium text-sm whitespace-nowrap overflow-hidden text-ellipsis">
                              {subItem.name}
                            </span>
                          </NavLink>
                        );
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>
              </>
            ) : hasSubItems && collapsed ? (
              // 折叠状态下有子菜单的项目 - 使用内联展开
              <>
                <button
                  onClick={() => toggleMenu(item.id!)}
                  title={item.name}
                  className={`
                    w-full flex items-center justify-center py-3 rounded-xl transition-all
                    ${
                      menuState === 'active'
                        ? "bg-blue-600/30 text-blue-300 border border-blue-500/50"
                        : menuState === 'partial'
                        ? "bg-blue-600/10 text-blue-400 border border-blue-500/20"
                        : "text-gray-400 hover:bg-white/5 hover:text-white"
                    }
                  `}
                >
                  <item.icon size={20} />
                </button>

                {/* 内联子菜单 - 仅显示图标 */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden mt-1 bg-white/[0.03] rounded-xl p-1.5 flex flex-col gap-1"
                    >
                      {item.subItems?.map((subItem) => {
                        // 如果是外部链接，使用 <a> 标签在新标签页打开
                        if (subItem.external) {
                          return (
                            <a
                              key={subItem.path}
                              href={subItem.path}
                              target="_blank"
                              rel="noopener noreferrer"
                              title={subItem.name}
                              className="flex items-center justify-center py-2.5 rounded-xl transition-all text-gray-400 hover:bg-white/10 hover:text-white"
                            >
                              <subItem.icon size={18} />
                            </a>
                          );
                        }
                        // 普通内部链接
                        return (
                          <NavLink
                            key={subItem.path}
                            to={subItem.path}
                            title={subItem.name}
                            end={subItem.path === '/workflows'}
                            className={({ isActive }) => `
                              flex items-center justify-center py-2.5 rounded-xl transition-all
                              ${
                                isActive
                                  ? "bg-blue-600/30 text-blue-400 border border-blue-500/50"
                                  : "text-gray-400 hover:bg-white/10 hover:text-white"
                              }
                            `}
                          >
                            <subItem.icon size={18} />
                          </NavLink>
                        );
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>
              </>
            ) : (
              // 普通菜单项（无子菜单）
              <NavLink
                to={item.path}
                title={collapsed ? item.name : undefined}
                className={({ isActive }) => `
                  flex items-center ${collapsed ? 'justify-center' : 'gap-3 px-4'} py-3 rounded-xl transition-all
                  ${
                    isActive
                      ? "bg-blue-600/20 text-blue-400 border border-blue-500/30"
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
            )}
          </div>
        );
      })}
      <div className={`mt-auto pt-4 border-t border-white/10`}>
        {/* Settings */}
        <NavLink
          to="/settings"
          title={collapsed ? t("settings") : undefined}
          className={({ isActive }) => `
            flex items-center ${collapsed ? 'justify-center' : 'gap-3 px-4'} py-3 rounded-xl transition-all
            ${
              isActive
                ? "bg-blue-600/20 text-blue-400"
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

const LayoutContent = () => {
  const { lang } = useMode();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { notifications, removeNotification } = useNotifications();
  const { canGoBack, canGoForward, goBack, goForward } = useNavigation();
  const { isInitialized, isLoading } = useInitialization();

  // ── 访问密码门控 ─────────────────────────────────────────────────────────────
  // 检查后端是否要求访问密码，若要求且本地无有效 token 则显示密码界面
  const [accessChecked, setAccessChecked] = React.useState(false);
  const [accessRequired, setAccessRequired] = React.useState(false);
  const [accessGranted, setAccessGranted] = React.useState(false);

  React.useEffect(() => {
    const checkAccess = async () => {
      try {
        const res = await fetch('/api/system/health');
        if (res.status === 401) {
          // 中间件拦截说明密码已启用且本次无 token
          const hasToken = Boolean(localStorage.getItem('access_token'));
          setAccessRequired(true);
          setAccessGranted(hasToken);
        } else if (res.ok) {
          const data = await res.json();
          if (data.access_password_required) {
            const hasToken = Boolean(localStorage.getItem('access_token'));
            setAccessRequired(true);
            setAccessGranted(hasToken);
          }
        }
      } catch {
        // 网络错误时不阻塞加载
      } finally {
        setAccessChecked(true);
      }
    };
    checkAccess();
  }, []);

  // 检测是否为移动端，移动端默认隐藏侧边栏
  const [isMobile, setIsMobile] = React.useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(true);
  const [isSearchOpen, setIsSearchOpen] = React.useState(false);
  const [showNotifications, setShowNotifications] = React.useState(false);
  const searchInputRef = React.useRef<HTMLInputElement>(null);
  const [activeBottomMenu, setActiveBottomMenu] = React.useState<string | null>(null);

  // 检查是否在 Microverse 游戏模式
  const isMicroverse = location.pathname === '/microverse';

  // 定义导航分组（移动端底部菜单）
  const libraryMenuItems = [
    {
      name: t("skills"),
      path: "/skills",
      icon: Wrench,
    },
    {
      name: t("agents"),
      path: "/agents",
      icon: Users,
    },
    {
      name: t("teams"),
      path: "/teams",
      icon: Network,
    },
    {
      name: t("projects"),
      path: "/projects",
      icon: FolderOpen,
    },
  ];

  const automationMenuItems = [
    {
      name: t("workflows"),
      path: "/workflows",
      icon: GitBranch,
    },
    {
      name: t("opp"),
      path: "/workflows/opp",
      icon: Target,
    },
    {
      name: t("history"),
      path: "/history",
      icon: History,
    },
  ];

  // 获取当前激活的菜单项：先精确匹配，再按 path 长度降序做前缀匹配（避免 /workflows 吞掉 /workflows/opp）
  const getActiveMenuItem = (items: typeof libraryMenuItems) => {
    const exact = items.find((item) => location.pathname === item.path);
    if (exact) return exact;
    const byLen = [...items].sort((a, b) => b.path.length - a.path.length);
    return byLen.find(
      (item) => item.path.length > 1 && location.pathname.startsWith(item.path + '/')
    );
  };

  const activeLibraryItem = getActiveMenuItem(libraryMenuItems);
  const activeAutomationItem = getActiveMenuItem(automationMenuItems);
  // 检查是否在 library 或 automation 分组的任何页面（用于弹出菜单）
  const isInLibraryGroup = libraryMenuItems.some(
    (item) =>
      item.path === location.pathname ||
      (item.path.length > 1 && location.pathname.startsWith(item.path + '/'))
  );
  const isInAutomationGroup = automationMenuItems.some(
    (item) =>
      item.path === location.pathname ||
      (item.path.length > 1 && location.pathname.startsWith(item.path + '/'))
  );

  // 动态更新浏览器标签栏颜色
  React.useEffect(() => {
    const themeColor = "#0f111a";

    // 更新 meta theme-color
    let metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (!metaThemeColor) {
      metaThemeColor = document.createElement('meta');
      metaThemeColor.setAttribute('name', 'theme-color');
      document.head.appendChild(metaThemeColor);
    }
    metaThemeColor.setAttribute('content', themeColor);
  }, []);

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
  
  // 检查是否是 Workspace 页面
  const isWorkspacePage = location.pathname.includes('/workspace');

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

  // 路由变化时重置滚动位置到顶部
  React.useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  // 如果未初始化或正在加载，显示初始化界面
  if (!isInitialized || isLoading) {
    return <InitializationScreen />;
  }

  // 如果需要访问密码且尚未验证（等待检查完成后再判断，避免闪烁）
  if (accessChecked && accessRequired && !accessGranted) {
    return <AccessPasswordGate onSuccess={() => setAccessGranted(true)} />;
  }

  return (
    <div
      className={`app-shell min-h-[var(--app-h)] safe-area-left safe-area-right flex text-white transition-colors duration-500 ${isTerminalPage ? 'overflow-visible' : 'overflow-hidden'} bg-[#0f111a]`}
    >
      {/* 桌面端侧边栏 / 游戏模式悬浮 Logo */}
      <aside
        className={`
          ${isMicroverse
            ? "fixed top-0 left-0 z-50 w-auto"
            : `${isSidebarOpen ? "w-72" : "w-20"} hidden md:flex flex-col border-r border-white/5 transition-all duration-300 relative z-50 bg-[#0a0b14]/80 backdrop-blur-2xl`
          }
        `}
      >
        {/* Logo */}
        <motion.button
          initial={isMicroverse ? { opacity: 0 } : false}
          animate={isMicroverse ? { opacity: 1 } : {}}
          transition={isMicroverse ? { duration: 0.3, ease: "easeOut" } : {}}
          onClick={() => {
            // 如果当前在 Microverse 页面，返回首页；否则跳转到 Microverse
            if (location.pathname === '/microverse') {
              navigate('/');
            } else {
              navigate('/microverse');
            }
          }}
          className={`
            h-20 flex items-center transition-all duration-500 hover:bg-white/5 group
            ${isMicroverse
              ? "px-6 gap-4"
              : `${isSidebarOpen ? "px-6 gap-4" : "px-3 justify-center"} border-b border-blue-500/20`
            }
          `}
          title={isMicroverse ? "退出游戏模式" : undefined}
        >
          <div
            className={`w-12 aspect-square flex-shrink-0 rounded-2xl flex items-center justify-center transition-all duration-500 group-hover:scale-110 shadow-lg relative overflow-hidden backdrop-blur-xl ${
              isMicroverse
                ? "bg-purple-500/15 border border-purple-400/40 shadow-purple-500/20"
                : "bg-blue-500/10 border border-blue-400/30 shadow-blue-500/10"
            }`}
          >
            {isMicroverse ? (
              <Gamepad2
                size={24}
                fill="currentColor"
                className="text-purple-400 drop-shadow-[0_0_15px_rgba(192,132,252,0.7)] relative z-10"
              />
            ) : (
              <Zap
                size={24}
                fill="currentColor"
                className="text-blue-400 drop-shadow-[0_0_15px_rgba(96,165,250,0.6)] animate-pulse relative z-10"
              />
            )}
            <div className={`absolute inset-0 blur-xl scale-150 rounded-full ${isMicroverse ? "bg-purple-400/25" : "bg-blue-400/20"}`} />
          </div>

          {(isSidebarOpen || isMicroverse) && (
            <div className="flex flex-col items-start overflow-hidden">
              <motion.div
                key={lang}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex flex-col"
              >
                <span className={`text-lg font-black tracking-tighter uppercase italic leading-[0.85] ${isMicroverse ? "text-purple-100" : "text-white"}`}>
                  Open
                </span>
                <span className={`text-sm font-black tracking-[0.2em] uppercase leading-tight ${isMicroverse ? "text-purple-400/90" : "text-blue-400/80"}`}>
                  Adventure
                </span>
              </motion.div>
            </div>
          )}
        </motion.button>

        {!isMicroverse && <Navigation collapsed={!isSidebarOpen} onExpandSidebar={() => setIsSidebarOpen(true)} />}
      </aside>

      {/* 移动端抽屉侧边栏 - 仅在 <md 显示 */}
      {!isMicroverse && (
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
                md:hidden fixed inset-y-0 left-0 w-64 z-50 border-r border-white/5 flex flex-col safe-area-top
                bg-[#0a0b14]
              `}
            >
              {/* Logo */}
              <button
                onClick={() => {
                  // 如果当前在 Microverse 页面，返回首页；否则跳转到 Microverse
                  if (location.pathname === '/microverse') {
                    navigate('/');
                  } else {
                    navigate('/microverse');
                  }
                  setIsSidebarOpen(false);
                }}
                className="h-14 flex items-center px-4 gap-3 transition-all duration-500 hover:bg-white/5 group w-full border-b border-blue-500/20"
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-500 group-hover:scale-110 shadow-lg relative overflow-hidden bg-blue-500/10 backdrop-blur-xl border border-blue-400/30 shadow-blue-500/10">
                  <div className="relative">
                    <Zap
                      size={20}
                      fill="currentColor"
                      className="text-blue-400 drop-shadow-[0_0_15px_rgba(96,165,250,0.6)] animate-pulse"
                    />
                    <div className="absolute inset-0 bg-blue-400/20 blur-xl scale-150 rounded-full" />
                  </div>
                </div>

                <div className="flex flex-col items-start overflow-hidden">
                  <span className="text-base font-black tracking-tighter uppercase italic leading-[0.85] text-white">
                    Open
                  </span>
                  <span className="text-xs font-black tracking-[0.2em] uppercase leading-tight text-blue-400/80">
                    Adventure
                  </span>
                </div>
              </button>

              {!isMicroverse && <Navigation collapsed={false} />}

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
      )}

      {/* Main Content Area */}
      <main className={`
        flex-1 flex flex-col min-w-0 min-h-0
        ${isTerminalPage ? 'overflow-visible' : 'overflow-hidden'}
        ${isMicroverse ? 'absolute inset-0 w-full h-full' : ''}
      `}>
        {/* TopBar - 仅桌面端显示 */}
        {!isMicroverse && (
          <header
            className={`
            hidden md:flex h-20 items-center justify-between px-8 border-b border-white/5
            bg-white/[0.02] backdrop-blur-xl
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

            {/* 前进/后退按钮 - 游戏模式下隐藏 */}
            {!isMicroverse && (
              <div className="hidden sm:flex items-center gap-1">
                <button
                  onClick={goBack}
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
                  onClick={goForward}
                  disabled={!canGoForward}
                  className={`
                    p-2 rounded-lg transition-all duration-200
                    ${canGoForward
                      ? 'hover:bg-white/5 text-gray-400 hover:text-white'
                      : 'text-gray-600 cursor-not-allowed opacity-40'
                    }
                  `}
                  title="前进"
                >
                  <ChevronRight size={20} />
                </button>
              </div>
            )}

            {/* 搜索框 - 可收起展开 - 游戏模式下隐藏 */}
            {!isMicroverse && (
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
            )}
          </div>

          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3 pl-6 border-l border-white/10">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-bold">Local</p>
                <p className="text-[10px] text-gray-400">
                  {t("userRole")}
                </p>
              </div>
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 p-0.5">
                <div className="w-full h-full rounded-full bg-[#0a0a0a] flex items-center justify-center overflow-hidden">
                  <User size={20} />
                </div>
              </div>
            </div>
          </div>
        </header>
        )}

        {/* Scrollable Page Content - 移动端添加底部间距（为浮动导航栏留空间） */}
        <div className={`flex-1 overflow-y-auto relative safe-area-top ${isMicroverse || isTerminalPage || isWorkspacePage ? '' : 'p-4 md:p-8'} ${isMicroverse ? '' : 'pb-24 md:pb-4'} safe-area-bottom`}>
          <div className={isTerminalPage || isMicroverse || isWorkspacePage ? 'h-full' : ''}>
            {/* 游戏模式：始终挂载，通过 CSS 控制显示，避免 hidden/0 尺寸导致 WebGL 画布重新初始化 */}
            <div className={`${isMicroverse ? '' : 'hidden'} h-full`}>
              <Microverse key="microverse-cached" />
            </div>

            {/* 其他路由：正常渲染 */}
            {!isMicroverse && <Outlet />}
          </div>
        </div>

      </main>

      {/* 移动端底部导航栏 - iOS 液态玻璃风格浮动导航栏 */}
      {!isMicroverse && (
        <nav
          className="md:hidden fixed left-4 right-4 z-50 safe-area-left safe-area-right transition-all duration-200 ease-out"
          style={{ bottom: 'calc(var(--safe-bottom) + 1rem)' }}
          id="mobile-dock"
        >
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
                    bg-white/15
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
                    bg-white/15
                  `}
                >
                  <div className="space-y-1">
                    {activeBottomMenu === 'library' && libraryMenuItems.map((item, index) => (
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

                    {activeBottomMenu === 'automation' && automationMenuItems.map((item, index) => (
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
        <div className="relative">
          {/* 毛玻璃渐变层 - 从上往下 */}
          <div
            className="absolute inset-0 rounded-3xl overflow-hidden pointer-events-none"
            style={{
              background: `linear-gradient(to bottom,
                rgba(255, 255, 255, 0.15) 0%,
                rgba(255, 255, 255, 0.08) 30%,
                rgba(255, 255, 255, 0.03) 60%,
                rgba(255, 255, 255, 0) 100%
              )`,
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
            }}
          />

          {/* 主导航栏内容 */}
          <div className={`
            relative grid grid-cols-5 items-center gap-1 px-2 h-16 rounded-3xl
            backdrop-blur-2xl backdrop-saturate-150
            border border-white/20 shadow-2xl
            bg-white/10
          `}>
          {/* Dashboard */}
          <NavLink
            to="/"
            onClick={() => {
              // 点击 Dashboard 时关闭所有二级菜单
              setActiveBottomMenu(null);
              setShowNotifications(false);
            }}
            className={({ isActive }) => `
              relative flex flex-col items-center justify-center gap-1 p-2 w-full min-w-0 rounded-2xl transition-all duration-300
              ${isActive && !activeBottomMenu && !showNotifications
                ? "text-white bg-gradient-to-br from-white/40 via-white/20 to-white/10 shadow-[0_0_20px_rgba(255,255,255,0.3)]"
                : "text-gray-400 hover:text-white"
              }
            `}
          >
            {({ isActive }) => (
              <>
                <LayoutDashboard size={20} className="relative z-10" />
                <span className="text-[10px] font-medium relative z-10 w-full truncate text-center">{t("dashboard")}</span>
              </>
            )}
          </NavLink>

          {/* Library 分组 */}
          <button
            onClick={() => {
              setActiveBottomMenu(activeBottomMenu === 'library' ? null : 'library');
              setShowNotifications(false);
            }}
            className={`
              relative flex flex-col items-center justify-center gap-1 p-2 w-full min-w-0 rounded-2xl transition-all duration-300
              ${activeLibraryItem || activeBottomMenu === 'library'
                ? "text-white bg-gradient-to-br from-white/40 via-white/20 to-white/10 shadow-[0_0_20px_rgba(255,255,255,0.3)]"
                : "text-gray-400 hover:text-white"
              }
            `}
          >
            {activeLibraryItem ? (
              <activeLibraryItem.icon size={20} className="relative z-10" />
            ) : (
              <Wrench size={20} className="relative z-10" />
            )}
            <span className="text-[10px] font-medium relative z-10 w-full truncate text-center">
              {activeLibraryItem ? activeLibraryItem.name : t("library")}
            </span>
          </button>

          {/* Automation 分组 */}
          <button
            onClick={() => {
              setActiveBottomMenu(activeBottomMenu === 'automation' ? null : 'automation');
              setShowNotifications(false);
            }}
            className={`
              relative flex flex-col items-center justify-center gap-1 p-2 w-full min-w-0 rounded-2xl transition-all duration-300
              ${activeAutomationItem || activeBottomMenu === 'automation'
                ? "text-white bg-gradient-to-br from-white/40 via-white/20 to-white/10 shadow-[0_0_20px_rgba(255,255,255,0.3)]"
                : "text-gray-400 hover:text-white"
              }
            `}
          >
            {activeAutomationItem ? (
              <activeAutomationItem.icon size={20} className="relative z-10" />
            ) : (
              <GitBranch size={20} className="relative z-10" />
            )}
            <span className="text-[10px] font-medium relative z-10 w-full truncate text-center">
              {activeAutomationItem ? activeAutomationItem.name : t("automation")}
            </span>
          </button>

          {/* Terminal 按钮 */}
          <NavLink
            to="/terminal"
            onClick={() => {
              setActiveBottomMenu(null);
              setShowNotifications(false);
            }}
            className={({ isActive }) => `
              relative flex flex-col items-center justify-center gap-1 p-2 w-full min-w-0 rounded-2xl transition-all duration-300
              ${isActive && !activeBottomMenu && !showNotifications
                ? "text-white bg-gradient-to-br from-white/40 via-white/20 to-white/10 shadow-[0_0_20px_rgba(255,255,255,0.3)]"
                : "text-gray-400 hover:text-white"
              }
            `}
          >
            <Terminal size={20} className="relative z-10" />
            <span className="text-[10px] font-medium relative z-10 w-full truncate text-center">终端</span>
          </NavLink>

          {/* 通知按钮 */}
          <button
            onClick={() => {
              setShowNotifications(!showNotifications);
              setActiveBottomMenu(null);
            }}
            className={`
              relative flex flex-col items-center justify-center gap-1 p-2 w-full min-w-0 rounded-2xl transition-all duration-300
              ${showNotifications
                ? "text-white bg-gradient-to-br from-white/40 via-white/20 to-white/10 shadow-[0_0_20px_rgba(255,255,255,0.3)]"
                : "text-gray-400 hover:text-white"
              }
            `}
          >
            <Bell size={20} className="relative z-10" />
            <span className="text-[10px] font-medium relative z-10 w-full truncate text-center">通知</span>

            {/* 通知徽章 */}
            {notifications.length > 0 && (
              <span className="absolute -top-1 right-0 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-[9px] font-bold text-white border-2 border-[#1a1b26] z-20">
                {notifications.length > 99 ? '99+' : notifications.length}
              </span>
            )}
          </button>
          </div>
        </div>
      </nav>
      )}
    </div>
  );
};

export const Layout = () => {
  return (
    <NavigationProvider>
      <LayoutContent />
    </NavigationProvider>
  );
};