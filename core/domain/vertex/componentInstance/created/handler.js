import { domain } from '@liquid-bricks/spec-domain/domain'
import { DOMAIN_SNAPSHOT_COMPONENT_STATE_INVALID } from '@liquid-bricks/lib-diagnostics/codes'

function instanceStateDelta() {
  return {
    'instance.state': domain.vertex.stateMachine.constants.STATES.CREATED,
  }
}

function initialSnapshotState(state) {
  return Object.entries(state).reduce((snapshot, [key, result]) => ({
    ...snapshot,
    [key]: result,
    [`${key}.state`]: null,
  }), {})
}

export async function addToSnapshot({
  rootCtx: { dataMapper },
  scope: {
    handlerDiagnostics,
    instanceId,
    instanceVertexId,
    state,
  },
}) {
  const delta = instanceStateDelta()
  const componentStateRows = await dataMapper.query.readComponentStateId({
    vertexId: instanceVertexId,
  })
  const componentStateIds = Array.isArray(componentStateRows)
    ? componentStateRows
    : [componentStateRows]
  const linkedComponentStateIds = componentStateIds.filter(Boolean)

  handlerDiagnostics.require(
    linkedComponentStateIds.length <= 1,
    DOMAIN_SNAPSHOT_COMPONENT_STATE_INVALID,
    'componentInstance must not have multiple componentState snapshots',
    { instanceId, instanceVertexId, componentStateIds: linkedComponentStateIds },
  )

  if (linkedComponentStateIds.length === 1) {
    return {
      instanceId,
      instanceVertexId,
      componentStateId: linkedComponentStateIds[0],
      delta,
      snapshotCreated: false,
    }
  }

  const snapshotState = { ...initialSnapshotState(state), ...delta }
  const { id: componentStateId } = await dataMapper.vertex.componentState.create({
    state: snapshotState,
  })
  await dataMapper.edge.has_snapshot.componentInstance_componentState.create({
    fromId: instanceVertexId,
    toId: componentStateId,
  })

  return {
    instanceId,
    instanceVertexId,
    componentStateId,
    delta,
    snapshotCreated: true,
  }
}
