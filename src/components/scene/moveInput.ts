/**
 * Camera-relative input: rotate the raw move vector by the camera's
 * horizontal look angle so forward is always "away from the camera".
 *
 * Convention: viewAngle theta is the camera's look angle where its forward
 * vector is (sin theta, 0, cos theta). W/up yields inputZ = -1, D/right
 * yields inputX = +1. At theta = PI (camera facing north) the result is
 * byte-identical to the old compass-absolute vectors.
 */
export function rotateInputByView(inputX: number, inputZ: number, viewAngle: number): { x: number; z: number } {
  const sin = Math.sin(viewAngle)
  const cos = Math.cos(viewAngle)
  return {
    x: -inputZ * sin - inputX * cos,
    z: -inputZ * cos + inputX * sin,
  }
}
