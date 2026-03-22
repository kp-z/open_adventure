/**
 * Markdown 内容检测与摘要工具
 */

/**
 * 检测文本是否包含 Markdown 语法
 */
export function looksLikeMarkdown(text: string): boolean {
  if (!text) return false;

  // 检测常见的 Markdown 语法
  const markdownPatterns = [
    /^#{1,6}\s+.+$/m,           // 标题
    /\*\*.+\*\*/,                // 粗体
    /\*.+\*/,                    // 斜体
    /\[.+\]\(.+\)/,              // 链接
    /```[\s\S]*?```/,            // 代码块
    /^\s*[-*+]\s+/m,             // 无序列表
    /^\s*\d+\.\s+/m,             // 有序列表
    /^\s*>\s+/m,                 // 引用
    /^\s*\|.+\|.+\|$/m,          // 表格
  ];

  return markdownPatterns.some(pattern => pattern.test(text));
}

/**
 * 生成纯文本摘要（去除 Markdown 语法）
 * @param text 原始 Markdown 文本
 * @param maxLength 最大长度（默认 120 字符）
 * @returns 纯文本摘要
 */
export function markdownPlainPreview(text: string, maxLength: number = 120): string {
  if (!text) return '';

  // 去除代码块
  let preview = text.replace(/```[\s\S]*?```/g, '[代码]');
  
  // 去除行内代码
  preview = preview.replace(/`[^`]+`/g, '[代码]');
  
  // 去除链接，保留链接文本
  preview = preview.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
  
  // 去除图片
  preview = preview.replace(/!\[([^\]]*)\]\([^)]+\)/g, '[图片]');
  
  // 去除标题标记
  preview = preview.replace(/^#{1,6}\s+/gm, '');
  
  // 去除粗体/斜体标记
  preview = preview.replace(/\*\*([^*]+)\*\*/g, '$1');
  preview = preview.replace(/\*([^*]+)\*/g, '$1');
  preview = preview.replace(/__([^_]+)__/g, '$1');
  preview = preview.replace(/_([^_]+)_/g, '$1');
  
  // 去除列表标记
  preview = preview.replace(/^\s*[-*+]\s+/gm, '');
  preview = preview.replace(/^\s*\d+\.\s+/gm, '');
  
  // 去除引用标记
  preview = preview.replace(/^\s*>\s+/gm, '');
  
  // 去除表格分隔符
  preview = preview.replace(/^\s*\|?[-:|\s]+\|?\s*$/gm, '');
  
  // 去除多余空行，保留单个换行
  preview = preview.replace(/\n{3,}/g, '\n\n').trim();
  
  // 取首段或首行
  const firstParagraph = preview.split('\n\n')[0] || preview.split('\n')[0] || preview;
  
  // 截断并添加省略号
  if (firstParagraph.length > maxLength) {
    return firstParagraph.substring(0, maxLength).trim() + '...';
  }
  
  return firstParagraph.trim();
}
