import React from "react";
import { NavLink, Outlet } from "react-router";
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
  Sparkles,
} from "lucide-react";
import { useMode } from "../contexts/ModeContext";
import { useTranslation } from "../hooks/useTranslation";
import { motion, AnimatePresence } from "motion/react";
import { ActionButton } from "./ui-shared";
import imgEsports from "figma:asset/46c7531e4886b7b49890d99d64d86e9ce62c198a.png";

const Navigation = () => {
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
      icon: mode === "adventure" ? UsersRound : UsersRound,
    },
    {
      name: t("workflows"),
      path: "/workflows",
      icon: mode === "adventure" ? Map : GitBranch,
    },
    {
      name: t("tasks"),
      path: "/tasks",
      icon: mode === "adventure" ? Trophy : History,
    },
  ];

  return (
    <nav className="flex flex-col gap-2 p-4">
      {navItems.map((item) => (
        <NavLink
          key={item.path}
          to={item.path}
          className={({ isActive }) => `
            flex items-center gap-3 px-4 py-3 rounded-xl transition-all
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
          <span className="font-medium whitespace-nowrap overflow-hidden text-ellipsis">
            {item.name}
          </span>
        </NavLink>
      ))}
      <div className="mt-auto pt-4 border-t border-white/10">
        <NavLink
          to="/settings"
          className={({ isActive }) => `
            flex items-center gap-3 px-4 py-3 rounded-xl transition-all
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
          <span className="font-medium">{t("settings")}</span>
        </NavLink>
      </div>
    </nav>
  );
};

export const Layout = () => {
  const { mode, toggleMode, lang } = useMode();
  const { t } = useTranslation();
  const [isSidebarOpen, setIsSidebarOpen] =
    React.useState(true);

  return (
    <div
      className={`min-h-screen flex text-white overflow-hidden transition-colors duration-500 ${mode === "adventure" ? "bg-[#0a0a14]" : "bg-[#0f111a]"}`}
    >
      {/* Sidebar */}
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
            h-24 flex items-center px-6 gap-4 group transition-all duration-500 hover:bg-white/5
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
                   <img src={imgEsports} alt="" className="w-10 h-10 object-contain scale-125 rotate-12" />
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

        <Navigation />
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* TopBar */}
        <header
          className={`
          h-20 flex items-center justify-between px-8 border-b border-white/5
          ${mode === "adventure" ? "bg-[#121225]" : "bg-white/[0.02] backdrop-blur-xl"}
        `}
        >
          <div className="flex items-center gap-4 flex-1">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="md:hidden p-2 hover:bg-white/5 rounded-lg"
            >
              <Menu size={24} />
            </button>

            <button
              onClick={toggleMode}
              className="md:hidden flex items-center gap-2 px-3 py-1 bg-white/5 rounded-full border border-white/10"
            >
              <div
                className={`w-5 h-5 rounded flex items-center justify-center ${mode === "adventure" ? "bg-yellow-500" : "bg-blue-600"}`}
              >
                {mode === "adventure" ? (
                  <Sword size={10} />
                ) : (
                  <Zap size={10} />
                )}
              </div>
              <span className="text-[10px] font-black uppercase tracking-tighter">
                {mode === "adventure" ? "RPG" : "PRO"}
              </span>
            </button>

            <div className="relative max-w-md w-full hidden sm:block">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                size={18}
              />
              <input
                type="text"
                placeholder={t("search")}
                className="w-full bg-white/5 border border-white/10 rounded-xl py-2 pl-10 pr-4 focus:outline-none focus:border-blue-500/50 transition-all"
              />
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

        {/* Scrollable Page Content */}
        <div className="flex-1 overflow-y-auto p-8 relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={mode}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
};