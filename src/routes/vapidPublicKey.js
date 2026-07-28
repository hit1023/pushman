import { createRoute, z } from '@hono/zod-openapi'

export const vapidPublicKeyRoute = createRoute({
  method: 'get',
  path: '/vapid-public-key',
  summary: 'VAPID公開鍵取得（クライアント側の購読登録に使用）',
  responses: {
    200: {
      content: {
        'application/json': {
          schema: z.object({ publicKey: z.string() }),
        },
      },
      description: 'OK',
    },
  },
})
