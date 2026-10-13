import { afterEach, expect, it, vi } from 'vitest';

vi.mock('../lib/auth.js', () => ({ generateMagicLink: vi.fn() }));
import { generateMagicLink } from '../lib/auth.js';
import handler from './request-link.js';

afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

it('sends production links through Resend and never reports failed delivery as success', async () => {
  vi.stubEnv('NODE_ENV', 'production');
  vi.stubEnv('BASE_URL', 'https://staging.popty.app');
  vi.stubEnv('RESEND_API_KEY', 'fake-test-key');
  vi.stubEnv('RESEND_FROM', 'Popty <login@example.invalid>');
  generateMagicLink.mockResolvedValue({ token: 'test-token' });
  const fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ id: 'test-email' }) });
  vi.stubGlobal('fetch', fetch);
  const log = vi.spyOn(console, 'log').mockImplementation(() => {});
  const request = () => {
    const res = { setHeader: vi.fn(), status: vi.fn(), json: vi.fn() };
    res.status.mockReturnValue(res);
    return res;
  };
  const req = { method: 'POST', body: { email: 'delivered@resend.dev' } };
  const res = request();
  await handler(req, res);
  expect(fetch).toHaveBeenCalledTimes(1);
  const [url, options] = fetch.mock.calls[0];
  expect(url).toBe('https://api.resend.com/emails');
  expect(options.headers.Authorization).toBe('Bearer fake-test-key');
  expect(JSON.parse(options.body)).toEqual({
    from: 'Popty <login@example.invalid>', to: ['delivered@resend.dev'],
    subject: 'Check your email for the login link',
    text: 'Check your email for the login link\n\nhttps://staging.popty.app/auth/verify?token=test-token'
  });
  expect(res.json).toHaveBeenCalledWith({ success: true, message: 'Check your email for the login link' });
  expect(log).not.toHaveBeenCalled();

  for (const response of [
    { ok: false, json: async () => ({ message: 'rejected' }) },
    { ok: true, json: async () => ({}) }
  ]) {
    fetch.mockResolvedValueOnce(response);
    const failed = request();
    await handler(req, failed);
    expect(failed.status).toHaveBeenCalledWith(502);
    expect(failed.json).toHaveBeenCalledWith({ error: 'Unable to send login link' });
  }
  fetch.mockRejectedValueOnce(new Error('network unavailable'));
  const unavailable = request();
  await handler(req, unavailable);
  expect(unavailable.status).toHaveBeenCalledWith(502);

  for (const name of ['RESEND_API_KEY', 'RESEND_FROM', 'BASE_URL']) {
    const value = process.env[name];
    vi.stubEnv(name, '');
    const calls = fetch.mock.calls.length;
    const unconfigured = request();
    await handler(req, unconfigured);
    expect(unconfigured.status).toHaveBeenCalledWith(503);
    expect(fetch.mock.calls.length).toBe(calls);
    vi.stubEnv(name, value);
  }
  vi.stubEnv('BASE_URL', 'http://localhost:5173');
  const insecure = request();
  await handler(req, insecure);
  expect(insecure.status).toHaveBeenCalledWith(503);

  vi.stubEnv('NODE_ENV', 'development');
  vi.stubEnv('RESEND_API_KEY', '');
  const calls = fetch.mock.calls.length;
  const dev = request();
  await handler(req, dev);
  expect(dev.json).toHaveBeenCalledWith({ success: true, message: 'Check your email for the login link', link: 'http://localhost:5173/auth/verify?token=test-token' });
  expect(fetch.mock.calls.length).toBe(calls);
});
