import test from 'node:test'
import assert from 'node:assert/strict'

import { validatePayload as validateData } from '../../../../core/domain/edge/has_data_state/started/validatePayload.js'
import { validatePayload as validateTask } from '../../../../core/domain/edge/has_task_state/started/validatePayload.js'
import { DiagnosticError, makeDiagnostics } from '../../../helpers.mjs'

function validScope(type, overrides = {}) {
  return {
    handlerDiagnostics: makeDiagnostics(),
    instanceId: 'instance-1',
    instanceVertexId: 'instance-vertex-1',
    stateMachineId: 'state-machine-1',
    stateEdgeId: 'state-edge-1',
    stateId: 'state-edge-1',
    nodeId: 'node-1',
    componentHash: 'component-hash-1',
    name: 'result-name',
    deps: {},
    type,
    status: 'running',
    stateEdgeStatus: 'running',
    updatedAt: '2026-07-26T12:34:56.000Z',
    ...overrides,
  }
}

for (const [type, validatePayload] of [
  ['data', validateData],
  ['task', validateTask],
]) {
  test(`${type} validator accepts its canonical started fact`, () => {
    assert.deepEqual(
      validatePayload({ scope: validScope(type) }),
      {
        type,
        updatedAt: '2026-07-26T12:34:56.000Z',
      },
    )
  })

  test(`${type} validator rejects another route type`, () => {
    assert.throws(
      () => validatePayload({ scope: validScope(type, { type: 'other' }) }),
      DiagnosticError,
    )
  })
}

for (const field of [
  'instanceId',
  'instanceVertexId',
  'stateMachineId',
  'stateEdgeId',
  'stateId',
  'nodeId',
  'componentHash',
  'name',
  'status',
  'stateEdgeStatus',
  'updatedAt',
]) {
  test(`started validator rejects missing ${field}`, () => {
    assert.throws(
      () => validateData({ scope: validScope('data', { [field]: '' }) }),
      DiagnosticError,
    )
  })
}

test('started validator rejects invalid status, deps, or timestamp', () => {
  for (const overrides of [
    { status: 'waiting' },
    { stateEdgeStatus: 'provided' },
    { deps: [] },
    { updatedAt: 'not-a-date' },
  ]) {
    assert.throws(
      () => validateData({ scope: validScope('data', overrides) }),
      DiagnosticError,
    )
  }
})
