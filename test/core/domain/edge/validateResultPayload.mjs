import test from 'node:test'
import assert from 'node:assert/strict'
import { DOMAIN_SNAPSHOT_PRECONDITION_INVALID } from '@liquid-bricks/lib-diagnostics/codes'

import { validatePayload as validateData } from '../../../../core/domain/edge/has_data_state/result_computed/validatePayload.js'
import { validatePayload as validateTask } from '../../../../core/domain/edge/has_task_state/result_computed/validatePayload.js'
import { validatePayload as validateGate } from '../../../../core/domain/edge/has_gate_state/result_computed/validatePayload.js'
import { DiagnosticError, makeDiagnostics } from '../../../helpers.mjs'

const validators = [
  ['data', validateData],
  ['task', validateTask],
  ['gate', validateGate],
]

function validScope(overrides = {}) {
  return {
    handlerDiagnostics: makeDiagnostics(),
    instanceId: 'instance-1',
    instanceVertexId: 'instance-vertex-1',
    stateMachineId: 'state-machine-1',
    stateEdgeId: 'state-edge-1',
    gateInstanceRefId: 'gate-instance-ref-1',
    name: 'result-name',
    result: null,
    type: 'untrusted-type',
    updatedAt: '2026-07-19T12:34:56.000Z',
    ...overrides,
  }
}

for (const [type, validatePayload] of validators) {
  test(`${type} validator accepts null and normalizes the route type`, () => {
    assert.deepEqual(
      validatePayload({ scope: validScope() }),
      {
        type,
        updatedAt: '2026-07-19T12:34:56.000Z',
      },
    )
  })
}

test('validator rejects a payload without a native result property', () => {
  const scope = validScope()
  delete scope.result

  assert.throws(
    () => validateData({ scope }),
    DiagnosticError,
  )
})

for (const field of ['instanceId', 'instanceVertexId', 'stateMachineId', 'stateEdgeId', 'name', 'updatedAt']) {
  test(`validator rejects missing ${field}`, () => {
    assert.throws(
      () => validateData({ scope: validScope({ [field]: '' }) }),
      DiagnosticError,
    )
  })
}

test('validator rejects an invalid result timestamp', () => {
  for (const updatedAt of ['not-a-date', '2026-07-20']) {
    assert.throws(
      () => validateData({ scope: validScope({ updatedAt }) }),
      (error) => {
        assert.equal(error instanceof DiagnosticError, true)
        assert.equal(error.code, DOMAIN_SNAPSHOT_PRECONDITION_INVALID)
        return true
      },
    )
  }
})

test('gate validator rejects a missing gateInstanceRefId', () => {
  assert.throws(
    () => validateGate({ scope: validScope({ gateInstanceRefId: '' }) }),
    DiagnosticError,
  )
})
