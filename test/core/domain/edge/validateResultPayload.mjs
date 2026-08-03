import test from 'node:test'
import assert from 'node:assert/strict'
import {
  DOMAIN_SNAPSHOT_PRECONDITION_INVALID,
  DOMAIN_SNAPSHOT_PRECONDITION_REQUIRED,
} from '@liquid-bricks/lib-diagnostics/codes'

import { validatePayload as validateDataResult } from '../../../../core/domain/edge/has_data_state/result_computed/validatePayload.js'
import { validatePayload as validateTaskResult } from '../../../../core/domain/edge/has_task_state/result_computed/validatePayload.js'
import { validatePayload as validateGateResult } from '../../../../core/domain/edge/has_gate_state/result_computed/validatePayload.js'
import { validatePayload as validateDataFailure } from '../../../../core/domain/edge/has_data_state/computation_failed/validatePayload.js'
import { validatePayload as validateTaskFailure } from '../../../../core/domain/edge/has_task_state/computation_failed/validatePayload.js'
import { validatePayload as validateGateFailure } from '../../../../core/domain/edge/has_gate_state/computation_failed/validatePayload.js'
import { DiagnosticError, makeDiagnostics } from '../../../helpers.mjs'

const resultValidators = [
  ['data', validateDataResult],
  ['task', validateTaskResult],
  ['gate', validateGateResult],
]

const failureValidators = [
  ['data', validateDataFailure],
  ['task', validateTaskFailure],
  ['gate', validateGateFailure],
]

const structuredError = {
  name: 'Error',
  message: 'compute failed',
  code: 'E_COMPUTE',
}

function validResultScope(overrides = {}) {
  return {
    handlerDiagnostics: makeDiagnostics(),
    instanceId: 'instance-1',
    instanceVertexId: 'instance-vertex-1',
    stateMachineId: 'state-machine-1',
    stateEdgeId: 'state-edge-1',
    gateInstanceRefId: 'gate-instance-ref-1',
    name: 'result-name',
    result: null,
    status: 'provided',
    stateEdgeStatus: 'provided',
    type: 'data',
    updatedAt: '2026-07-19T12:34:56.000Z',
    ...overrides,
  }
}

function validFailureScope(overrides = {}) {
  const scope = validResultScope({
    status: 'error',
    stateEdgeStatus: 'error',
    error: structuredError,
  })
  delete scope.result
  return Object.assign(scope, overrides)
}

for (const [type, validatePayload] of resultValidators) {
  test(`${type} result validator accepts null for the matching route type`, () => {
    assert.deepEqual(
      validatePayload({ scope: validResultScope({ type }) }),
      {
        type,
        status: 'provided',
        stateEdgeStatus: 'provided',
        updatedAt: '2026-07-19T12:34:56.000Z',
      },
    )
  })
}

for (const [type, validatePayload] of failureValidators) {
  test(`${type} computation failure validator accepts a result-free structured error`, () => {
    assert.deepEqual(
      validatePayload({ scope: validFailureScope({ type }) }),
      {
        type,
        status: 'error',
        stateEdgeStatus: 'error',
        error: structuredError,
        updatedAt: '2026-07-19T12:34:56.000Z',
      },
    )
  })
}

for (const [type, validatePayload] of resultValidators) {
  test(`${type} result validator rejects a payload for another route type`, () => {
    assert.throws(
      () => validatePayload({ scope: validResultScope({ type: type === 'data' ? 'task' : 'data' }) }),
      (error) => {
        assert.equal(error instanceof DiagnosticError, true)
        assert.equal(error.code, DOMAIN_SNAPSHOT_PRECONDITION_INVALID)
        return true
      },
    )
  })
}

for (const [type, validatePayload] of failureValidators) {
  test(`${type} computation failure validator rejects a payload for another route type`, () => {
    assert.throws(
      () => validatePayload({ scope: validFailureScope({ type: type === 'data' ? 'task' : 'data' }) }),
      (error) => {
        assert.equal(error instanceof DiagnosticError, true)
        assert.equal(error.code, DOMAIN_SNAPSHOT_PRECONDITION_INVALID)
        return true
      },
    )
  })
}

