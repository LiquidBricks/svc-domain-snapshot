import { DOMAIN_SNAPSHOT_PRECONDITION_INVALID, DOMAIN_SNAPSHOT_PRECONDITION_REQUIRED } from '@liquid-bricks/lib-diagnostics/codes'

function isIsoDateTime(value) {
  if (typeof value !== 'string') return false
  const parsed = new Date(value)
  return !Number.isNaN(parsed.valueOf()) && parsed.toISOString() === value
}

export function validatePayload({ scope }) {
  const { handlerDiagnostics } = scope

  for (const field of [
    'instanceId',
    'instanceVertexId',
    'componentId',
    'componentHash',
    'stateMachineId',
    'updatedAt',
  ]) {
    handlerDiagnostics.require(
      typeof scope[field] === 'string' && scope[field].length > 0,
      DOMAIN_SNAPSHOT_PRECONDITION_REQUIRED,
      `${field} required for componentInstance created snapshot`,
      { field },
    )
  }

  handlerDiagnostics.require(
    scope.state != null && typeof scope.state === 'object' && !Array.isArray(scope.state),
    DOMAIN_SNAPSHOT_PRECONDITION_INVALID,
    'state must be an object for componentInstance created snapshot',
    { field: 'state' },
  )
  handlerDiagnostics.require(
    Object.values(scope.state).every(value => value === null),
    DOMAIN_SNAPSHOT_PRECONDITION_INVALID,
    'state must contain only null initial values for componentInstance created snapshot',
    { field: 'state' },
  )
  handlerDiagnostics.require(
    isIsoDateTime(scope.updatedAt),
    DOMAIN_SNAPSHOT_PRECONDITION_INVALID,
    'updatedAt must be an ISO date-time for componentInstance created snapshot',
    { field: 'updatedAt' },
  )
}
