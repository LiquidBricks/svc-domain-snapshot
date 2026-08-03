import { DOMAIN_SNAPSHOT_PRECONDITION_INVALID, DOMAIN_SNAPSHOT_PRECONDITION_REQUIRED } from '@liquid-bricks/lib-diagnostics/codes'

export const hasOwn = (value, key) => Object.prototype.hasOwnProperty.call(value, key)

export function isStructuredError(error) {
  return error != null
    && typeof error === 'object'
    && !Array.isArray(error)
    && typeof error.name === 'string'
    && error.name.length > 0
    && typeof error.message === 'string'
    && (!hasOwn(error, 'code') || typeof error.code === 'string' || typeof error.code === 'number')
}

function isIsoDateTime(value) {
  if (typeof value !== 'string') return false
  const parsed = new Date(value)
  return !Number.isNaN(parsed.valueOf()) && parsed.toISOString() === value
}

export function validateComputationPayload({ scope }, { type, event }) {
  const {
    handlerDiagnostics,
    instanceId,
    instanceVertexId,
    stateMachineId,
    stateEdgeId,
    name,
    status,
    stateEdgeStatus,
    updatedAt,
  } = scope

  for (const [field, value] of [
    ['instanceId', instanceId],
    ['instanceVertexId', instanceVertexId],
    ['stateMachineId', stateMachineId],
    ['stateEdgeId', stateEdgeId],
    ['name', name],
  ]) {
    handlerDiagnostics.require(
      typeof value === 'string' && value.length,
      DOMAIN_SNAPSHOT_PRECONDITION_REQUIRED,
      `${field} required for ${type} snapshot ${event}`,
      { field, type },
    )
  }

  handlerDiagnostics.require(
    scope.type === type,
    DOMAIN_SNAPSHOT_PRECONDITION_INVALID,
    `type must be ${type} for ${type} snapshot ${event}`,
    { field: 'type', expected: type, actual: scope.type },
  )

  handlerDiagnostics.require(
    status !== undefined,
    DOMAIN_SNAPSHOT_PRECONDITION_REQUIRED,
    `status required for ${type} snapshot ${event}`,
    { field: 'status', type },
  )
  handlerDiagnostics.require(
    stateEdgeStatus !== undefined,
    DOMAIN_SNAPSHOT_PRECONDITION_REQUIRED,
    `stateEdgeStatus required for ${type} snapshot ${event}`,
    { field: 'stateEdgeStatus', type },
  )
  handlerDiagnostics.require(
    typeof updatedAt === 'string' && updatedAt.length,
    DOMAIN_SNAPSHOT_PRECONDITION_REQUIRED,
    `updatedAt required for ${type} snapshot ${event}`,
    { field: 'updatedAt', type },
  )
  handlerDiagnostics.require(
    isIsoDateTime(updatedAt),
    DOMAIN_SNAPSHOT_PRECONDITION_INVALID,
    `updatedAt must be an ISO date-time for ${type} snapshot ${event}`,
    { field: 'updatedAt', type },
  )

  if (type === 'gate') {
    handlerDiagnostics.require(
      typeof scope.gateInstanceRefId === 'string' && scope.gateInstanceRefId.length,
      DOMAIN_SNAPSHOT_PRECONDITION_REQUIRED,
      `gateInstanceRefId required for gate snapshot ${event}`,
      { field: 'gateInstanceRefId', type },
    )
  }

  return {
    handlerDiagnostics,
    status,
    stateEdgeStatus,
    updatedAt,
  }
}
