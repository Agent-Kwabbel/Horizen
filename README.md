# Horizen

Horizen is a minimal start page that combines a beautiful ambient backdrop with quick access to search, links, and local weather. I needed a new tab page that would match my Linux setup and my browser, so I made one!

Btw, altough I use a Firefox based browser (Zen Browser), gradients on Chormium based browsers are for some reason waaay better. So the background is 10x better if you use Chromium.

## Features
- **Animated aurora back** that fills the screen with softly shifting colors. There is a 5% on a hidden real aurora theme on page load.
- **Keyboard-first DuckDuckGo search** with instant focus on load and `/` shortcut support.
- **Quick links dock** for your most-used destinations, powered by editable preferences stored in local storage.
- **Weather at a glance** with cached results, location search, and manual refresh built on the Open-Meteo API.
- **Persistent preferences provider** that syncs across tabs so updates stay in place on every reload.

## Getting Started
1. Install dependencies: `yarn install`
2. Run the development server: `yarn dev`
3. Build for production: `yarn build`

## Roadmap
Planned improvements for future releases include:
- Using Und*ck to make DuckDuckGo Bang operations faster.
- Allowing users to switch their preferred search engine without code changes.
- Add more available quick link icons.
- And you know, general performance optimizations across the app.
- Maybe some extra shortcuts and more customization/widgets?
