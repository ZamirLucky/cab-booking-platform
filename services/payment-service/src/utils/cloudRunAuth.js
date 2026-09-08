'use strict';

const { GoogleAuth } = require('google-auth-library');

const auth = new GoogleAuth();
const clients = new Map();

/** Returns Cloud Run auth headers; skips local HTTP services. */
async function getCloudRunAuthHeaders(serviceUrl) {
  const audience = String(serviceUrl || '').replace(/\/+$/, '');

  // Local development
  if (!audience.startsWith('https://')) {
    return {};
  }

  let client = clients.get(audience);

  if (!client) {
    client = await auth.getIdTokenClient(audience);
    clients.set(audience, client);
  }

  const requestHeaders = await client.getRequestHeaders();

  const authorization =
    typeof requestHeaders.get === 'function'
      ? requestHeaders.get('authorization')
      : requestHeaders.Authorization || requestHeaders.authorization;

  if (!authorization) {
    throw new Error('Could not obtain a Cloud Run identity token');
  }

  return {
    'X-Serverless-Authorization': authorization
  };
}

module.exports = { getCloudRunAuthHeaders };
