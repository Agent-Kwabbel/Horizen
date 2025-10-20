import { parseMarkdown, type MarkdownLine } from "@/lib/markdown"

type MarkdownRendererProps = {
  content: string
  onCheckboxToggle: (lineIndex: number) => void
}

export function MarkdownRenderer({ content, onCheckboxToggle }: MarkdownRendererProps) {
  const lines = parseMarkdown(content)

  const renderInlineNodes = (line: MarkdownLine) => {
    return line.nodes.map((node, i) => {
      switch (node.type) {
        case 'bold-italic':
          return (
            <span key={i} className="font-bold italic">
              {node.content}
            </span>
          )
        case 'bold':
          return (
            <strong key={i} className="font-bold">
              {node.content}
            </strong>
          )
        case 'italic':
          return (
            <em key={i} className="italic">
              {node.content}
            </em>
          )
        case 'strikethrough':
          return (
            <span key={i} className="line-through">
              {node.content}
            </span>
          )
        case 'text':
          return <span key={i}>{node.content}</span>
        default:
          return null
      }
    })
  }

  return (
    <div className="text-sm space-y-1">
      {lines.map((line, idx) => {
        if (line.type === 'hr') {
          return <hr key={idx} className="border-white/20 my-2" />
        }

        if (line.type === 'blockquote') {
          return (
            <div
              key={idx}
              className="border-l-2 border-white/30 pl-3 italic text-white/80"
              style={{ marginLeft: `${line.indent * 8}px` }}
            >
              {renderInlineNodes(line)}
            </div>
          )
        }

        if (line.type === 'checkbox') {
          return (
            <div
              key={idx}
              className="flex items-start gap-2"
              style={{ marginLeft: `${line.indent * 8}px` }}
            >
              <input
                type="checkbox"
                checked={line.checked}
                onChange={() => onCheckboxToggle(line.lineIndex)}
                className="mt-0.5 cursor-pointer accent-blue-500"
              />
              <span className={line.checked ? 'line-through text-white/50' : ''}>
                {renderInlineNodes(line)}
              </span>
            </div>
          )
        }

        if (line.type === 'list') {
          if (line.listType === 'ordered') {
            return (
              <div
                key={idx}
                className="flex items-start gap-2"
                style={{ marginLeft: `${line.indent * 8}px` }}
              >
                <span className="text-white/70">{line.listNumber}.</span>
                <span>{renderInlineNodes(line)}</span>
              </div>
            )
          } else {
            return (
              <div
                key={idx}
                className="flex items-start gap-2"
                style={{ marginLeft: `${line.indent * 8}px` }}
              >
                <span className="text-white/70">•</span>
                <span>{renderInlineNodes(line)}</span>
              </div>
            )
          }
        }

        return (
          <div key={idx} className="leading-relaxed">
            {renderInlineNodes(line)}
          </div>
        )
      })}
    </div>
  )
}
