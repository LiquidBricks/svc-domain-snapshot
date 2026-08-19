import { create as createSubject } from '@liquid-bricks/lib-nats-subject/create/basic'
import {
  DOMAIN_SNAPSHOT_COMPONENT_STATE_INVALID,
  DOMAIN_SNAPSHOT_COMPONENT_STATE_NOT_FOUND,
  DOMAIN_SNAPSHOT_PRECONDITION_INVALID,
} from '@liquid-bricks/lib-diagnostics/codes'

const first = (value) => Array.isArray(value) ? value[0] : value

function ids(value) {
  return (Array.isArray(value) ? value : [value])
    .filter(id => typeof id === 'string' && id.length > 0)
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

export async function snapshotLog({
  rootCtx: { dataMapper, natsContext },
  routeCtx: { emits },
  scope: {
    handlerDiagnostics,
    subjectParams,
    instanceId,
    logId,
    name,
    type,
    method,
    args,
    updatedAt,
  },
}) {
  const instanceVertexIds = ids(
    await dataMapper.query.findComponentInstanceVertexId({ instanceId }),
  )
  handlerDiagnostics.require(
    instanceVertexIds.length === 1,
    DOMAIN_SNAPSHOT_COMPONENT_STATE_NOT_FOUND,
    'exactly one componentInstance required for has_log snapshot',
    { instanceId, instanceVertexIds },
  )
  const instanceVertexId = instanceVertexIds[0]

  const componentStateIds = ids(await dataMapper.query.readComponentStateId({
    vertexId: instanceVertexId,
  }))
  handlerDiagnostics.require(
    componentStateIds.length === 1,
    DOMAIN_SNAPSHOT_COMPONENT_STATE_NOT_FOUND,
    'exactly one componentState required for has_log snapshot',
    { instanceId, instanceVertexId, componentStateIds },
  )
  const componentStateId = componentStateIds[0]

  const currentStateRows = await dataMapper.query.readComponentState({
    vertexId: componentStateId,
  })
  const currentState = parseState(unwrapState(currentStateRows))
  handlerDiagnostics.require(
    currentState != null && typeof currentState === 'object' && !Array.isArray(currentState),
    DOMAIN_SNAPSHOT_COMPONENT_STATE_INVALID,
    'componentState state must be an object for has_log snapshot',
    { componentStateId, instanceId, instanceVertexId },
  )

  const currentLogs = currentState.logs ?? []
  handlerDiagnostics.require(
    Array.isArray(currentLogs),
    DOMAIN_SNAPSHOT_COMPONENT_STATE_INVALID,
    'componentState logs must be an array',
    { componentStateId, instanceId, logs: currentLogs },
  )

  const log = { logId, name, type, method, args, updatedAt }
  const existingLog = currentLogs.find(entry => entry?.logId === logId)
  handlerDiagnostics.require(
    existingLog === undefined || JSON.stringify(existingLog) === JSON.stringify(log),
    DOMAIN_SNAPSHOT_PRECONDITION_INVALID,
    'logId must identify the same log during snapshot replay',
    { instanceId, logId, existingLog, log },
  )

  const snapshotChanged = existingLog === undefined
  const logs = snapshotChanged ? [...currentLogs, log] : currentLogs
  const delta = { logs }
  const state = { ...currentState, ...delta }

  if (snapshotChanged) {
    await dataMapper.vertex.componentState.setState({
      componentStateId,
      state,
      updatedAt,
    })
  }

  const subject = createSubject(emits['domain.snapshot.log.*.v1.*'])
    .forPublish()
    .set({
      env: subjectParams.env,
      tenant: subjectParams.tenant,
      context: 'delta',
      action: method,
      id: subjectParams.id,
    })
    .build()

  await natsContext.publish(
    subject,
    JSON.stringify({
      data: {
        instanceId,
        instanceVertexId,
        componentStateId,
        ...log,
        delta,
      },
    }),
  )

  return {
    instanceId,
    instanceVertexId,
    componentStateId,
    log,
    logs,
    state,
    delta,
    snapshotChanged,
    subject,
  }
}
