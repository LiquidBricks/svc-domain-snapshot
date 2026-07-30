import { DOMAIN_SNAPSHOT_PRECONDITION_INVALID, DOMAIN_SNAPSHOT_PRECONDITION_REQUIRED } from '@liquid-bricks/lib-diagnostics/codes'

function isIsoDateTime(value) {
  if (typeof value !== 'string') return false
  const parsed = new Date(value)
  return !Number.isNaN(parsed.valueOf()) && parsed.toISOString() === value
}

export function validateStartedPayload({ scope }, { type }) {
  const { handlerDiagnostics } = scope

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
    handlerDiagnostics.require(
      typeof scope[field] === 'string' && scope[field].length > 0,
      DOMAIN_SNAPSHOT_PRECONDITION_REQUIRED,
      `${field} required for ${type} started snapshot`,
      { field, type },
    )
  }

  handlerDiagnostics.require(
    scope.type === type,
    DOMAIN_SNAPSHOT_PRECONDITION_INVALID,
    `type must be ${type} for ${type} started snapshot`,
    { field: 'type', expected: type, actual: scope.type },
  )
  handlerDiagnostics.require(
    scope.status === 'running' && scope.stateEdgeStatus === 'running',
    DOMAIN_SNAPSHOT_PRECONDITION_INVALID,
    `status must be running for ${type} started snapshot`,
    {
      field: 'status',
      status: scope.status,
      stateEdgeStatus: scope.stateEdgeStatus,
      type,
    },
  )
  handlerDiagnostics.require(
    scope.deps != null && typeof scope.deps === 'object' && !Array.isArray(scope.deps),
    DOMAIN_SNAPSHOT_PRECONDITION_INVALID,
    `deps must be an object for ${type} started snapshot`,
    { field: 'deps', type },
  )
  handlerDiagnostics.require(
    isIsoDateTime(scope.updatedAt),
    DOMAIN_SNAPSHOT_PRECONDITION_INVALID,
    `updatedAt must be an ISO date-time for ${type} started snapshot`,
    { field: 'updatedAt', type },
  )

  return {
    type,
    updatedAt: scope.updatedAt,
  }
}
