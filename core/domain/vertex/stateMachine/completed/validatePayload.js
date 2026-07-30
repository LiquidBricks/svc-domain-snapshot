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
    'stateMachineId',
    'updatedAt',
  ]) {
    handlerDiagnostics.require(
      typeof scope[field] === 'string' && scope[field].length > 0,
      DOMAIN_SNAPSHOT_PRECONDITION_REQUIRED,
      `${field} required for stateMachine completed snapshot`,
      { field },
    )
  }

  handlerDiagnostics.require(
    isIsoDateTime(scope.updatedAt),
    DOMAIN_SNAPSHOT_PRECONDITION_INVALID,
    'updatedAt must be an ISO date-time for stateMachine completed snapshot',
    { field: 'updatedAt' },
  )
}
