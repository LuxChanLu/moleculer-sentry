/*
 * moleculer-sentry
 * Copyright (c) 2019 YourSoft.run (https://github.com/YourSoftRun/moleculer-sentry)
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
    /** @type {String} DSN given by sentry. */
    dsn: null,
    /** @type {Object?} Additional options for `Sentry.init` */
    options: {},
    /** @type {Object?} Options for the sentry scope */
    scope: {
      /** @type {String?} Name of the meta containing user infos */
      user: null
    }
  },

  /**
	 * Events
	 */
  events: {
    'metrics.trace.span.finish'(metric) {
      if (metric.error && this.isSentryReady()) {
        this.sendError(metric)
      }
    }
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
		 * Send error to sentry, based on the metric error
		 *
		 * @param {Object} metric
		 */
    sendError(metric) {
      Sentry.withScope(scope => {
        scope.setTag('id', metric.requestID)
        scope.setTag('service', this.getServiceName(metric))
        scope.setTag('span', this.getSpanName(metric))
        scope.setTag('type', metric.error.type)
        scope.setTag('code', metric.error.code)

        if (metric.error.data) {
          scope.setExtra('data', metric.error.data)
        }

        if (this.settings.scope && this.settings.scope.user && metric.meta && metric.meta[this.settings.scope.user]) {
          scope.setUser(metric.meta[this.settings.scope.user])
        }

        Sentry.captureEvent({
          message: metric.error.message,
          stacktrace: metric.error.stack
        })
      })
    },
    isSentryReady() {
      return Sentry.getCurrentHub().getClient() !== undefined
    }
  },
  started() {
    if (this.settings.dsn) {
      Sentry.init({ dsn: this.settings.dsn, ...this.settings.options })
    }
  },
  async stopped() {
    if (this.isSentryReady()) {
      await Sentry.flush()
      SentryUtils.getGlobalObject().__SENTRY__ = undefined
    }
  }
}
