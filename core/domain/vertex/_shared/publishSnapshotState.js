import { create as createSubject } from '@liquid-bricks/lib-nats-subject/create/basic'
import { Errors } from '../../../../errors.js'

export async function publishSnapshotState({
  rootCtx: { natsContext },
  routeCtx: { emits },
  scope: {
    handlerDiagnostics,
    subjectParams,
    instanceId,
    instanceVertexId,
    componentStateId,
    stateMachineId,
    delta,
    updatedAt,
  },
}) {
  handlerDiagnostics.require(
    typeof componentStateId === 'string' && componentStateId.length > 0,
    Errors.COMPONENT_STATE_INVALID,
    'componentStateId required before publishing instance snapshot state',
    { instanceId, instanceVertexId, componentStateId },
  )

  const subject = createSubject(emits['domain.snapshot.instance.state.v1'])
    .forPublish()
    .set({
      env: subjectParams.env,
      tenant: subjectParams.tenant,
      context: 'delta',
      id: subjectParams.id,
    })
    .build()

  const data = {
    instanceId,
    instanceVertexId,
    componentStateId,
    stateMachineId,
    type: 'instance',
    name: 'state',
    delta,
    updatedAt,
  }

  await natsContext.publish(subject, JSON.stringify({ data }))

  return {
    snapshotPublished: true,
    snapshotSubject: subject,
  }
}
