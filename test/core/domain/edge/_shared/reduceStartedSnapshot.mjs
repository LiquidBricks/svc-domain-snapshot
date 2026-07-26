import test from 'node:test'
import assert from 'node:assert/strict'

import { createStartedSnapshotReducer } from '../../../../../core/domain/edge/_shared/reduceStartedSnapshot.js'
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

function reducerArgs({ currentState, calls, published }) {
  return {
    rootCtx: {
      dataMapper: {
        query: {
          async readComponentStateId(payload) {
            calls.push(['readComponentStateId', payload])
            return ['component-state-1']
          },
          async readComponentState(payload) {
            calls.push(['readComponentState', payload])
            return [{ state: [currentState] }]
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
    },
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
      stateMachineId: 'state-machine-1',
      stateEdgeId: 'state-edge-1',
      stateId: 'state-edge-1',
      name: 'recipient',
      updatedAt: '2026-07-26T12:34:56.000Z',
    },
  }
}

test('started reducer preserves the result and updates its adjacent state key', async () => {
  const calls = []
  const published = []
  const currentState = {
    'instance.state': 'created',
    'data.recipient': 'Liquid Bricks',
    'data.recipient.state': null,
    'task.canGreet': true,
    'task.canGreet.state': null,
  }
  const reducer = createStartedSnapshotReducer({ type: 'data' })

  const result = await reducer(reducerArgs({ currentState, calls, published }))

  assert.deepEqual(calls.map(([name]) => name), [
    'readComponentStateId',
    'readComponentState',
    'setState',
    'publish',
  ])
  assert.deepEqual(currentState, {
    'instance.state': 'created',
    'data.recipient': 'Liquid Bricks',
    'data.recipient.state': null,
    'task.canGreet': true,
    'task.canGreet.state': null,
  })
  assert.deepEqual(result.delta, {
    'data.recipient.state': 'started',
  })
  assert.deepEqual(result.state, {
    'instance.state': 'created',
    'data.recipient': 'Liquid Bricks',
    'data.recipient.state': 'started',
    'task.canGreet': true,
    'task.canGreet.state': null,
  })
  assert.equal(
    published[0].subject,
    'prod.domain._.state.snapshot.data.result.v1._',
  )
  assert.deepEqual(published[0].payload.data.delta, result.delta)
  assert.equal(published[0].payload.data.name, 'recipient')
})

test('started reducer accepts a serialized component state', async () => {
  const calls = []
  const published = []
  const reducer = createStartedSnapshotReducer({ type: 'data' })
  const result = await reducer(reducerArgs({
    currentState: JSON.stringify({
      'data.recipient': null,
      'data.recipient.state': null,
    }),
    calls,
    published,
  }))

  assert.deepEqual(result.state, {
    'data.recipient': null,
    'data.recipient.state': 'started',
  })
})
