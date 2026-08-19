import test from 'node:test'
import assert from 'node:assert/strict'
import { JetStreamApiCodes } from '@nats-io/jetstream'

import {
  consumerName,
  createConsumerConfig,
  ensureConsumer,
} from '../index.js'

test('consumer configuration includes snapshot initialization and lifecycle facts', () => {
  const { filter_subjects: filterSubjects } = createConsumerConfig()

  for (const subject of [
    '*.domain.*.*.vertex.componentInstance.created.v1.*',
    '*.domain.*.*.vertex.stateMachine.completed.v1.*',
    '*.domain.*.*.vertex.stateMachine.started.v1.*',
    '*.domain.*.*.edge.has_data_state.result_computed.v1.*',
    '*.domain.*.*.edge.has_data_state.computation_failed.v1.*',
    '*.domain.*.*.edge.has_data_state.started.v1.*',
    '*.domain.*.*.edge.has_task_state.result_computed.v1.*',
    '*.domain.*.*.edge.has_task_state.computation_failed.v1.*',
    '*.domain.*.*.edge.has_task_state.started.v1.*',
    '*.domain.*.*.edge.has_gate_state.result_computed.v1.*',
    '*.domain.*.*.edge.has_gate_state.computation_failed.v1.*',
    '*.domain.*.*.edge.has_log.*.v1.*',
  ]) {
    assert.ok(filterSubjects.includes(subject), `missing ${subject}`)
  }
})

test('ensureConsumer preserves a durable whose filters are current', async () => {
  const config = createConsumerConfig()
  const info = { config }
  const calls = []
  const jetstreamManager = {
    consumers: {
      info: async (...args) => {
        calls.push(['info', ...args])
        return info
      },
      update: async (...args) => calls.push(['update', ...args]),
      add: async (...args) => calls.push(['add', ...args]),
    },
  }

  const result = await ensureConsumer({ streamName: 'componentStream', jetstreamManager })

  assert.equal(result, info)
  assert.deepEqual(calls, [['info', 'componentStream', consumerName]])
})

test('ensureConsumer updates filters without resetting the durable ACK floor', async () => {
  const calls = []
  const updated = { config: createConsumerConfig() }
  const jetstreamManager = {
    consumers: {
      info: async (...args) => {
        calls.push(['info', ...args])
        return { config: { filter_subjects: ['old.filter'] } }
      },
      update: async (...args) => {
        calls.push(['update', ...args])
        return updated
      },
      add: async (...args) => calls.push(['add', ...args]),
    },
  }

  const result = await ensureConsumer({ streamName: 'componentStream', jetstreamManager })

  assert.equal(result, updated)
  assert.deepEqual(calls[1], [
    'update',
    'componentStream',
    consumerName,
    { filter_subjects: createConsumerConfig().filter_subjects },
  ])
  assert.equal(calls.some(([method]) => method === 'add'), false)
})

test('ensureConsumer creates the durable only when it is missing', async () => {
  const config = createConsumerConfig()
  const added = { config }
  const calls = []
  const jetstreamManager = {
    consumers: {
      info: async (...args) => {
        calls.push(['info', ...args])
        const error = new Error('consumer not found')
        error.code = JetStreamApiCodes.ConsumerNotFound
        throw error
      },
      update: async (...args) => calls.push(['update', ...args]),
      add: async (...args) => {
        calls.push(['add', ...args])
        return added
      },
    },
  }

  const result = await ensureConsumer({ streamName: 'componentStream', jetstreamManager })

  assert.equal(result, added)
  assert.deepEqual(calls, [
    ['info', 'componentStream', consumerName],
    ['add', 'componentStream', config],
  ])
})
