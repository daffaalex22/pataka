import { describe, expect, it } from 'vitest'
import { rotateInputByView } from '@/components/scene/moveInput'

function expectVec(actual: { x: number; z: number }, x: number, z: number) {
  expect(actual.x).toBeCloseTo(x, 10)
  expect(actual.z).toBeCloseTo(z, 10)
}

describe('rotateInputByView', () => {
  it('keeps the spawn view byte-identical (camera facing north)', () => {
    expectVec(rotateInputByView(0, -1, Math.PI), 0, -1)
    expectVec(rotateInputByView(1, 0, Math.PI), 1, 0)
    expectVec(rotateInputByView(0, 1, Math.PI), 0, 1)
  })

  it('continues forward after turning around (camera facing south)', () => {
    expectVec(rotateInputByView(0, -1, 0), 0, 1)
    expectVec(rotateInputByView(1, 0, 0), -1, 0)
  })

  it('maps input to the view axes when facing east', () => {
    expectVec(rotateInputByView(0, -1, Math.PI / 2), 1, 0)
    expectVec(rotateInputByView(1, 0, Math.PI / 2), 0, 1)
  })
})
