import { DOMAIN_SNAPSHOT_PRECONDITION_INVALID, DOMAIN_SNAPSHOT_PRECONDITION_REQUIRED } from '@liquid-bricks/lib-diagnostics/codes'

import { hasOwn, validateComputationPayload } from './validateComputationPayload.js'

export function validateResultPayload(args, { type }) {
  const { scope } = args
  const {
    handlerDiagnostics,
    status,
    stateEdgeStatus,
    updatedAt,
  } = validateComputationPayload(args, { type, event: 'result' })

  handlerDiagnostics.require(
    status === 'provided' && stateEdgeStatus === 'provided',
    DOMAIN_SNAPSHOT_PRECONDITION_INVALID,
    `status and stateEdgeStatus must be provided for ${type} result`,
    { field: 'status', status, stateEdgeStatus, type },
  )
  handlerDiagnostics.require(
    hasOwn(scope, 'result'),
    DOMAIN_SNAPSHOT_PRECONDITION_REQUIRED,
    `native result required for ${type} snapshot result`,
    { field: 'result', type },
  )
  handlerDiagnostics.require(
    !hasOwn(scope, 'error'),
    DOMAIN_SNAPSHOT_PRECONDITION_INVALID,
    `error must be omitted for ${type} snapshot result`,
    { field: 'error', type },
  )

  return {
    type,
    status: 'provided',
    stateEdgeStatus: 'provided',
    updatedAt,
  }
}
