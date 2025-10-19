# Horizen

Horizen is a privacy-first browser start page combining powerful features: fast client side bang operators, AI chat supporting OpenAI, Anthropic, and Google Gemini, customizable quick links, and a local weather widget.

*Note: Personally, I use a Firefox-based browser (Zen Browser), but gradients render significantly better on Chromium-based browsers for optimal visual experience.*

*Built with assistance from Claude Code mainly for Git workflows, Vercel deployment, test generation, and code refactoring, because I wanted to test it out.*

## ✨ Features

### 🔍 Search
- **Client side bang operators support** for direct site searches (!g, !yt, !gh, etc.)
- **Custom search engines** - add your own search providers

### 💬 AI Chat Assistant
- **Multi-provider support**: OpenAI (GPT-4o, GPT-4 Turbo, GPT-4o Mini), Anthropic (Claude Opus, Sonnet, Haiku), Google (Gemini Pro, Flash)
- **Ghost mode**: send messages without saving to conversation history
- **Message editing**: edit and regenerate messages with different prompts or models
- **Code syntax highlighting** with KaTeX math rendering
- **Markdown support** with tables, lists, and formatting
- **Streaming responses** with real-time text generation
- **Model switching**: change models mid-conversation or retry with different models

### 🔐 Security & Privacy
- **Password protection** (BETA): Optional password-based encryption for API keys using PBKDF2 + AES-256-GCM
- **Session locking**: Lock and unlock your encrypted API keys
- **Local-only storage**: All data stored in browser localStorage, never sent to external servers
- **Encrypted API keys**: AES-256-GCM encryption for all stored API keys
- **Import/Export** (BETA): Backup and restore your data, preferences, and conversations

### ⚙️ Customization
- **Customizable keyboard shortcuts**: Fully rebindable shortcuts for all major actions
- **Quick links dock**: Add custom links with icons (YouTube, GitHub, Mail, Drive, Globe, Chat)
- **Weather widget**: Location-based weather with customizable units (temperature, wind speed, precipitation)
- **Theme preferences**: Toggle weather widget, chat, quick links visibility
- **Persistent preferences**: Settings sync across browser tabs automatically

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

**Recommended: Vercel (Full-Stack with Serverless Functions)**

The easiest way to deploy Horizen is using Vercel, which automatically handles both the frontend and API routes:

1. **Push to GitHub:**
   ```bash
   git push origin main
   ```

2. **Deploy to Vercel:**
   - Connect your GitHub repository to Vercel
   - Vercel will automatically detect the configuration and deploy
   - The build command (`yarn build`) and output directory (`dist`) are pre-configured in `vercel.json`

3. **Update API Origins:**
   - After deployment, update the `ALLOWED_ORIGINS` in `api/openai/chat.ts`, `api/anthropic/messages.ts`, and `api/gemini/generate.ts`
   - Replace `'https://horizen-eta.vercel.app'` with your actual Vercel URL

**Alternative: Other Static Hosts (Without Chat Feature)**
- You can deploy the `/dist` folder to any static host (Netlify, GitHub Pages, etc.)
- Note: The AI chat feature requires serverless functions and will not work on static-only hosts

### API Keys

To use the AI chat feature, you need to configure API keys in the app settings:
- **OpenAI:** Get your key from [platform.openai.com/api-keys](https://platform.openai.com/api-keys)
- **Anthropic:** Get your key from [console.anthropic.com](https://console.anthropic.com/)
- **Google Gemini:** Get your key from [aistudio.google.com/apikey](https://aistudio.google.com/apikey)

**Security:**
- API keys are encrypted with AES-256-GCM before storage in localStorage
- Optional password protection (BETA) adds an extra layer with PBKDF2 key derivation
- Keys are sent through Vercel Edge Functions (not stored on servers)
- Sessions can be locked/unlocked when using password protection

## 📄 License

This project is licensed under the **GNU Affero General Public License v3.0 (AGPL-3.0)**.

This means:
- ✅ You can use, modify, and distribute this software
- ✅ You can use it for commercial purposes
- ⚠️ If you modify and deploy this software on a network server, you **must** make the source code available to users
- ⚠️ Any modifications must also be licensed under AGPL-3.0
- ⚠️ You must include copyright and license notices

See the [LICENSE](LICENSE) file for full details.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request or open an Issue for bugs and feature requests.
