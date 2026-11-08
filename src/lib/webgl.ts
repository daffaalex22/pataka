/** Returns true when the browser can create a WebGL context (v2 preferred, v1 fallback). */
export function hasWebGL(test?: () => WebGLRenderingContext | null): boolean {
  if (test) return Boolean(test())
  try {
    const canvas = document.createElement('canvas')
    return Boolean(canvas.getContext('webgl2') ?? canvas.getContext('webgl'))
  } catch {
    return false
  }
}
