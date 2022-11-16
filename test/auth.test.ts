import { authCheck } from '../src/auth';
import { setupGlobal } from './setupJest';

setupGlobal();

describe('authCheck', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  test('handle missing bearer token', async () => {
    const request = new Request('/', { method: 'GET' });
    request.headers.append('foo', 'bar');
    const response = await authCheck(request);
    expect(response).toBeDefined();
    expect(response?.status).toEqual(401);
    expect(response?.headers).toBeDefined();
    expect(response?.headers?.get('Content-Type')).toEqual('text/json');
    const text = await response?.text();
    expect(text).toBeDefined();
    const reply = JSON.parse(text || '');
    expect(reply).toBeDefined();
    expect(reply).toMatchObject({
      success: false,
      errors: ['Missing bearer token'],
      messages: expect.any(Array),
    });
  });

  test('handle incorrect bearer token', async () => {
    const request = new Request('/', { method: 'GET' });
    request.headers.append('Authorization', 'bar');
    const response = await authCheck(request);
    expect(response).toBeDefined();
    expect(response?.status).toEqual(401);
    expect(response?.headers).toBeDefined();
    expect(response?.headers?.get('Content-Type')).toEqual('text/json');
    const text = await response?.text();
    expect(text).toBeDefined();
    const reply = JSON.parse(text || '');
    expect(reply).toBeDefined();
    expect(reply).toMatchObject({
      success: false,
      errors: ['Invalid bearer token'],
      messages: expect.any(Array),
    });
  });

  test('handle correct bearer token', async () => {
    const request = new Request('/', { method: 'GET' });
    request.headers.append('Authorization', 'zot'); // matches setup in beforeEach above
    const response = await authCheck(request);
    expect(response).not.toBeDefined(); // the itty-router uses undefined to proceed to next handler
  });
});
