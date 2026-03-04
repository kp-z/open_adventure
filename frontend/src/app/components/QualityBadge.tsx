import React from 'react';
import { Star } from 'lucide-react';

interface QualityBadgeProps {
  score?: number;
  grade?: 'A' | 'B' | 'C' | 'D' | 'F';
  size?: 'sm' | 'md' | 'lg';
  showScore?: boolean;
}

export const QualityBadge: React.FC<QualityBadgeProps> = ({
  score,
  grade,
  size = 'sm',
  showScore = true
}) => {
  if (!grade || score === undefined) {
    return null;
  }

  const getGradeColor = (grade: string) => {
    switch (grade) {
      case 'A':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'B':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'C':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'D':
        return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
      case 'F':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'text-xs px-1.5 py-0.5 gap-1';
      case 'md':
        return 'text-sm px-2 py-1 gap-1.5';
      case 'lg':
        return 'text-base px-3 py-1.5 gap-2';
      default:
        return 'text-xs px-1.5 py-0.5 gap-1';
    }
  };

  const getIconSize = () => {
    switch (size) {
      case 'sm':
        return 12;
      case 'md':
        return 14;
      case 'lg':
        return 16;
      default:
        return 12;
    }
  };

  return (
    <div
      className={`inline-flex items-center rounded border ${getGradeColor(grade)} ${getSizeClasses()} font-medium`}
      title={`Quality Score: ${score}/100`}
    >
      <Star size={getIconSize()} fill="currentColor" />
      <span>{grade}</span>
      {showScore && <span className="opacity-70">{score}</span>}
    </div>
  );
};
