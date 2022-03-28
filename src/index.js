/*
 * moleculer-sentry
 * Copyright (c) 2022 LuxChan S.A R.L.-S (https://github.com/LuxChanLu/moleculer-sentry)
 * MIT Licensed
 */

'use strict'

const Sentry = require('@sentry/node')
const SentryUtils = require('@sentry/utils')

module.exports = {
  name: 'sentry',

  /**
   * Default settings
   */
  settings: {
    /** @type {Object?} Sentry configuration wrapper. */
    sentry: {
      /** @type {String} DSN given by sentry. */
      dsn: null,
      /** @type {String} Name of event fired by "Event" exported in tracing. */
      tracingEventName: '$tracing.spans',
      /** @type {Object} Additional options for `Sentry.init`. */
      options: {},
      /** @type {String?} Name of the meta containing user infos. */
      userMetaKey: null,
    },
    /**
     * @deprecated
     * @type {String} DSN given by sentry.
     */
    dsn: null,
    /**
     * @deprecated
     * @type {Object?} Additional options for `Sentry.init`
     */
    options: {},
    /**
     * @deprecated
     * @type {Object?} Options for the sentry scope
     */
    scope: {
      /**
       * @deprecated
       * @type {String?} Name of the meta containing user infos
       */
      user: null
    }
  },

  /**
   * Events
   */
  events: {
    // bind event listeners
    '**'(payload, sender, event) {
      // only listen to specifig tracing event
      if (event !== this.settings.sentry.tracingEventName) {
        return
      }

      this.onTracingEvent(payload)
    },
  },

  /**
   * Methods
   */
  methods: {
    /**
     * Get service name from metric event (Imported from moleculer-jaeger)
     *
     * @param {Object} metric
     * @returns {String}
     */
    getServiceName(metric) {
      if (!metric.service && metric.action) {
        const parts = metric.action.name.split('.')
        parts.pop()
        return parts.join('.')
      }
      return metric.service && metric.service.name ? metric.service.name : metric.service
    },

    /**
     * Get span name from metric event. By default it returns the action name (Imported from moleculer-jaeger)
     *
     * @param {Object} metric
     * @returns  {String}
     */
    getSpanName(metric) {
      return metric.action ? metric.action.name : metric.name
    },

    /**
     * Get object key under which user is stored in service meta
     *
     * @returns  {String}
     */
    getUserMetaKey() {
      // prefer new approach
      if (this.settings.sentry.userMetaKey) {
        return this.settings.sentry.userMetaKey
      }

      // fallback to old approach
      if (this.settings.scope && this.settings.scope.user) {
        return this.settings.scope.user
      }

      return null
    },

    /**
     * Send error to sentry, based on the metric error
     *
     * @param {Object} metric
     */
    sendSentryError(metric) {
      Sentry.withScope((scope) => {
        scope.setTag('id', metric.requestID)
        scope.setTag('service', this.getServiceName(metric))
        scope.setTag('span', this.getSpanName(metric))
        scope.setTag('type', metric.error.type)
        scope.setTag('code', metric.error.code)

        if (metric.error.data) {
          scope.setExtra('data', metric.error.data)
        }

        const userMetaKey = this.getUserMetaKey()

        if (userMetaKey && metric.meta && metric.meta[userMetaKey]) {
          scope.setUser(metric.meta[userMetaKey])
        }

        Sentry.captureEvent({
          message: metric.error.message,
          stacktrace: !Array.isArray(metric.error.stack) ? [metric.error.stack] : metric.error.stack
        })
      })
    },

    /**
     * Check if sentry is configured or not
     */
    isSentryReady() {
      return Sentry.getCurrentHub().getClient() !== undefined
    },

    /**
     * Tracing event handler
     *
     * @param metrics
     * @return void
     */
    onTracingEvent(metrics) {
      metrics.forEach((metric) => {
        if (metric.error && this.isSentryReady() && (!this.shouldReport || this.shouldReport(metric) == true)) {
          this.sendSentryError(metric)
        }
      })
    }
  },

  started() {
    // ToDo: remove deprecated dsn and options from settings with next version
    const dsn = this.settings.dsn || this.settings.sentry.dsn
    const options = this.settings.options || this.settings.sentry.options

    if (dsn) {
      Sentry.init({ dsn, ...options })
    }
  },

  async stopped() {
    if (this.isSentryReady()) {
      await Sentry.flush()
      SentryUtils.getGlobalObject().__SENTRY__ = undefined
    }
  }
}
