'use strict';

const axios = require('axios');
const {
  getCloudRunAuthHeaders
} = require('./cloudRunAuth');

let configured = false;

/** Adds Cloud Run identity tokens to run.app requests. */
function configureCloudRunAxios() {
  if (configured) {
    return;
  }

  configured = true;

  axios.interceptors.request.use(async (config) => {
    if (!config.url) {
      return config;
    }

    let targetUrl;

    try {
      targetUrl = config.baseURL
        ? new URL(config.url, config.baseURL)
        : new URL(config.url);
    } catch {
      return config;
    }

    // Request scope
    if (!targetUrl.hostname.endsWith('.run.app')) {
      return config;
    }

    const cloudRunHeaders =
      await getCloudRunAuthHeaders(targetUrl.origin);

    config.headers = config.headers || {};

    for (const [name, value] of Object.entries(cloudRunHeaders)) {
      if (typeof config.headers.set === 'function') {
        config.headers.set(name, value);
      } else {
        config.headers[name] = value;
      }
    }

    return config;
  });
}

module.exports = configureCloudRunAxios;
