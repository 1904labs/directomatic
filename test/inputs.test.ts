import { checkSpreadsheetStatus, fetchRedirectRows, mergeHeaders } from '../src/inputs';
import { fetchMock, setupGlobal } from './setupJest';

setupGlobal();

describe('inputs', () => {
  const expectedLookup =
    'https://example.org/keymaster/values/Redirects!A:F?key=gozarian&valueRenderOption=UNFORMATTED_VALUE';

  beforeEach(() => {
    fetchMock.resetMocks();
    jest.resetModules();
  });

  describe('mergeHeaders', () => {
    test('handles empty', () => {
      const result = mergeHeaders([], []);
      expect(result).toEqual({});
    });

    test('handles normal', () => {
      const result = mergeHeaders(['Name', 'Purpose'], ['Dennis', 'Destruction']);
      expect(result).toEqual({ Name: 'Dennis', Purpose: 'Destruction' });
    });

    test('handles jagged', () => {
      const result = mergeHeaders(['Name', 'Purpose'], ['Dennis']);
      expect(result).toEqual({ Name: 'Dennis', Purpose: undefined });
    });
  });

  describe('checkSpreadsheetStatus', () => {
    test('empty sheet works', async () => {
      fetchMock.mockResponseOnce(
        JSON.stringify({
          values: [],
        }),
        { status: 200, statusText: 'OK' }
      );

      const response = await checkSpreadsheetStatus();
      expect(fetchMock).toBeCalledWith(expectedLookup);
      expect(response).toBeDefined();
      expect(response.success).toEqual(true);
      expect(response.errors).toHaveLength(0);
      const messages = response.messages ?? [];
      expect(messages).toHaveLength(2);
      expect(messages[0]).toContain('contains no rows');
      expect(messages[1]).toEqual(
        'Google Sheet URL https://docs.google.com/spreadsheets/d/keymaster/edit'
      );
    });

    test('non-empty sheet works', async () => {
      fetchMock.mockResponseOnce(
        JSON.stringify({
          values: ['Hi'],
        }),
        { status: 200, statusText: 'OK' }
      );

      const response = await checkSpreadsheetStatus();
      expect(fetchMock).toBeCalledWith(expectedLookup);
      expect(response).toBeDefined();
      expect(response.success).toEqual(true);
      expect(response.errors).toHaveLength(0);
      const messages = response.messages ?? [];
      expect(messages).toHaveLength(2);
      expect(messages[0]).toContain('contains 1 total rows');
      expect(messages[1]).toContain(
        `URL https://docs.google.com/spreadsheets/d/${GSHEETS_ID}/edit`
      );
    });

    test('handles failure as expected', async () => {
      fetchMock.mockResponseOnce(JSON.stringify({}), {
        status: 301,
        statusText: 'FOUND',
      });

      const response = await checkSpreadsheetStatus();
      expect(response).toBeDefined();
      expect(response.success).toEqual(false);
      const errors = response.errors ?? [];
      expect(errors).toHaveLength(1);
      expect(errors[0]).toEqual('Google Sheet API returned 301, FOUND');
      const messages = response.messages ?? [];
      expect(messages).toHaveLength(2);
      expect(messages[0]).toContain('contains no rows');
      expect(messages[1]).toContain(
        `URL https://docs.google.com/spreadsheets/d/${GSHEETS_ID}/edit`
      );
    });
  });

  describe('fetchRedirectRows', () => {
    test('empty sheet works', async () => {
      fetchMock.mockResponseOnce(
        JSON.stringify({
          values: [],
        }),
        { status: 200, statusText: 'OK' }
      );

      await fetchRedirectRows().catch((e) =>
        expect(e.message).toEqual('Google Sheets API did not return any rows.')
      );
    });

    test('headers-only sheet works', async () => {
      fetchMock.mockResponseOnce(
        JSON.stringify({
          values: [['Name: who this is', 'Expectation: what they will do']],
        }),
        { status: 200, statusText: 'OK' }
      );

      const response = await fetchRedirectRows();
      expect(fetchMock).toBeCalledWith(expectedLookup);
      expect(response).toBeDefined();
      expect(response).toHaveLength(0);
    });

    test('non-empty sheet works', async () => {
      fetchMock.mockResponseOnce(
        JSON.stringify({
          values: [
            ['source: from URL', 'destination: to URL'],
            ['g00', 'google.com'],
            ['b1ng', 'bing.com'],
          ],
        }),
        { status: 200, statusText: 'OK' }
      );

      const response = await fetchRedirectRows();
      expect(fetchMock).toBeCalledWith(expectedLookup);
      expect(response).toBeDefined();
      expect(response).toHaveLength(2);
      const firstRow = response[0];
      expect(firstRow.source).toEqual('g00');
      expect(firstRow.destination).toEqual('google.com');
      const secondRow = response[1];
      expect(secondRow.source).toEqual('b1ng');
      expect(secondRow.destination).toEqual('bing.com');
    });
  });
});
