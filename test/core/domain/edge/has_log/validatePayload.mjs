import test from 'node:test'
import assert from 'node:assert/strict'

import { validatePayload } from '../../../../../core/domain/edge/has_log/validatePayload.js'
import { makeDiagnostics } from '../../../../helpers.mjs'

function scope(overrides = {}) {
  return {
    handlerDiagnostics: makeDiagnostics(),
    subjectParams: { action: 'warn', id: 'instance-1' },
    instanceId: 'instance-1',
    logId: 'log-1',
    name: 'inspectContainer',
    type: 'task',
    method: 'warn',
    args: ['message'],
    updatedAt: '2026-08-15T12:34:56.000Z',
    ...overrides,
  }
}

test('has_log snapshot validation accepts a path-aligned fact', () => {
  assert.deepEqual(validatePayload({ scope: scope() }), {
    updatedAt: '2026-08-15T12:34:56.000Z',
  })
})

test('has_log snapshot validation rejects malformed or mismatched facts', () => {
  for (const invalidScope of [
    scope({ logId: '' }),
    scope({ type: 'unknown' }),
    scope({ args: {} }),
    scope({ method: 'error' }),
    scope({ instanceId: 'instance-2' }),
    scope({ updatedAt: 'not-a-date' }),
  ]) {
    assert.throws(
      () => validatePayload({ scope: invalidScope }),
      (error) => typeof error.code === 'string',
    )
  }
})
