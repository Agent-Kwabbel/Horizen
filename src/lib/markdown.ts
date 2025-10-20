/**
 * Simple markdown parser for the notes widget
 * Supports: bold, italic, strikethrough, blockquotes, lists, checkboxes, horizontal rules
 */

export type MarkdownNode = {
  type: 'text' | 'bold' | 'italic' | 'bold-italic' | 'strikethrough' | 'blockquote' | 'hr' | 'list-item' | 'checkbox'
  content: string
  checked?: boolean
  lineIndex?: number
}

export type MarkdownLine = {
  type: 'normal' | 'blockquote' | 'hr' | 'list' | 'checkbox'
  nodes: MarkdownNode[]
  indent: number
  listType?: 'unordered' | 'ordered' | 'checkbox'
  listNumber?: number
  checked?: boolean
  lineIndex: number
}

/**
 * Parse inline markdown (bold, italic, strikethrough)
 */
function parseInline(text: string): MarkdownNode[] {
  const nodes: MarkdownNode[] = []
  let current = ''
  let i = 0

  while (i < text.length) {
    // Bold italic (***text*** or ___text___)
    if (
      (text[i] === '*' && text[i + 1] === '*' && text[i + 2] === '*') ||
      (text[i] === '_' && text[i + 1] === '_' && text[i + 2] === '_')
    ) {
      if (current) {
        nodes.push({ type: 'text', content: current })
        current = ''
      }
      const delimiter = text[i]
      i += 3
      const start = i
      while (i < text.length && !(text[i] === delimiter && text[i + 1] === delimiter && text[i + 2] === delimiter)) {
        i++
      }
      if (i < text.length) {
        const content = text.slice(start, i)
        // Push a single node with a special marker
        nodes.push({ type: 'text', content: `__BOLD_ITALIC__${content}__END_BOLD_ITALIC__` } as any)
        i += 3
      }
    }
    // Bold (**text** or __text__)
    else if (
      (text[i] === '*' && text[i + 1] === '*') ||
      (text[i] === '_' && text[i + 1] === '_')
    ) {
      if (current) {
        nodes.push({ type: 'text', content: current })
        current = ''
      }
      const delimiter = text[i]
      i += 2
      const start = i
      while (i < text.length && !(text[i] === delimiter && text[i + 1] === delimiter)) {
        i++
      }
      if (i < text.length) {
        nodes.push({ type: 'bold', content: text.slice(start, i) })
        i += 2
      }
    }
    // Italic (*text* or _text_)
    else if (text[i] === '*' || text[i] === '_') {
      if (current) {
        nodes.push({ type: 'text', content: current })
        current = ''
      }
      const delimiter = text[i]
      i++
      const start = i
      while (i < text.length && text[i] !== delimiter) {
        i++
      }
      if (i < text.length) {
        nodes.push({ type: 'italic', content: text.slice(start, i) })
        i++
      }
    }
    // Strikethrough (~~text~~)
    else if (text[i] === '~' && text[i + 1] === '~') {
      if (current) {
        nodes.push({ type: 'text', content: current })
        current = ''
      }
      i += 2
      const start = i
      while (i < text.length && !(text[i] === '~' && text[i + 1] === '~')) {
        i++
      }
      if (i < text.length) {
        nodes.push({ type: 'strikethrough', content: text.slice(start, i) })
        i += 2
      }
    }
    else {
      current += text[i]
      i++
    }
  }

  if (current) {
    nodes.push({ type: 'text', content: current })
  }

  // Post-process to extract bold-italic markers
  const processed: MarkdownNode[] = []
  for (const node of nodes) {
    if (node.type === 'text' && node.content.includes('__BOLD_ITALIC__')) {
      const parts = node.content.split(/(__BOLD_ITALIC__|__END_BOLD_ITALIC__)/)
      let inBoldItalic = false
      for (const part of parts) {
        if (part === '__BOLD_ITALIC__') {
          inBoldItalic = true
        } else if (part === '__END_BOLD_ITALIC__') {
          inBoldItalic = false
        } else if (part) {
          if (inBoldItalic) {
            processed.push({ type: 'text', content: part } as any)
            processed[processed.length - 1].type = 'bold-italic' as any
          } else {
            processed.push({ type: 'text', content: part })
          }
        }
      }
    } else {
      processed.push(node)
    }
  }

  return processed
}

/**
 * Parse markdown text into structured lines
 */