for (const field of ['status', 'stateEdgeStatus']) {
  test(`result validator rejects a missing ${field}`, () => {
    assert.throws(
      () => validateDataResult({ scope: validResultScope({ [field]: undefined }) }),
      (error) => {
        assert.equal(error instanceof DiagnosticError, true)
        assert.equal(error.code, DOMAIN_SNAPSHOT_PRECONDITION_REQUIRED)
        return true
      },
    )
  })

  test(`computation failure validator rejects a missing ${field}`, () => {
    assert.throws(
      () => validateDataFailure({ scope: validFailureScope({ [field]: undefined }) }),
      (error) => {
        assert.equal(error instanceof DiagnosticError, true)
        assert.equal(error.code, DOMAIN_SNAPSHOT_PRECONDITION_REQUIRED)
        return true
      },
    )
  })
}

test('result validator rejects an error outcome', () => {
  assert.throws(
    () => validateDataResult({ scope: validFailureScope() }),
    (error) => {
      assert.equal(error instanceof DiagnosticError, true)
      assert.equal(error.code, DOMAIN_SNAPSHOT_PRECONDITION_INVALID)
      return true
    },
  )
})

test('computation failure validator rejects a provided outcome', () => {
  assert.throws(
    () => validateDataFailure({ scope: validResultScope() }),
    (error) => {
      assert.equal(error instanceof DiagnosticError, true)
      assert.equal(error.code, DOMAIN_SNAPSHOT_PRECONDITION_INVALID)
      return true
    },
  )
})

test('result validator rejects error metadata', () => {
  assert.throws(
    () => validateDataResult({ scope: validResultScope({ error: structuredError }) }),
    (error) => {
      assert.equal(error instanceof DiagnosticError, true)
      assert.equal(error.code, DOMAIN_SNAPSHOT_PRECONDITION_INVALID)
      return true
    },
  )
})

for (const error of [
  undefined,
  null,
  'compute failed',
  {},
  { name: '', message: 'compute failed' },
  { name: 'Error' },
  { name: 'Error', message: 'compute failed', code: {} },
]) {
  test(`computation failure validator rejects malformed error details: ${JSON.stringify(error)}`, () => {
    assert.throws(
      () => validateTaskFailure({ scope: validFailureScope({ type: 'task', error }) }),
      (validationError) => {
        assert.equal(validationError instanceof DiagnosticError, true)
        assert.equal(validationError.code, DOMAIN_SNAPSHOT_PRECONDITION_INVALID)
        return true
      },
    )
  })
}

test('computation failure validator accepts a numeric structured error code', () => {
  assert.doesNotThrow(() => validateTaskFailure({
    scope: validFailureScope({
      type: 'task',
      error: { ...structuredError, code: -2 },
    }),
  }))
})

for (const field of ['result', 'resultValue']) {
  for (const value of [null, undefined, { unexpected: true }]) {
    test(`computation failure validator rejects own ${field}: ${JSON.stringify(value)}`, () => {
      assert.throws(
        () => validateTaskFailure({ scope: validFailureScope({ type: 'task', [field]: value }) }),
        (validationError) => {
          assert.equal(validationError instanceof DiagnosticError, true)
          assert.equal(validationError.code, DOMAIN_SNAPSHOT_PRECONDITION_INVALID)
          return true
        },
      )
    })
  }
}

test('result validator rejects a payload without a native result property', () => {
  const scope = validResultScope()
  delete scope.result

  assert.throws(
    () => validateDataResult({ scope }),
    DiagnosticError,
  )
})

for (const field of ['instanceId', 'instanceVertexId', 'stateMachineId', 'stateEdgeId', 'name', 'updatedAt']) {
  test(`validator rejects missing ${field}`, () => {
    assert.throws(
      () => validateDataResult({ scope: validResultScope({ [field]: '' }) }),
      DiagnosticError,
    )
  })
}

test('validator rejects an invalid timestamp', () => {
  for (const updatedAt of ['not-a-date', '2026-07-20']) {
    assert.throws(
      () => validateDataFailure({ scope: validFailureScope({ updatedAt }) }),
      (error) => {
        assert.equal(error instanceof DiagnosticError, true)
        assert.equal(error.code, DOMAIN_SNAPSHOT_PRECONDITION_INVALID)
        return true
      },
    )
  }
})

for (const [label, validatePayload, scope] of [
  ['result', validateGateResult, validResultScope({ type: 'gate', gateInstanceRefId: '' })],
  ['computation failure', validateGateFailure, validFailureScope({ type: 'gate', gateInstanceRefId: '' })],
]) {
  test(`gate ${label} validator rejects a missing gateInstanceRefId`, () => {
    assert.throws(
      () => validatePayload({ scope }),
      DiagnosticError,
    )
  })
}
