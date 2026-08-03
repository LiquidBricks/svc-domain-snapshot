import { DOMAIN_SNAPSHOT_PRECONDITION_INVALID } from '@liquid-bricks/lib-diagnostics/codes'

import {
  hasOwn,
  isStructuredError,
  validateComputationPayload,
} from './validateComputationPayload.js'

export function validateComputationFailurePayload(args, { type }) {
  const { scope } = args
  const {
    handlerDiagnostics,
    status,
    stateEdgeStatus,
    updatedAt,
  } = validateComputationPayload(args, { type, event: 'computation failure' })

  handlerDiagnostics.require(
    status === 'error' && stateEdgeStatus === 'error',
    DOMAIN_SNAPSHOT_PRECONDITION_INVALID,
    `status and stateEdgeStatus must be error for ${type} computation failure`,
    { field: 'status', status, stateEdgeStatus, type },
  )
  for (const field of ['result', 'resultValue']) {
    handlerDiagnostics.require(
      !hasOwn(scope, field),
      DOMAIN_SNAPSHOT_PRECONDITION_INVALID,
      `${field} must be omitted for ${type} computation failure`,
      { field, type },
    )
  }
  handlerDiagnostics.require(
    isStructuredError(scope.error),
    DOMAIN_SNAPSHOT_PRECONDITION_INVALID,
    `structured error required for ${type} computation failure`,
    { field: 'error', error: scope.error, type },
  )

  return {
    type,
    status: 'error',
    stateEdgeStatus: 'error',
    error: scope.error,
    updatedAt,
  }
}
