import { serve } from '@hono/node-server'
import { OpenAPIHono } from '@hono/zod-openapi'
import { apiReference } from '@scalar/hono-api-reference'
import { basicAuth } from 'hono/basic-auth'
import webpush from 'web-push'
import { sendRoute } from './routes/send.js'
import { vapidPublicKeyRoute } from './routes/vapidPublicKey.js'
import { healthRoute } from './routes/health.js'
import { readEnvFile, writeEnvFile } from './lib/envFile.js'
import { SETTINGS_FIELDS, renderSettingsPage } from './routes/settingsPage.js'
import { renderTestPage, SERVICE_WORKER_JS } from './routes/testPage.js'
import { renderHomePage } from './routes/homePage.js'
import { renderDocsPage } from './routes/docsPage.js'
import { lineSendRoute } from './routes/line.js'
import { pushLineMessage, replyLineMessage, verifyLineSignature } from './lib/line.js'

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT ?? 'mailto:noreply@yahoi.jp',
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
)

const app = new OpenAPIHono()

// Routes
app.get('/', (c) => {
  return c.html(renderHomePage())
})

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

app.openapi(lineSendRoute, async (c) => {
  const { to, message } = c.req.valid('json')

  try {
    await pushLineMessage(to, message)
    return c.json({ success: true }, 200)
  } catch (err) {
    return c.json({ error: err.message }, 400)
  }
})

// LINEのWebhook。友だち追加・メッセージ受信時に、送信先(to)として使うuserIdを本人に返信する
app.post('/line/webhook', async (c) => {
  const rawBody = await c.req.text()
  const signature = c.req.header('x-line-signature')

  if (!verifyLineSignature(rawBody, signature)) {
    return c.text('invalid signature', 401)
  }

  const body = JSON.parse(rawBody)
  for (const event of body.events ?? []) {
    const userId = event.source?.userId
    if (!userId || !event.replyToken) continue
    if (event.type === 'follow' || event.type === 'message') {
      await replyLineMessage(
        event.replyToken,
        `あなたのuserIdは:\n${userId}\n\nこれをpushmanの送信先(to)に指定してください。`
      )
    }
  }

  return c.json({ ok: true })
})

// 設定ページ（.envの閲覧・編集。RESEND_API_KEY等の機微情報を扱うためBasic認証必須）
app.use('/settings', async (c, next) => {
  const password = process.env.ADMIN_PASSWORD
  if (!password) {
    return c.text('ADMIN_PASSWORD が設定されていません。.env に設定してください。', 500)
  }
  return basicAuth({ username: 'admin', password })(c, next)
})

app.get('/settings', (c) => {
  return c.html(renderSettingsPage(readEnvFile(), c.req.query('saved') === '1'))
})

app.post('/settings', async (c) => {
  const body = await c.req.parseBody()
  const updates = {}
  for (const field of SETTINGS_FIELDS) {
    if (body[field.key] !== undefined) updates[field.key] = body[field.key]
  }
  writeEnvFile(updates)
  return c.redirect('/settings?saved=1')
})

// テスト送信ページ（このブラウザ自身を購読し、/sendへテスト送信する）
app.get('/test', (c) => {
  return c.html(renderTestPage())
})

app.get('/sw.js', (c) => {
  return c.text(SERVICE_WORKER_JS, 200, { 'Content-Type': 'application/javascript' })
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

// /docs UI（タブナビ付きページの中にiframeで埋め込む）
app.get('/docs', (c) => {
  return c.html(renderDocsPage())
})

app.get(
  '/api-docs',
  apiReference({
    spec: { url: '/openapi.json' },
    theme: 'saturn',
  })
)

const port = Number(process.env.PORT ?? 3000)

serve({ fetch: app.fetch, port }, () => {
  console.log(`Pushman API running on port ${port}`)
})
