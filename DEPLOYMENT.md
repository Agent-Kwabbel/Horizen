# Deployment Guide

This guide covers how to deploy Horizen to various hosting platforms.

## Important Note About Chat Feature

The AI chat feature requires a backend proxy server (`server.js`) to securely handle API keys. You have two deployment options:

1. **Static-only deployment**: Deploy without the chat feature (simpler)
2. **Full-stack deployment**: Deploy with the chat feature (requires Node.js hosting)

---

## Option 1: Static Deployment (Without Chat)

### Netlify

1. Build the app:
   ```bash
   yarn build
   ```

2. Deploy to Netlify:
   ```bash
   # Install Netlify CLI
   npm install -g netlify-cli

   # Deploy
   netlify deploy --prod --dir=dist
   ```

Or use the Netlify web UI to deploy the `/dist` folder.

### Vercel

1. Install Vercel CLI:
   ```bash
   npm install -g vercel
   ```

2. Deploy:
   ```bash
   yarn build
   vercel --prod
   ```

### GitHub Pages

1. Build the app:
   ```bash
   yarn build
   ```

2. Deploy using GitHub Actions or manually push `/dist` to `gh-pages` branch.

---

## Option 2: Full-Stack Deployment (With Chat)

### Railway

Railway is great for full-stack Node.js apps:

1. Create a `railway.toml` file:
   ```toml
   [build]
   builder = "NIXPACKS"

   [deploy]
   startCommand = "node server.js"
   ```

2. Add build configuration to `package.json`:
   ```json
   "scripts": {
     "start": "node server.js",
     "build": "vite build"
   }
   ```

3. Deploy via Railway CLI or connect your GitHub repo.

### Render

1. Create two services on Render:
   - **Web Service** for the frontend (static site)
   - **Web Service** for the backend (Node.js)

2. Frontend service:
   - Build command: `yarn build`
   - Publish directory: `dist`

3. Backend service:
   - Build command: `yarn install`
   - Start command: `node server.js`

4. Update `src/lib/chat-api.ts` to use your backend URL instead of `localhost:3001`

### Fly.io

1. Create a `fly.toml`:
   ```toml
   app = "horizen"

   [build]

   [http_service]
   internal_port = 3001
   force_https = true
   auto_stop_machines = true
   auto_start_machines = true

   [[vm]]
   size = "shared-cpu-1x"
   ```

2. Create a `Dockerfile`:
   ```dockerfile
   FROM node:20-alpine
   WORKDIR /app
   COPY package.json yarn.lock ./
   RUN yarn install --frozen-lockfile
   COPY . .
   RUN yarn build
   EXPOSE 3001
   CMD ["node", "server.js"]
   ```

3. Deploy:
   ```bash
   fly deploy
   ```

---

## Updating API Endpoints for Production

When deploying the full-stack version, update the API endpoints in `src/lib/chat-api.ts`:

```typescript
// Change from:
const response = await fetch("http://localhost:3001/api/openai/chat", {

// To your production URL:
const response = await fetch("https://your-backend-domain.com/api/openai/chat", {
```

Or better yet, use environment variables:

```typescript
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3001"
const response = await fetch(`${API_BASE_URL}/api/openai/chat`, {
```

Then set `VITE_API_BASE_URL` in your build environment.

---

## Security Considerations

- The proxy server handles API keys securely by keeping them on the server side
- Users enter their API keys in the browser settings
- Keys are sent to your proxy server, which forwards requests to OpenAI/Anthropic
- **Never** commit API keys to your repository
- Consider adding rate limiting to the proxy server for production use
- Use HTTPS in production to encrypt API key transmission

---

## Testing Your Deployment

1. Check that the static site loads correctly
2. Test search functionality
3. Test weather widget
4. Test quick links
5. If chat is enabled:
   - Add API keys in settings
   - Create a new chat
   - Send a test message
   - Check browser console for any CORS or network errors
