/** Returns true when the browser can create a WebGL2 context (three r187 requires WebGL2). */
export function hasWebGL(test?: () => WebGLRenderingContext | null): boolean {
  if (test) return Boolean(test())
  try {
    const canvas = document.createElement('canvas')
    const context = canvas.getContext('webgl2')
    context?.getExtension('WEBGL_lose_context')?.loseContext()
    return Boolean(context)
  } catch {
    return false
  }
}

/** The seat step defaults to the 2D map when the device cannot render the 3D venue. */
export function defaultSeatView(webglAvailable: boolean): '3d' | 'map' {
  return webglAvailable ? '3d' : 'map'
}
