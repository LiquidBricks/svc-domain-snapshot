import { events as natsEvents } from '@liquid-bricks/lib-nats-subject/events/nats'
import { ackMessage, decodeData } from '../../../../../middleware/index.js'
import { publishSnapshotState } from '../../_shared/publishSnapshotState.js'
import { updateSnapshotState } from './handler.js'
import { path } from './subject.js'
import { validatePayload } from './validatePayload.js'

export { path }

export const emits = {
  'domain.snapshot.instance.state.v1':
    natsEvents['*'].domain['*']['*'].snapshot.instance.state.v1['*'],
}

export const spec = {
  context: { emits },
  decode: [
    decodeData([
      'instanceId',
      'instanceVertexId',
      'stateMachineId',
      'state',
      'dataStateIds',
      'taskStateIds',
      'importInstanceIds',
      'gateInstanceIds',
      'updatedAt',
    ]),
  ],
  pre: [
    validatePayload,
  ],
  handler: updateSnapshotState,
  post: [
    publishSnapshotState,
    ackMessage,
  ],
}
