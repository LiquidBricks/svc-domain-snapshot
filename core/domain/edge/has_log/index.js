import { events as natsEvents } from '@liquid-bricks/lib-nats-subject/events/nats'
import { ackMessage, decodeData } from '../../../../middleware/index.js'
import { snapshotLog } from './handler.js'
import { path } from './subject.js'
import { validatePayload } from './validatePayload.js'

export { path }

export const emits = {
  'domain.snapshot.log.*.v1.*':
    natsEvents['*'].domain['*']['*'].snapshot.log['*'].v1['*'],
}

export const spec = {
  context: { emits },
  decode: [
    decodeData([
      'instanceId',
      'logId',
      'name',
      'type',
      'method',
      'args',
      'updatedAt',
    ]),
  ],
  pre: [
    validatePayload,
  ],
  handler: snapshotLog,
  post: [
    ackMessage,
  ],
}

export { snapshotLog, validatePayload }
