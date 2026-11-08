'use client'

import { Component, type ReactNode } from 'react'

/** Keeps a WebGL/three failure local: the rest of the page stays usable via the fallback. */
export class SceneBoundary extends Component<
  { fallback: ReactNode; children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children
  }
}
