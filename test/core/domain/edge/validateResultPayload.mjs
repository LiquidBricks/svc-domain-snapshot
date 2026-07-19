import test from 'node:test'
import assert from 'node:assert/strict'

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

for (const field of ['instanceId', 'instanceVertexId', 'name']) {
  test(`validator rejects missing ${field}`, () => {
    assert.throws(
      () => validateData({ scope: validScope({ [field]: '' }) }),
      DiagnosticError,
    )
  })
}
