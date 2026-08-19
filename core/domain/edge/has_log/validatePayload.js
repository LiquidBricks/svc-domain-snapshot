import {
  DOMAIN_SNAPSHOT_PRECONDITION_INVALID,
  DOMAIN_SNAPSHOT_PRECONDITION_REQUIRED,
} from '@liquid-bricks/lib-diagnostics/codes'

const functionTypes = new Set(['data', 'gate', 'task'])
const canonicalIsoDateTime = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/

export function validatePayload({ scope }) {
  const {
    handlerDiagnostics,
    subjectParams,
    instanceId,
    logId,
    name,
    type,
    method,
    args,
    updatedAt,
  } = scope

  for (const [field, value] of [
    ['instanceId', instanceId],
    ['logId', logId],
    ['name', name],
    ['method', method],
    ['updatedAt', updatedAt],
  ]) {
    handlerDiagnostics.require(
      typeof value === 'string' && value.length > 0,
      DOMAIN_SNAPSHOT_PRECONDITION_REQUIRED,
      `${field} required for has_log snapshot`,
      { field },
    )
  }

  handlerDiagnostics.require(
    functionTypes.has(type),
    DOMAIN_SNAPSHOT_PRECONDITION_INVALID,
    'type must be data, gate, or task for has_log snapshot',
    { field: 'type', type },
  )
  handlerDiagnostics.require(
    Array.isArray(args),
    DOMAIN_SNAPSHOT_PRECONDITION_INVALID,
    'args must be an array for has_log snapshot',
    { field: 'args' },
  )
  handlerDiagnostics.require(
    subjectParams?.action === method,
    DOMAIN_SNAPSHOT_PRECONDITION_INVALID,
    'has_log method must match the fact path for snapshotting',
    { field: 'method', method, action: subjectParams?.action },
  )
  handlerDiagnostics.require(
    subjectParams?.id === instanceId,
    DOMAIN_SNAPSHOT_PRECONDITION_INVALID,
    'has_log instanceId must match the fact path for snapshotting',
    { field: 'instanceId', instanceId, id: subjectParams?.id },
  )

  const timestamp = Date.parse(updatedAt)
  handlerDiagnostics.require(
    canonicalIsoDateTime.test(updatedAt)
      && Number.isFinite(timestamp)
      && new Date(timestamp).toISOString() === updatedAt,
    DOMAIN_SNAPSHOT_PRECONDITION_INVALID,
    'updatedAt must be a canonical ISO date-time for has_log snapshot',
    { field: 'updatedAt', updatedAt },
  )

  return { updatedAt }
}
