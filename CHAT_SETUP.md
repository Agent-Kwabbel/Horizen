# Chat Feature Setup

The chat sidebar requires a proxy server to avoid CORS issues when calling OpenAI and Anthropic APIs from the browser.

## Running the App with Chat

You need to run **two** terminals:

### Terminal 1: Frontend Dev Server
```bash
yarn dev
```

### Terminal 2: API Proxy Server
```bash
yarn proxy
```

The proxy server runs on `http://localhost:3001` and forwards requests to OpenAI and Anthropic APIs.

## How It Works

1. The frontend sends chat requests to `http://localhost:3001/api/openai/chat` or `http://localhost:3001/api/anthropic/messages`
2. The proxy server adds your API key and forwards the request to the actual API
3. Responses are streamed back to the frontend in real-time

## Configuration

Add your API keys in the Settings panel (bottom-right gear icon):
- **OpenAI API Key**: Get one from https://platform.openai.com/api-keys
- **Anthropic API Key**: Get one from https://console.anthropic.com/settings/keys

Keys are stored in localStorage and sent to the proxy server with each request.

## Features

- **Wide Sidebar**: Resizable chat interface (720px on tablets, 900px on desktop)
- **Model Selection**: Choose between OpenAI (GPT-4o, GPT-4o-mini, etc.) and Anthropic (Claude 3.5 Sonnet, Haiku, Opus)
- **Conversation History**: Create, switch between, and delete conversations
- **Real-time Streaming**: Messages appear as they're generated
- **Keyboard Shortcut**: Press `Ctrl+K` (or `Cmd+K` on Mac) to toggle the chat sidebar
- **ShadCN Components**: Uses Radix UI primitives with ScrollArea for smooth scrolling

## Troubleshooting

If you see CORS errors:
1. Make sure the proxy server is running (`yarn proxy`)
2. Check that it's running on port 3001
3. Verify your API keys are correctly entered in Settings
