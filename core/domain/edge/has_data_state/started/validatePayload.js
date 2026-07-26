import { validateStartedPayload } from '../../_shared/validateStartedPayload.js'

export function validatePayload(args) {
  return validateStartedPayload(args, { type: 'data' })
}
