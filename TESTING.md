# Testing Documentation

This document describes the comprehensive unit testing setup for the Horizen start page application.

## Overview

The project uses **Vitest** as the test runner with **React Testing Library** for component testing. All tests are configured to run in a jsdom environment with proper mocking for browser APIs.

## Test Structure

Tests are organized in a dedicated `src/__tests__` directory with the following structure:

```
src/__tests__/
├── components/          # Component unit tests
│   ├── AuroraCanvas.test.tsx
│   ├── QuickLinks.test.tsx
│   ├── SearchBar.test.tsx
│   ├── SettingsFab.test.tsx
│   └── WeatherWidget.test.tsx
├── integration/         # Integration tests
│   └── App.test.tsx
└── lib/                 # Library/utility tests
    └── prefs.test.tsx

src/test/               # Test configuration & utilities
├── setup.ts            # Global test setup and mocks
└── utils.tsx           # Custom render helpers
```

## Test Coverage

### Test Statistics
- **Total Tests**: 147
- **Test Files**: 7
- **All Tests Passing**: ✅

### Components Tested

1. **PrefsProvider** (`src/__tests__/lib/prefs.test.tsx`) - 17 tests
   - localStorage persistence
   - Default preferences loading
   - Preference updates (weather, chat, links, models)
   - Cross-tab synchronization via storage events
   - Error handling for corrupted data
   - Conversations management

2. **SearchBar** (`src/__tests__/components/SearchBar.test.tsx`) - 24 tests
   - Search query submission
   - DuckDuckGo integration
   - Auto-focus behavior
   - Keyboard shortcut (`/` key)
   - Empty/whitespace validation
   - Special character encoding
   - Accessibility features

3. **QuickLinks** (`src/__tests__/components/QuickLinks.test.tsx`) - 19 tests
   - Link rendering
   - Icon display for all types
   - External link security (target="_blank", rel="noopener noreferrer")
   - Empty state handling
   - URL handling (query params, hash fragments)
   - Accessibility

4. **WeatherWidget** (`src/__tests__/components/WeatherWidget.test.tsx`) - 26 tests
   - Location selection and search
   - Weather data fetching from Open-Meteo API
   - 15-minute cache implementation
   - Weather icon selection based on conditions
   - Manual refresh functionality
   - Error handling
   - Loading states

5. **AuroraCanvas** (`src/__tests__/components/AuroraCanvas.test.tsx`) - 22 tests
   - Canvas rendering
   - Animation loop
   - Reduced motion support
   - Responsive resizing
   - Device pixel ratio handling
   - Cleanup on unmount

6. **SettingsFab** (`src/__tests__/components/SettingsFab.test.tsx`) - 29 tests
   - Settings dialog opening
   - Weather/chat toggles
   - API key management (OpenAI, Anthropic)
   - API key visibility toggles
   - Quick links CRUD operations
   - Verified org models toggle
   - Delete all chats confirmation
   - Preference persistence

7. **App Integration** (`src/__tests__/integration/App.test.tsx`) - 24 tests
   - Full app rendering
   - Component integration
   - Preference-driven visibility
   - Chat sidebar toggle (Ctrl+K / Cmd+K)
   - Settings interaction
   - Weather widget integration
   - Quick links updates
   - Cross-component state management

## Test Scripts

```bash
# Run tests in watch mode (interactive)
yarn test

# Run tests with UI dashboard
yarn test:ui

# Run tests once (CI mode)
yarn test:run

# Run tests with coverage report
yarn test:coverage
```

## Test Configuration

### Vitest Config (`vitest.config.ts`)
- Environment: jsdom
- Globals: enabled
- CSS support: enabled
- Coverage provider: v8
- Setup file: `src/test/setup.ts`

### Test Setup (`src/test/setup.ts`)
Provides comprehensive mocking for:
- DOM APIs (IntersectionObserver, matchMedia)
- Canvas API with gradient support
- Animation frame APIs
- Geolocation API
- Auto-cleanup after each test

### Test Utilities (`src/test/utils.tsx`)
- Custom `render` function with PrefsProvider wrapper
- Re-exports of all testing library utilities

## Writing Tests

### Component Test Example

```typescript
import { describe, it, expect } from 'vitest'
import { render, screen } from '@/test/utils'
import userEvent from '@testing-library/user-event'
import MyComponent from './MyComponent'

describe('MyComponent', () => {
  it('should render correctly', () => {
    render(<MyComponent />)
    expect(screen.getByText('Hello')).toBeInTheDocument()
  })

  it('should handle user interaction', async () => {
    const user = userEvent.setup()
    render(<MyComponent />)

    await user.click(screen.getByRole('button'))

    expect(screen.getByText('Clicked')).toBeInTheDocument()
  })
})
```

### Best Practices

1. **Use Testing Library Queries**
   - Prefer `getByRole`, `getByLabelText`, `getByText`
   - Avoid `querySelector` when possible

2. **User Interactions**
   - Always use `userEvent` from `@testing-library/user-event`
   - Use `await` with async interactions

3. **Async Operations**
   - Use `waitFor` for async state updates
   - Use `findBy*` queries for elements that appear asynchronously

4. **Mocking**
   - Mock external APIs (fetch, localStorage)
   - Mock heavy components in integration tests
   - Clear mocks in `beforeEach`

5. **Accessibility**
   - Test ARIA labels and roles
   - Verify keyboard navigation
   - Check screen reader content

## Continuous Integration

The test suite is designed to run in CI environments:
- No external dependencies
- Fast execution (~4 seconds)
- Comprehensive error reporting
- Exit code 0 on success

## Known Warnings

Some minor React warnings may appear:
- Missing descriptions in Radix UI dialog components (cosmetic only)
- These do not affect test validity or application functionality

## Future Improvements

- Add visual regression testing
- Implement E2E tests with Playwright
- Add performance benchmarks
- Increase coverage to 95%+
- Add mutation testing

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/react)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
