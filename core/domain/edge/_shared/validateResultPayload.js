import { DOMAIN_SNAPSHOT_PRECONDITION_INVALID, DOMAIN_SNAPSHOT_PRECONDITION_REQUIRED } from '@liquid-bricks/lib-diagnostics/codes'

const hasOwn = (value, key) => Object.prototype.hasOwnProperty.call(value, key)

function isIsoDateTime(value) {
  if (typeof value !== 'string') return false
  const parsed = new Date(value)
  return !Number.isNaN(parsed.valueOf()) && parsed.toISOString() === value
}

export function validateResultPayload({ scope }, { type }) {
  const {
    handlerDiagnostics,
    instanceId,
    instanceVertexId,
    stateMachineId,
    stateEdgeId,
    name,
    updatedAt,
  } = scope

  handlerDiagnostics.require(
    typeof instanceId === 'string' && instanceId.length,
    DOMAIN_SNAPSHOT_PRECONDITION_REQUIRED,
    `instanceId required for ${type} snapshot result`,
    { field: 'instanceId', type },
  )
  handlerDiagnostics.require(
    typeof instanceVertexId === 'string' && instanceVertexId.length,
    DOMAIN_SNAPSHOT_PRECONDITION_REQUIRED,
    `instanceVertexId required for ${type} snapshot result`,
    { field: 'instanceVertexId', type },
  )
  handlerDiagnostics.require(
    typeof stateMachineId === 'string' && stateMachineId.length,
    DOMAIN_SNAPSHOT_PRECONDITION_REQUIRED,
    `stateMachineId required for ${type} snapshot result`,
    { field: 'stateMachineId', type },
  )
  handlerDiagnostics.require(
    typeof stateEdgeId === 'string' && stateEdgeId.length,
    DOMAIN_SNAPSHOT_PRECONDITION_REQUIRED,
    `stateEdgeId required for ${type} snapshot result`,
    { field: 'stateEdgeId', type },
  )
  handlerDiagnostics.require(
    typeof name === 'string' && name.length,
    DOMAIN_SNAPSHOT_PRECONDITION_REQUIRED,
    `name required for ${type} snapshot result`,
    { field: 'name', type },
  )
  handlerDiagnostics.require(
    hasOwn(scope, 'result'),
    DOMAIN_SNAPSHOT_PRECONDITION_REQUIRED,
    `native result required for ${type} snapshot result`,
    { field: 'result', type },
  )
  handlerDiagnostics.require(
    typeof updatedAt === 'string' && updatedAt.length,
    DOMAIN_SNAPSHOT_PRECONDITION_REQUIRED,
    `updatedAt required for ${type} snapshot result`,
    { field: 'updatedAt', type },
  )
  handlerDiagnostics.require(
    isIsoDateTime(updatedAt),
    DOMAIN_SNAPSHOT_PRECONDITION_INVALID,
    `updatedAt must be an ISO date-time for ${type} snapshot result`,
    { field: 'updatedAt', type },
  )
  if (type === 'gate') {
    handlerDiagnostics.require(
      typeof scope.gateInstanceRefId === 'string' && scope.gateInstanceRefId.length,
      DOMAIN_SNAPSHOT_PRECONDITION_REQUIRED,
      'gateInstanceRefId required for gate snapshot result',
      { field: 'gateInstanceRefId', type },
    )
  }

  return {
    type,
    updatedAt,
  }
}
