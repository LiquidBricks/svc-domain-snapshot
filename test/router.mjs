import test from 'node:test'
import assert from 'node:assert/strict'

import { createDomainSnapshotRouter, routes } from '../router.js'
import { makeDiagnostics } from './helpers.mjs'

test('router exposes inbound params and runs the data snapshot route through ack', async () => {
  const order = []
  const published = []
  const diagnostics = makeDiagnostics()
  const dataMapper = {
    query: {
      async readComponentStateId() {
        return ['component-state-1']
      },
      async readComponentState() {
        return [{
          state: [{
            'data.url': null,
            'task.fetch': null,
          }],
        }]
      },
    },
    vertex: {
      componentState: {
        async setState(payload) {
          order.push('setState')
          assert.deepEqual(payload.state, {
            'data.url': 'https://example.test',
            'task.fetch': null,
          })
        },
      },
    },
  }
  const natsContext = {
    async publish(subject, payload) {
      order.push('publish')
      published.push({ subject, payload: JSON.parse(payload) })
    },
  }
  const message = {
    subject: 'dev.domain.tenant-a.context-a.edge.has_data_state.result_computed.v1.event-1',
    json() {
      return {
        data: {
          instanceId: 'instance-1',
          instanceVertexId: 'instance-vertex-1',
          stateMachineId: 'state-machine-1',
          stateEdgeId: 'state-edge-1',
          stateId: 'state-edge-1',
          type: 'task',
          name: 'url',
          result: 'https://example.test',
          updatedAt: '2026-07-19T12:34:56.000Z',
        },
      }
    },
    ack() {
      order.push('ack')
    },
  }

  const router = createDomainSnapshotRouter({
    natsContext,
    diagnostics,
    dataMapper,
  })
  const response = await router.request({
    subject: message.subject,
    message,
  })

  assert.equal(routes.length, 3)
  assert.deepEqual(order, ['setState', 'publish', 'ack'])
  assert.deepEqual(response.scope.subjectParams, {
    env: 'dev',
    ns: 'domain',
    tenant: 'tenant-a',
    context: 'context-a',
    channel: 'edge',
    entity: 'has_data_state',
    action: 'result_computed',
    version: 'v1',
    id: 'event-1',
  })
  assert.equal(
    published[0].subject,
    'dev.domain.tenant-a.delta.snapshot.data.result.v1.event-1',
  )
  assert.equal(published[0].payload.data.type, 'data')
  assert.equal(Object.hasOwn(published[0].payload.data, 'state'), false)
  assert.deepEqual(published[0].payload.data.delta, {
    'data.url': 'https://example.test',
  })
})
