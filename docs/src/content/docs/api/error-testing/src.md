---
title: API Reference
layout: ~/layouts/api.astro
---

[**Sparkle Design System API**](../README.md)

***

[Sparkle Design System API](../README.md) / error-testing/src

# error-testing/src

## Classes

### TestScenarioBuilder\<TError, TState\>

A fluent builder for creating type-safe error test scenarios.

#### Type Parameters

##### TError

`TError` *extends* `Error` = `Error`

##### TState

`TState` = `unknown`

#### Methods

##### build()

> **build**(): [`TestScenarioConfig`](#testscenarioconfig)\<`TError`, `TState`\>

Builds the test scenario configuration.

###### Returns

[`TestScenarioConfig`](#testscenarioconfig)\<`TError`, `TState`\>

###### Throws

If the configuration is incomplete

##### execute()

> **execute**(`context`): `Promise`\<[`TestResult`](#testresult)\<`TError`\>\>

Executes the test scenario.

###### Parameters

###### context

[`TestContext`](#testcontext)\<`TState`\>

The test context

###### Returns

`Promise`\<[`TestResult`](#testresult)\<`TError`\>\>

##### withDescription()

> **withDescription**(`description`): `this`

Sets the description for the test scenario.

###### Parameters

###### description

`string`

###### Returns

`this`

##### withErrorType()

> **withErrorType**\<`E`\>(`errorType`): [`TestScenarioBuilder`](#testscenariobuilder)\<`E`, `TState`\>

Specifies the error type to test.

###### Type Parameters

###### E

`E` *extends* `Error`

###### Parameters

###### errorType

`Object`

The constructor for the error type

###### Returns

[`TestScenarioBuilder`](#testscenariobuilder)\<`E`, `TState`\>

##### withRecovery()

> **withRecovery**(`recovery`): `this`

Adds a recovery strategy to the test scenario.

###### Parameters

###### recovery

[`ErrorRecoveryStrategy`](#errorrecoverystrategy)\<`TError`, `TState`\>

The recovery strategy to use

###### Returns

`this`

##### withSetup()

> **withSetup**(`setup`): `this`

Adds a setup function to the test scenario.

###### Parameters

###### setup

(`context`) => `Promise`\<`void`\>

The setup function to run before the test

###### Returns

`this`

##### withTeardown()

> **withTeardown**(`teardown`): `this`

Adds a teardown function to the test scenario.

###### Parameters

###### teardown

(`context`) => `Promise`\<`void`\>

The teardown function to run after the test

###### Returns

`this`

##### create()

> `static` **create**\<`E`, `S`\>(`description`): [`TestScenarioBuilder`](#testscenariobuilder)\<`E`, `S`\>

Creates a new test scenario builder.

###### Type Parameters

###### E

`E` *extends* `Error` = `Error`

###### S

`S` = `unknown`

###### Parameters

###### description

`string`

A description of the test scenario

###### Returns

[`TestScenarioBuilder`](#testscenariobuilder)\<`E`, `S`\>

## Interfaces

### ErrorBoundaryConfig\<TError\>

Base interface for error boundary configurations.

#### Type Parameters

##### TError

`TError` *extends* `Error` = `Error`

***

### ErrorRecoveryStrategy\<TError, TState\>

Type-safe error recovery strategy.

#### Type Parameters

##### TError

`TError` *extends* `Error` = `Error`

##### TState

`TState` = `unknown`

***

### TestContext\<TState\>

Represents a test scenario context that maintains type safety throughout the test lifecycle.

#### Type Parameters

##### TState

`TState` = `unknown`

***

### TestResult\<TError\>

Result of a test scenario execution.

#### Type Parameters

##### TError

`TError` *extends* `Error` = `Error`

***

### TestScenarioConfig\<TError, TState\>

Configuration for a test scenario.

#### Type Parameters

##### TError

`TError` *extends* `Error` = `Error`

##### TState

`TState` = `unknown`
