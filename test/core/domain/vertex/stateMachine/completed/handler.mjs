import test from 'node:test'
import assert from 'node:assert/strict'

import { updateSnapshotState } from '../../../../../../core/domain/vertex/stateMachine/completed/handler.js'
import { DiagnosticError, makeDiagnostics } from '../../../../../helpers.mjs'

function args({
  instanceVertexIds = ['instance-vertex-1'],
  componentStateIds = ['component-state-1'],
  currentState,
  calls = [],
} = {}) {
  return {
    rootCtx: {
      dataMapper: {
        query: {
          async findInstanceVertexId(payload) {
            calls.push(['findInstanceVertexId', payload])
            return instanceVertexIds
          },
          async readComponentStateId(payload) {
            calls.push(['readComponentStateId', payload])
            return componentStateIds
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
    },
    scope: {
      handlerDiagnostics: makeDiagnostics(),
      instanceId: 'instance-1',
      updatedAt: '2026-07-26T12:34:56.000Z',
    },
  }
}

test('resolves the instance and preserves its snapshot while marking it complete', async () => {
  const calls = []
  const currentState = {
    'instance.state': 'running',
    'data.url': 'https://example.test',
    'data.url.state': 'started',
  }

  const result = await updateSnapshotState(args({ currentState, calls }))

  assert.deepEqual(calls, [
    ['findInstanceVertexId', { instanceId: 'instance-1' }],
    ['readComponentStateId', { vertexId: 'instance-vertex-1' }],
    ['readComponentState', { vertexId: 'component-state-1' }],
    ['setState', {
      componentStateId: 'component-state-1',
      state: {
        'instance.state': 'complete',
        'data.url': 'https://example.test',
        'data.url.state': 'started',
      },
      updatedAt: '2026-07-26T12:34:56.000Z',
    }],
  ])
  assert.deepEqual(currentState, {
    'instance.state': 'running',
    'data.url': 'https://example.test',
    'data.url.state': 'started',
  })
  assert.deepEqual(result.delta, { 'instance.state': 'complete' })
  assert.equal(result.instanceVertexId, 'instance-vertex-1')
  assert.equal(result.componentStateId, 'component-state-1')
  assert.equal(result.snapshotUpdated, true)
})

test('accepts a serialized component snapshot', async () => {
  const result = await updateSnapshotState(args({
    currentState: JSON.stringify({
      'instance.state': 'running',
      'task.fetch': null,
    }),
  }))

  assert.deepEqual(result.snapshotState, {
    'instance.state': 'complete',
    'task.fetch': null,
  })
})

for (const instanceVertexIds of [[], ['instance-vertex-1', 'instance-vertex-2']]) {
  test(`rejects an invalid resolved instance count of ${instanceVertexIds.length}`, async () => {
    await assert.rejects(
      updateSnapshotState(args({
        instanceVertexIds,
        currentState: { 'instance.state': 'running' },
      })),
      DiagnosticError,
    )
  })
}

for (const componentStateIds of [[], ['component-state-1', 'component-state-2']]) {
  test(`rejects an invalid linked snapshot count of ${componentStateIds.length}`, async () => {
    await assert.rejects(
      updateSnapshotState(args({
        componentStateIds,
        currentState: { 'instance.state': 'running' },
      })),
      DiagnosticError,
    )
  })
}

test('rejects an invalid component snapshot state', async () => {
  await assert.rejects(
    updateSnapshotState(args({ currentState: 'not-json' })),
    DiagnosticError,
  )
})
