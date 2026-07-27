import test from 'node:test'
import assert from 'node:assert/strict'

import { validatePayload } from '../../../../../../core/domain/vertex/stateMachine/started/validatePayload.js'
import { DiagnosticError, makeDiagnostics } from '../../../../../helpers.mjs'

function validScope(overrides = {}) {
  return {
    handlerDiagnostics: makeDiagnostics(),
    instanceId: 'instance-1',
    instanceVertexId: 'instance-vertex-1',
    stateMachineId: 'state-machine-1',
    state: 'running',
    dataStateIds: ['data-state-1'],
    taskStateIds: ['task-state-1'],
    importInstanceIds: [],
    gateInstanceIds: [],
    updatedAt: '2026-07-26T12:34:56.000Z',
    ...overrides,
  }
}

test('accepts a complete stateMachine started fact', () => {
  assert.doesNotThrow(() => validatePayload({ scope: validScope() }))
})

for (const field of [
  'instanceId',
  'instanceVertexId',
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

for (const field of [
  'dataStateIds',
  'taskStateIds',
  'importInstanceIds',
  'gateInstanceIds',
]) {
  test(`rejects an invalid ${field}`, () => {
    assert.throws(
      () => validatePayload({ scope: validScope({ [field]: [''] }) }),
      DiagnosticError,
    )
  })
}

test('rejects a lifecycle state other than running', () => {
  assert.throws(
    () => validatePayload({ scope: validScope({ state: 'created' }) }),
    DiagnosticError,
  )
})

test('rejects an invalid timestamp', () => {
  assert.throws(
    () => validatePayload({ scope: validScope({ updatedAt: 'not-a-date' }) }),
    DiagnosticError,
  )
})
