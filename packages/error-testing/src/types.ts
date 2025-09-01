import type {ComponentType} from 'react'

/**
 * Represents a test scenario context that maintains type safety throughout the test lifecycle.
 */
export interface TestContext<TState = unknown> {
  state: TState
  services: Record<string, unknown>
}

/**
 * Base interface for error boundary configurations.
 */
export interface ErrorBoundaryConfig<TError extends Error = Error> {
  readonly name: string
  readonly errorTypes: readonly (new (...args: any[]) => TError)[]
  readonly fallback?: ComponentType<{error: TError}>
}

/**
 * Type-safe error recovery strategy.
 */
export interface ErrorRecoveryStrategy<TError extends Error = Error, TState = unknown> {
  readonly canHandle: (error: Error) => error is TError
  readonly handle: (error: TError, context: TestContext<TState>) => Promise<void>
}

/**
 * Configuration for a test scenario.
 */
export interface TestScenarioConfig<TError extends Error = Error, TState = unknown> {
  description: string
  setup?: (context: TestContext<TState>) => Promise<void>
  teardown?: (context: TestContext<TState>) => Promise<void>
  errorType: new (...args: any[]) => TError
  recovery?: ErrorRecoveryStrategy<TError, TState>
}

/**
 * Result of a test scenario execution.
 */
export interface TestResult<TError extends Error = Error> {
  success: boolean
  error?: TError
  recoveryAttempted: boolean
  recoverySucceeded?: boolean
}
