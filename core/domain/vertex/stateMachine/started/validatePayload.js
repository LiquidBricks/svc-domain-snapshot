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
    'instanceVertexId',
    'stateMachineId',
    'state',
    'updatedAt',
  ]) {
    handlerDiagnostics.require(
      typeof scope[field] === 'string' && scope[field].length > 0,
      Errors.PRECONDITION_REQUIRED,
      `${field} required for stateMachine started snapshot`,
      { field },
    )
  }

  for (const field of [
    'dataStateIds',
    'taskStateIds',
    'importInstanceIds',
    'gateInstanceIds',
  ]) {
    handlerDiagnostics.require(
      Array.isArray(scope[field])
        && scope[field].every(id => typeof id === 'string' && id.length > 0),
      Errors.PRECONDITION_INVALID,
      `${field} must be a string array for stateMachine started snapshot`,
      { field },
    )
  }

  handlerDiagnostics.require(
    scope.state === 'running',
    Errors.PRECONDITION_INVALID,
    'state must be running for stateMachine started snapshot',
    { field: 'state', state: scope.state },
  )
  handlerDiagnostics.require(
    isIsoDateTime(scope.updatedAt),
    Errors.PRECONDITION_INVALID,
    'updatedAt must be an ISO date-time for stateMachine started snapshot',
    { field: 'updatedAt' },
  )
}
