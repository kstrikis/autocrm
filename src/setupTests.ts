import { vi } from 'vitest'

declare global {
  var vi: any
}

// Make vi available globally
globalThis.vi = vi 