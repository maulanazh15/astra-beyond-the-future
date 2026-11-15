import { Component } from 'react'
import type { ErrorInfo, ReactNode } from 'react'

type SceneErrorBoundaryProps = {
  fallback: ReactNode
  onError?: (error: unknown) => void
  children: ReactNode
}

/**
 * Catches failed model loads (missing file, corrupt GLB) and WebGL errors, rendering `fallback`.
 * Class component by necessity: React has no hook-based error boundary. This is the only exception
 * to the function-component convention.
 */
export class SceneErrorBoundary extends Component<SceneErrorBoundaryProps, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error: unknown, info: ErrorInfo) {
    if (import.meta.env.DEV) console.warn('3D content failed to render; showing fallback.', error, info.componentStack)
    this.props.onError?.(error)
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children
  }
}
