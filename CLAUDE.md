# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Horizen is a minimal browser start page built with React, TypeScript, and Vite. It features an animated aurora background, DuckDuckGo search, customizable quick links, and a weather widget powered by Open-Meteo API.

**Key Characteristic**: There's a 5% chance of a hidden "real aurora" theme variant (green/teal hues) appearing on page load instead of the default purple/blue theme.

## Commands

```bash
# Development
yarn install    # Install dependencies
yarn dev        # Start dev server (Vite)
yarn build      # Type check with tsc, then build for production
yarn lint       # Run ESLint
yarn preview    # Preview production build locally
```

## Architecture

### State Management

**Preferences System** (`src/lib/prefs.tsx`):
- Central `PrefsProvider` context wrapping the entire app
- Stores user preferences in localStorage under key `"startpage:prefs"`
- Syncs across tabs using the `storage` event
- Contains: `showWeather` boolean and `links` array of QuickLink objects
- Access via `usePrefs()` hook anywhere in component tree
- Changes persist automatically via useEffect watching prefs state

### Component Structure

**App.tsx**: Root component structure
- Wraps everything in `PrefsProvider`
- `AppBody` component consumes `usePrefs()` to access preferences
- Layout: AuroraCanvas (background) → centered search/clock → bottom quick links → conditional weather widget → settings FAB

**AuroraCanvas.tsx**: Animated background
- Canvas-based blob animation with physics simulation
- Blobs have wandering behavior, edge spring forces, and mutual separation
- Easter egg: 5% chance (`CFG.easterEggOdds`) triggers aurora theme with different color palette
- Respects `prefers-reduced-motion` by showing static frame
- Configuration lives in `CFG` object (blob count, colors, physics constants)

**WeatherWidget.tsx**: Top-right weather display
- Uses Open-Meteo API for weather data (no API key required)
- Caches weather data for 15 minutes in localStorage (`wx:cache:${lat},${lon}`)
- Location stored separately in localStorage (`"wx:location"`)
- Search powered by Open-Meteo geocoding API
- Manual refresh button clears cache and refetches

**SearchBar.tsx**: DuckDuckGo search
- Auto-focuses on page load
- Press `/` to focus from anywhere (when not already typing)
- Submits to `https://duckduckgo.com/?q=...`

**SettingsFab.tsx**: Bottom-right settings button
- Opens sheet with preferences UI
- Toggle weather widget visibility
- Add/edit/remove quick links (label, href, icon)
- Changes save automatically via PrefsProvider

### UI Components

Located in `src/components/ui/`:
- Built with Radix UI primitives (Dialog, Popover, Select, Switch, etc.)
- Styled with Tailwind CSS v4
- Uses shadcn/ui pattern (utility components in ui folder)

### Styling

- Tailwind CSS v4 via `@tailwindcss/vite` plugin
- Path alias: `@` → `./src`
- Custom animation classes from `tw-animate-css` package
- Glass morphism theme: `bg-black/35 backdrop-blur border-white/10`

## Development Notes

### Adding New Quick Link Icons

1. Add icon key to `IconKey` type in `src/lib/prefs.tsx`
2. Add mapping to `ICON_CHOICES` array in `src/components/SettingsFab.tsx`
3. Add icon rendering logic in `src/components/QuickLinks.tsx`

### Weather Data Structure

Weather widget uses Open-Meteo's free API:
- Current weather endpoint: `https://api.open-meteo.com/v1/forecast`
- Geocoding endpoint: `https://geocoding-api.open-meteo.com/v1/search`
- TTL for cached weather: 15 minutes

### Configuration

- Vite config (`vite.config.ts`): React plugin + Tailwind + path alias
- TypeScript configs: `tsconfig.json` (references), `tsconfig.app.json` (src), `tsconfig.node.json` (vite config)
- ESLint: Flat config format (`eslint.config.js`)
- Don't keep any servers (proxy or dev) running for me to test. I prefer to self restart the server and keep it in another tmux window