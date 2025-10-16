import ReactMarkdown from 'react-markdown'
import remarkMath from 'remark-math'
import remarkGfm from 'remark-gfm'
import rehypeKatex from 'rehype-katex'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism'

type MessageContentProps = {
  content: string
}

export default function MessageContent({ content }: MessageContentProps) {
  // Convert \(...\) to $...$ and \[...\] to $$...$$ for better LaTeX support
  const processedContent = content
    .replace(/\\\((.*?)\\\)/g, (_, math) => `$${math}$`)
    .replace(/\\\[(.*?)\\\]/gs, (_, math) => `$$${math}$$`)

  return (
    <div className="text-sm min-w-0">
      <ReactMarkdown
        remarkPlugins={[
          [remarkMath, {
            singleDollarTextMath: true,
          }],
          remarkGfm
        ]}
        rehypePlugins={[
          [rehypeKatex, {
            strict: false,
            trust: true,
            macros: {
              "\\eqref": "\\href{#1}{}"
            }
          }]
        ]}
        components={{
        // Code blocks with syntax highlighting
        code({ node, inline, className, children, ...props }: any) {
          const match = /language-(\w+)/.exec(className || '')
          const language = match ? match[1] : ''

          return !inline && language ? (
            <div className="overflow-x-auto max-w-full">
              <SyntaxHighlighter
                style={vscDarkPlus}
                language={language}
                PreTag="div"
                className="rounded-md !bg-black/40 !mt-2 !mb-2"
                customStyle={{
                  margin: 0,
                  padding: '1rem',
                  fontSize: '0.875rem',
                }}
                wrapLongLines={false}
                {...props}
              >
                {String(children).replace(/\n$/, '')}
              </SyntaxHighlighter>
            </div>
          ) : (
            <code
              className="bg-white/10 px-1.5 py-0.5 rounded text-sm font-mono break-all"
              {...props}
            >
              {children}
            </code>
          )
        },
        // Images
        img({ src, alt, ...props }: any) {
          return (
            <img
              src={src}
              alt={alt}
              className="max-w-full h-auto rounded-lg my-2"
              loading="lazy"
              {...props}
            />
          )
        },
        // Links
        a({ children, href, ...props }: any) {
          return (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300 underline"
              {...props}
            >
              {children}
            </a>
          )
        },
        // Headings
        h1({ children, ...props }: any) {
          return <h1 className="text-2xl font-bold mt-4 mb-2" {...props}>{children}</h1>
        },
        h2({ children, ...props }: any) {
          return <h2 className="text-xl font-bold mt-3 mb-2" {...props}>{children}</h2>
        },
        h3({ children, ...props }: any) {
          return <h3 className="text-lg font-semibold mt-3 mb-1" {...props}>{children}</h3>
        },
        // Lists
        ul({ children, ...props }: any) {
          return <ul className="list-disc list-inside my-2 space-y-1" {...props}>{children}</ul>
        },
        ol({ children, ...props }: any) {
          return <ol className="list-decimal list-inside my-2 space-y-1" {...props}>{children}</ol>
        },
        // Blockquotes
        blockquote({ children, ...props }: any) {
          return (
            <blockquote
              className="border-l-4 border-white/30 pl-4 italic my-2 text-white/80"
              {...props}
            >
              {children}
            </blockquote>
          )
        },
        // Horizontal rule
        hr({ ...props }: any) {
          return <hr className="border-white/20 my-4" {...props} />
        },
        // Tables
        table({ children, ...props }: any) {
          return (
            <div className="overflow-x-auto my-2">
              <table className="min-w-full border border-white/20" {...props}>
                {children}
              </table>
            </div>
          )
        },
        thead({ children, ...props }: any) {
          return <thead className="bg-white/5" {...props}>{children}</thead>
        },
        th({ children, ...props }: any) {
          return (
            <th className="border border-white/20 px-3 py-2 text-left font-semibold" {...props}>
              {children}
            </th>
          )
        },
        td({ children, ...props }: any) {
          return (
            <td className="border border-white/20 px-3 py-2" {...props}>
              {children}
            </td>
          )
        },
        // Paragraphs
        p({ children, ...props }: any) {
          return <p className="my-1" {...props}>{children}</p>
        },
      }}
      >
        {processedContent}
      </ReactMarkdown>
    </div>
  )
}
