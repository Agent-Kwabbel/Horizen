import express from 'express'
import cors from 'cors'

const app = express()
const PORT = 3001

app.use(cors())
app.use(express.json({ limit: '50mb' }))
app.use(express.urlencoded({ limit: '50mb', extended: true }))

// OpenAI proxy endpoint
app.post('/api/openai/chat', async (req, res) => {
  const apiKey = req.headers['x-api-key']

  if (!apiKey) {
    return res.status(401).json({ error: 'Missing API key' })
  }

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(req.body),
    })

    if (!response.ok) {
      const error = await response.text()
      return res.status(response.status).json({ error })
    }

    // Stream the response
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')

    const reader = response.body.getReader()
    const decoder = new TextDecoder()

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        res.write(chunk)
      }
      res.end()
    } catch (error) {
      console.error('Stream error:', error)
      throw error
    }
  } catch (error) {
    console.error('OpenAI proxy error:', error)
    if (!res.headersSent) {
      res.status(500).json({ error: error.message })
    }
  }
})

// Anthropic proxy endpoint
app.post('/api/anthropic/messages', async (req, res) => {
  const apiKey = req.headers['x-api-key']

  if (!apiKey) {
    return res.status(401).json({ error: 'Missing API key' })
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(req.body),
    })

    if (!response.ok) {
      const error = await response.text()
      return res.status(response.status).json({ error })
    }

    // Stream the response
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')

    const reader = response.body.getReader()
    const decoder = new TextDecoder()

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        res.write(chunk)
      }
      res.end()
    } catch (error) {
      console.error('Stream error:', error)
      throw error
    }
  } catch (error) {
    console.error('Anthropic proxy error:', error)
    if (!res.headersSent) {
      res.status(500).json({ error: error.message })
    }
  }
})

// Gemini proxy endpoint
app.post('/api/gemini/generate', async (req, res) => {
  const apiKey = req.headers['x-api-key']

  if (!apiKey) {
    return res.status(401).json({ error: 'Missing API key' })
  }

  try {
    const { model, contents } = req.body
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?key=${apiKey}&alt=sse`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ contents }),
    })

    if (!response.ok) {
      const error = await response.text()
      return res.status(response.status).json({ error })
    }

    // Stream the response
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')

    const reader = response.body.getReader()
    const decoder = new TextDecoder()

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        res.write(chunk)
      }
      res.end()
    } catch (error) {
      console.error('Stream error:', error)
      throw error
    }
  } catch (error) {
    console.error('Gemini proxy error:', error)
    if (!res.headersSent) {
      res.status(500).json({ error: error.message })
    }
  }
})

// Use HTTP for development (simpler and avoids certificate issues)
app.listen(PORT, () => {
  console.log(`🔧 Proxy server running on http://localhost:${PORT}`)
  console.log(`✅ Development mode - using HTTP`)
})
