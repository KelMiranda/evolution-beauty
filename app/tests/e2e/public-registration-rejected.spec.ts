import { expect, test } from '@playwright/test'

test.describe('Public registration validation', () => {
  test('rejects a non-canonical gender with a field issue', async ({ request }) => {
    const response = await request.post('http://localhost:4321/api/public/participants', {
      headers: { 'Content-Type': 'application/json' },
      data: { gender: 'Otro' },
    })

    expect(response.status()).toBe(400)

    const body = (await response.json()) as {
      error: string
      issues: Array<{ path: Array<string | number> }>
    }

    expect(body.error).toBe('validation_failed')
    expect(body.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: expect.arrayContaining(['gender']) }),
      ])
    )
  })
})
