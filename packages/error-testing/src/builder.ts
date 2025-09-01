import type {ErrorRecoveryStrategy, TestContext, TestResult, TestScenarioConfig} from './types'

/**
 * A fluent builder for creating type-safe error test scenarios.
 */
export class TestScenarioBuilder<TError extends Error = Error, TState = unknown> {
  private config: Partial<TestScenarioConfig<TError, TState>> = {}

  /**
   * Creates a new test scenario builder.
   * @param description - A description of the test scenario
   */
  static create<E extends Error = Error, S = unknown>(description: string): TestScenarioBuilder<E, S> {
    return new TestScenarioBuilder<E, S>().withDescription(description)
  }

  /**
   * Sets the description for the test scenario.
   */
  withDescription(description: string): this {
    this.config.description = description
    return this
  }

  /**
   * Specifies the error type to test.
   * @param errorType - The constructor for the error type
   */
  withErrorType<E extends Error>(errorType: new (...args: any[]) => E): TestScenarioBuilder<E, TState> {
    ;(this.config as any).errorType = errorType
    return this as any
  }

  /**
   * Adds a setup function to the test scenario.
   * @param setup - The setup function to run before the test
   */
  withSetup(setup: (context: TestContext<TState>) => Promise<void>): this {
    this.config.setup = setup
    return this
  }

  /**
   * Adds a teardown function to the test scenario.
   * @param teardown - The teardown function to run after the test
   */
  withTeardown(teardown: (context: TestContext<TState>) => Promise<void>): this {
    this.config.teardown = teardown
    return this
  }

  /**
   * Adds a recovery strategy to the test scenario.
   * @param recovery - The recovery strategy to use
   */
  withRecovery(recovery: ErrorRecoveryStrategy<TError, TState>): this {
    this.config.recovery = recovery
    return this
  }

  /**
   * Builds the test scenario configuration.
   * @throws {Error} If the configuration is incomplete
   */
  build(): TestScenarioConfig<TError, TState> {
    if (!this.config.description) {
      throw new Error('Test scenario must have a description')
    }
    if (!this.config.errorType) {
      throw new Error('Test scenario must have an error type')
    }

    return this.config as TestScenarioConfig<TError, TState>
  }

  /**
   * Executes the test scenario.
   * @param context - The test context
   */
  async execute(context: TestContext<TState>): Promise<TestResult<TError>> {
    const config = this.build()
    const result: TestResult<TError> = {
      success: false,
      recoveryAttempted: false,
    }

    try {
      if (config.setup) {
        await config.setup(context)
      }

      // Here you would typically trigger the error condition
      // eslint-disable-next-line new-cap
      throw new config.errorType()
    } catch (error) {
      if (error instanceof config.errorType) {
        result.error = error

        if (config.recovery) {
          result.recoveryAttempted = true
          try {
            await config.recovery.handle(error, context)
            result.recoverySucceeded = true
            result.success = true
          } catch {
            result.recoverySucceeded = false
          }
        }
      }
    } finally {
      if (config.teardown) {
        await config.teardown(context)
      }
    }

    return result
  }
}
