import { Errors } from '../errors.js'

export function decodeData(selector) {
  return function ({ message, rootCtx: { diagnostics } }) {
    const { data } = message.json()
    diagnostics.require(
      data,
      Errors.PRECONDITION_REQUIRED,
      'Data is required',
      { field: 'data', subject: message.subject },
    )

    const picked = {}
    for (const key of selector) {
      if (Object.prototype.hasOwnProperty.call(data, key)) picked[key] = data[key]
    }
    return picked
  }
}
