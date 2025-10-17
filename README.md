# Horizen

Horizen is a minimal start page that combines a beautiful ambient backdrop with quick access to search, links, and local weather. I needed a new tab page that would match my Linux setup and my browser, so I made one!

Btw, altough I use a Firefox based browser (Zen Browser), gradients on Chormium based browsers are for some reason waaay better. So the background is 10x better if you use Chromium.

Also, yes, AI chat sidebar now!

*Little disclaimer, I've tested Claude Code for the first time on this, mainly for helping me out with things like Git (creating commit messages and branches nightmares), hosting on Vercel, and generating tests etc.*

## Features
- **Animated aurora background** that fills the screen with softly shifting colors. There is a 5% chance of a hidden real aurora theme on page load.
- **Keyboard-first DuckDuckGo search** with instant focus on load and `/` shortcut support.
- **Customizable keyboard shortcuts** for quick access to search, chat, settings, and more. Fully customizable via the shortcuts manager.
- **Quick links dock** for your most-used destinations, powered by editable preferences stored in local storage.
- **Weather at a glance** with cached results, location search, and manual refresh built on the Open-Meteo API.
- **AI Chat Assistant** with support for OpenAI (GPT-4o, GPT-4 Turbo, etc.) and Anthropic (Claude) models. Manage multiple conversations with rename and delete capabilities.
- **Persistent preferences provider** that syncs across tabs so updates stay in place on every reload.

## Getting Started

### Development

1. **Install dependencies:**
   ```bash
   yarn install
   ```

2. **Run the development environment:**
   ```bash
   yarn dev
   ```
   This runs both the Vite dev server (port 5173) and the API proxy server (port 3001) concurrently.

3. **Open in browser:**
   Navigate to `http://localhost:5173`

### Production Build

1. **Build the app:**
   ```bash
   yarn build
   ```
   This will:
   - Run TypeScript type checking
   - Build optimized production files to `/dist`

2. **Preview the production build locally:**
   ```bash
   yarn preview
   ```

### Deployment

**NOTE: NEED TO UPDATE THE DEPLOYMENT STEPS, RECENTLY CHANGED.**

For deployment, you have two options:

**Option A: Static Hosting (Without Chat Feature)**
- Deploy the `/dist` folder to any static host (Netlify, Vercel, GitHub Pages, etc.)
- The chat feature will not work without the proxy server

**Option B: Full-Stack Deployment (With Chat Feature)**
- Deploy both the static files AND the proxy server
- Example with a Node.js hosting service:
  1. Deploy `/dist` files
  2. Run `node server.js` as a background process
  3. Ensure the frontend can reach the proxy at the configured URL

### API Keys

To use the AI chat feature, you need to configure API keys in the app settings:
- **OpenAI:** Get your key from https://platform.openai.com/api-keys
- **Anthropic:** Get your key from https://console.anthropic.com/

Keys are stored locally in your browser and sent through the proxy server.

## Keyboard Shortcuts

Default keyboard shortcuts (all customizable in Settings):

- **Ctrl+K** / **⌘K** - Toggle chat sidebar
- **Ctrl+Shift+N** / **⌘⇧N** - Create new chat
- **Ctrl+I** / **⌘I** - Focus chat input
- **Ctrl+U** / **⌘U** - Upload file to chat
- **Ctrl+,** / **⌘,** - Open settings
- **Ctrl+/** / **⌘/** - Open keyboard shortcuts manager
- **Ctrl+W** / **⌘W** - Toggle weather widget
- **/** - Focus search bar
- **Esc** - Close dialogs / unfocus elements

## Roadmap
Planned improvements for future releases include:
- Using Und*ck to make DuckDuckGo Bang operations faster.
- Allowing users to switch their preferred search engine without code changes.
- Add more available quick link icons.
- And you know, general performance optimizations across the app.
