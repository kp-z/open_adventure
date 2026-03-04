import React from 'react';
import { X, Star, TrendingUp, TrendingDown, Lightbulb } from 'lucide-react';
import type { QualityEvaluation } from '@/lib/api/types';

interface SkillQualityDialogProps {
  skillName: string;
  evaluation: QualityEvaluation;
  onClose: () => void;
}

export const SkillQualityDialog: React.FC<SkillQualityDialogProps> = ({
  skillName,
  evaluation,
  onClose
}) => {
  const getGradeColor = (grade: string) => {
    switch (grade) {
      case 'A':
        return 'text-green-400';
      case 'B':
        return 'text-blue-400';
      case 'C':
        return 'text-yellow-400';
      case 'D':
        return 'text-orange-400';
      case 'F':
        return 'text-red-400';
      default:
        return 'text-gray-400';
    }
  };

  const getDimensionName = (key: string) => {
    const names: Record<string, string> = {
      documentation: '文档完整性',
      clarity: '功能明确性',
      structure: '结构规范性',
      maintainability: '可维护性'
    };
    return names[key] || key;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-gray-900 border border-white/10 rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <div className="flex items-center gap-4">
            <h2 className="text-2xl font-bold text-white">{skillName}</h2>
            <div className="flex items-center gap-2">
              <span className={`text-4xl font-bold ${getGradeColor(evaluation.grade)}`}>
                {evaluation.grade}
              </span>
              <div className="text-sm text-gray-400">
                <div className="font-medium">{evaluation.score}/100</div>
                <div className="text-xs">质量评分</div>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Dimensions */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-4">各维度评分</h3>
            <div className="grid grid-cols-2 gap-4">
              {Object.entries(evaluation.dimensions).map(([key, dim]) => (
                <div
                  key={key}
                  className="bg-white/5 border border-white/10 rounded-lg p-4"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-300">
                      {getDimensionName(key)}
                    </span>
                    <span className="text-lg font-bold text-white">
                      {dim.score}/{dim.max}
                    </span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full transition-all"
                      style={{ width: `${(dim.score / dim.max) * 100}%` }}
                    />
                  </div>
                  {dim.issues && dim.issues.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {dim.issues.map((issue, idx) => (
                        <p key={idx} className="text-xs text-red-400">
                          • {issue}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Strengths */}
          {evaluation.strengths.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                <TrendingUp size={20} className="text-green-400" />
                优点
              </h3>
              <ul className="space-y-2">
                {evaluation.strengths.map((strength, idx) => (
                  <li
                    key={idx}
                    className="text-sm text-gray-300 bg-green-500/10 border border-green-500/20 rounded px-3 py-2"
                  >
                    ✓ {strength}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Weaknesses */}
          {evaluation.weaknesses.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                <TrendingDown size={20} className="text-orange-400" />
                不足
              </h3>
              <ul className="space-y-2">
                {evaluation.weaknesses.map((weakness, idx) => (
                  <li
                    key={idx}
                    className="text-sm text-gray-300 bg-orange-500/10 border border-orange-500/20 rounded px-3 py-2"
                  >
                    ⚠ {weakness}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Suggestions */}
          {evaluation.suggestions.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                <Lightbulb size={20} className="text-yellow-400" />
                改进建议
              </h3>
              <ul className="space-y-2">
                {evaluation.suggestions.map((suggestion, idx) => (
                  <li
                    key={idx}
                    className="text-sm text-gray-300 bg-yellow-500/10 border border-yellow-500/20 rounded px-3 py-2"
                  >
                    💡 {suggestion}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-white/10">
          <button
            onClick={onClose}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded transition-colors"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  );
};
