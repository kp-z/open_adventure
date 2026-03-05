/**
 * 分类图标和颜色映射
 */
import {
  Code,
  FileSearch,
  FileText,
  TestTube,
  Wrench,
  Bug,
  Database,
  Workflow,
  Sparkles,
  Hammer,
  type LucideIcon
} from 'lucide-react'

export interface CategoryConfig {
  id: string
  name: string
  icon: LucideIcon
  color: string
  description: string
}

export const categoryConfigs: Record<string, CategoryConfig> = {
  'code-generation': {
    id: 'code-generation',
    name: '代码生成',
    icon: Code,
    color: 'text-blue-500',
    description: '生成代码、脚手架、模板等'
  },
  'code-analysis': {
    id: 'code-analysis',
    name: '代码分析',
    icon: FileSearch,
    color: 'text-purple-500',
    description: '代码审查、静态分析、质量检查等'
  },
  'documentation': {
    id: 'documentation',
    name: '文档处理',
    icon: FileText,
    color: 'text-green-500',
    description: '生成文档、API 文档、README 等'
  },
  'testing': {
    id: 'testing',
    name: '测试工具',
    icon: TestTube,
    color: 'text-red-500',
    description: '单元测试、集成测试、测试生成等'
  },
  'refactoring': {
    id: 'refactoring',
    name: '重构优化',
    icon: Wrench,
    color: 'text-orange-500',
    description: '代码重构、性能优化、简化等'
  },
  'debugging': {
    id: 'debugging',
    name: '调试诊断',
    icon: Bug,
    color: 'text-pink-500',
    description: 'Bug 修复、日志分析、错误诊断等'
  },
  'data-processing': {
    id: 'data-processing',
    name: '数据处理',
    icon: Database,
    color: 'text-cyan-500',
    description: '数据转换、格式化、解析等'
  },
  'automation': {
    id: 'automation',
    name: '自动化工具',
    icon: Workflow,
    color: 'text-indigo-500',
    description: '脚本生成、工作流自动化等'
  },
  'ai-enhancement': {
    id: 'ai-enhancement',
    name: 'AI 增强',
    icon: Sparkles,
    color: 'text-yellow-500',
    description: 'Prompt 优化、AI 辅助工具等'
  },
  'utility': {
    id: 'utility',
    name: '通用工具',
    icon: Hammer,
    color: 'text-gray-500',
    description: '其他实用工具'
  }
}

/**
 * 获取分类配置
 */
export function getCategoryConfig(categoryId: string): CategoryConfig | undefined {
  return categoryConfigs[categoryId]
}

/**
 * 获取所有分类配置
 */
export function getAllCategories(): CategoryConfig[] {
  return Object.values(categoryConfigs)
}
