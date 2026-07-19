import router from '@liquid-bricks/lib-nats-subject/router'
import { dataMapper as createDataMapper } from '@liquid-bricks/spec-domain/domain'
import { Errors } from './errors.js'
import * as domain from './core/domain/index.js'

export const routes = [
  [domain.edge.has_data_state.result_computed.path, domain.edge.has_data_state.result_computed.spec],
  [domain.edge.has_task_state.result_computed.path, domain.edge.has_task_state.result_computed.spec],
  [domain.edge.has_gate_state.result_computed.path, domain.edge.has_gate_state.result_computed.spec],
]

export function createDomainSnapshotRouter({
  natsContext,
  g,
  diagnostics,
  dataMapper = createDataMapper({ g, diagnostics }),
}) {
  return router({
    tokens: ['env', 'ns', 'tenant', 'context', 'channel', 'entity', 'action', 'version', 'id'],
    context: { natsContext, g, diagnostics, dataMapper },
  })
    .beforeEach(({ rootCtx: { diagnostics }, info: { params, values, stage, index, fn }, scope, message }) => {
      const handlerDiagnostics = diagnostics.child({
        router: { params, values, stage, index, fn },
        scope,
        message: message.json(),
      })

      return {
        handlerDiagnostics,
        subjectParams: { ...params },
      }
    })
    .route({}, { children: routes })
    .default({
      handler: async ({ message, rootCtx: { diagnostics } }) => {
        diagnostics.invariant(
          false,
          Errors.ROUTER_UNKNOWN_SUBJECT,
          `No handler for subject: ${message.subject}`,
          { subject: message.subject, message: message?.json?.() },
        )
      },
    })
    .error(({ error, rootCtx: { diagnostics } }, ...rest) => {
      if (error instanceof diagnostics.DiagnosticError) return
      throw diagnostics.error(
        Errors.ROUTER_HANDLER_ERROR,
        'domain snapshot router error',
        { error, rest },
      )
    })
    .abort(({ message }) => {
      try { message?.ack?.() } catch (_) { /* ignore */ }
      return { status: 'aborted' }
    })
}
