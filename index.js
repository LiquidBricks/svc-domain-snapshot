import { AckPolicy, DeliverPolicy, JetStreamApiCodes } from '@nats-io/jetstream'
import { create as createBasicSubject } from '@liquid-bricks/lib-nats-subject/create/basic'
import { events as natsEvents } from '@liquid-bricks/lib-nats-subject/events/nats'
import { createDomainSnapshotRouter } from './router.js'

export const consumerName = 'domainSnapshotConsumer'

export function createConsumerConfig() {
  return {
    durable_name: consumerName,
    ack_policy: AckPolicy.Explicit,
    deliver_policy: DeliverPolicy.All,
    max_ack_pending: 1,
    filter_subjects: [
      createBasicSubject(natsEvents['*'].domain['*']['*'].vertex.componentInstance.created.v1['*']).forSubscribe().build(),
      createBasicSubject(natsEvents['*'].domain['*']['*'].edge.has_data_state.result_computed.v1['*']).forSubscribe().build(),
      createBasicSubject(natsEvents['*'].domain['*']['*'].edge.has_data_state.started.v1['*']).forSubscribe().build(),
      createBasicSubject(natsEvents['*'].domain['*']['*'].edge.has_task_state.result_computed.v1['*']).forSubscribe().build(),
      createBasicSubject(natsEvents['*'].domain['*']['*'].edge.has_task_state.started.v1['*']).forSubscribe().build(),
      createBasicSubject(natsEvents['*'].domain['*']['*'].edge.has_gate_state.result_computed.v1['*']).forSubscribe().build(),
    ],
  }
}

function configuredFilterSubjects(info) {
  const { filter_subjects: filterSubjects = [] } = info?.config ?? {}
  return Array.isArray(filterSubjects) ? filterSubjects : [filterSubjects]
}

function sameFilterSubjects(current, expected) {
  if (current.length !== expected.length) return false
  const currentSet = new Set(current)
  return expected.every(subject => currentSet.has(subject))
}

export async function ensureConsumer({ streamName, jetstreamManager }) {
  const config = createConsumerConfig()

  try {
    const info = await jetstreamManager.consumers.info(streamName, consumerName)
    if (sameFilterSubjects(configuredFilterSubjects(info), config.filter_subjects)) return info

    return jetstreamManager.consumers.update(streamName, consumerName, {
      filter_subjects: config.filter_subjects,
    })
  } catch (error) {
    if (error?.code !== JetStreamApiCodes.ConsumerNotFound) throw error
  }

  return jetstreamManager.consumers.add(streamName, config)
}

export async function consumeMessages({ messages, router }) {
  for await (const message of messages) {
    await router.request({
      subject: message.subject,
      message,
    })
  }
}

export async function Consumer({ streamName, natsContext, g, diagnostics: d }) {
  const diagnostics = d.child({ consumerName })
  const jetstream = await natsContext.jetstream()
  const jetstreamManager = await natsContext.jetstreamManager()

  await ensureConsumer({ streamName, jetstreamManager })

  const consumer = await jetstream.consumers.get(streamName, consumerName)
  const messages = await consumer.consume()
  const router = createDomainSnapshotRouter({ natsContext, g, diagnostics })

  void consumeMessages({ messages, router })
}
