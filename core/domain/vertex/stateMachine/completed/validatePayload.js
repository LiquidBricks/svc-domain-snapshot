import { Errors } from '../../../../../errors.js'

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
      Errors.PRECONDITION_REQUIRED,
      `${field} required for stateMachine completed snapshot`,
      { field },
    )
  }

  handlerDiagnostics.require(
    isIsoDateTime(scope.updatedAt),
    Errors.PRECONDITION_INVALID,
    'updatedAt must be an ISO date-time for stateMachine completed snapshot',
    { field: 'updatedAt' },
  )
}
