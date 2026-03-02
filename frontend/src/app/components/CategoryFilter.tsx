import React, { useState } from 'react';
import { ChevronDown, Box, User, FolderGit2, Puzzle } from 'lucide-react';
import { GlassCard } from './ui-shared';
import { motion, AnimatePresence } from 'framer-motion';

export type CategoryType = 'all' | 'user' | 'plugin' | 'project' | 'builtin';

interface CategoryCounts {
  builtin: number;
  user: number;
  project: number;
  plugin: number;
}

interface SubCategory {
  id: string;
  name: string;
  count: number;
}

interface CategoryFilterProps {
  selectedCategory: CategoryType;
  selectedSubCategories: string[];
  counts: CategoryCounts;
  projectSubCategories?: SubCategory[];
  pluginSubCategories?: SubCategory[];
  onCategoryChange: (category: CategoryType) => void;
  onSubCategoriesChange: (subCategories: string[]) => void;
}

export const CategoryFilter: React.FC<CategoryFilterProps> = ({
  selectedCategory,
  selectedSubCategories,
  counts,
  projectSubCategories = [],
  pluginSubCategories = [],
  onCategoryChange,
  onSubCategoriesChange,
}) => {
  const [expandedCategory, setExpandedCategory] = useState<CategoryType | null>(null);

  const totalCount = counts.builtin + counts.user + counts.project + counts.plugin;

  const categories = [
    {
      type: 'all' as CategoryType,
      label: 'All',
      icon: Box,
      count: totalCount,
      color: 'blue',
      hasSubCategories: false,
    },
    {
      type: 'user' as CategoryType,
      label: 'User',
      icon: User,
      count: counts.user,
      color: 'green',
      hasSubCategories: false,
    },
    {
      type: 'plugin' as CategoryType,
      label: 'Plugin',
      icon: Puzzle,
      count: counts.plugin,
      color: 'orange',
      hasSubCategories: true,
      subCategories: pluginSubCategories,
    },
    {
      type: 'project' as CategoryType,
      label: 'Project',
      icon: FolderGit2,
      count: counts.project,
      color: 'purple',
      hasSubCategories: true,
      subCategories: projectSubCategories,
    },
    {
      type: 'builtin' as CategoryType,
      label: 'Built-in',
      icon: Box,
      count: counts.builtin,
      color: 'blue',
      hasSubCategories: false,
    },
  ];

  const handleCategoryClick = (type: CategoryType, hasSubCategories: boolean) => {
    if (selectedCategory === type) {
      onCategoryChange('all');
      setExpandedCategory(null);
      onSubCategoriesChange([]);
    } else {
      onCategoryChange(type);
      onSubCategoriesChange([]);
      if (hasSubCategories) {
        setExpandedCategory(expandedCategory === type ? null : type);
      } else {
        setExpandedCategory(null);
      }
    }
  };

  const handleSubCategoryClick = (subCategoryId: string) => {
    if (selectedSubCategories.includes(subCategoryId)) {
      onSubCategoriesChange(selectedSubCategories.filter(id => id !== subCategoryId));
    } else {
      onSubCategoriesChange([...selectedSubCategories, subCategoryId]);
    }
  };

  const currentCategory = categories.find(c => c.type === selectedCategory);
  const showSubCategories = currentCategory?.hasSubCategories && currentCategory.subCategories && currentCategory.subCategories.length > 0;

  return (
    <div className="space-y-3 md:space-y-4">
      {/* Main Categories - 移动端极简图标模式，桌面端完整卡片 */}
      <div className="grid grid-cols-5 md:grid-cols-3 lg:grid-cols-5 gap-2 md:gap-4">
        {categories.map((category) => {
          const Icon = category.icon;
          const isSelected = selectedCategory === category.type;

          return (
            <GlassCard
              key={category.type}
              onClick={() => handleCategoryClick(category.type, category.hasSubCategories)}
              className={`transition-all cursor-pointer p-2 md:p-4 ${
                isSelected ? `ring-2 ring-${category.color}-500/50` : ''
              }`}
            >
              {/* 移动端：仅图标和数字 */}
              <div className="md:hidden flex flex-col items-center gap-1">
                <div
                  className={`w-8 h-8 rounded-lg bg-${category.color}-500/20 border border-${category.color}-500/30 flex items-center justify-center`}
                >
                  <Icon className={`text-${category.color}-400`} size={14} />
                </div>
                <span className="text-sm font-black">{category.count}</span>
                {category.hasSubCategories && category.count > 0 && (
                  <ChevronDown
                    size={10}
                    className={`text-gray-400 transition-transform ${
                      isSelected && showSubCategories ? 'rotate-180' : ''
                    }`}
                  />
                )}
              </div>

              {/* 桌面端：完整卡片 */}
              <div className="hidden md:block">
                <div className="flex items-center justify-between mb-3">
                  <div
                    className={`w-12 h-12 rounded-2xl bg-${category.color}-500/20 border border-${category.color}-500/30 flex items-center justify-center`}
                  >
                    <Icon className={`text-${category.color}-400`} size={24} />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-3xl font-black">{category.count}</span>
                    {category.hasSubCategories && category.count > 0 && (
                      <ChevronDown
                        size={16}
                        className={`text-gray-400 transition-transform ${
                          isSelected && showSubCategories ? 'rotate-180' : ''
                        }`}
                      />
                    )}
                  </div>
                </div>
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">
                  {category.label}
                </h3>
              </div>
            </GlassCard>
          );
        })}
      </div>

      {/* Sub-categories - Horizontal */}
      <AnimatePresence>
        {showSubCategories && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="flex flex-wrap gap-2 p-3 md:p-4 bg-white/5 rounded-xl border border-white/10">
              {currentCategory.subCategories!.map((sub) => {
                const isSelected = selectedSubCategories.includes(sub.id);
                return (
                  <button
                    key={sub.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSubCategoryClick(sub.id);
                    }}
                    className={`px-2 md:px-3 py-1 md:py-1.5 rounded-lg text-xs font-bold transition-colors ${
                      isSelected
                        ? `bg-${currentCategory.color}-500/30 border-2 border-${currentCategory.color}-500 text-${currentCategory.color}-300`
                        : 'bg-white/5 border border-white/10 hover:bg-white/10 text-gray-400'
                    }`}
                  >
                    <span className="truncate">{sub.name}</span>
                    <span className="text-[10px] font-bold ml-1 md:ml-2">({sub.count})</span>
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
