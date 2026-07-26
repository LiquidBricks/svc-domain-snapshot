import test from 'node:test'
import assert from 'node:assert/strict'

import { validatePayload } from '../../../../../../core/domain/vertex/componentInstance/created/validatePayload.js'
import { DiagnosticError, makeDiagnostics } from '../../../../../helpers.mjs'

function validScope(overrides = {}) {
  return {
    handlerDiagnostics: makeDiagnostics(),
    instanceId: 'instance-1',
    instanceVertexId: 'instance-vertex-1',
    componentId: 'component-1',
    componentHash: 'component-hash-1',
    stateMachineId: 'state-machine-1',
    state: {
      'data.url': null,
      'task.fetch': null,
    },
    updatedAt: '2026-07-19T12:34:56.000Z',
    ...overrides,
  }
}

test('accepts a complete initial snapshot payload', () => {
  assert.doesNotThrow(() => validatePayload({ scope: validScope() }))
})

for (const field of [
  'instanceId',
  'instanceVertexId',
  'componentId',
  'componentHash',
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

test('rejects a non-object state or a non-null initial value', () => {
  for (const state of [null, [], { 'data.url': 'already-computed' }]) {
    assert.throws(
      () => validatePayload({ scope: validScope({ state }) }),
      DiagnosticError,
    )
  }
})

test('rejects an invalid timestamp', () => {
  assert.throws(
    () => validatePayload({ scope: validScope({ updatedAt: 'not-a-date' }) }),
    DiagnosticError,
  )
})
