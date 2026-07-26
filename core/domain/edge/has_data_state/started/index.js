import { events as natsEvents } from '@liquid-bricks/lib-nats-subject/events/nats'
import { ackMessage, decodeData } from '../../../../../middleware/index.js'
import { createStartedSnapshotReducer } from '../../_shared/reduceStartedSnapshot.js'
import { path } from './subject.js'
import { validatePayload } from './validatePayload.js'

export { path }

export const emits = {
  'domain.snapshot.data.result.v1':
    natsEvents['*'].domain['*']['*'].snapshot.data.result.v1['*'],
}

export const spec = {
  context: { emits },
  decode: [
    decodeData([
      'instanceId',
      'instanceVertexId',
      'stateMachineId',
      'stateEdgeId',
      'stateId',
      'nodeId',
      'componentHash',
      'name',
      'deps',
      'type',
      'status',
      'stateEdgeStatus',
      'updatedAt',
    ]),
  ],
  pre: [
    validatePayload,
  ],
  handler: createStartedSnapshotReducer({ type: 'data' }),
  post: [
    ackMessage,
  ],
}
