import { create as createSubject } from '@liquid-bricks/lib-nats-subject/create/basic'
import { Errors } from '../../../../errors.js'

const first = (value) => Array.isArray(value) ? value[0] : value

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

function snapshotSubject({ emits, type, subjectParams }) {
  return createSubject(emits[`domain.snapshot.${type}.result.v1`])
    .forPublish()
    .set({
      env: subjectParams.env,
      tenant: subjectParams.tenant,
      context: subjectParams.context,
      id: subjectParams.id,
    })
    .build()
}

export function createResultSnapshotReducer({ type }) {
  return async function reduceResultSnapshot({
    rootCtx: { dataMapper, natsContext },
    routeCtx: { emits },
    scope: {
      handlerDiagnostics,
      subjectParams,
      instanceId,
      instanceVertexId,
      stateMachineId,
      stateEdgeId,
      stateId,
      gateInstanceRefId,
      name,
      result,
      updatedAt,
    },
  }) {
    const componentStateIds = await dataMapper.query.readComponentStateId({
      vertexId: instanceVertexId,
    })
    const componentStateId = first(componentStateIds)

    handlerDiagnostics.require(
      typeof componentStateId === 'string' && componentStateId.length,
      Errors.COMPONENT_STATE_NOT_FOUND,
      'componentState not found for componentInstance',
      { instanceId, instanceVertexId },
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

    const key = `${type}.${name}`
    const delta = { [key]: result }
    const state = { ...currentState, ...delta }

    await dataMapper.vertex.componentState.setState({
      componentStateId,
      state,
      updatedAt,
    })

    const subject = snapshotSubject({ emits, type, subjectParams })
    await natsContext.publish(
      subject,
      JSON.stringify({
        data: {
          instanceId,
          instanceVertexId,
          componentStateId,
          stateMachineId,
          stateEdgeId,
          stateId,
          gateInstanceRefId,
          type,
          name,
          state,
          delta,
          updatedAt,
        },
      }),
    )

    return {
      instanceId,
      instanceVertexId,
      componentStateId,
      type,
      name,
      state,
      delta,
      updatedAt,
      subject,
    }
  }
}
