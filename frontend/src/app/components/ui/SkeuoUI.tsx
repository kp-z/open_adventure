/**
 * 拟物风格 UI 基元（参考 ~/项目/灵感/project 原型）
 * 用于 Projects 工作台等控制台风界面。
 */
import React from "react";
import { motion } from "motion/react";
import { cn } from "../../lib/utils";

// --- LED ---
export type LedStatus = "green" | "yellow" | "gray" | "red";

export function Led({ status, className }: { status: LedStatus; className?: string }) {
  const colorMap = {
    green: "bg-[#00ff41] shadow-[0_0_10px_#00ff41,inset_0_0_5px_white]",
    yellow: "bg-[#ff9d00] shadow-[0_0_10px_#ff9d00,inset_0_0_5px_white]",
    gray: "bg-[#444] shadow-[inset_0_0_5px_#222]",
    red: "bg-[#ff003c] shadow-[0_0_10px_#ff003c,inset_0_0_5px_white]",
  };
  const isPulsing = status === "green" || status === "yellow";

  return (
    <div
      className={cn(
        "relative rounded-full border border-[#111] w-3 h-3 flex items-center justify-center overflow-hidden",
        "before:absolute before:w-full before:h-full before:rounded-full before:shadow-[inset_0_2px_4px_rgba(0,0,0,0.5)]",
        className
      )}
    >
      <motion.div
        className={cn("w-full h-full rounded-full", colorMap[status])}
        animate={isPulsing ? { opacity: [0.6, 1, 0.6] } : {}}
        transition={isPulsing ? { repeat: Infinity, duration: 2, ease: "easeInOut" } : {}}
      />
      <div className="absolute top-[10%] left-[20%] w-[40%] h-[30%] bg-white/40 rounded-full" />
    </div>
  );
}

type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: "sm" | "md" | "lg";
  active?: boolean;
}

export const MechButton = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "secondary", size = "md", active, children, disabled, ...props }, ref) => {
    const baseStyle =
      "relative overflow-hidden flex items-center justify-center font-bold tracking-wider uppercase transition-colors select-none";

    const sizeStyle = {
      sm: "px-3 py-1.5 text-xs rounded-md",
      md: "px-4 py-2 text-sm rounded-lg",
      lg: "px-6 py-3 text-base rounded-xl",
    }[size];

    const variants = {
      primary:
        "bg-gradient-to-b from-[#2a3040] to-[#1a1e28] text-[#00d8ff] border border-[#00d8ff]/30 shadow-[0_4px_0_#0f172a,inset_0_1px_1px_rgba(255,255,255,0.1)]",
      secondary:
        "bg-gradient-to-b from-[#3a3a3a] to-[#222] text-[#e0e0e0] border border-[#111] shadow-[0_4px_0_#111,inset_0_1px_1px_rgba(255,255,255,0.1)]",
      danger:
        "bg-gradient-to-b from-[#4a2020] to-[#2a1010] text-[#ff003c] border border-[#ff003c]/30 shadow-[0_4px_0_#1a0a0a,inset_0_1px_1px_rgba(255,255,255,0.1)]",
      ghost: "bg-transparent text-[#aaa] hover:bg-white/5 shadow-none border border-transparent",
    };

    const pressedStyle = "active:translate-y-[4px] active:shadow-none active:brightness-90";
    const activeStateStyle = active ? "translate-y-[4px] shadow-none brightness-90 inset-shadow-sm" : "";
    const disabledStyle = disabled
      ? "opacity-50 cursor-not-allowed grayscale active:translate-y-0 active:shadow-[0_4px_0_#111]"
      : "";

    return (
      <motion.button
        ref={ref}
        whileTap={disabled || variant === "ghost" ? {} : { y: 4, transition: { duration: 0.08 } }}
        className={cn(
          baseStyle,
          sizeStyle,
          variants[variant],
          !disabled && variant !== "ghost" && pressedStyle,
          activeStateStyle,
          disabledStyle,
          className
        )}
        disabled={disabled}
        {...props}
      >
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.05] mix-blend-overlay"
          style={{
            backgroundImage:
              'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.8%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")',
          }}
        />
        {children}
      </motion.button>
    );
  }
);
MechButton.displayName = "MechButton";

export function MetalPanel({
  children,
  className,
  inset,
}: {
  children: React.ReactNode;
  className?: string;
  inset?: boolean;
}) {
  return (
    <div
      className={cn(
        "relative bg-gradient-to-b from-[#2a2a2a] to-[#1e1e1e] border border-[#444] rounded-xl overflow-hidden",
        inset
          ? "shadow-[inset_0_4px_10px_rgba(0,0,0,0.6)] border-t-[#111] border-b-[#444]"
          : "shadow-[0_8px_16px_rgba(0,0,0,0.5),inset_0_1px_1px_rgba(255,255,255,0.1)]",
        className
      )}
    >
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage:
            'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")',
        }}
      />
      <div className="relative z-10">{children}</div>
    </div>
  );
}

