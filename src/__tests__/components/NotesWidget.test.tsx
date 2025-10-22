import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import NotesWidget from '@/components/NotesWidget'
import { PrefsProvider } from '@/lib/prefs'
import type { NotesWidgetConfig } from '@/lib/widgets'

const mockConfig: NotesWidgetConfig = {
  id: 'notes-test',
  type: 'notes',
  enabled: true,
  order: 0,
  settings: {
    content: '',
    maxLength: 500,
    quickJot: false,
  },
}

function renderNotesWidget(config: NotesWidgetConfig = mockConfig) {
  return render(
    <PrefsProvider>
      <NotesWidget config={config} />
    </PrefsProvider>
  )
}

describe('NotesWidget', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  describe('Basic Rendering', () => {
    it('should render with title and icon', () => {
      renderNotesWidget()
      expect(screen.getByText('Quick Notes')).toBeInTheDocument()
      const icon = document.querySelector('.lucide-sticky-note')
      expect(icon).toBeInTheDocument()
    })

    it('should show empty state message when no content', () => {
      renderNotesWidget()
      expect(screen.getByText(/no notes yet/i)).toBeInTheDocument()
    })

    it('should show edit button in view mode', () => {
      renderNotesWidget()
      expect(screen.getByTitle('Edit mode')).toBeInTheDocument()
    })

    it('should render with initial content', () => {
      const config = { ...mockConfig, settings: { ...mockConfig.settings, content: 'Test note' } }
      renderNotesWidget(config)
      expect(screen.getByText('Test note')).toBeInTheDocument()
    })

    it('should not show mode toggle in quick jot mode', () => {
      const config = { ...mockConfig, settings: { ...mockConfig.settings, quickJot: true } }
      renderNotesWidget(config)
      expect(screen.queryByTitle('Edit mode')).not.toBeInTheDocument()
      expect(screen.queryByTitle('View mode')).not.toBeInTheDocument()
    })
  })

  describe('Quick Jot Mode', () => {
    it('should start in edit mode when quick jot is enabled', () => {
      const config = { ...mockConfig, settings: { ...mockConfig.settings, quickJot: true } }
      renderNotesWidget(config)
      expect(screen.getByRole('textbox')).toBeInTheDocument()
    })

    it('should show quick jot placeholder', () => {
      const config = { ...mockConfig, settings: { ...mockConfig.settings, quickJot: true } }
      renderNotesWidget(config)
      expect(screen.getByPlaceholderText('Jot down your thoughts...')).toBeInTheDocument()
    })

    it('should show character count', () => {
      const config = { ...mockConfig, settings: { ...mockConfig.settings, quickJot: true } }
      renderNotesWidget(config)
      expect(screen.getByText('0 / 500')).toBeInTheDocument()
    })
  })

  describe('Character Limit', () => {
    it('should display current character count', () => {
      const config = { ...mockConfig, settings: { ...mockConfig.settings, content: 'Hello', quickJot: true } }
      renderNotesWidget(config)
      expect(screen.getByText('5 / 500')).toBeInTheDocument()
    })

    it('should enforce max length in settings', () => {
      const config = { ...mockConfig, settings: { ...mockConfig.settings, maxLength: 100, quickJot: true } }
      renderNotesWidget(config)
      expect(screen.getByText('0 / 100')).toBeInTheDocument()
    })
  })

  describe('Markdown Rendering', () => {
    it('should render bold text', () => {
      const config = { ...mockConfig, settings: { ...mockConfig.settings, content: '**bold**' } }
      renderNotesWidget(config)
      const boldElement = screen.getByText('bold')
      expect(boldElement.tagName).toBe('STRONG')
    })

    it('should render italic text', () => {
      const config = { ...mockConfig, settings: { ...mockConfig.settings, content: '*italic*' } }
      renderNotesWidget(config)
      const italicElement = screen.getByText('italic')
      expect(italicElement.tagName).toBe('EM')
    })

    it('should render strikethrough text', () => {
      const config = { ...mockConfig, settings: { ...mockConfig.settings, content: '~~strike~~' } }
      renderNotesWidget(config)
      const strikeElement = screen.getByText('strike')
      expect(strikeElement.className).toContain('line-through')
    })

    it('should render bold-italic text', () => {
      const config = { ...mockConfig, settings: { ...mockConfig.settings, content: '***bold italic***' } }
      renderNotesWidget(config)
      const element = screen.getByText('bold italic')
      expect(element.className).toContain('font-bold')
      expect(element.className).toContain('italic')
    })

    it('should render unordered list', () => {
      const config = { ...mockConfig, settings: { ...mockConfig.settings, content: '- Item 1\n- Item 2' } }
      renderNotesWidget(config)
      expect(screen.getByText('Item 1')).toBeInTheDocument()
      expect(screen.getByText('Item 2')).toBeInTheDocument()
    })

    it('should render ordered list', () => {
      const config = { ...mockConfig, settings: { ...mockConfig.settings, content: '1. First\n2. Second' } }
      renderNotesWidget(config)
      expect(screen.getByText('First')).toBeInTheDocument()
      expect(screen.getByText('Second')).toBeInTheDocument()
      expect(screen.getByText('1.')).toBeInTheDocument()
      expect(screen.getByText('2.')).toBeInTheDocument()
    })

    it('should render horizontal rule', () => {
      const config = { ...mockConfig, settings: { ...mockConfig.settings, content: 'Above\n---\nBelow' } }
      renderNotesWidget(config)
      expect(document.querySelector('hr')).toBeInTheDocument()
    })

    it('should render blockquote', () => {
      const config = { ...mockConfig, settings: { ...mockConfig.settings, content: '> Quote' } }
      renderNotesWidget(config)
      expect(screen.getByText('Quote')).toBeInTheDocument()
      const blockquote = screen.getByText('Quote').closest('div')
      expect(blockquote?.className).toContain('border-l-2')
    })

    it('should render unchecked checkbox', () => {
      const config = { ...mockConfig, settings: { ...mockConfig.settings, content: '- [ ] Task' } }
      renderNotesWidget(config)
      const checkbox = screen.getByRole('checkbox')
      expect(checkbox).not.toBeChecked()
    })

    it('should render checked checkbox', () => {
      const config = { ...mockConfig, settings: { ...mockConfig.settings, content: '- [x] Done' } }
      renderNotesWidget(config)
      const checkbox = screen.getByRole('checkbox')
      expect(checkbox).toBeChecked()
    })

    it('should apply strikethrough to checked items', () => {
      const config = { ...mockConfig, settings: { ...mockConfig.settings, content: '- [x] Done' } }
      renderNotesWidget(config)
      const text = screen.getByText('Done')
      const parent = text.parentElement
      expect(parent?.className).toContain('line-through')
    })
  })

  describe('Checkbox Interactions', () => {
    it('should toggle checkbox when clicked', async () => {
      const user = userEvent.setup()
      const config = { ...mockConfig, settings: { ...mockConfig.settings, content: '- [ ] Task' } }
      renderNotesWidget(config)

      const checkbox = screen.getByRole('checkbox')
      expect(checkbox).not.toBeChecked()

      await user.click(checkbox)

      expect(checkbox).toBeChecked()
    })

    it('should toggle multiple checkboxes independently', async () => {
      const user = userEvent.setup()
      const config = { ...mockConfig, settings: { ...mockConfig.settings, content: '- [ ] Task 1\n- [ ] Task 2' } }
      renderNotesWidget(config)

      const checkboxes = screen.getAllByRole('checkbox')
      await user.click(checkboxes[0])

      expect(checkboxes[0]).toBeChecked()
      expect(checkboxes[1]).not.toBeChecked()
    })
  })

  describe('Styling and Layout', () => {
    it('should have correct width', () => {
      const { container } = renderNotesWidget()
      const widget = container.firstChild as HTMLElement
      expect(widget.className).toContain('w-[18rem]')
    })

    it('should have backdrop blur', () => {
      const { container } = renderNotesWidget()
      const widget = container.firstChild as HTMLElement
      expect(widget.className).toContain('backdrop-blur')
    })

    it('should have rounded corners', () => {
      const { container } = renderNotesWidget()
      const widget = container.firstChild as HTMLElement
      expect(widget.className).toContain('rounded-xl')
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty content', () => {
      renderNotesWidget()
      expect(screen.getByText(/no notes yet/i)).toBeInTheDocument()
    })

    it('should handle whitespace-only content', () => {
      const config = { ...mockConfig, settings: { ...mockConfig.settings, content: '   \n  ' } }
      renderNotesWidget(config)
      expect(screen.getByText(/no notes yet/i)).toBeInTheDocument()
    })

    it('should handle special characters in edit mode', () => {
      const config = { ...mockConfig, settings: { ...mockConfig.settings, content: '<script>alert("xss")</script>', quickJot: true } }
      renderNotesWidget(config)
      const textarea = screen.getByRole('textbox')
      expect(textarea).toHaveValue('<script>alert("xss")</script>')
    })

  })

  describe('Accessibility', () => {
    it('should have accessible button titles', () => {
      renderNotesWidget()
      expect(screen.getByTitle('Edit mode')).toHaveAttribute('title')
    })

    it('should have proper textarea placeholder', () => {
      const config = { ...mockConfig, settings: { ...mockConfig.settings, quickJot: true } }
      renderNotesWidget(config)
      expect(screen.getByRole('textbox')).toHaveAttribute('placeholder')
    })

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup()
      renderNotesWidget()

      await user.tab()

      expect(screen.getByTitle('Edit mode')).toHaveFocus()
    })
  })
})
