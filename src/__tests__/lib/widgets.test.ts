import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  createDefaultWidget,
  getEnabledWidgets,
  reorderWidgets,
  toggleWidget,
  updateWidgetSettings,
  WIDGET_REGISTRY,
  DEFAULT_WIDGETS,
  type WidgetConfig,
  type WeatherWidgetConfig,
  type NotesWidgetConfig,
  type QuoteWidgetConfig,
} from '@/lib/widgets'

describe('widgets utility functions', () => {
  describe('WIDGET_REGISTRY', () => {
    it('should have all widget types registered', () => {
      expect(WIDGET_REGISTRY).toHaveProperty('weather')
      expect(WIDGET_REGISTRY).toHaveProperty('notes')
      expect(WIDGET_REGISTRY).toHaveProperty('quote')
    })

    it('should have correct weather widget metadata', () => {
      expect(WIDGET_REGISTRY.weather).toEqual({
        type: 'weather',
        name: 'Weather',
        description: 'Display current weather conditions',
        icon: 'cloud',
        defaultSettings: {
          unitSystem: 'metric',
          forecastDisplay: 'expanded',
          alertLevel: 'all',
          alertTypes: {
            wind: true,
            gust: true,
            temperature: true,
            precipitation: true,
            snow: true,
            thunderstorm: true,
            visibility: true,
            uv: true,
            airQuality: true,
          },
        },
      })
    })

    it('should have correct notes widget metadata', () => {
      expect(WIDGET_REGISTRY.notes).toEqual({
        type: 'notes',
        name: 'Quick Notes',
        description: 'Jot down quick notes',
        icon: 'sticky-note',
        defaultSettings: {
          content: '',
          maxLength: 500,
          quickJot: false,
        },
      })
    })

    it('should have correct quote widget metadata', () => {
      expect(WIDGET_REGISTRY.quote).toEqual({
        type: 'quote',
        name: 'Random Quote',
        description: 'Display random inspiring quotes',
        icon: 'quote',
        defaultSettings: {
          autoRotate: true,
          rotateInterval: 86400000,
        },
      })
    })
  })

  describe('DEFAULT_WIDGETS', () => {
    it('should have weather and notes widgets by default', () => {
      expect(DEFAULT_WIDGETS).toHaveLength(2)
      expect(DEFAULT_WIDGETS[0].type).toBe('weather')
      expect(DEFAULT_WIDGETS[1].type).toBe('notes')
    })

    it('should have correct default weather widget config', () => {
      const weatherWidget = DEFAULT_WIDGETS[0] as WeatherWidgetConfig
      expect(weatherWidget).toEqual({
        id: 'weather-default',
        type: 'weather',
        enabled: true,
        order: 0,
        settings: {
          unitSystem: 'metric',
          forecastDisplay: 'expanded',
          alertLevel: 'all',
          alertTypes: {
            wind: true,
            gust: true,
            temperature: true,
            precipitation: true,
            snow: true,
            thunderstorm: true,
            visibility: true,
            uv: true,
            airQuality: true,
          },
        },
      })
    })

    it('should have correct default notes widget config', () => {
      const notesWidget = DEFAULT_WIDGETS[1] as NotesWidgetConfig
      expect(notesWidget).toEqual({
        id: 'notes-default',
        type: 'notes',
        enabled: true,
        order: 1,
        settings: {
          content: '',
          maxLength: 500,
          quickJot: false,
        },
      })
    })
  })

  describe('createDefaultWidget', () => {
    beforeEach(() => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2024-01-01T00:00:00Z'))
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('should create weather widget with default settings', () => {
      const widget = createDefaultWidget('weather', 0)
      expect(widget).toEqual({
        id: 'weather-1704067200000',
        type: 'weather',
        enabled: true,
        order: 0,
        settings: {
          unitSystem: 'metric',
          forecastDisplay: 'expanded',
          alertLevel: 'all',
          alertTypes: {
            wind: true,
            gust: true,
            temperature: true,
            precipitation: true,
            snow: true,
            thunderstorm: true,
            visibility: true,
            uv: true,
            airQuality: true,
          },
        },
      })
    })

    it('should create notes widget with default settings', () => {
      const widget = createDefaultWidget('notes', 1)
      expect(widget).toEqual({
        id: 'notes-1704067200000',
        type: 'notes',
        enabled: true,
        order: 1,
        settings: {
          content: '',
          maxLength: 500,
          quickJot: false,
        },
      })
    })

    it('should create quote widget with default settings', () => {
      const widget = createDefaultWidget('quote', 2)
      expect(widget).toEqual({
        id: 'quote-1704067200000',
        type: 'quote',
        enabled: true,
        order: 2,
        settings: {
          autoRotate: true,
          rotateInterval: 86400000,
        },
      })
    })

    it('should default order to 0 if not specified', () => {
      const widget = createDefaultWidget('weather')
      expect(widget.order).toBe(0)
    })

    it('should generate unique IDs based on timestamp', () => {
      const widget1 = createDefaultWidget('weather')
      vi.advanceTimersByTime(1000)
      const widget2 = createDefaultWidget('weather')
      expect(widget1.id).not.toBe(widget2.id)
    })
  })

  describe('getEnabledWidgets', () => {
    it('should return only enabled widgets', () => {
      const widgets: WidgetConfig[] = [
        { id: '1', type: 'weather', enabled: true, order: 0, settings: { alertLevel: 'all' } },
        { id: '2', type: 'notes', enabled: false, order: 1, settings: { content: '', maxLength: 500, quickJot: false } },
        { id: '3', type: 'quote', enabled: true, order: 2, settings: { autoRotate: true, rotateInterval: 86400000 } },
      ]

      const enabled = getEnabledWidgets(widgets)
      expect(enabled).toHaveLength(2)
      expect(enabled[0].id).toBe('1')
      expect(enabled[1].id).toBe('3')
    })

    it('should return widgets sorted by order', () => {
      const widgets: WidgetConfig[] = [
        { id: '1', type: 'weather', enabled: true, order: 2, settings: { alertLevel: 'all' } },
        { id: '2', type: 'notes', enabled: true, order: 0, settings: { content: '', maxLength: 500, quickJot: false } },
        { id: '3', type: 'quote', enabled: true, order: 1, settings: { category: 'mixed', autoRotate: true, rotateInterval: 86400000 } },
      ]

      const enabled = getEnabledWidgets(widgets)
      expect(enabled[0].id).toBe('2')
      expect(enabled[1].id).toBe('3')
      expect(enabled[2].id).toBe('1')
    })

    it('should return empty array when no widgets are enabled', () => {
      const widgets: WidgetConfig[] = [
        { id: '1', type: 'weather', enabled: false, order: 0, settings: { alertLevel: 'all' } },
        { id: '2', type: 'notes', enabled: false, order: 1, settings: { content: '', maxLength: 500, quickJot: false } },
      ]

      const enabled = getEnabledWidgets(widgets)
      expect(enabled).toEqual([])
    })

    it('should handle empty widget array', () => {
      const enabled = getEnabledWidgets([])
      expect(enabled).toEqual([])
    })
  })

  describe('reorderWidgets', () => {
    it('should move widget to new position and update order values', () => {
      const widgets: WidgetConfig[] = [
        { id: '1', type: 'weather', enabled: true, order: 0, settings: { alertLevel: 'all' } },
        { id: '2', type: 'notes', enabled: true, order: 1, settings: { content: '', maxLength: 500, quickJot: false } },
        { id: '3', type: 'quote', enabled: true, order: 2, settings: { autoRotate: true, rotateInterval: 86400000 } },
      ]

      const reordered = reorderWidgets(widgets, '1', 2)
      expect(reordered[0].id).toBe('2')
      expect(reordered[0].order).toBe(0)
      expect(reordered[1].id).toBe('3')
      expect(reordered[1].order).toBe(1)
      expect(reordered[2].id).toBe('1')
      expect(reordered[2].order).toBe(2)
    })

    it('should move widget from end to beginning', () => {
      const widgets: WidgetConfig[] = [
        { id: '1', type: 'weather', enabled: true, order: 0, settings: { alertLevel: 'all' } },
        { id: '2', type: 'notes', enabled: true, order: 1, settings: { content: '', maxLength: 500, quickJot: false } },
        { id: '3', type: 'quote', enabled: true, order: 2, settings: { autoRotate: true, rotateInterval: 86400000 } },
      ]

      const reordered = reorderWidgets(widgets, '3', 0)
      expect(reordered[0].id).toBe('3')
      expect(reordered[1].id).toBe('1')
      expect(reordered[2].id).toBe('2')
    })

    it('should return original array if widget ID not found', () => {
      const widgets: WidgetConfig[] = [
        { id: '1', type: 'weather', enabled: true, order: 0, settings: { alertLevel: 'all' } },
        { id: '2', type: 'notes', enabled: true, order: 1, settings: { content: '', maxLength: 500, quickJot: false } },
      ]

      const reordered = reorderWidgets(widgets, 'nonexistent', 1)
      expect(reordered).toEqual(widgets)
    })

    it('should handle moving to same position', () => {
      const widgets: WidgetConfig[] = [
        { id: '1', type: 'weather', enabled: true, order: 0, settings: { alertLevel: 'all' } },
        { id: '2', type: 'notes', enabled: true, order: 1, settings: { content: '', maxLength: 500, quickJot: false } },
      ]

      const reordered = reorderWidgets(widgets, '2', 1)
      expect(reordered[1].id).toBe('2')
    })
  })

  describe('toggleWidget', () => {
    it('should toggle widget enabled state from true to false', () => {
      const widgets: WidgetConfig[] = [
        { id: '1', type: 'weather', enabled: true, order: 0, settings: { alertLevel: 'all' } },
        { id: '2', type: 'notes', enabled: true, order: 1, settings: { content: '', maxLength: 500, quickJot: false } },
      ]

      const toggled = toggleWidget(widgets, '1')
      expect(toggled[0].enabled).toBe(false)
      expect(toggled[1].enabled).toBe(true)
    })

    it('should toggle widget enabled state from false to true', () => {
      const widgets: WidgetConfig[] = [
        { id: '1', type: 'weather', enabled: false, order: 0, settings: { alertLevel: 'all' } },
      ]

      const toggled = toggleWidget(widgets, '1')
      expect(toggled[0].enabled).toBe(true)
    })

    it('should not modify other widgets', () => {
      const widgets: WidgetConfig[] = [
        { id: '1', type: 'weather', enabled: true, order: 0, settings: { alertLevel: 'all' } },
        { id: '2', type: 'notes', enabled: true, order: 1, settings: { content: '', maxLength: 500, quickJot: false } },
        { id: '3', type: 'quote', enabled: false, order: 2, settings: { category: 'mixed', autoRotate: true, rotateInterval: 86400000 } },
      ]

      const toggled = toggleWidget(widgets, '2')
      expect(toggled[0].enabled).toBe(true)
      expect(toggled[1].enabled).toBe(false)
      expect(toggled[2].enabled).toBe(false)
    })

    it('should return unchanged array if widget ID not found', () => {
      const widgets: WidgetConfig[] = [
        { id: '1', type: 'weather', enabled: true, order: 0, settings: { alertLevel: 'all' } },
      ]

      const toggled = toggleWidget(widgets, 'nonexistent')
      expect(toggled).toEqual(widgets)
    })
  })

  describe('updateWidgetSettings', () => {
    it('should update weather widget settings', () => {
      const widgets: WidgetConfig[] = [
        { id: '1', type: 'weather', enabled: true, order: 0, settings: { alertLevel: 'all' } },
      ]

      const updated = updateWidgetSettings(widgets, '1', {
        location: { name: 'London', latitude: 51.5074, longitude: -0.1278 },
      })

      const weatherWidget = updated[0] as WeatherWidgetConfig
      expect(weatherWidget.settings.location).toEqual({
        name: 'London',
        latitude: 51.5074,
        longitude: -0.1278,
      })
    })

    it('should update notes widget settings', () => {
      const widgets: WidgetConfig[] = [
        { id: '1', type: 'notes', enabled: true, order: 0, settings: { content: '', maxLength: 500, quickJot: false } },
      ]

      const updated = updateWidgetSettings(widgets, '1', {
        content: 'Test note',
        quickJot: true,
      })

      const notesWidget = updated[0] as NotesWidgetConfig
      expect(notesWidget.settings.content).toBe('Test note')
      expect(notesWidget.settings.quickJot).toBe(true)
      expect(notesWidget.settings.maxLength).toBe(500)
    })

    it('should update quote widget settings', () => {
      const widgets: WidgetConfig[] = [
        { id: '1', type: 'quote', enabled: true, order: 0, settings: { autoRotate: true, rotateInterval: 86400000 } },
      ]

      const updated = updateWidgetSettings(widgets, '1', {
        autoRotate: false,
        rotateInterval: 3600000,
      })

      const quoteWidget = updated[0] as QuoteWidgetConfig
      expect(quoteWidget.settings.autoRotate).toBe(false)
      expect(quoteWidget.settings.rotateInterval).toBe(3600000)
    })

    it('should merge settings without removing existing ones', () => {
      const widgets: WidgetConfig[] = [
        {
          id: '1',
          type: 'weather',
          enabled: true,
          order: 0,
          settings: {
            location: { name: 'Paris', latitude: 48.8566, longitude: 2.3522 },
          },
        },
      ]

      const updated = updateWidgetSettings(widgets, '1', {
        units: {
          temperature: 'fahrenheit' as const,
          windSpeed: 'mph' as const,
          precipitation: 'inch' as const,
        },
      })

      const weatherWidget = updated[0] as WeatherWidgetConfig
      expect(weatherWidget.settings.location).toEqual({
        name: 'Paris',
        latitude: 48.8566,
        longitude: 2.3522,
      })
      expect(weatherWidget.settings.units?.temperature).toBe('fahrenheit')
    })

    it('should not modify other widgets', () => {
      const widgets: WidgetConfig[] = [
        { id: '1', type: 'weather', enabled: true, order: 0, settings: { alertLevel: 'all' } },
        { id: '2', type: 'notes', enabled: true, order: 1, settings: { content: 'Original', maxLength: 500, quickJot: false } },
      ]

      const updated = updateWidgetSettings(widgets, '1', {
        location: { name: 'Berlin', latitude: 52.52, longitude: 13.405 },
      })

      const notesWidget = updated[1] as NotesWidgetConfig
      expect(notesWidget.settings.content).toBe('Original')
    })

    it('should return unchanged array if widget ID not found', () => {
      const widgets: WidgetConfig[] = [
        { id: '1', type: 'weather', enabled: true, order: 0, settings: { alertLevel: 'all' } },
      ]

      const updated = updateWidgetSettings(widgets, 'nonexistent', { test: 'value' })
      expect(updated).toEqual(widgets)
    })
  })
})