export function Rivet({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "w-2 h-2 rounded-full bg-gradient-to-br from-[#555] to-[#222] border border-[#111] shadow-[inset_0_1px_1px_rgba(255,255,255,0.4),0_1px_1px_rgba(0,0,0,0.5)] flex items-center justify-center",
        className
      )}
    >
      <div className="w-[1px] h-[4px] bg-[#111] rotate-45" />
      <div className="w-[4px] h-[1px] bg-[#111] absolute rotate-45" />
    </div>
  );
}

export function ToggleSwitch({ checked, onChange }: { checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <div
      className="relative w-12 h-6 rounded-full bg-[#111] shadow-[inset_0_2px_4px_rgba(0,0,0,0.8),0_1px_1px_rgba(255,255,255,0.1)] cursor-pointer flex items-center px-1"
      onClick={() => onChange(!checked)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onChange(!checked);
        }
      }}
      role="switch"
      aria-checked={checked}
      tabIndex={0}
    >
      <motion.div
        className={cn(
          "w-5 h-5 rounded-full bg-gradient-to-b from-[#ccc] to-[#888] shadow-[0_2px_4px_rgba(0,0,0,0.5),inset_0_2px_2px_rgba(255,255,255,0.8)] border border-[#555]"
        )}
        animate={{ x: checked ? 24 : 0 }}
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
      >
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex gap-[2px]">
          <div className="w-[1px] h-2 bg-[#666]" />
          <div className="w-[1px] h-2 bg-[#666]" />
        </div>
      </motion.div>
    </div>
  );
}

export function Knob({
  value,
  min = 0,
  max = 100,
  onChange,
}: {
  value: number;
  min?: number;
  max?: number;
  onChange: (val: number) => void;
}) {
  const rotation = -135 + ((value - min) / (max - min)) * 270;
  return (
    <div
      className="w-10 h-10 rounded-full bg-gradient-to-b from-[#444] to-[#222] border border-[#111] shadow-[0_4px_6px_rgba(0,0,0,0.6),inset_0_1px_2px_rgba(255,255,255,0.2)] flex items-center justify-center cursor-pointer relative"
      onClick={() => onChange(value >= max ? min : value + 10)}
      role="slider"
      aria-valuenow={value}
      aria-valuemin={min}
      aria-valuemax={max}
      tabIndex={0}
    >
      <div className="absolute -inset-2 rounded-full border border-[#333] border-dashed opacity-30 pointer-events-none" />
      <div className="w-8 h-8 rounded-full bg-gradient-to-b from-[#333] to-[#111] shadow-[inset_0_2px_4px_rgba(0,0,0,0.8)] flex items-center justify-center">
        <motion.div
          className="w-full h-full rounded-full relative"
          animate={{ rotate: rotation }}
          transition={{ type: "spring", damping: 20 }}
        >
          <div className="absolute top-1 left-1/2 -translate-x-1/2 w-1 h-2 bg-[#00d8ff] rounded-full shadow-[0_0_4px_#00d8ff]" />
        </motion.div>
      </div>
    </div>
  );
}

export function SegmentedControl({
  options,
  selected,
  onChange,
}: {
  options: string[];
  selected: string;
  onChange: (val: string) => void;
}) {
  return (
    <div className="flex bg-[#111] p-1 rounded-lg border border-[#333] shadow-[inset_0_2px_5px_rgba(0,0,0,0.5)]">
      {options.map((opt) => {
        const isActive = opt === selected;
        return (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(opt)}
            className={cn(
              "px-4 py-1.5 text-xs font-bold uppercase transition-all rounded-md relative",
              isActive ? "text-[#00d8ff] text-shadow-[0_0_8px_rgba(0,216,255,0.5)]" : "text-[#666] hover:text-[#aaa]"
            )}
          >
            {isActive && (
              <motion.div
                layoutId="skeuo-segment-bg"
                className="absolute inset-0 bg-gradient-to-b from-[#333] to-[#222] border border-[#444] rounded-md shadow-[0_2px_4px_rgba(0,0,0,0.5),inset_0_1px_1px_rgba(255,255,255,0.1)] z-0"
              />
            )}
            <span className="relative z-10">{opt}</span>
          </button>
        );
      })}
    </div>
  );
}

export function FrostedInput({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="relative flex items-center">
      <input
        className={cn(
          "w-full bg-[#1a1a1a]/60 backdrop-blur-md border border-[#333] rounded-lg px-4 py-2 text-[#eee] placeholder:text-[#555] focus:outline-none focus:border-[#00d8ff] focus:ring-1 focus:ring-[#00d8ff]/50 shadow-[inset_0_2px_4px_rgba(0,0,0,0.5)] transition-all",
          className
        )}
        {...props}
      />
      <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent pointer-events-none" />
    </div>
  );
}
