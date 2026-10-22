// Live regression: exercise runtime defaults, not a custom CA/agent/dispatcher.
// Source: https://emudhra.we-have-a-problem.com/ (both trust paths).
import https from 'node:https';

const targets = [
  ['https://dv-g3b-emudhra.we-have-a-problem.com/', false],
  ['https://dv-g3b-aaa-emudhra.we-have-a-problem.com/', false],
  ['https://ubuntu.com/', true],
];
const trustErrors = new Set([
  'UNABLE_TO_GET_ISSUER_CERT',
  'UNABLE_TO_GET_ISSUER_CERT_LOCALLY',
  'UNABLE_TO_VERIFY_LEAF_SIGNATURE',
  'SELF_SIGNED_CERT_IN_CHAIN',
  'DEPTH_ZERO_SELF_SIGNED_CERT',
  'CERT_REJECTED',
  'CERT_REVOKED',
]);

function errorCodes(error) {
  return [error?.code, ...((error?.errors ?? []).flatMap(errorCodes)),
    ...(error?.cause ? errorCodes(error.cause) : [])].filter(Boolean);
}

function nativeHttps(url) {
  return new Promise((resolve, reject) => {
    const request = https.get(url, { signal: AbortSignal.timeout(15000) }, (response) => {
      response.destroy();
      resolve(response.statusCode);
    });
    request.on('error', reject);
  });
}

async function nativeFetch(url) {
  // Do not follow a redirect onto a different certificate/trust path.
  const response = await fetch(url, { redirect: 'manual', signal: AbortSignal.timeout(15000) });
  await response.body?.cancel();
  return response.status;
}

if (process.env.NODE_TLS_REJECT_UNAUTHORIZED === '0') {
  throw new Error('Refusing to audit with TLS verification disabled');
}

console.log(JSON.stringify({ node: process.version, NODE_OPTIONS: process.env.NODE_OPTIONS,
  SSL_CERT_FILE: process.env.SSL_CERT_FILE }));
const results = await Promise.all(targets.flatMap(([url, shouldTrust]) =>
  Object.entries({ https: nativeHttps, fetch: nativeFetch }).map(async ([client, probe]) => {
    try {
      const status = await probe(url);
      return { client, url, result: 'TLS_ACCEPTED', status, pass: shouldTrust };
    } catch (error) {
      const codes = errorCodes(error);
      const certificateFailure = codes.some((code) => trustErrors.has(code));
      // DNS, timeout, socket, protocol, expiry and hostname errors are NOT proof
      // that the compromised issuer was distrusted.
      return { client, url, result: certificateFailure ? 'CERTIFICATE_REJECTED' : 'INCONCLUSIVE',
        codes, message: error.message, pass: !shouldTrust && certificateFailure };
    }
  })));
for (const result of results) console.log(JSON.stringify(result));
if (results.some(({ pass }) => !pass)) process.exitCode = 1;
