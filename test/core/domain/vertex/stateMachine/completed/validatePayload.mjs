import test from 'node:test'
import assert from 'node:assert/strict'

import { validatePayload } from '../../../../../../core/domain/vertex/stateMachine/completed/validatePayload.js'
import { DiagnosticError, makeDiagnostics } from '../../../../../helpers.mjs'

function validScope(overrides = {}) {
  return {
    handlerDiagnostics: makeDiagnostics(),
    instanceId: 'instance-1',
    stateMachineId: 'state-machine-1',
    updatedAt: '2026-07-26T12:34:56.000Z',
    ...overrides,
  }
}

test('accepts a complete stateMachine completed fact', () => {
  assert.doesNotThrow(() => validatePayload({ scope: validScope() }))
})

for (const field of [
  'instanceId',
  'stateMachineId',
  'updatedAt',
]) {
  test(`rejects missing ${field}`, () => {
    assert.throws(
      () => validatePayload({ scope: validScope({ [field]: '' }) }),
      DiagnosticError,
    )
  })
}

test('rejects an invalid timestamp', () => {
  assert.throws(
    () => validatePayload({ scope: validScope({ updatedAt: 'not-a-date' }) }),
    DiagnosticError,
  )
})
