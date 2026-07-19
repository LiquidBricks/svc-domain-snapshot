import { Errors } from '../../../../errors.js'

const hasOwn = (value, key) => Object.prototype.hasOwnProperty.call(value, key)

export function validateResultPayload({ scope }, { type }) {
  const {
    handlerDiagnostics,
    instanceId,
    instanceVertexId,
    name,
    updatedAt,
  } = scope

  handlerDiagnostics.require(
    typeof instanceId === 'string' && instanceId.length,
    Errors.PRECONDITION_REQUIRED,
    `instanceId required for ${type} snapshot result`,
    { field: 'instanceId', type },
  )
  handlerDiagnostics.require(
    typeof instanceVertexId === 'string' && instanceVertexId.length,
    Errors.PRECONDITION_REQUIRED,
    `instanceVertexId required for ${type} snapshot result`,
    { field: 'instanceVertexId', type },
  )
  handlerDiagnostics.require(
    typeof name === 'string' && name.length,
    Errors.PRECONDITION_REQUIRED,
    `name required for ${type} snapshot result`,
    { field: 'name', type },
  )
  handlerDiagnostics.require(
    hasOwn(scope, 'result'),
    Errors.PRECONDITION_REQUIRED,
    `native result required for ${type} snapshot result`,
    { field: 'result', type },
  )

  return {
    type,
    updatedAt: typeof updatedAt === 'string' && updatedAt.length
      ? updatedAt
      : new Date().toISOString(),
  }
}
