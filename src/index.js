import { serve } from '@hono/node-server'
import { OpenAPIHono } from '@hono/zod-openapi'
import { apiReference } from '@scalar/hono-api-reference'
import webpush from 'web-push'
import { sendRoute } from './routes/send.js'
import { vapidPublicKeyRoute } from './routes/vapidPublicKey.js'
import { healthRoute } from './routes/health.js'

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT ?? 'mailto:noreply@yahoi.jp',
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
)

const app = new OpenAPIHono()

// Routes
app.openapi(healthRoute, (c) => {
  return c.json({ status: 'ok' })
})

app.openapi(vapidPublicKeyRoute, (c) => {
  return c.json({ publicKey: process.env.VAPID_PUBLIC_KEY })
})

app.openapi(sendRoute, async (c) => {
  const { subscription, title, body, icon, badge, url, data } = c.req.valid('json')

  const payload = JSON.stringify({ title, body, icon, badge, url, data })

  try {
    await webpush.sendNotification(subscription, payload)
    return c.json({ success: true }, 200)
  } catch (err) {
    const statusCode = err.statusCode ?? 400
    const message = err.body || err.message
    return c.json({ error: message, statusCode }, statusCode === 410 ? 410 : 400)
  }
})

// OpenAPI spec
app.doc('/openapi.json', {
  openapi: '3.0.0',
  info: {
    title: 'Pushman API',
    version: '1.0.0',
    description: 'VAPIDを使ったWeb Push通知送信API',
  },
})

// /docs UI
app.get(
  '/docs',
  apiReference({
    spec: { url: '/openapi.json' },
    theme: 'saturn',
  })
)

const port = Number(process.env.PORT ?? 3000)

serve({ fetch: app.fetch, port }, () => {
  console.log(`Pushman API running on port ${port}`)
})
