import { createRoute, z } from '@hono/zod-openapi'

const SubscriptionSchema = z.object({
  endpoint: z.string().url().openapi({ example: 'https://fcm.googleapis.com/fcm/send/xxxxx' }),
  keys: z.object({
    p256dh: z.string().openapi({ example: 'BN4G...' }),
    auth: z.string().openapi({ example: 'k8Jt...' }),
  }),
})

const SendBodySchema = z.object({
  subscription: SubscriptionSchema,
  title: z.string().min(1).openapi({ example: 'お知らせ' }),
  body: z.string().optional().openapi({ example: '本文' }),
  icon: z.string().url().optional().openapi({ example: 'https://example.com/icon.png' }),
  badge: z.string().url().optional(),
  url: z.string().url().optional().openapi({ description: '通知クリック時に開くURL' }),
  data: z.any().optional().openapi({ description: '任意の追加データ' }),
})

const SendResponseSchema = z.object({
  success: z.boolean(),
})

const ErrorSchema = z.object({
  error: z.string(),
  statusCode: z.number().optional(),
})

export const sendRoute = createRoute({
  method: 'post',
  path: '/send',
  summary: 'Web Push通知の送信',
  request: {
    body: {
      content: { 'application/json': { schema: SendBodySchema } },
      required: true,
    },
  },
  responses: {
    200: {
      content: { 'application/json': { schema: SendResponseSchema } },
      description: '送信成功',
    },
    400: {
      content: { 'application/json': { schema: ErrorSchema } },
      description: '送信失敗',
    },
    410: {
      content: { 'application/json': { schema: ErrorSchema } },
      description: '購読が無効（呼び出し元で該当subscriptionを削除すること）',
    },
  },
})
