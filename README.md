# moleculer-sentry

[![Build](https://github.com/LuxChanLu/moleculer-sentry/actions/workflows/build.yaml/badge.svg)](https://github.com/LuxChanLu/moleculer-sentry/actions/workflows/build.yaml)
[![Coverage Status](https://coveralls.io/repos/github/LuxChanLu/moleculer-sentry/badge.svg?branch=master)](https://coveralls.io/github/LuxChanLu/moleculer-sentry?branch=master)
[![Codacy Badge](https://app.codacy.com/project/badge/Grade/42a2b5016bde4f2197f28389e221c61d)](https://www.codacy.com/gh/LuxChanLu/moleculer-sentry/dashboard?utm_source=github.com&amp;utm_medium=referral&amp;utm_content=LuxChanLu/moleculer-sentry&amp;utm_campaign=Badge_Grade)
[![Maintainability](https://api.codeclimate.com/v1/badges/8fbbbade0e11725f5c57/maintainability)](https://codeclimate.com/github/LuxChanLu/moleculer-sentry/maintainability)
[![Known Vulnerabilities](https://snyk.io/test/github/LuxChanLu/moleculer-sentry/badge.svg)](https://snyk.io/test/github/LuxChanLu/moleculer-sentry)

[![Downloads](https://img.shields.io/npm/dm/moleculer-sentry.svg)](https://www.npmjs.com/package/moleculer-sentry)
[![FOSSA Status](https://app.fossa.com/api/projects/git%2Bgithub.com%2FLuxChanLu%2Fmoleculer-sentry.svg?type=shield)](https://app.fossa.com/projects/git%2Bgithub.com%2FLuxChanLu%2Fmoleculer-sentry?ref=badge_shield)

## Usage

This package uses Moleculer's tracing function to catch errors and send them to sentry. In oder for it to function
properly, you need to enable tracing and use the "Event" exporter. To see how to set up tracing, please refer to
the [moleculer documentation](https://moleculer.services/docs/0.14/tracing.html#Event).

```js
const SentryMixin = require('moleculer-sentry')

module.exports = {
  mixins: [SentryMixin],

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
  }
}
```
