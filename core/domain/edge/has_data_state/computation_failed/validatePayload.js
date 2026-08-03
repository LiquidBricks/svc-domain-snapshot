import { validateComputationFailurePayload } from '../../_shared/validateComputationFailurePayload.js'

export function validatePayload(args) {
  return validateComputationFailurePayload(args, { type: 'data' })
}
