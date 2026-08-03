import test from 'node:test'
import assert from 'node:assert/strict'

import {
  createComputationFailedSnapshotReducer,
  createResultSnapshotReducer,
} from '../../../../../core/domain/edge/_shared/reduceResultSnapshot.js'
import { makeDiagnostics } from '../../../../helpers.mjs'

const emits = {
  'domain.snapshot.data.result.v1': {
    env: '*',
    ns: 'domain',
    tenant: '*',
    context: '*',
    channel: 'snapshot',
    entity: 'data',
    action: 'result',
    version: 'v1',
    id: '*',
  },
  'domain.snapshot.data.computation_failed.v1': {
    env: '*',
    ns: 'domain',
    tenant: '*',
    context: '*',
    channel: 'snapshot',
    entity: 'data',
    action: 'computation_failed',
    version: 'v1',
    id: '*',
  },
}

function makeRootCtx({ currentState, calls, published }) {
  return {
    dataMapper: {
      query: {
        async readComponentStateId(payload) {
          calls.push(['readComponentStateId', payload])
          return ['component-state-1']
        },
        async readComponentState(payload) {
          calls.push(['readComponentState', payload])
          return [{ state: [currentState], updatedAt: ['2026-07-18T00:00:00.000Z'] }]
        },
      },
      vertex: {
        componentState: {
          async setState(payload) {
            calls.push(['setState', payload])
          },
        },
      },
    },
    natsContext: {
      async publish(subject, payload) {
        calls.push(['publish', subject])
        published.push({ subject, payload: JSON.parse(payload) })
      },
    },
  }
}

test('single-writer reducer merges and persists the result status, then publishes only the delta', async () => {
  const calls = []
  const published = []
  const currentState = {
    'data.url': null,
    'data.url.state': 'started',
    'task.fetch': null,
    'task.fetch.state': null,
    'instance.state': 'created',
  }
  const updatedAt = '2026-07-19T12:34:56.000Z'
  const resultValue = { href: 'https://example.test' }
  const reducer = createResultSnapshotReducer({ type: 'data' })

  const result = await reducer({
    rootCtx: makeRootCtx({ currentState, calls, published }),
    routeCtx: { emits },
    scope: {
      handlerDiagnostics: makeDiagnostics(),
      subjectParams: {
        env: 'dev',
        ns: 'domain',
        tenant: 'tenant-a',
        context: 'context-a',
        channel: 'edge',
        entity: 'has_data_state',
        action: 'result_computed',
        version: 'v1',
        id: 'event-1',
      },
      instanceId: 'instance-1',
      instanceVertexId: 'instance-vertex-1',
      stateMachineId: 'state-machine-1',
      stateEdgeId: 'state-edge-1',
      stateId: 'state-edge-1',
      name: 'url',
      result: resultValue,
      status: 'provided',
      stateEdgeStatus: 'provided',
      updatedAt,
    },
  })

  assert.deepEqual(calls.map(([name]) => name), [
    'readComponentStateId',
    'readComponentState',
    'setState',
    'publish',
  ])
  assert.deepEqual(currentState, {
    'data.url': null,
    'data.url.state': 'started',
    'task.fetch': null,
    'task.fetch.state': null,
    'instance.state': 'created',
  })
  assert.deepEqual(result.delta, {
    'data.url': resultValue,
    'data.url.state': 'provided',
  })
  assert.deepEqual(result.state, {
    'data.url': resultValue,
    'data.url.state': 'provided',
    'task.fetch': null,
    'task.fetch.state': null,
    'instance.state': 'created',
  })
  assert.equal(
    published[0].subject,
    'dev.domain.tenant-a.delta.snapshot.data.result.v1.event-1',
  )
  assert.equal(Object.hasOwn(published[0].payload.data, 'state'), false)
  assert.deepEqual(published[0].payload.data.delta, result.delta)
  assert.equal(published[0].payload.data.status, 'provided')
  assert.equal(published[0].payload.data.stateEdgeStatus, 'provided')
  assert.equal(Object.hasOwn(published[0].payload.data, 'error'), false)
  assert.equal(published[0].payload.data.componentStateId, 'component-state-1')
  assert.equal(published[0].payload.data.updatedAt, updatedAt)
})

test('single-writer reducer preserves the existing result when recording an error status', async () => {
  const calls = []
  const published = []
  const error = {
    name: 'Error',
    message: 'compute failed',
    code: 'E_COMPUTE',
  }
  const reducer = createComputationFailedSnapshotReducer({ type: 'data' })

  const result = await reducer({
    rootCtx: makeRootCtx({
      currentState: JSON.stringify({
        'data.url': 'existing-result-sentinel',
        'data.url.state': 'provided',
      }),
      calls,
      published,
    }),
    routeCtx: { emits },
    scope: {
      handlerDiagnostics: makeDiagnostics(),
      subjectParams: {
        env: 'prod',
        tenant: '_',
        context: '_',
        id: '_',
      },
      instanceId: 'instance-1',
      instanceVertexId: 'instance-vertex-1',
      name: 'url',
      status: 'error',
      stateEdgeStatus: 'error',
      error,
      updatedAt: '2026-07-19T12:34:56.000Z',
    },
  })

  assert.deepEqual(result.delta, {
    'data.url.state': 'error',
  })
  assert.deepEqual(result.state, {
    'data.url': 'existing-result-sentinel',
    'data.url.state': 'error',
  })
  assert.equal(Object.hasOwn(result.delta, 'data.url'), false)
  assert.deepEqual(published[0].payload.data.delta, result.delta)
  assert.equal(
    published[0].subject,
    'prod.domain._.delta.snapshot.data.computation_failed.v1._',
  )
  assert.equal(published[0].payload.data.status, 'error')
  assert.equal(published[0].payload.data.stateEdgeStatus, 'error')
  assert.deepEqual(published[0].payload.data.error, error)
})
