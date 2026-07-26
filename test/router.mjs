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

  assert.equal(routes.length, 6)
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

test('router folds componentInstance created into the domain snapshot and publishes its delta before ack', async () => {
  const order = []
  const diagnostics = makeDiagnostics()
  const dataMapper = {
    query: {
      async readComponentStateId() {
        order.push('readComponentStateId')
        return []
      },
    },
    vertex: {
      componentState: {
        async create({ state }) {
          order.push('createComponentState')
          assert.deepEqual(state, {
            'data.url': null,
            'data.url.state': null,
            'task.fetch': null,
            'task.fetch.state': null,
            'instance.state': 'created',
          })
          return { id: 'component-state-1' }
        },
      },
    },
    edge: {
      has_snapshot: {
        componentInstance_componentState: {
          async create(payload) {
            order.push('linkSnapshot')
            assert.deepEqual(payload, {
              fromId: 'instance-vertex-1',
              toId: 'component-state-1',
            })
          },
        },
      },
    },
  }
  const message = {
    subject: 'prod.domain._._.vertex.componentInstance.created.v1._',
    json() {
      return {
        data: {
          instanceId: 'instance-1',
          instanceVertexId: 'instance-vertex-1',
          componentId: 'component-1',
          componentHash: 'component-hash-1',
          stateMachineId: 'state-machine-1',
          state: {
            'data.url': null,
            'task.fetch': null,
          },
          updatedAt: '2026-07-19T12:34:56.000Z',
        },
      }
    },
    ack() {
      order.push('ack')
    },
  }

  const router = createDomainSnapshotRouter({
    natsContext: {
      async publish(subject, payload) {
        order.push('publishSnapshot')
        assert.equal(
          subject,
          'prod.domain._.delta.snapshot.instance.result.v1._',
        )
        assert.deepEqual(JSON.parse(payload), {
          data: {
            instanceId: 'instance-1',
            instanceVertexId: 'instance-vertex-1',
            componentStateId: 'component-state-1',
            stateMachineId: 'state-machine-1',
            type: 'instance',
            name: 'state',
            delta: {
              'instance.state': 'created',
            },
            updatedAt: '2026-07-19T12:34:56.000Z',
          },
        })
      },
    },
    diagnostics,
    dataMapper,
  })
  const response = await router.request({
    subject: message.subject,
    message,
  })

  assert.deepEqual(order, [
    'readComponentStateId',
    'createComponentState',
    'linkSnapshot',
    'publishSnapshot',
    'ack',
  ])
  assert.equal(response.scope.snapshotCreated, true)
  assert.equal(response.scope.snapshotPublished, true)
  assert.equal(response.scope.componentStateId, 'component-state-1')
  assert.deepEqual(response.scope.delta, { 'instance.state': 'created' })
  assert.equal(
    response.scope.snapshotSubject,
    'prod.domain._.delta.snapshot.instance.result.v1._',
  )
})

test('router republishes the delta when an existing snapshot is recovering from a prior publish failure', async () => {
  const order = []
  const diagnostics = makeDiagnostics()
  const dataMapper = {
    query: {
      async readComponentStateId() {
        order.push('readComponentStateId')
        return ['component-state-1']
      },
    },
  }
  const message = {
    subject: 'prod.domain._._.vertex.componentInstance.created.v1._',
    json() {
      return {
        data: {
          instanceId: 'instance-1',
          instanceVertexId: 'instance-vertex-1',
          componentId: 'component-1',
          componentHash: 'component-hash-1',
          stateMachineId: 'state-machine-1',
          state: {
            'data.url': null,
          },
          updatedAt: '2026-07-19T12:34:56.000Z',
        },
      }
    },
    ack() {
      order.push('ack')
    },
  }

  const router = createDomainSnapshotRouter({
    natsContext: {
      async publish(subject, payload) {
        order.push('publishSnapshot')
        assert.equal(subject, 'prod.domain._.delta.snapshot.instance.result.v1._')
        assert.deepEqual(JSON.parse(payload).data.delta, {
          'instance.state': 'created',
        })
      },
    },
    diagnostics,
    dataMapper,
  })
  const response = await router.request({
    subject: message.subject,
    message,
  })

  assert.deepEqual(order, [
    'readComponentStateId',
    'publishSnapshot',
    'ack',
  ])
  assert.equal(response.scope.snapshotCreated, false)
  assert.equal(response.scope.snapshotPublished, true)
})

for (const { type, entity, name, result } of [
  {
    type: 'data',
    entity: 'has_data_state',
    name: 'recipient',
    result: 'Liquid Bricks',
  },
  {
    type: 'task',
    entity: 'has_task_state',
    name: 'canGreet',
    result: true,
  },
]) {
  test(`router folds ${type} started into its adjacent snapshot state before ack`, async () => {
    const order = []
    const currentState = {
      [`${type}.${name}`]: result,
      [`${type}.${name}.state`]: null,
    }
    const dataMapper = {
      query: {
        async readComponentStateId() {
          order.push('readComponentStateId')
          return ['component-state-1']
        },
        async readComponentState() {
          order.push('readComponentState')
          return [{ state: [currentState] }]
        },
      },
      vertex: {
        componentState: {
          async setState({ componentStateId, state, updatedAt }) {
            order.push('setState')
            assert.equal(componentStateId, 'component-state-1')
            assert.equal(updatedAt, '2026-07-26T12:34:56.000Z')
            assert.deepEqual(state, {
              [`${type}.${name}`]: result,
              [`${type}.${name}.state`]: 'started',
            })
          },
        },
      },
    }
    const message = {
      subject: `prod.domain._._.edge.${entity}.started.v1._`,
      json() {
        return {
          data: {
            instanceId: 'instance-1',
            instanceVertexId: 'instance-vertex-1',
            stateMachineId: 'state-machine-1',
            stateEdgeId: 'state-edge-1',
            stateId: 'state-edge-1',
            nodeId: `${type}-node-1`,
            componentHash: 'component-hash-1',
            name,
            deps: {},
            type,
            status: 'running',
            stateEdgeStatus: 'running',
            updatedAt: '2026-07-26T12:34:56.000Z',
          },
        }
      },
      ack() {
        order.push('ack')
      },
    }
    const router = createDomainSnapshotRouter({
      diagnostics: makeDiagnostics(),
      dataMapper,
      natsContext: {
        async publish(subject, payload) {
          order.push('publish')
          assert.equal(
            subject,
            `prod.domain._.state.snapshot.${type}.result.v1._`,
          )
          assert.deepEqual(JSON.parse(payload).data, {
            instanceId: 'instance-1',
            instanceVertexId: 'instance-vertex-1',
            componentStateId: 'component-state-1',
            stateMachineId: 'state-machine-1',
            stateEdgeId: 'state-edge-1',
            stateId: 'state-edge-1',
            type,
            name,
            delta: {
              [`${type}.${name}.state`]: 'started',
            },
            updatedAt: '2026-07-26T12:34:56.000Z',
          })
        },
      },
    })

    const response = await router.request({
      subject: message.subject,
      message,
    })

    assert.deepEqual(order, [
      'readComponentStateId',
      'readComponentState',
      'setState',
      'publish',
      'ack',
    ])
    assert.deepEqual(response.scope.delta, {
      [`${type}.${name}.state`]: 'started',
    })
  })
}
