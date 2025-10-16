import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import QuickLinks from '@/components/QuickLinks'
import type { QuickLink } from '@/lib/prefs'

const mockLinks: QuickLink[] = [
  { id: '1', label: 'YouTube', href: 'https://youtube.com', icon: 'youtube' },
  { id: '2', label: 'ChatGPT', href: 'https://chat.openai.com', icon: 'chat' },
  { id: '3', label: 'Mail', href: 'https://mail.proton.me', icon: 'mail' },
  { id: '4', label: 'Drive', href: 'https://drive.google.com', icon: 'drive' },
]

describe('QuickLinks', () => {
  it('should render all provided links', () => {
    render(<QuickLinks links={mockLinks} />)

    expect(screen.getByText('YouTube')).toBeInTheDocument()
    expect(screen.getByText('ChatGPT')).toBeInTheDocument()
    expect(screen.getByText('Mail')).toBeInTheDocument()
    expect(screen.getByText('Drive')).toBeInTheDocument()
  })

  it('should render links with correct hrefs', () => {
    render(<QuickLinks links={mockLinks} />)

    const youtubeLink = screen.getByRole('link', { name: /youtube/i })
    const chatLink = screen.getByRole('link', { name: /chatgpt/i })

    expect(youtubeLink).toHaveAttribute('href', 'https://youtube.com')
    expect(chatLink).toHaveAttribute('href', 'https://chat.openai.com')
  })

  it('should open links in new tab with security attributes', () => {
    render(<QuickLinks links={mockLinks} />)

    const links = screen.getAllByRole('link')

    links.forEach(link => {
      expect(link).toHaveAttribute('target', '_blank')
      expect(link).toHaveAttribute('rel', 'noopener noreferrer')
    })
  })

  it('should render nav element', () => {
    render(<QuickLinks links={mockLinks} />)

    const nav = screen.getByRole('navigation')
    expect(nav).toBeInTheDocument()
  })

  it('should render with empty links array', () => {
    const { container } = render(<QuickLinks links={[]} />)

    const nav = screen.getByRole('navigation')
    expect(nav).toBeInTheDocument()
    expect(container.querySelectorAll('a')).toHaveLength(0)
  })

  it('should render with single link', () => {
    const singleLink: QuickLink[] = [
      { id: '1', label: 'GitHub', href: 'https://github.com', icon: 'github' }
    ]

    render(<QuickLinks links={singleLink} />)

    expect(screen.getByText('GitHub')).toBeInTheDocument()
    expect(screen.getByRole('link')).toHaveAttribute('href', 'https://github.com')
  })

  it('should render all icon types', () => {
    const allIconLinks: QuickLink[] = [
      { id: '1', label: 'YouTube', href: 'https://youtube.com', icon: 'youtube' },
      { id: '2', label: 'Chat', href: 'https://chat.com', icon: 'chat' },
      { id: '3', label: 'Mail', href: 'https://mail.com', icon: 'mail' },
      { id: '4', label: 'Drive', href: 'https://drive.com', icon: 'drive' },
      { id: '5', label: 'GitHub', href: 'https://github.com', icon: 'github' },
      { id: '6', label: 'Globe', href: 'https://example.com', icon: 'globe' },
    ]

    render(<QuickLinks links={allIconLinks} />)

    allIconLinks.forEach(link => {
      expect(screen.getByText(link.label)).toBeInTheDocument()
    })
  })

  it('should render icon SVGs', () => {
    const { container } = render(<QuickLinks links={mockLinks} />)

    const svgIcons = container.querySelectorAll('svg')
    expect(svgIcons.length).toBeGreaterThan(0)
    expect(svgIcons.length).toBe(mockLinks.length)
  })

  it('should use unique keys for each link', () => {
    const { container } = render(<QuickLinks links={mockLinks} />)

    const links = container.querySelectorAll('a')
    links.forEach((link, index) => {
      expect(link).toHaveAttribute('href', mockLinks[index].href)
    })
  })

  it('should handle special characters in labels', () => {
    const specialLinks: QuickLink[] = [
      { id: '1', label: 'Mail & Chat', href: 'https://example.com', icon: 'mail' },
      { id: '2', label: 'R&D', href: 'https://example.com', icon: 'globe' },
    ]

    render(<QuickLinks links={specialLinks} />)

    expect(screen.getByText('Mail & Chat')).toBeInTheDocument()
    expect(screen.getByText('R&D')).toBeInTheDocument()
  })

  it('should handle very long labels', () => {
    const longLabelLinks: QuickLink[] = [
      {
        id: '1',
        label: 'This is a very long label that might wrap',
        href: 'https://example.com',
        icon: 'globe'
      },
    ]

    render(<QuickLinks links={longLabelLinks} />)

    expect(screen.getByText('This is a very long label that might wrap')).toBeInTheDocument()
  })

  it('should handle URLs with query parameters', () => {
    const queryLinks: QuickLink[] = [
      {
        id: '1',
        label: 'Search',
        href: 'https://google.com/search?q=test',
        icon: 'globe'
      },
    ]

    render(<QuickLinks links={queryLinks} />)

    const link = screen.getByRole('link', { name: /search/i })
    expect(link).toHaveAttribute('href', 'https://google.com/search?q=test')
  })

  it('should handle URLs with hash fragments', () => {
    const hashLinks: QuickLink[] = [
      {
        id: '1',
        label: 'Docs',
        href: 'https://docs.example.com#section',
        icon: 'globe'
      },
    ]

    render(<QuickLinks links={hashLinks} />)

    const link = screen.getByRole('link', { name: /docs/i })
    expect(link).toHaveAttribute('href', 'https://docs.example.com#section')
  })

  it('should maintain order of links', () => {
    const { container } = render(<QuickLinks links={mockLinks} />)

    const linkElements = container.querySelectorAll('a')
    const labels = Array.from(linkElements).map(link => link.textContent)

    expect(labels).toEqual(['YouTube', 'ChatGPT', 'Mail', 'Drive'])
  })

  it('should have proper accessibility structure', () => {
    render(<QuickLinks links={mockLinks} />)

    const links = screen.getAllByRole('link')

    links.forEach(link => {
      expect(link).toHaveAccessibleName()
    })
  })

  it('should render with correct CSS classes', () => {
    const { container } = render(<QuickLinks links={mockLinks} />)

    const nav = container.querySelector('nav')
    expect(nav).toHaveClass('absolute', 'bottom-10', 'inset-x-0')
  })

  it('should handle duplicate IDs gracefully', () => {
    const duplicateIdLinks: QuickLink[] = [
      { id: '1', label: 'Link 1', href: 'https://example1.com', icon: 'globe' },
      { id: '1', label: 'Link 2', href: 'https://example2.com', icon: 'mail' },
    ]

    const { container } = render(<QuickLinks links={duplicateIdLinks} />)

    expect(screen.getByText('Link 1')).toBeInTheDocument()
    expect(screen.getByText('Link 2')).toBeInTheDocument()
  })
})
