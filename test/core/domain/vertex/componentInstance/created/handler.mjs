import test from 'node:test'
import assert from 'node:assert/strict'

import { addToSnapshot } from '../../../../../../core/domain/vertex/componentInstance/created/handler.js'
import { DiagnosticError, makeDiagnostics } from '../../../../../helpers.mjs'

function scope(overrides = {}) {
  return {
    handlerDiagnostics: makeDiagnostics(),
    instanceId: 'instance-1',
    instanceVertexId: 'instance-vertex-1',
    state: {
      'data.url': null,
      'task.fetch': null,
    },
    ...overrides,
  }
}

test('creates and links the initial componentState snapshot with instance lifecycle state', async () => {
  const calls = []
  const result = await addToSnapshot({
    rootCtx: {
      dataMapper: {
        query: {
          async readComponentStateId(payload) {
            calls.push(['readComponentStateId', payload])
            return []
          },
        },
        vertex: {
          componentState: {
            async create(payload) {
              calls.push(['createComponentState', payload])
              return { id: 'component-state-1' }
            },
          },
        },
        edge: {
          has_snapshot: {
            componentInstance_componentState: {
              async create(payload) {
                calls.push(['linkSnapshot', payload])
              },
            },
          },
        },
      },
    },
    scope: scope(),
  })

  assert.deepEqual(calls, [
    ['readComponentStateId', { vertexId: 'instance-vertex-1' }],
    ['createComponentState', {
      state: {
        'data.url': null,
        'data.url.state': null,
        'task.fetch': null,
        'task.fetch.state': null,
        'instance.state': 'created',
      },
    }],
    ['linkSnapshot', {
      fromId: 'instance-vertex-1',
      toId: 'component-state-1',
    }],
  ])
  assert.deepEqual(result, {
    instanceId: 'instance-1',
    instanceVertexId: 'instance-vertex-1',
    componentStateId: 'component-state-1',
    delta: {
      'instance.state': 'created',
    },
    snapshotCreated: true,
  })
})

test('replay preserves an existing snapshot and returns the created delta for republishing', async () => {
  const dataMapper = {
    query: {
      async readComponentStateId() {
        return ['component-state-existing']
      },
    },
    vertex: {
      componentState: {
        async create() {
          assert.fail('replay must not create another componentState')
        },
      },
    },
    edge: {
      has_snapshot: {
        componentInstance_componentState: {
          async create() {
            assert.fail('replay must not create another snapshot edge')
          },
        },
      },
    },
  }

  const result = await addToSnapshot({ rootCtx: { dataMapper }, scope: scope() })

  assert.equal(result.componentStateId, 'component-state-existing')
  assert.deepEqual(result.delta, { 'instance.state': 'created' })
  assert.equal(result.snapshotCreated, false)
})

test('rejects multiple linked snapshots', async () => {
  await assert.rejects(
    addToSnapshot({
      rootCtx: {
        dataMapper: {
          query: {
            async readComponentStateId() {
              return ['component-state-1', 'component-state-2']
            },
          },
        },
      },
      scope: scope(),
    }),
    DiagnosticError,
  )
})
