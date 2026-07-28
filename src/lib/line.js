import crypto from 'node:crypto'

const LINE_API_BASE = 'https://api.line.me/v2/bot'

export async function pushLineMessage(to, message) {
  const res = await fetch(`${LINE_API_BASE}/message/push`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`,
    },
    body: JSON.stringify({ to, messages: [{ type: 'text', text: message }] }),
  })
  if (!res.ok) {
    const err = new Error(await res.text())
    err.statusCode = res.status
    throw err
  }
}

export async function replyLineMessage(replyToken, message) {
  const res = await fetch(`${LINE_API_BASE}/message/reply`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`,
    },
    body: JSON.stringify({ replyToken, messages: [{ type: 'text', text: message }] }),
  })
  if (!res.ok) {
    console.error('LINE reply failed:', await res.text())
  }
}

export function verifyLineSignature(rawBody, signatureHeader) {
  const secret = process.env.LINE_CHANNEL_SECRET
  if (!secret || !signatureHeader) return false
  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('base64')
  return expected === signatureHeader
}
