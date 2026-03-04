import React, { useState, useEffect } from 'react';
import { TagBadge } from './TagBadge';

interface TagSelectorProps {
  selectedTags: string[];
  onTagsChange: (tags: string[]) => void;
  maxTags?: number;
}

interface TagDefinitions {
  [dimension: string]: string[];
}

export const TagSelector: React.FC<TagSelectorProps> = ({
  selectedTags,
  onTagsChange,
  maxTags = 10
}) => {
  const [tagDefinitions, setTagDefinitions] = useState<TagDefinitions>({});
  const [searchQuery, setSearchQuery] = useState('');
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
      if (selectedTags.length < maxTags) {
        onTagsChange([...selectedTags, tag]);
      }
    }
  };

  const handleRemoveTag = (tag: string) => {
    onTagsChange(selectedTags.filter(t => t !== tag));
  };

  const filteredDefinitions = Object.entries(tagDefinitions).reduce((acc, [dimension, tags]) => {
    const filtered = tags.filter(tag =>
      tag.toLowerCase().includes(searchQuery.toLowerCase())
    );
    if (filtered.length > 0) {
      acc[dimension] = filtered;
    }
    return acc;
  }, {} as TagDefinitions);

  if (loading) {
    return <div className="text-gray-500">加载标签定义中...</div>;
  }

  return (
    <div className="space-y-4">
      {/* 已选标签 */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium text-gray-700">
            已选标签 ({selectedTags.length}/{maxTags})
          </label>
          {selectedTags.length > 0 && (
            <button
              onClick={() => onTagsChange([])}
              className="text-xs text-gray-500 hover:text-gray-700"
            >
              清空
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-2 min-h-[40px] p-2 border border-gray-200 rounded-lg bg-gray-50">
          {selectedTags.length === 0 ? (
            <span className="text-sm text-gray-400">未选择标签</span>
          ) : (
            selectedTags.map(tag => (
              <TagBadge
                key={tag}
                tag={tag}
                onRemove={() => handleRemoveTag(tag)}
              />
            ))
          )}
        </div>
      </div>

      {/* 搜索框 */}
      <div>
        <input
          type="text"
          placeholder="搜索标签..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* 标签列表（按维度分组） */}
      <div className="space-y-4 max-h-96 overflow-y-auto">
        {Object.entries(filteredDefinitions).map(([dimension, tags]) => (
          <div key={dimension}>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">
              {dimension}
            </h3>
            <div className="flex flex-wrap gap-2">
              {tags.map(tag => {
                const isSelected = selectedTags.includes(tag);
                const isDisabled = !isSelected && selectedTags.length >= maxTags;

                return (
                  <button
                    key={tag}
                    onClick={() => handleTagToggle(tag)}
                    disabled={isDisabled}
                    className={`
                      px-3 py-1.5 rounded-full text-sm font-medium border transition-colors
                      ${isSelected
                        ? 'bg-blue-500 text-white border-blue-500'
                        : isDisabled
                        ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                      }
                    `}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* 提示信息 */}
      {selectedTags.length >= maxTags && (
        <div className="text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-lg p-2">
          已达到最大标签数量限制（{maxTags} 个）
        </div>
      )}
    </div>
  );
};