export function parseMarkdown(text: string): MarkdownLine[] {
  const lines = text.split('\n')
  const result: MarkdownLine[] = []

  lines.forEach((line, lineIndex) => {
    // Horizontal rule (---)
    if (line.trim() === '---' || line.trim() === '***' || line.trim() === '___') {
      result.push({
        type: 'hr',
        nodes: [{ type: 'hr', content: '' }],
        indent: 0,
        lineIndex,
      })
      return
    }

    // Blockquote (> text)
    if (line.trimStart().startsWith('> ')) {
      const indent = line.length - line.trimStart().length
      const content = line.trimStart().slice(2)
      result.push({
        type: 'blockquote',
        nodes: parseInline(content),
        indent,
        lineIndex,
      })
      return
    }

    // Checkbox (- [ ] or - [x])
    const checkboxMatch = line.match(/^(\s*)-\s+\[([ x])\]\s+(.*)/)
    if (checkboxMatch) {
      const indent = checkboxMatch[1].length
      const checked = checkboxMatch[2].toLowerCase() === 'x'
      const content = checkboxMatch[3]
      result.push({
        type: 'checkbox',
        nodes: parseInline(content),
        indent,
        listType: 'checkbox',
        checked,
        lineIndex,
      })
      return
    }

    // Unordered list (- text)
    const unorderedMatch = line.match(/^(\s*)-\s+(.*)/)
    if (unorderedMatch) {
      const indent = unorderedMatch[1].length
      const content = unorderedMatch[2]
      result.push({
        type: 'list',
        nodes: parseInline(content),
        indent,
        listType: 'unordered',
        lineIndex,
      })
      return
    }

    // Ordered list (1. text)
    const orderedMatch = line.match(/^(\s*)(\d+)\.\s+(.*)/)
    if (orderedMatch) {
      const indent = orderedMatch[1].length
      const number = parseInt(orderedMatch[2])
      const content = orderedMatch[3]
      result.push({
        type: 'list',
        nodes: parseInline(content),
        indent,
        listType: 'ordered',
        listNumber: number,
        lineIndex,
      })
      return
    }

    // Normal text
    result.push({
      type: 'normal',
      nodes: parseInline(line),
      indent: 0,
      lineIndex,
    })
  })

  return result
}

/**
 * Toggle checkbox state in markdown text
 */
export function toggleCheckbox(text: string, lineIndex: number): string {
  const lines = text.split('\n')
  if (lineIndex < 0 || lineIndex >= lines.length) return text

  const line = lines[lineIndex]
  const checkboxMatch = line.match(/^(\s*-\s+\[)([ x])(\].*)/)

  if (checkboxMatch) {
    const checked = checkboxMatch[2].toLowerCase() === 'x'
    lines[lineIndex] = checkboxMatch[1] + (checked ? ' ' : 'x') + checkboxMatch[3]
  }

  return lines.join('\n')
}

/**
 * Auto-continue list when Enter is pressed
 */
export function autoList(text: string, cursorPos: number): { text: string; cursorPos: number } | null {
  const beforeCursor = text.slice(0, cursorPos)
  const afterCursor = text.slice(cursorPos)
  const lines = beforeCursor.split('\n')
  const currentLine = lines[lines.length - 1]

  // Check for checkbox
  const checkboxMatch = currentLine.match(/^(\s*)-\s+\[([ x])\]\s+(.*)/)
  if (checkboxMatch) {
    const indent = checkboxMatch[1]
    const content = checkboxMatch[3]

    // If empty, remove the list marker
    if (content.trim() === '') {
      const newText = beforeCursor.slice(0, beforeCursor.length - currentLine.length) + afterCursor
      return { text: newText, cursorPos: cursorPos - currentLine.length }
    }

    // Continue with new checkbox
    const continuation = `\n${indent}- [ ] `
    return {
      text: beforeCursor + continuation + afterCursor,
      cursorPos: cursorPos + continuation.length,
    }
  }

  // Check for unordered list
  const unorderedMatch = currentLine.match(/^(\s*)-\s+(.*)/)
  if (unorderedMatch) {
    const indent = unorderedMatch[1]
    const content = unorderedMatch[2]

    // If empty, remove the list marker
    if (content.trim() === '') {
      const newText = beforeCursor.slice(0, beforeCursor.length - currentLine.length) + afterCursor
      return { text: newText, cursorPos: cursorPos - currentLine.length }
    }

    // Continue with new bullet
    const continuation = `\n${indent}- `
    return {
      text: beforeCursor + continuation + afterCursor,
      cursorPos: cursorPos + continuation.length,
    }
  }

  // Check for ordered list
  const orderedMatch = currentLine.match(/^(\s*)(\d+)\.\s+(.*)/)
  if (orderedMatch) {
    const indent = orderedMatch[1]
    const number = parseInt(orderedMatch[2])
    const content = orderedMatch[3]

    // If empty, remove the list marker
    if (content.trim() === '') {
      const newText = beforeCursor.slice(0, beforeCursor.length - currentLine.length) + afterCursor
      return { text: newText, cursorPos: cursorPos - currentLine.length }
    }

    // Continue with next number
    const continuation = `\n${indent}${number + 1}. `
    return {
      text: beforeCursor + continuation + afterCursor,
      cursorPos: cursorPos + continuation.length,
    }
  }

  return null
}
