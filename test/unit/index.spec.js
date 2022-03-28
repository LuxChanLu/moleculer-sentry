const { ServiceBroker } = require('moleculer')
const Sentry = require('@sentry/node')
const SentryHub = require('@sentry/hub')

const SentryService = require('../../index.js')
const SentryServiceWithDSN = {
  ...SentryService,
  settings: { ...SentryService.settings, sentry: { dsn: 'https://abc:xyz@localhost:1234/123' } }
}

describe('Sentry init', () => {
  it('should not init sentry', async () => {
    const broker = new ServiceBroker({ logger: false })
    const service = broker.createService(SentryService)
    await broker.start()
    expect(service).toBeDefined()
    expect(Sentry.getCurrentHub().getClient()).toBeUndefined()
    expect(service.isSentryReady()).toBeFalsy()
    return broker.stop()
  })

  it('should init sentry', async () => {
    const broker = new ServiceBroker({ logger: false })
    const service = broker.createService(SentryServiceWithDSN)
    await broker.start()
    expect(service).toBeDefined()
    expect(Sentry.getCurrentHub().getClient()).toBeDefined()
    expect(service.isSentryReady()).toBeTruthy()
    await broker.stop()
    expect(Sentry.getCurrentHub().getClient()).toBeUndefined()
    expect(service.isSentryReady()).toBeFalsy()
  })
})

describe('Events', () => {
  const broker = new ServiceBroker({ logger: false })
  const service = broker.createService(SentryServiceWithDSN)

  beforeAll(() => broker.start())
  afterAll(() => broker.stop())

  it('should not sendError (no sentry)', () => {
    const oldSentryReady = service.isSentryReady
    service.isSentryReady = jest.fn(() => false)
    service.sendSentryError = jest.fn()

    broker.emit('$tracing.spans', [{ error: {} }])

    expect(service.sendSentryError).not.toHaveBeenCalled()
    service.isSentryReady = oldSentryReady
  })

  it('should not sendError (no error)', () => {
    service.sendSentryError = jest.fn()

    broker.emit('$tracing.spans', [{}])

    expect(service.sendSentryError).not.toHaveBeenCalled()
  })

  it('should sendError', () => {
    service.sendSentryError = jest.fn()
    const error = { type: 'test', message: 'test' }

    broker.emit('$tracing.spans', [{ error }])

    expect(service.sendSentryError).toHaveBeenCalledWith({ error })
  })
})

describe('sendError scope', () => {
  const broker = new ServiceBroker({ logger: false })
  const service = broker.createService({
    ...SentryServiceWithDSN,
    settings: { ...SentryServiceWithDSN.settings, sentry: { userMetaKey: 'user' } }
  })

  beforeAll(() => broker.start())
  afterAll(() => broker.stop())

  it('should set basic tags', () => {
    const scope = new SentryHub.Scope()
    scope.setTag = jest.fn()
    Sentry.withScope = jest.fn((cb) => cb(scope))
    const error = { type: 'test', message: 'test', code: 42 }
    service.sendSentryError({ requestID: 'tracingid', error, service: 'errors', action: { name: 'test' } })
    expect(scope.setTag).toHaveBeenCalledTimes(5)
    expect(scope.setTag).toHaveBeenCalledWith('id', 'tracingid')
    expect(scope.setTag).toHaveBeenCalledWith('service', 'errors')
    expect(scope.setTag).toHaveBeenCalledWith('span', 'test')
    expect(scope.setTag).toHaveBeenCalledWith('code', 42)
  })

  it('should set basic tags + error data', () => {
    const scope = new SentryHub.Scope()
    scope.setTag = jest.fn()
    scope.setExtra = jest.fn()
    Sentry.withScope = jest.fn((cb) => cb(scope))
    const error = { type: 'test', message: 'test', code: 4224, data: { test: true } }
    service.sendSentryError({ requestID: 'tracingiddata', error, action: { name: 'testdata' } })
    expect(scope.setTag).toHaveBeenCalledTimes(5)
    expect(scope.setTag).toHaveBeenCalledWith('id', 'tracingiddata')
    expect(scope.setTag).toHaveBeenCalledWith('span', 'testdata')
    expect(scope.setTag).toHaveBeenCalledWith('code', 4224)

    expect(scope.setExtra).toHaveBeenCalledTimes(1)
    expect(scope.setExtra).toHaveBeenCalledWith('data', { test: true })
  })

  it('should set basic tags + error data + user data', () => {
    const scope = new SentryHub.Scope()
    scope.setTag = jest.fn()
    scope.setExtra = jest.fn()
    scope.setUser = jest.fn()
    Sentry.withScope = jest.fn((cb) => cb(scope))
    const error = { type: 'test', message: 'test', code: 4224, data: { test: true } }
    service.sendSentryError({
      requestID: 'tracingiddata',
      error,
      action: { name: 'testdata' },
      meta: { user: { id: 'test', email: 'test@example.com' } }
    })
    expect(scope.setTag).toHaveBeenCalledTimes(5)
    expect(scope.setTag).toHaveBeenCalledWith('id', 'tracingiddata')
    expect(scope.setTag).toHaveBeenCalledWith('span', 'testdata')
    expect(scope.setTag).toHaveBeenCalledWith('code', 4224)

    expect(scope.setExtra).toHaveBeenCalledTimes(1)
    expect(scope.setExtra).toHaveBeenCalledWith('data', { test: true })

    expect(scope.setUser).toHaveBeenCalledTimes(1)
    expect(scope.setUser).toHaveBeenCalledWith({ id: 'test', email: 'test@example.com' })
  })
})

describe('sendError captureMessage', () => {
  const broker = new ServiceBroker({ logger: false })
  const service = broker.createService(SentryServiceWithDSN)

  beforeAll(() => broker.start())
  afterAll(() => broker.stop())

  it('should capture basic message', () => {
    Sentry.captureEvent = jest.fn()
    let error = { type: 'test', message: 'test', code: 42, stack: 'stack' }
    service.sendSentryError({ requestID: 'tracingid', error, service: { name: 'errors' }, name: 'test' })
    expect(Sentry.captureEvent).toHaveBeenCalledTimes(1)
    expect(Sentry.captureEvent).toHaveBeenCalledWith({ message: 'test', stacktrace: ['stack'] })
    Sentry.captureEvent.mockReset()
    error = { type: 'test', message: 'test', code: 42, stack: ['stack'] }
    service.sendSentryError({ requestID: 'tracingid', error, service: { name: 'errors' }, name: 'test' })
    expect(Sentry.captureEvent).toHaveBeenCalledTimes(1)
    expect(Sentry.captureEvent).toHaveBeenCalledWith({ message: 'test', stacktrace: ['stack'] })
  })

})

describe('sendError with shouldReport', () => {
  const broker = new ServiceBroker({ logger: false })
  const service = broker.createService({
    mixins: [SentryServiceWithDSN],
    methods: {
      shouldReport({ error }) {
        return error.code === 42
      }
    }
  })

  beforeAll(() => broker.start())
  afterAll(() => broker.stop())

  it('should report error', () => {
    service.sendSentryError = jest.fn()
    const error = { type: 'test', message: 'test', code: 42, stack: 'stack' }
    broker.emit('$tracing.spans', [{ error }])
    expect(service.sendSentryError).toHaveBeenCalledTimes(1)
  })

  it('should not report error', () => {
    service.sendSentryError = jest.fn()
    const error = { type: 'test', message: 'test', code: 24, stack: 'stack' }
    broker.emit('$tracing.spans', [{ error }])
    expect(service.sendSentryError).not.toHaveBeenCalledTimes(1)
  })

})
