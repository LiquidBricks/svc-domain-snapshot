import test from 'node:test'
import assert from 'node:assert/strict'

import { snapshotLog } from '../../../../../core/domain/edge/has_log/handler.js'
import { makeDiagnostics } from '../../../../helpers.mjs'

const emits = {
  'domain.snapshot.log.*.v1.*': {
    env: '*',
    ns: 'domain',
    tenant: '*',
    context: '*',
    channel: 'snapshot',
    entity: 'log',
    action: '*',
    version: 'v1',
    id: '*',
  },
}

function snapshotArgs({ currentLogs = [] } = {}) {
  const calls = []
  const published = []
  const currentState = {
    'instance.state': 'running',
    logs: currentLogs,
  }
  const dataMapper = {
    query: {
      async findComponentInstanceVertexId(payload) {
        calls.push(['findComponentInstanceVertexId', payload])
        return ['instance-vertex-1']
      },
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
  }

  return {
    calls,
    published,
    args: {
      rootCtx: {
        dataMapper,
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
          action: 'error',
          id: 'instance-1',
        },
        instanceId: 'instance-1',
        logId: 'log-1',
        name: 'inspectContainer',
        type: 'task',
        method: 'error',
        args: ['inspect failed', { code: 125 }],
        updatedAt: '2026-08-15T12:34:56.000Z',
      },
    },
  }
}

test('has_log snapshot appends the log and publishes the updated logs delta', async () => {
  const { calls, published, args } = snapshotArgs()
  const result = await snapshotLog(args)

  assert.deepEqual(calls.map(([method]) => method), [
    'findComponentInstanceVertexId',
    'readComponentStateId',
    'readComponentState',
    'setState',
    'publish',
  ])
  assert.equal(result.snapshotChanged, true)
  assert.deepEqual(result.log, {
    logId: 'log-1',
    name: 'inspectContainer',
    type: 'task',
    method: 'error',
    args: ['inspect failed', { code: 125 }],
    updatedAt: '2026-08-15T12:34:56.000Z',
  })
  assert.deepEqual(result.delta, { logs: [result.log] })
  assert.deepEqual(result.state, {
    'instance.state': 'running',
    logs: [result.log],
  })
  assert.equal(published[0].subject, 'prod.domain._.delta.snapshot.log.error.v1.instance-1')
  assert.deepEqual(published[0].payload.data, {
    instanceId: 'instance-1',
    instanceVertexId: 'instance-vertex-1',
    componentStateId: 'component-state-1',
    ...result.log,
    delta: result.delta,
  })
})

test('has_log snapshot does not append the same logId twice during replay', async () => {
  const log = {
    logId: 'log-1',
    name: 'inspectContainer',
    type: 'task',
    method: 'error',
    args: ['inspect failed', { code: 125 }],
    updatedAt: '2026-08-15T12:34:56.000Z',
  }
  const { calls, published, args } = snapshotArgs({ currentLogs: [log] })
  const result = await snapshotLog(args)

  assert.equal(result.snapshotChanged, false)
  assert.deepEqual(result.logs, [log])
  assert.equal(calls.some(([method]) => method === 'setState'), false)
  assert.equal(published.length, 1)
})
