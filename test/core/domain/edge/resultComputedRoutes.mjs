import test from 'node:test'
import assert from 'node:assert/strict'

import { spec as dataResultSpec } from '../../../../core/domain/edge/has_data_state/result_computed/index.js'
import { spec as gateResultSpec } from '../../../../core/domain/edge/has_gate_state/result_computed/index.js'
import { spec as taskResultSpec } from '../../../../core/domain/edge/has_task_state/result_computed/index.js'
import { spec as dataFailureSpec } from '../../../../core/domain/edge/has_data_state/computation_failed/index.js'
import { spec as gateFailureSpec } from '../../../../core/domain/edge/has_gate_state/computation_failed/index.js'
import { spec as taskFailureSpec } from '../../../../core/domain/edge/has_task_state/computation_failed/index.js'
import { makeDiagnostics } from '../../../helpers.mjs'

const resultSpecs = [
  ['data', dataResultSpec],
  ['gate', gateResultSpec],
  ['task', taskResultSpec],
]

const failureSpecs = [
  ['data', dataFailureSpec],
  ['gate', gateFailureSpec],
  ['task', taskFailureSpec],
]

for (const [type, spec] of resultSpecs) {
  test(`${type} result route decodes only a provided result outcome`, () => {
    const result = { value: `${type}-value` }
    const decoded = spec.decode[0]({
      message: {
        json() {
          return {
            data: {
              instanceId: 'instance-1',
              name: `${type}Source`,
              result,
              status: 'provided',
              stateEdgeStatus: 'provided',
            },
          }
        },
      },
      rootCtx: { diagnostics: makeDiagnostics() },
    })

    assert.equal(decoded.status, 'provided')
    assert.equal(decoded.stateEdgeStatus, 'provided')
    assert.deepEqual(decoded.result, result)
    assert.equal(Object.hasOwn(decoded, 'error'), false)
    assert.ok(spec.context.emits[`domain.snapshot.${type}.result.v1`])
  })
}

for (const [type, spec] of failureSpecs) {
  test(`${type} computation failure route decodes a result-free structured error`, () => {
    const error = {
      name: 'Error',
      message: `${type} compute failed`,
      code: 'E_COMPUTE',
    }
    const decoded = spec.decode[0]({
      message: {
        json() {
          return {
            data: {
              instanceId: 'instance-1',
              name: `${type}Source`,
              status: 'error',
              stateEdgeStatus: 'error',
              error,
            },
          }
        },
      },
      rootCtx: { diagnostics: makeDiagnostics() },
    })

    assert.equal(decoded.status, 'error')
    assert.equal(decoded.stateEdgeStatus, 'error')
    assert.deepEqual(decoded.error, error)
    assert.equal(Object.hasOwn(decoded, 'result'), false)
    assert.equal(Object.hasOwn(decoded, 'resultValue'), false)
    assert.ok(spec.context.emits[`domain.snapshot.${type}.computation_failed.v1`])
  })
}
