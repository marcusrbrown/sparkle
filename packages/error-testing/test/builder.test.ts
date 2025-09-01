import {describe, expect, it} from 'vitest'
import {TestScenarioBuilder, type TestContext} from '../src'

class CustomError extends Error {
  constructor(message = 'Custom error') {
    super(message)
    this.name = 'CustomError'
  }
}

interface TestState {
  counter: number
}

describe('TestScenarioBuilder', () => {
  it('should build and execute a test scenario', async () => {
    const context: TestContext<TestState> = {
      state: {counter: 0},
      services: {},
    }

    const scenario = TestScenarioBuilder.create<CustomError, TestState>('Test custom error handling')
      .withErrorType(CustomError)
      .withSetup(async ctx => {
        ctx.state.counter += 1
      })
      .withRecovery({
        canHandle: (error): error is CustomError => error instanceof CustomError,
        handle: async (_, ctx) => {
          ctx.state.counter += 1
        },
      })
      .withTeardown(async ctx => {
        ctx.state.counter = 0
      })

    const result = await scenario.execute(context)

    expect(result.success).toBe(true)
    expect(result.recoveryAttempted).toBe(true)
    expect(result.recoverySucceeded).toBe(true)
    expect(result.error).toBeInstanceOf(CustomError)
    expect(context.state.counter).toBe(0) // Reset by teardown
  })

  it('should fail when recovery fails', async () => {
    const context: TestContext<TestState> = {
      state: {counter: 0},
      services: {},
    }

    const scenario = TestScenarioBuilder.create<CustomError, TestState>('Test failed recovery')
      .withErrorType(CustomError)
      .withRecovery({
        canHandle: (error): error is CustomError => error instanceof CustomError,
        handle: async () => {
          throw new Error('Recovery failed')
        },
      })

    const result = await scenario.execute(context)

    expect(result.success).toBe(false)
    expect(result.recoveryAttempted).toBe(true)
    expect(result.recoverySucceeded).toBe(false)
    expect(result.error).toBeInstanceOf(CustomError)
  })
})
