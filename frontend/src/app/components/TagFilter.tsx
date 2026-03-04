import React, { useState, useEffect } from 'react';
import { Filter, X } from 'lucide-react';
import { GlassCard } from './ui-shared';
import { motion, AnimatePresence } from 'framer-motion';

interface TagFilterProps {
  selectedTags: string[];
  onTagsChange: (tags: string[]) => void;
}

interface TagDefinitions {
  [dimension: string]: string[];
}

export const TagFilter: React.FC<TagFilterProps> = ({
  selectedTags,
  onTagsChange,
}) => {
  const [tagDefinitions, setTagDefinitions] = useState<TagDefinitions>({});
  const [expandedDimension, setExpandedDimension] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTagDefinitions();
  }, []);

  const fetchTagDefinitions = async () => {
    try {
      const response = await fetch('/api/skills/tags/definitions');
      const data = await response.json();
      setTagDefinitions(data);
    } catch (error) {
      console.error('Failed to fetch tag definitions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTagToggle = (tag: string) => {
    if (selectedTags.includes(tag)) {
      onTagsChange(selectedTags.filter(t => t !== tag));
    } else {
      onTagsChange([...selectedTags, tag]);
    }
  };

  const handleClearAll = () => {
    onTagsChange([]);
  };

  const getDimensionColor = (dimension: string) => {
    const colors: Record<string, string> = {
      '工具': 'blue',
      'API': 'purple',
      '危险性': 'green',
      '阶段': 'yellow',
      '链路': 'pink',
      '功能': 'indigo',
      '范围': 'orange',
    };
    return colors[dimension] || 'gray';
  };

  if (loading) {
    return (
      <GlassCard className="p-4">
        <div className="text-sm text-gray-500">加载标签定义中...</div>
      </GlassCard>
    );
  }

  return (
    <div className="space-y-3">
      {/* 已选标签 */}
      {selectedTags.length > 0 && (
        <GlassCard className="p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Filter size={16} className="text-gray-400" />
              <span className="text-sm font-medium text-gray-700">
                已选标签 ({selectedTags.length})
              </span>
            </div>
            <button
              onClick={handleClearAll}
              className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1"
            >
              <X size={12} />
              清空
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {selectedTags.map(tag => (
              <button
                key={tag}
                onClick={() => handleTagToggle(tag)}
                className="px-2 py-1 rounded-full text-xs font-medium bg-blue-500 text-white flex items-center gap-1 hover:bg-blue-600 transition-colors"
              >
                {tag}
                <X size={12} />
              </button>
            ))}
          </div>
        </GlassCard>
      )}

      {/* 标签维度 */}
      <div className="space-y-2">
        {Object.entries(tagDefinitions).map(([dimension, tags]) => {
          const color = getDimensionColor(dimension);
          const isExpanded = expandedDimension === dimension;
          const selectedCount = tags.filter(tag => selectedTags.includes(tag)).length;

          return (
            <GlassCard key={dimension} className="overflow-hidden">
              <button
                onClick={() => setExpandedDimension(isExpanded ? null : dimension)}
                className="w-full p-3 flex items-center justify-between hover:bg-white/5 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <div
                    className={`w-2 h-2 rounded-full bg-${color}-500`}
                  />
                  <span className="text-sm font-medium text-gray-700">
                    {dimension}
                  </span>
                  {selectedCount > 0 && (
                    <span className="text-xs text-gray-500">
                      ({selectedCount})
                    </span>
                  )}
                </div>
                <motion.div
                  animate={{ rotate: isExpanded ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <Filter size={14} className="text-gray-400" />
                </motion.div>
              </button>

              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="px-3 pb-3 flex flex-wrap gap-2">
                      {tags.map(tag => {
                        const isSelected = selectedTags.includes(tag);
                        return (
                          <button
                            key={tag}
                            onClick={() => handleTagToggle(tag)}
                            className={`px-2 py-1 rounded-full text-xs font-medium transition-colors ${
                              isSelected
                                ? `bg-${color}-500 text-white`
                                : 'bg-white/5 text-gray-600 hover:bg-white/10'
                            }`}
                          >
                            {tag}
                          </button>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </GlassCard>
          );
        })}
      </div>
    </div>
  );
};
