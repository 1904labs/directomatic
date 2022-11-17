import { version } from '../package.json';
import { hello, status, list, diff, publish } from '../src/controller';
import { fetchMock, setupGlobal } from './setupJest';

setupGlobal();

describe('controller', () => {
  beforeEach(() => {
    fetchMock.resetMocks();
    jest.resetModules();
  });

  const callForJson = async (method: () => Promise<Response>) => {
    const response = await method();
    expect(response).toBeDefined();

    const payload = await response.json();
    expect(payload).toBeDefined();

    return payload;
  };

  describe('hello', () => {
    test('returns correct version', async () => {
      const payload = await callForJson(hello);
      const messages = payload?.messages;
      expect(messages).toBeDefined();
      expect(messages).toHaveLength(1);
      expect(messages[0]).toEqual(`directomatic ${version} says hello.`);
    });
  });

  const badSpreadsheetStatus = {
    success: false,
    errors: ['INVALID'],
    messages: [ ],
  };

  const goodSpreadsheetStatus = {
    success: true,
    values: [ ['From', 'To'], ['work', 'play']],
    errors: [],
    messages: [],
  };

  const badBulkListStatus = {
    success: false,
    errors: ['BOGUS'],
    messages: [ ],
  };

  const goodBulkListStatus = {
    success: true,
    result: {
      name: 'Obi-Wan Kenobi',
      num_items: 77,
      num_referencing_filters: 5,
      description: 'He is me'
    },
    errors: [],
    messages: [],
  };

  describe('status', () => {
    test('good statuses works', async () => {
      fetchMock.mockResponses(
        [JSON.stringify(goodSpreadsheetStatus), { status: 200, statusText: 'OK' }],
        [JSON.stringify(goodBulkListStatus), { status: 200, statusText: 'OK' }]
      );

      const payload = await callForJson(status);
      expect(payload).toMatchObject({
        success: true,
        errors: [],
        messages: [
          'Google Sheet contains 2 total rows.',
          'Google Sheet URL https://docs.google.com/spreadsheets/d/keymaster/edit',
          'Cloudflare Rules List URL https://dash.cloudflare.com/keymaster/configurations/lists/gozar',
          'Cloudflare list Obi-Wan Kenobi contains 77 rules and referenced by 5 filters.',
          'Cloudflare list description: He is me'
        ],
      });
    });

    test('bad spreadsheet status works', async () => {
      fetchMock.mockResponses(
        [JSON.stringify(badSpreadsheetStatus), { status: 404, statusText: 'NOT FOUND' }],
        [JSON.stringify(goodBulkListStatus), { status: 200, statusText: 'OK' }]
      );

      const payload = await callForJson(status);
      expect(payload).toMatchObject({
        success: false,
        errors: ['Google Sheet API returned 404, NOT FOUND'],
        messages: expect.any(Array),
      });
    });

    test('bad bulk list status works', async () => {
      fetchMock.mockResponses(
        [JSON.stringify(goodSpreadsheetStatus), { status: 200, statusText: 'OK' }],
        [JSON.stringify(badBulkListStatus), { status: 418, statusText: 'TEAPOT' }]
      );

      const payload = await callForJson(status);
      expect(payload).toMatchObject({
        success: false,
        errors: ['Cloudflare API returned 418, TEAPOT', 'BOGUS'],
        messages: expect.any(Array),
      });
    });
  });

  const goodRedirectRows = {
    success: true,
    values: [ 
      ['source', 'destination', 'code', 'localized', 'deleted', 'description'],
      ['/work', '/play', 301, 'F', 0, 'happy'],
      ['/school', '/home', 302, 'n', 'N', 'joy'],
      ['/jack', '/jill', 307, 0, 1, 'no more'], // will be ignored
      ['/self', '/self', 308, 0, 0, 'recursive'] // will be invalid
    ],
    errors: [],
    messages: [],
  };

  const goodBulkListRows = {
    success: true,
    result: [
      {
        id: 'Herman',
        redirect: {
          source_url: '/back',
          target_url: '/forth',
          status_code: 308,
        },
        created_on: 'seconds ago',
        modified_on: 'never',
      }
    ]
  }

  describe('list', () => {
    test('works', async () => {
      fetchMock.mockResponses(
        [JSON.stringify(goodRedirectRows), { status: 200, statusText: 'OK' }],
        [JSON.stringify(goodBulkListRows), { status: 200, statusText: 'OK' }],
      );

      const payload = await callForJson(list);
      expect(payload).toMatchObject({
        messages: [
          'Google sheet contains 2 valid rules and 1 rows with errors.',
        ],
        inputRows: [
          {
            source: "/work",
            destination: "/play",
            code: 301,
            localized: false,
            deleted: false,
            description: "happy",
          },
          {
            source: "/school",
            destination: "/home",
            code: 302,
            localized: false,
            deleted: false,
            description: "joy",
          }
        ],
        invalidRules: [ 
          {
            source: '/self',
            destination: '/self',
            code: 308,
            localized: 0,
            deleted: 0,
            description: 'recursive',
          }
        ]
      });
    });
  });

  describe('diff', () => {
    test('works', async () => {
      fetchMock.mockResponses(
        [JSON.stringify(goodRedirectRows), { status: 200, statusText: 'OK' }],
        [JSON.stringify(goodBulkListRows), { status: 200, statusText: 'OK' }],
      );

      const payload = await callForJson(diff);
      expect(payload).toMatchObject({
        messages: [
          'There are 2 rules to add (in spreadsheet but not published).',
          'There are 1 rules to remove (published but not in spreadsheet).',
        ],
        addedRules: [
          { redirect: {
              source_url: "https://any.org/work",
              target_url: "https://any.org/play",
              status_code: 301,
            }
          },
          { redirect: {
              source_url: "https://any.org/school",
              target_url: "https://any.org/home",
              status_code: 302,
            }
          },
        ],
        removedRules: [ 
          {
            id: 'Herman',
            redirect: {
              source_url: '/back',
              target_url: '/forth',
              status_code: 308,
            },
            created_on: 'seconds ago',
            modified_on: 'never',
          }
        ]
      });
    });
  });

  const goodPutResponse = {
    success: true,
    messages: ['OK'],
    errors: [ ],
    result: {
        operation_id: 'SNORT',
      }
  }

  const badPutResponse = {
    success: false,
    messages: ['Bad Wolf'],
    errors: [{
      source: {
        parameter_value_index: 1
      }
    }],
    result: {
        operation_id: 'BLORT',
      }
  }

  describe('publish', () => {
    test('works', async () => {
      fetchMock.mockResponses(
        [JSON.stringify(goodRedirectRows), { status: 200, statusText: 'OK' }],
        [JSON.stringify(goodPutResponse), { status: 200, statusText: 'OK' }],
        ['OK', { status: 200, statusText: 'OK' }],
      );

      const report = await callForJson(publish);
      expect(report).toMatchObject({
        success: true,
        errors: [],
        messages: [
          'OK',
          'Cloudflare API provided operation ID SNORT'
        ]
      });
    });

    test('error handled', async () => {
      fetchMock.mockResponses(
        [JSON.stringify(goodRedirectRows), { status: 200, statusText: 'OK' }],
        [JSON.stringify(badPutResponse), { status: 200, statusText: 'OK' }],
        ['OK', { status: 200, statusText: 'OK' }],
      );

      const report = await callForJson(publish);
      expect(report).toMatchObject({
        success: false,
        errors: [ { source: { parameter_value_index: 1 } } ],
        messages: [
          'Bad Wolf'
        ],
        invalidRules: [ {
          redirect: {
            source_url: 'https://any.org/school',
            target_url: 'https://any.org/home',
            status_code: 302
          }
        }]
      });
    });
  });
});
