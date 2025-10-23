import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import HabitTrackerWidget from '@/features/widgets/components/HabitTrackerWidget'
import { PrefsProvider } from '@/lib/prefs'
import type { HabitTrackerWidgetConfig } from '@/lib/widgets'

const mockSetPrefs = vi.fn()

vi.mock('@/lib/prefs', async () => {
  const actual = await vi.importActual('@/lib/prefs')
  return {
    ...actual,
    usePrefs: () => ({
      prefs: {
        widgets: [],
      },
      setPrefs: mockSetPrefs,
    }),
  }
})

describe('HabitTrackerWidget', () => {
  let defaultConfig: HabitTrackerWidgetConfig

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-01-01T12:00:00Z'))
    mockSetPrefs.mockClear()

    defaultConfig = {
      id: 'habit-test',
      type: 'habitTracker',
      enabled: true,
      order: 0,
      settings: {
        habits: [],
        resetTime: '02:00',
        timezone: 'UTC',
        unlimitedHeight: false,
        lastResetDate: '2024-01-01T02:00:00Z',
      },
    }
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('Rendering', () => {
    it('should render habit tracker widget', () => {
      render(
        <PrefsProvider>
          <HabitTrackerWidget config={defaultConfig} />
        </PrefsProvider>
      )

      expect(screen.getByText('Habit Tracker')).toBeInTheDocument()
    })

    it('should show empty state when no habits', () => {
      render(
        <PrefsProvider>
          <HabitTrackerWidget config={defaultConfig} />
        </PrefsProvider>
      )

      expect(screen.getByText('No habits yet. Add one below!')).toBeInTheDocument()
    })

    it('should render add habit input', () => {
      render(
        <PrefsProvider>
          <HabitTrackerWidget config={defaultConfig} />
        </PrefsProvider>
      )

      expect(screen.getByPlaceholderText('Add new habit...')).toBeInTheDocument()
    })

    it('should display existing habits', () => {
      const config = {
        ...defaultConfig,
        settings: {
          ...defaultConfig.settings,
          habits: [
            { id: '1', name: 'Exercise', checked: false },
            { id: '2', name: 'Read', checked: true },
          ],
        },
      }

      render(
        <PrefsProvider>
          <HabitTrackerWidget config={config} />
        </PrefsProvider>
      )

      expect(screen.getByText('Exercise')).toBeInTheDocument()
      expect(screen.getByText('Read')).toBeInTheDocument()
    })
  })

  describe('Adding Habits', () => {
    it('should add new habit when clicking add button', () => {
      render(
        <PrefsProvider>
          <HabitTrackerWidget config={defaultConfig} />
        </PrefsProvider>
      )

      const input = screen.getByPlaceholderText('Add new habit...')
      fireEvent.change(input, { target: { value: 'Morning Meditation' } })

      const addButton = screen.getByRole('button')
      fireEvent.click(addButton)

      expect(mockSetPrefs).toHaveBeenCalled()

      const call = mockSetPrefs.mock.calls[mockSetPrefs.mock.calls.length - 1][0]
      const result = call({ widgets: [defaultConfig] })
      const updatedWidget = result.widgets[0] as HabitTrackerWidgetConfig

      expect(updatedWidget.settings.habits).toHaveLength(1)
      expect(updatedWidget.settings.habits[0].name).toBe('Morning Meditation')
      expect(updatedWidget.settings.habits[0].checked).toBe(false)
    })

    it('should add habit when pressing Enter', () => {
      render(
        <PrefsProvider>
          <HabitTrackerWidget config={defaultConfig} />
        </PrefsProvider>
      )

      const input = screen.getByPlaceholderText('Add new habit...')
      fireEvent.change(input, { target: { value: 'Drink Water' } })
      fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' })

      expect(mockSetPrefs).toHaveBeenCalled()
    })

    it('should clear input after adding habit', () => {
      render(
        <PrefsProvider>
          <HabitTrackerWidget config={defaultConfig} />
        </PrefsProvider>
      )

      const input = screen.getByPlaceholderText('Add new habit...') as HTMLInputElement
      fireEvent.change(input, { target: { value: 'Test Habit' } })

      const addButton = screen.getByRole('button')
      fireEvent.click(addButton)

      expect(input.value).toBe('')
    })

    it('should not add empty habit', () => {
      render(
        <PrefsProvider>
          <HabitTrackerWidget config={defaultConfig} />
        </PrefsProvider>
      )

      const addButton = screen.getByRole('button')
      fireEvent.click(addButton)

      expect(mockSetPrefs).not.toHaveBeenCalled()
    })

    it('should trim whitespace from habit name', () => {
      render(
        <PrefsProvider>
          <HabitTrackerWidget config={defaultConfig} />
        </PrefsProvider>
      )

      const input = screen.getByPlaceholderText('Add new habit...')
      fireEvent.change(input, { target: { value: '  Spaced Habit  ' } })

      const addButton = screen.getByRole('button')
      fireEvent.click(addButton)

      expect(mockSetPrefs).toHaveBeenCalled()

      const call = mockSetPrefs.mock.calls[mockSetPrefs.mock.calls.length - 1][0]
      const result = call({ widgets: [defaultConfig] })
      const updatedWidget = result.widgets[0] as HabitTrackerWidgetConfig

      expect(updatedWidget.settings.habits[0].name).toBe('Spaced Habit')
    })

    it('should limit habit name to 100 characters', () => {
      render(
        <PrefsProvider>
          <HabitTrackerWidget config={defaultConfig} />
        </PrefsProvider>
      )

      const longHabit = 'a'.repeat(150)
      const input = screen.getByPlaceholderText('Add new habit...')
      fireEvent.change(input, { target: { value: longHabit } })

      const addButton = screen.getByRole('button')
      fireEvent.click(addButton)

      expect(mockSetPrefs).toHaveBeenCalled()

      const call = mockSetPrefs.mock.calls[mockSetPrefs.mock.calls.length - 1][0]
      const result = call({ widgets: [defaultConfig] })
      const updatedWidget = result.widgets[0] as HabitTrackerWidgetConfig

      expect(updatedWidget.settings.habits[0].name).toHaveLength(100)
    })
  })

  describe('Toggling Habits', () => {
    it('should toggle habit checked state', () => {
      const config = {
        ...defaultConfig,
        settings: {
          ...defaultConfig.settings,
          habits: [
            { id: '1', name: 'Exercise', checked: false },
          ],
        },
      }

      render(
        <PrefsProvider>
          <HabitTrackerWidget config={config} />
        </PrefsProvider>
      )

      const checkbox = screen.getByRole('checkbox')
      fireEvent.click(checkbox)

      expect(mockSetPrefs).toHaveBeenCalled()

      const call = mockSetPrefs.mock.calls[mockSetPrefs.mock.calls.length - 1][0]
      const result = call({ widgets: [config] })
      const updatedWidget = result.widgets[0] as HabitTrackerWidgetConfig

      expect(updatedWidget.settings.habits[0].checked).toBe(true)
    })

    it('should uncheck habit when already checked', () => {
      const config = {
        ...defaultConfig,
        settings: {
          ...defaultConfig.settings,
          habits: [
            { id: '1', name: 'Exercise', checked: true },
          ],
        },
      }

      render(
        <PrefsProvider>
          <HabitTrackerWidget config={config} />
        </PrefsProvider>
      )

      const checkbox = screen.getByRole('checkbox')
      fireEvent.click(checkbox)

      expect(mockSetPrefs).toHaveBeenCalled()

      const call = mockSetPrefs.mock.calls[mockSetPrefs.mock.calls.length - 1][0]
      const result = call({ widgets: [config] })
      const updatedWidget = result.widgets[0] as HabitTrackerWidgetConfig

      expect(updatedWidget.settings.habits[0].checked).toBe(false)
    })
  })

  describe('Deleting Habits', () => {
    it('should delete habit when delete button clicked', () => {
      const config = {
        ...defaultConfig,
        settings: {
          ...defaultConfig.settings,
          habits: [
            { id: '1', name: 'Exercise', checked: false },
            { id: '2', name: 'Read', checked: false },
          ],
        },
      }

      render(
        <PrefsProvider>
          <HabitTrackerWidget config={config} />
        </PrefsProvider>
      )

      const habitRow = screen.getByText('Exercise').closest('div')
      expect(habitRow).toBeInTheDocument()

      const deleteButtons = screen.getAllByRole('button').filter(
        btn => btn.querySelector('svg')?.classList.contains('lucide-x')
      )

      fireEvent.click(deleteButtons[0])

      expect(mockSetPrefs).toHaveBeenCalled()

      const call = mockSetPrefs.mock.calls[mockSetPrefs.mock.calls.length - 1][0]
      const result = call({ widgets: [config] })
      const updatedWidget = result.widgets[0] as HabitTrackerWidgetConfig

      expect(updatedWidget.settings.habits).toHaveLength(1)
      expect(updatedWidget.settings.habits[0].name).toBe('Read')
    })
  })

  describe('Editing Habits', () => {
    it('should enter edit mode when edit button clicked', () => {
      const config = {
        ...defaultConfig,
        settings: {
          ...defaultConfig.settings,
          habits: [
            { id: '1', name: 'Exercise', checked: false },
          ],
        },
      }

      render(
        <PrefsProvider>
          <HabitTrackerWidget config={config} />
        </PrefsProvider>
      )

      const habitRow = screen.getByText('Exercise').closest('div')
      expect(habitRow).toBeInTheDocument()

      const buttons = screen.getAllByRole('button')
      const editButton = buttons[0]

      fireEvent.click(editButton)

      const editInput = screen.getByDisplayValue('Exercise')
      expect(editInput).toBeInTheDocument()
    })

    it('should save edited habit name', () => {
      const config = {
        ...defaultConfig,
        settings: {
          ...defaultConfig.settings,
          habits: [
            { id: '1', name: 'Exercise', checked: false },
          ],
        },
      }

      render(
        <PrefsProvider>
          <HabitTrackerWidget config={config} />
        </PrefsProvider>
      )

      const buttons = screen.getAllByRole('button')
      const editButton = buttons[0]
      fireEvent.click(editButton)

      const editInput = screen.getByDisplayValue('Exercise')
      fireEvent.change(editInput, { target: { value: 'Morning Exercise' } })

      const saveButton = screen.getAllByRole('button')[0]
      expect(saveButton).toBeInTheDocument()
      fireEvent.click(saveButton)

      expect(mockSetPrefs).toHaveBeenCalled()

      const call = mockSetPrefs.mock.calls[mockSetPrefs.mock.calls.length - 1][0]
      const result = call({ widgets: [config] })
      const updatedWidget = result.widgets[0] as HabitTrackerWidgetConfig

      expect(updatedWidget.settings.habits[0].name).toBe('Morning Exercise')
    })

    it('should save edit when pressing Enter', () => {
      const config = {
        ...defaultConfig,
        settings: {
          ...defaultConfig.settings,
          habits: [
            { id: '1', name: 'Exercise', checked: false },
          ],
        },
      }

      render(
        <PrefsProvider>
          <HabitTrackerWidget config={config} />
        </PrefsProvider>
      )

      const buttons = screen.getAllByRole('button')
      const editButton = buttons[0]
      fireEvent.click(editButton)

      const editInput = screen.getByDisplayValue('Exercise')
      fireEvent.change(editInput, { target: { value: 'Updated' } })
      fireEvent.keyDown(editInput, { key: 'Enter', code: 'Enter' })

      expect(mockSetPrefs).toHaveBeenCalled()
    })

    it('should cancel edit when pressing Escape', () => {
      const config = {
        ...defaultConfig,
        settings: {
          ...defaultConfig.settings,
          habits: [
            { id: '1', name: 'Exercise', checked: false },
          ],
        },
      }

      render(
        <PrefsProvider>
          <HabitTrackerWidget config={config} />
        </PrefsProvider>
      )

      const buttons = screen.getAllByRole('button')
      const editButton = buttons[0]
      fireEvent.click(editButton)

      const editInput = screen.getByDisplayValue('Exercise')
      fireEvent.keyDown(editInput, { key: 'Escape', code: 'Escape' })

      expect(screen.queryByDisplayValue('Exercise')).not.toBeInTheDocument()
      expect(mockSetPrefs).not.toHaveBeenCalled()
    })

    it('should limit edited habit name to 100 characters', () => {
      const config = {
        ...defaultConfig,
        settings: {
          ...defaultConfig.settings,
          habits: [
            { id: '1', name: 'Exercise', checked: false },
          ],
        },
      }

      render(
        <PrefsProvider>
          <HabitTrackerWidget config={config} />
        </PrefsProvider>
      )

      const buttons = screen.getAllByRole('button')
      const editButton = buttons[0]
      fireEvent.click(editButton)

      const editInput = screen.getByDisplayValue('Exercise') as HTMLInputElement

      const longText = 'a'.repeat(150)
      fireEvent.change(editInput, { target: { value: longText } })

      expect(editInput.value).toHaveLength(100)
    })
  })

  describe('Daily Reset', () => {
    it('should set last reset date on first load', () => {
      const config = {
        ...defaultConfig,
        settings: {
          ...defaultConfig.settings,
          lastResetDate: undefined,
          habits: [
            { id: '1', name: 'Exercise', checked: true },
          ],
        },
      }

      render(
        <PrefsProvider>
          <HabitTrackerWidget config={config} />
        </PrefsProvider>
      )

      expect(mockSetPrefs).toHaveBeenCalled()
      const call = mockSetPrefs.mock.calls[0][0]
      const result = call({ widgets: [config] })
      const updatedWidget = result.widgets[0] as HabitTrackerWidgetConfig

      expect(updatedWidget.settings.lastResetDate).toBeDefined()
    })

    it('should reset all habits after reset time has passed', () => {
      const yesterdayBeforeReset = new Date('2023-12-31T01:00:00Z')

      const config = {
        ...defaultConfig,
        settings: {
          ...defaultConfig.settings,
          lastResetDate: yesterdayBeforeReset.toISOString(),
          resetTime: '02:00',
          habits: [
            { id: '1', name: 'Exercise', checked: true },
            { id: '2', name: 'Read', checked: true },
          ],
        },
      }

      render(
        <PrefsProvider>
          <HabitTrackerWidget config={config} />
        </PrefsProvider>
      )

      expect(mockSetPrefs).toHaveBeenCalled()
      const call = mockSetPrefs.mock.calls[0][0]
      const result = call({ widgets: [config] })
      const updatedWidget = result.widgets[0] as HabitTrackerWidgetConfig

      expect(updatedWidget.settings.habits[0].checked).toBe(false)
      expect(updatedWidget.settings.habits[1].checked).toBe(false)
    })

    it('should not reset habits before reset time', () => {
      const todayBeforeReset = new Date('2024-01-01T01:00:00Z')

      const config = {
        ...defaultConfig,
        settings: {
          ...defaultConfig.settings,
          lastResetDate: todayBeforeReset.toISOString(),
          resetTime: '02:00',
          habits: [
            { id: '1', name: 'Exercise', checked: true },
          ],
        },
      }

      render(
        <PrefsProvider>
          <HabitTrackerWidget config={config} />
        </PrefsProvider>
      )

      const calls = mockSetPrefs.mock.calls
      if (calls.length > 0) {
        const call = calls[calls.length - 1][0]
        const result = call({ widgets: [config] })
        const updatedWidget = result.widgets[0] as HabitTrackerWidgetConfig

        expect(updatedWidget.settings.habits[0].checked).toBe(true)
      }
    })

    it('should update last reset date after reset', () => {
      const yesterdayBeforeReset = new Date('2023-12-31T01:00:00Z')

      const config = {
        ...defaultConfig,
        settings: {
          ...defaultConfig.settings,
          lastResetDate: yesterdayBeforeReset.toISOString(),
          resetTime: '02:00',
          habits: [
            { id: '1', name: 'Exercise', checked: true },
          ],
        },
      }

      render(
        <PrefsProvider>
          <HabitTrackerWidget config={config} />
        </PrefsProvider>
      )

      expect(mockSetPrefs).toHaveBeenCalled()
      const call = mockSetPrefs.mock.calls[0][0]
      const result = call({ widgets: [config] })
      const updatedWidget = result.widgets[0] as HabitTrackerWidgetConfig

      const lastResetDate = new Date(updatedWidget.settings.lastResetDate!)
      expect(lastResetDate.toISOString()).toBe('2024-01-01T12:00:00.000Z')
    })
  })

  describe('Height Settings', () => {
    it('should apply max height when unlimitedHeight is false', () => {
      const config = {
        ...defaultConfig,
        settings: {
          ...defaultConfig.settings,
          unlimitedHeight: false,
          habits: Array(20).fill(null).map((_, i) => ({
            id: `${i}`,
            name: `Habit ${i}`,
            checked: false,
          })),
        },
      }

      const { container } = render(
        <PrefsProvider>
          <HabitTrackerWidget config={config} />
        </PrefsProvider>
      )

      const habitList = container.querySelector('.space-y-1')
      expect(habitList).toHaveClass('max-h-[16rem]')
      expect(habitList).toHaveClass('overflow-y-auto')
    })

    it('should not apply max height when unlimitedHeight is true', () => {
      const config = {
        ...defaultConfig,
        settings: {
          ...defaultConfig.settings,
          unlimitedHeight: true,
          habits: Array(20).fill(null).map((_, i) => ({
            id: `${i}`,
            name: `Habit ${i}`,
            checked: false,
          })),
        },
      }

      const { container } = render(
        <PrefsProvider>
          <HabitTrackerWidget config={config} />
        </PrefsProvider>
      )

      const habitList = container.querySelector('.space-y-1')
      expect(habitList).not.toHaveClass('max-h-[16rem]')
      expect(habitList).not.toHaveClass('overflow-y-auto')
    })
  })

  describe('Visual States', () => {
    it('should apply strikethrough to checked habits', () => {
      const config = {
        ...defaultConfig,
        settings: {
          ...defaultConfig.settings,
          habits: [
            { id: '1', name: 'Exercise', checked: true },
          ],
        },
      }

      render(
        <PrefsProvider>
          <HabitTrackerWidget config={config} />
        </PrefsProvider>
      )

      const habitText = screen.getByText('Exercise')
      expect(habitText).toHaveClass('line-through')
      expect(habitText).toHaveClass('text-white/50')
    })

    it('should not apply strikethrough to unchecked habits', () => {
      const config = {
        ...defaultConfig,
        settings: {
          ...defaultConfig.settings,
          habits: [
            { id: '1', name: 'Exercise', checked: false },
          ],
        },
      }

      render(
        <PrefsProvider>
          <HabitTrackerWidget config={config} />
        </PrefsProvider>
      )

      const habitText = screen.getByText('Exercise')
      expect(habitText).not.toHaveClass('line-through')
      expect(habitText).not.toHaveClass('text-white/50')
    })
  })
})
