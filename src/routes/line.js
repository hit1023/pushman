import { createRoute, z } from '@hono/zod-openapi'

const LineSendBodySchema = z.object({
  to: z.string().min(1).openapi({
    description: 'LINEのuserId（Uで始まる文字列）。Webhook経由での友だち追加時に自動返信される',
    example: 'U4af4980629...',
  }),
  message: z.string().min(1).openapi({ example: 'お知らせ' }),
})

const LineSendResponseSchema = z.object({ success: z.boolean() })

const ErrorSchema = z.object({ error: z.string() })

export const lineSendRoute = createRoute({
  method: 'post',
  path: '/line/send',
  summary: 'LINEへのメッセージ送信',
  request: {
    body: {
      content: { 'application/json': { schema: LineSendBodySchema } },
      required: true,
    },
  },
  responses: {
    200: {
      content: { 'application/json': { schema: LineSendResponseSchema } },
      description: '送信成功',
    },
    400: {
      content: { 'application/json': { schema: ErrorSchema } },
      description: '送信失敗',
    },
  },
})
