import { domain } from '@liquid-bricks/spec-domain/domain'
import { Errors } from '../../../../../errors.js'

const first = value => Array.isArray(value) ? value[0] : value

function values(rows) {
  return (Array.isArray(rows) ? rows : [rows]).filter(Boolean)
}

function unwrapState(rows) {
  const row = first(rows)
  if (row == null || typeof row !== 'object' || Array.isArray(row)) return row
  return Object.prototype.hasOwnProperty.call(row, 'state')
    ? first(row.state)
    : row
}

function parseState(value) {
  if (typeof value !== 'string') return value
  try {
    return JSON.parse(value)
  } catch {
    return value
  }
}

export async function updateSnapshotState({
  rootCtx: { dataMapper },
  scope: {
    handlerDiagnostics,
    instanceId,
    updatedAt,
  },
}) {
  const instanceVertexIds = values(
    await dataMapper.query.findInstanceVertexId({ instanceId }),
  )

  handlerDiagnostics.require(
    instanceVertexIds.length > 0,
    Errors.COMPONENT_STATE_NOT_FOUND,
    'componentInstance not found for stateMachine completed snapshot',
    { instanceId },
  )
  handlerDiagnostics.require(
    instanceVertexIds.length === 1,
    Errors.COMPONENT_STATE_INVALID,
    'instanceId must resolve to one componentInstance',
    { instanceId, instanceVertexIds },
  )

  const [instanceVertexId] = instanceVertexIds
  handlerDiagnostics.require(
    typeof instanceVertexId === 'string' && instanceVertexId.length > 0,
    Errors.COMPONENT_STATE_INVALID,
    'instanceVertexId must be a non-empty string',
    { instanceId, instanceVertexId },
  )

  const componentStateIds = values(
    await dataMapper.query.readComponentStateId({
      vertexId: instanceVertexId,
    }),
  )

  handlerDiagnostics.require(
    componentStateIds.length > 0,
    Errors.COMPONENT_STATE_NOT_FOUND,
    'componentState not found for componentInstance',
    { instanceId, instanceVertexId },
  )
  handlerDiagnostics.require(
    componentStateIds.length === 1,
    Errors.COMPONENT_STATE_INVALID,
    'componentInstance must not have multiple componentState snapshots',
    { instanceId, instanceVertexId, componentStateIds },
  )

  const [componentStateId] = componentStateIds
  handlerDiagnostics.require(
    typeof componentStateId === 'string' && componentStateId.length > 0,
    Errors.COMPONENT_STATE_INVALID,
    'componentStateId must be a non-empty string',
    { instanceId, instanceVertexId, componentStateId },
  )

  const currentStateRows = await dataMapper.query.readComponentState({
    vertexId: componentStateId,
  })
  const currentState = parseState(unwrapState(currentStateRows))

  handlerDiagnostics.require(
    currentState != null && typeof currentState === 'object' && !Array.isArray(currentState),
    Errors.COMPONENT_STATE_INVALID,
    'componentState state must be an object',
    { componentStateId, instanceId, instanceVertexId },
  )

  const delta = {
    'instance.state': domain.vertex.stateMachine.constants.STATES.COMPLETE,
  }
  const snapshotState = { ...currentState, ...delta }

  await dataMapper.vertex.componentState.setState({
    componentStateId,
    state: snapshotState,
    updatedAt,
  })

  return {
    instanceId,
    instanceVertexId,
    componentStateId,
    delta,
    snapshotState,
    snapshotUpdated: true,
  }
}
