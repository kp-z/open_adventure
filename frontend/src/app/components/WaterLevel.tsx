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

  // percentage 是已使用百分比，计算剩余百分比
  const remainingPercentage = 100 - animatedPercentage;
  // 波浪线位置：从顶部开始，根据剩余百分比定位（剩余越多，水位越高）
  const wavePosition = ((100 - remainingPercentage) / 100) * size;

  // 根据剩余百分比选择颜色
  const getColor = () => {
    if (remainingPercentage >= 50) return 'rgba(34, 197, 94, 0.2)'; // 淡绿色 - 充足（剩余 50-100%）
    if (remainingPercentage >= 10) return 'rgba(251, 191, 36, 0.6)'; // 黄色 - 中等（剩余 10-50%）
    return 'rgba(239, 68, 68, 0.6)'; // 红色 - 危险（剩余 0-10%）
  };

  const color = getColor();

  // 考虑边框宽度，clipPath 半径需要更小
  const clipRadius = (size / 2) - 3; // 减去边框宽度和额外的安全边距

  return (
    <>
      {/* 水位线以下的填充区域 - 使用 SVG 确保圆形裁剪 */}
      <svg
        className="absolute inset-0 w-full h-full transition-all duration-1000 ease-out pointer-events-none"
        style={{ zIndex: 20 }}
        viewBox={`0 0 ${size} ${size}`}
      >
        <defs>
          {/* 定义圆形裁剪路径 - 考虑边框宽度 */}
          <clipPath id={`bubble-clip-${size}`}>
            <circle cx={size / 2} cy={size / 2} r={clipRadius} />
          </clipPath>
        </defs>

        {/* 填充矩形，从水位线到底部 */}
        <rect
          x="0"
          y={wavePosition}
          width={size}
          height={size - wavePosition}
          fill={color}
          clipPath={`url(#bubble-clip-${size})`}
        />
      </svg>

      {/* 横向波浪线 - 使用相同的 clipPath 确保不溢出 */}
      <svg
        className="absolute inset-0 w-full h-full transition-all duration-1000 ease-out pointer-events-none"
        style={{ zIndex: 21 }}
        viewBox={`0 0 ${size} ${size}`}
      >
        <defs>
          {/* 使用相同的圆形裁剪路径 */}
          <clipPath id={`bubble-clip-wave-${size}`}>
            <circle cx={size / 2} cy={size / 2} r={clipRadius} />
          </clipPath>
        </defs>

        {/* 波浪线路径 - 应用 clipPath，减小波动幅度 */}
        <g clipPath={`url(#bubble-clip-wave-${size})`}>
          <path
            stroke={color}
            strokeWidth="2"
            fill="none"
            d={`M0,${wavePosition} Q${size * 0.25},${wavePosition - 2} ${size * 0.5},${wavePosition} T${size},${wavePosition}`}
          >
            <animate
              attributeName="d"
              dur="3s"
              repeatCount="indefinite"
              values={`
                M0,${wavePosition} Q${size * 0.25},${wavePosition - 2} ${size * 0.5},${wavePosition} T${size},${wavePosition};
                M0,${wavePosition} Q${size * 0.25},${wavePosition + 2} ${size * 0.5},${wavePosition} T${size},${wavePosition};
                M0,${wavePosition} Q${size * 0.25},${wavePosition - 2} ${size * 0.5},${wavePosition} T${size},${wavePosition}
              `}
            />
          </path>
        </g>
      </svg>
    </>
  );
};
