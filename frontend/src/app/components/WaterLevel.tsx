import React, { useEffect, useState } from 'react';

interface WaterLevelProps {
  percentage: number; // 0-100，已使用百分比
  size?: number; // 容器大小
}

export const WaterLevel: React.FC<WaterLevelProps> = ({ percentage, size = 60 }) => {
  const [animatedPercentage, setAnimatedPercentage] = useState(0);

  useEffect(() => {
    // 动画效果：逐渐填充到目标百分比
    const timer = setTimeout(() => {
      setAnimatedPercentage(percentage);
    }, 100);
    return () => clearTimeout(timer);
  }, [percentage]);

  // 计算剩余百分比（percentage 是已使用百分比）
  const remainingPercentage = 100 - animatedPercentage;
  // 波浪线位置：从顶部开始，根据剩余百分比定位
  const wavePosition = (remainingPercentage / 100) * size;

  // 根据剩余百分比选择颜色
  const getColor = () => {
    const remaining = 100 - percentage; // 计算剩余百分比
    if (remaining >= 50) return '#22c55e'; // 草绿色 - 充足（剩余 50-100%）
    if (remaining >= 10) return '#fbbf24'; // 淡黄色 - 中等（剩余 10-50%）
    return '#fca5a5'; // 淡红色 - 危险（剩余 0-10%）
  };

  const color = getColor();

  return (
    <>
      {/* 水位线以下的填充区域 - 使用 SVG 确保圆形裁剪 */}
      <svg
        className="absolute inset-0 w-full h-full transition-all duration-1000 ease-out pointer-events-none"
        style={{ zIndex: 20 }}
        viewBox={`0 0 ${size} ${size}`}
      >
        <defs>
          {/* 定义圆形裁剪路径 */}
          <clipPath id={`bubble-clip-${size}`}>
            <circle cx={size / 2} cy={size / 2} r={size / 2 - 2} />
          </clipPath>
        </defs>

        {/* 填充矩形，从水位线到底部 */}
        <rect
          x="0"
          y={wavePosition}
          width={size}
          height={size - wavePosition}
          fill={color}
          opacity="0.1"
          clipPath={`url(#bubble-clip-${size})`}
        />
      </svg>

      {/* 横向波浪线 - 第一层 */}
      <svg
        className="absolute left-0 w-full transition-all duration-1000 ease-out pointer-events-none"
        style={{
          top: `${wavePosition}px`,
          height: '10px',
          transform: 'translateY(-5px)',
          zIndex: 21
        }}
        viewBox="0 0 1440 320"
        preserveAspectRatio="none"
      >
        <defs>
          <clipPath id={`wave-clip-${size}`}>
            <rect x="0" y="0" width="1440" height="320" />
          </clipPath>
        </defs>
        <path
          stroke={color}
          strokeWidth="6"
          fill="none"
          strokeOpacity="0.7"
          clipPath={`url(#wave-clip-${size})`}
          d="M0,160L48,144C96,128,192,96,288,90.7C384,85,480,107,576,128C672,149,768,171,864,165.3C960,160,1056,128,1152,122.7C1248,117,1344,139,1392,149.3L1440,160"
        >
          <animate
            attributeName="d"
            dur="3s"
            repeatCount="indefinite"
            values="
              M0,160L48,144C96,128,192,96,288,90.7C384,85,480,107,576,128C672,149,768,171,864,165.3C960,160,1056,128,1152,122.7C1248,117,1344,139,1392,149.3L1440,160;
              M0,192L48,181.3C96,171,192,149,288,154.7C384,160,480,192,576,197.3C672,203,768,181,864,170.7C960,160,1056,160,1152,170.7C1248,181,1344,203,1392,213.3L1440,224;
              M0,160L48,144C96,128,192,96,288,90.7C384,85,480,107,576,128C672,149,768,171,864,165.3C960,160,1056,128,1152,122.7C1248,117,1344,139,1392,149.3L1440,160
            "
          />
        </path>
      </svg>

      {/* 横向波浪线 - 第二层（增加深度感） */}
      <svg
        className="absolute left-0 w-full transition-all duration-1000 ease-out pointer-events-none"
        style={{
          top: `${wavePosition}px`,
          height: '10px',
          transform: 'translateY(-4px)',
          zIndex: 21
        }}
        viewBox="0 0 1440 320"
        preserveAspectRatio="none"
      >
        <path
          stroke={color}
          strokeWidth="4"
          fill="none"
          strokeOpacity="0.5"
          d="M0,224L48,213.3C96,203,192,181,288,181.3C384,181,480,203,576,213.3C672,224,768,224,864,213.3C960,203,1056,181,1152,181.3C1248,181,1344,203,1392,213.3L1440,224"
        >
          <animate
            attributeName="d"
            dur="4s"
            repeatCount="indefinite"
            values="
              M0,224L48,213.3C96,203,192,181,288,181.3C384,181,480,203,576,213.3C672,224,768,224,864,213.3C960,203,1056,181,1152,181.3C1248,181,1344,203,1392,213.3L1440,224;
              M0,256L48,240C96,224,192,192,288,181.3C384,171,480,181,576,197.3C672,213,768,235,864,229.3C960,224,1056,192,1152,181.3C1248,171,1344,181,1392,186.7L1440,192;
              M0,224L48,213.3C96,203,192,181,288,181.3C384,181,480,203,576,213.3C672,224,768,224,864,213.3C960,203,1056,181,1152,181.3C1248,181,1344,203,1392,213.3L1440,224
            "
          />
        </path>
      </svg>
    </>
  );
};
