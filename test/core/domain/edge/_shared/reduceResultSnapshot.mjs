import test from 'node:test'
import assert from 'node:assert/strict'

import { createResultSnapshotReducer } from '../../../../../core/domain/edge/_shared/reduceResultSnapshot.js'
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

test('single-writer reducer merges and persists the full state, then publishes only the delta', async () => {
  const calls = []
  const published = []
  const currentState = {
    'data.url': null,
    'task.fetch': null,
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
    'task.fetch': null,
  })
  assert.deepEqual(result.delta, {
    'data.url': resultValue,
  })
  assert.deepEqual(result.state, {
    'data.url': resultValue,
    'task.fetch': null,
  })
  assert.equal(
    published[0].subject,
    'dev.domain.tenant-a.delta.snapshot.data.result.v1.event-1',
  )
  assert.equal(Object.hasOwn(published[0].payload.data, 'state'), false)
  assert.deepEqual(published[0].payload.data.delta, result.delta)
  assert.equal(published[0].payload.data.componentStateId, 'component-state-1')
  assert.equal(published[0].payload.data.updatedAt, updatedAt)
})

test('single-writer reducer treats null as a native result value', async () => {
  const calls = []
  const published = []
  const reducer = createResultSnapshotReducer({ type: 'data' })

  const result = await reducer({
    rootCtx: makeRootCtx({
      currentState: JSON.stringify({ 'data.url': 'old-value' }),
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
      result: null,
      updatedAt: '2026-07-19T12:34:56.000Z',
    },
  })

  assert.deepEqual(result.delta, { 'data.url': null })
  assert.deepEqual(result.state, { 'data.url': null })
  assert.deepEqual(published[0].payload.data.delta, { 'data.url': null })
})
