import type { ReactElement } from 'react'
import { render, type RenderOptions } from '@testing-library/react'
import { PrefsProvider } from '@/lib/prefs'

// Custom render function that wraps with PrefsProvider
export function renderWithPrefs(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) {
  return render(ui, { wrapper: PrefsProvider, ...options })
}

// Re-export everything from testing library
export * from '@testing-library/react'
export { renderWithPrefs as render }
