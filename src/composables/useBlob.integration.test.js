// Integration tests of the synchronization with a real Blobs backend. They
// need the Blobs project next to this one or at BLOBS_PATH, and are skipped
// otherwise.

import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

import { getRandomId, getRandomSecret } from '@/utils'

const blobsPath = path.resolve(
  process.env.BLOBS_PATH ?? fileURLToPath(new URL('../../../Blobs', import.meta.url))
)
const blobsAvailable = fs.existsSync(path.join(blobsPath, 'src/app.js'))

async function waitFor(condition, timeout = 3000) {
  const deadline = Date.now() + timeout
  while (!condition()) {
    if (Date.now() > deadline) throw new Error('Condition is not met in time')
    await new Promise((resolve) => setTimeout(resolve, 20))
  }
}

describe.skipIf(!blobsAvailable)('useBlob with the Blobs backend', () => {
  let server, storageDir, useBlob

  beforeAll(async () => {
    process.env.TOKEN_SECRET = 'TEST_SECRET'
    const { getToken } = await import(/* @vite-ignore */ path.join(blobsPath, 'src/auth.js'))
    const { createServer } = await import(/* @vite-ignore */ path.join(blobsPath, 'src/app.js'))
    storageDir = fs.mkdtempSync(path.join(os.tmpdir(), 'split-blobs-'))
    ;({ server } = createServer({ storageDir }))
    server.listen(0)
    vi.stubEnv('VITE_BACKEND_URL', `ws://localhost:${server.httpServer.address().port}`)
    vi.stubEnv('VITE_BACKEND_TOKEN', getToken('split'))
    vi.stubEnv('VITE_CIPHER_SALT', 'TEST_SALT')
    ;({ useBlob } = await import('./useBlob'))
  })

  afterAll(async () => {
    vi.unstubAllEnvs()
    await new Promise((resolve) => server?.close(resolve))
    if (storageDir) fs.rmSync(storageDir, { recursive: true, force: true })
  })

  async function connectClients(count) {
    const secret = getRandomSecret()
    const clients = Array.from({ length: count }, () => useBlob())
    for (const client of clients) await client.connect({ secret })
    return clients
  }

  it('delivers changes to other clients', async () => {
    const [one, two] = await connectClients(2)
    const result = await one.update({ title: 'Trip' }, undefined)
    expect(result).toEqual({ success: true, version: 1 })
    await waitFor(() => two.state.version === 1)
    expect(two.state.dataset).toEqual({ title: 'Trip' })
  })

  it('loads the current blob on connection', async () => {
    const secret = getRandomSecret()
    const one = useBlob()
    await one.connect({ secret })
    await one.update({ title: 'Saved' }, undefined)
    const two = useBlob()
    await two.connect({ secret })
    await waitFor(() => two.state.version === 1)
    expect(two.state.dataset).toEqual({ title: 'Saved' })
  })

  // Every call gives an independent dataset, like one of another browser
  async function createDataset() {
    vi.resetModules()
    const { useDataset } = await import('./useDataset')
    return useDataset()
  }

  it('merges concurrent changes of datasets', async () => {
    const secret = getRandomSecret()
    const one = await createDataset()
    const two = await createDataset()
    await one.connect(secret)
    await two.connect(secret)
    const [a, b, c] = [getRandomId(), getRandomId(), getRandomId()]
    await one.upsert({ items: [{ id: c, name: 'Shared' }] })
    await waitFor(() => !one.modified.value)
    const items = [one.select('items', ['id']), two.select('items', ['id'])]
    await waitFor(() => items[1].value.length === 1)

    // Both datasets change at the same time before getting each other changes
    await Promise.all([
      one.upsert({
        items: [
          { id: a, name: 'One' },
          { id: c, note: 'From one' }
        ]
      }),
      two.upsert({
        items: [
          { id: b, name: 'Two' },
          { id: c, name: 'Renamed' }
        ]
      })
    ])
    const expected = [
      { id: a, name: 'One' },
      { id: b, name: 'Two' },
      { id: c, name: 'Renamed', note: 'From one' }
    ].sort((left, right) => left.id.localeCompare(right.id))
    await waitFor(
      () =>
        !one.modified.value &&
        !two.modified.value &&
        JSON.stringify(items[0].value) === JSON.stringify(expected) &&
        JSON.stringify(items[1].value) === JSON.stringify(expected),
      10000
    ).catch((err) => {
      const state = {
        one: [one.modified.value, items[0].value],
        two: [two.modified.value, items[1].value]
      }
      throw new Error(`${err.message}: ${JSON.stringify(state)}`)
    })
  }, 15000)

  it('takes the current blob from a version conflict at once', async () => {
    const [one, two] = await connectClients(2)
    await one.update({ title: 'First' }, undefined)
    await waitFor(() => two.state.version === 1)

    await one.update({ title: 'Second' }, 1)
    const result = await two.update({ title: 'Conflicting' }, 1)
    expect(result.success).toBe(false)
    // No need to wait for the change notification
    expect(two.state.version).toBe(2)
    expect(two.state.dataset).toEqual({ title: 'Second' })
  })
})
