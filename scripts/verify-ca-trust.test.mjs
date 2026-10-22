import { afterEach, expect, test, vi } from 'vitest';

const originalExitCode = process.exitCode;
afterEach(() => {
  process.exitCode = originalExitCode;
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.resetModules();
  vi.doUnmock('node:https');
});

async function auditWithFailure(code) {
  const output = [];
  vi.spyOn(console, 'log').mockImplementation((line) => output.push(JSON.parse(line)));
  vi.doMock('node:https', () => ({ default: {
    get(url, _options, onResponse) {
      return { on(_event, onError) {
        queueMicrotask(() => {
          if (url === 'https://ubuntu.com/') {
            onResponse({ statusCode: 200, destroy() {} });
          } else {
            onError(Object.assign(new Error('TLS failure'), { code }));
          }
        });
      } };
    },
  } }));
  vi.stubGlobal('fetch', async (url) => {
    if (url === 'https://ubuntu.com/') return { status: 200 };
    throw new TypeError('fetch failed', { cause: Object.assign(new Error('TLS failure'), { code }) });
  });
  process.exitCode = undefined;
  await import('./verify-ca-trust.mjs');
  return { results: output.slice(1), exitCode: process.exitCode };
}

test('native CERT_REVOKED is certificate rejection for https and nested fetch errors', async () => {
  const { results, exitCode } = await auditWithFailure('CERT_REVOKED');
  expect(results.filter(({ result }) => result === 'CERTIFICATE_REJECTED')).toHaveLength(4);
  expect(results.every(({ pass }) => pass)).toBe(true);
  expect(exitCode).toBeUndefined();
});

test.each(['ENOTFOUND', 'ETIMEDOUT', 'ERR_TLS_CERT_ALTNAME_INVALID', 'CERT_HAS_EXPIRED'])(
  '%s remains inconclusive, never proof of issuer distrust', async (code) => {
    const { results, exitCode } = await auditWithFailure(code);
    expect(results.filter(({ result }) => result === 'INCONCLUSIVE')).toHaveLength(4);
    expect(exitCode).toBe(1);
  },
);
