export class DiagnosticError extends Error {}

export function makeDiagnostics() {
  const diagnostics = {
    DiagnosticError,
    child() {
      return diagnostics
    },
    require(condition, code, message, meta) {
      if (condition) return
      const error = new DiagnosticError(message)
      error.code = code
      error.meta = meta
      throw error
    },
    invariant(condition, code, message, meta) {
      return diagnostics.require(condition, code, message, meta)
    },
    error(code, message, meta) {
      const error = new Error(message)
      error.code = code
      error.meta = meta
      return error
    },
  }

  return diagnostics
}
