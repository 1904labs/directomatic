import {
  RedirectProps,
  BulkRedirectListItem,
  BulkRedirectListItemDetails,
} from '../src/types';
import { Locales } from '../src/globals';
import {
  makeBulkList,
  getBulkListStatus,
  uploadBulkList,
  getBulkListContents,
} from '../src/outputs';
import { fetchMock, setupGlobal, pushLocale, popLocale } from './setupJest';

setupGlobal();

describe('outputs', () => {
  const expectedListApi = 'https://example.org/accounts/keymaster/rules/lists/gozar';
  const expectedListItemsApi =
    'https://example.org/accounts/keymaster/rules/lists/gozar/items';

  beforeEach(() => {
    fetchMock.resetMocks();
    jest.resetModules();
  });

  describe('makeBulkList', () => {
    test('empty list works', () => {
      const result = makeBulkList([]);
      expect(result).toMatchObject([]);
    });

    test('valid list works', () => {
      // we're intentionally not passing relative URLs
      // since we're not trying to test
      // processing.makeFullURL here...
      const one: RedirectProps = {
        source: 'http://home.family',
        destination: 'https://work.com',
        code: 301,
        localized: false,
        deleted: false,
      };
      const two: RedirectProps = {
        source: 'https://work.com',
        destination: 'mailto:play@home.org',
        code: 302,
        localized: false,
        deleted: true,
      };
      const three: RedirectProps = {
        source: 'http://play.fun',
        destination: 'tel:game.family',
        code: 307,
        localized: false,
        deleted: false,
      };

      const inputList: RedirectProps[] = [one, two, three];
      const response = makeBulkList(inputList);
      expect(response).toHaveLength(3);
      expect(response[0]).toMatchObject({
        redirect: {
          source_url: 'http://home.family',
          target_url: 'https://work.com',
          status_code: 301,
        },
      });
      expect(response[1]).toMatchObject({
        redirect: {
          source_url: 'https://work.com',
          target_url: 'mailto:play@home.org',
          status_code: 302,
        },
      });
      expect(response[2]).toMatchObject({
        redirect: {
          source_url: 'http://play.fun',
          target_url: 'tel:game.family',
          status_code: 307,
        },
      });
    });

    test('localizing works', () => {
      const localizeThis: RedirectProps = {
        source: '/play/',
        destination: '/game/',
        code: 302,
        localized: true,
        deleted: false,
      };
      const inputList: RedirectProps[] = [localizeThis];
      const response = makeBulkList(inputList);
      expect(response).toHaveLength(Locales.length);
      // make sure we handle default local without adding to URL
      expect(response[0]).toMatchObject({
        redirect: {
          source_url: 'https://any.org/play/',
          target_url: 'https://any.org/game/',
          status_code: 302,
        },
      });
      // now spot-check for the others...
      expect(response).toContainEqual({
        redirect: {
          source_url: 'https://any.org/en-gb/play/',
          target_url: 'https://any.org/en-gb/game/',
          status_code: 302,
        },
      });
      expect(response).toContainEqual({
        redirect: {
          source_url: 'https://any.org/pt-br/play/',
          target_url: 'https://any.org/pt-br/game/',
          status_code: 302,
        },
      });
    });

    test('fall-back locale localizing works', () => {
      pushLocale(null);
      const localizeThis: RedirectProps = {
        source: '/play/',
        destination: '/another-game/',
        code: 308,
        localized: true,
        deleted: false,
      };
      const inputList: RedirectProps[] = [localizeThis];
      const response = makeBulkList(inputList);
      expect(response).toHaveLength(Locales.length);
      // make sure we handle default local without adding to URL
      expect(response[0]).toMatchObject({
        redirect: {
          source_url: 'https://any.org/play/',
          target_url: 'https://any.org/another-game/',
          status_code: 308,
        },
      });
      // now spot-check for some others...
      expect(response).toContainEqual({
        redirect: {
          source_url: 'https://any.org/en-gb/play/',
          target_url: 'https://any.org/en-gb/another-game/',
          status_code: 308,
        },
      });
      expect(response).toContainEqual({
        redirect: {
          source_url: 'https://any.org/pt-br/play/',
          target_url: 'https://any.org/pt-br/another-game/',
          status_code: 308,
        },
      });
      popLocale();
    });
  });

  describe('getBulkListStatus', () => {
    test('no result works', async () => {
      fetchMock.mockResponses([
        JSON.stringify({
          success: true,
          errors: ['no result'],
          messages: ['choose'],
        }),
        { status: 200, statusText: 'OK' },
      ]);

      const response = await getBulkListStatus();
      expect(fetchMock).toBeCalledWith(expectedListApi, {
        method: 'GET',
        headers: {
          'content-type': 'application/json',
          'authorization': 'Bearer gatekeeper',
        },
      });
      expect(response).toMatchObject({
        success: true,
        errors: ['no result'],
        messages: [
          'Cloudflare Rules List URL https://dash.cloudflare.com/keymaster/configurations/lists/gozar',
          'choose',
        ],
      });
    });

    test('empty list works', async () => {
      fetchMock.mockResponses([
        JSON.stringify({
          success: true,
          result: {
            name: 'staypuft',
            description: 'something that could never possibly destroy us',
            num_items: 0,
            num_referencing_filters: 1,
          },
          errors: ['none'],
          messages: ['choose the form'],
        }),
        { status: 200, statusText: 'OK' },
      ]);

      const response = await getBulkListStatus();
      expect(fetchMock).toBeCalledWith(expectedListApi, {
        method: 'GET',
        headers: {
          'content-type': 'application/json',
          'authorization': 'Bearer gatekeeper',
        },
      });
      expect(response).toMatchObject({
        success: true,
        errors: ['none'],
        messages: [
          'Cloudflare Rules List URL https://dash.cloudflare.com/keymaster/configurations/lists/gozar',
          'Cloudflare list staypuft contains 0 rules and referenced by 1 filters.',
          'Cloudflare list description: something that could never possibly destroy us',
          'choose the form',
        ],
      });
    });

    test('normal list works', async () => {
      fetchMock.mockResponses([
        JSON.stringify({
          success: true,
          result: {
            id: '3145551212',
            name: 'staypuft',
            description: 'something that could never possibly destroy us',
            kind: 'redirect',
            num_items: 10,
            num_referencing_filters: 2,
            created_on: '2022-11-15T08:00:00Z',
            modified_on: '2022-11-15T14:00:00Z',
          },
          errors: [],
          messages: ['choose the form'],
        }),
        { status: 200, statusText: 'OK' },
      ]);

      const response = await getBulkListStatus();
      expect(fetchMock).toBeCalledWith(expectedListApi, {
        method: 'GET',
        headers: {
          'content-type': 'application/json',
          'authorization': 'Bearer gatekeeper',
        },
      });
      expect(response).toMatchObject({
        success: true,
        errors: [],
        messages: [
          'Cloudflare Rules List URL https://dash.cloudflare.com/keymaster/configurations/lists/gozar',
          'Cloudflare list staypuft contains 10 rules and referenced by 2 filters.',
          'Cloudflare list description: something that could never possibly destroy us',
          'choose the form',
        ],
      });
    });

    test('bad list handled', async () => {
      fetchMock.mockResponses([
        JSON.stringify({
          success: false,
          result: null,
          errors: ['bad list'],
          messages: ['you must choose'],
        }),
        { status: 200, statusText: 'OK' },
      ]);

      const response = await getBulkListStatus();
      expect(fetchMock).toBeCalledWith(expectedListApi, {
        method: 'GET',
        headers: {
          'content-type': 'application/json',
          'authorization': 'Bearer gatekeeper',
        },
      });
      expect(response).toMatchObject({
        success: false,
        errors: ['bad list'],
        messages: [
          'Cloudflare Rules List URL https://dash.cloudflare.com/keymaster/configurations/lists/gozar',
          'you must choose',
        ],
      });
    });

    test('bad response handled', async () => {
      fetchMock.mockResponses([
        JSON.stringify({
          success: true, // should be ignored
        }),
        { status: 401, statusText: 'UNAUTHORIZED' },
      ]);

      const response = await getBulkListStatus();
      expect(fetchMock).toBeCalledWith(expectedListApi, {
        method: 'GET',
        headers: {
          'content-type': 'application/json',
          'authorization': 'Bearer gatekeeper',
        },
      });
      expect(response).toMatchObject({
        success: false,
        errors: ['Cloudflare API returned 401, UNAUTHORIZED'],
        messages: [
          'Cloudflare Rules List URL https://dash.cloudflare.com/keymaster/configurations/lists/gozar',
        ],
      });
    });
  });

  describe('uploadBulkList', () => {
    test('empty list works', async () => {
      fetchMock.mockResponses(
        [
          JSON.stringify({
            success: true,
            errors: [],
            messages: [],
            result: {
              operation_id: 'HI',
            },
          }),
          { status: 200, statusText: 'OK' },
        ],
        [JSON.stringify({}), { status: 200, statusText: 'OK' }]
      );

      const response = await uploadBulkList([]);
      expect(fetchMock).toBeCalledWith(expectedListItemsApi, {
        method: 'PUT',
        headers: {
          'content-type': 'application/json',
          'authorization': 'Bearer gatekeeper',
        },
        body: expect.any(String),
      });
      expect(fetchMock).toBeCalledWith(expectedListApi, {
        method: 'PUT',
        headers: {
          'content-type': 'application/json',
          'authorization': 'Bearer gatekeeper',
        },
        body: expect.any(String),
      });
      expect(response).toMatchObject({
        success: true,
        errors: [],
        messages: ['Cloudflare API provided operation ID HI'],
        invalidRules: [],
      });
      expect(response.messages).toHaveLength(1);
    });

    test('valid list works', async () => {
      fetchMock.mockResponses(
        [
          JSON.stringify({
            success: true,
            errors: [],
            messages: [],
            result: {
              operation_id: 'HI',
            },
          }),
          { status: 200, statusText: 'OK' },
        ],
        [JSON.stringify({}), { status: 200, statusText: 'OK' }]
      );

      const list: BulkRedirectListItem[] = [
        {
          id: 'Herman',
          redirect: {
            source_url: 'from',
            target_url: 'to',
            status_code: 301,
          },
          created_on: 'today',
          modified_on: 'tomorrow',
        },
      ];

      const response = await uploadBulkList(list);
      expect(fetchMock).toBeCalledWith(expectedListItemsApi, {
        method: 'PUT',
        headers: {
          'content-type': 'application/json',
          'authorization': 'Bearer gatekeeper',
        },
        body: expect.any(String),
      });
      expect(fetchMock).toBeCalledWith(expectedListApi, {
        method: 'PUT',
        headers: {
          'content-type': 'application/json',
          'authorization': 'Bearer gatekeeper',
        },
        body: expect.any(String),
      });
      expect(response).toMatchObject({
        success: true,
        errors: [],
        messages: ['Cloudflare API provided operation ID HI'],
        invalidRules: [],
      });
      expect(response.messages).toHaveLength(1);
    });

    test('list with errors works', async () => {
      fetchMock.mockResponses(
        [
          JSON.stringify({
            success: true,
            errors: [
              {
                code: 1003,
                message: 'Invalid or missing zone id.',
                source: {
                  parameter_value_index: 1,
                },
              },
            ],
            messages: [],
            result: {
              operation_id: 'HI',
            },
          }),
          { status: 200, statusText: 'OK' },
        ],
        [JSON.stringify({}), { status: 404, statusText: 'NOT FOUND' }]
      );

      const list: BulkRedirectListItem[] = [
        {
          id: 'Herman',
          redirect: {
            source_url: 'from',
            target_url: 'to',
            status_code: 301,
          },
          created_on: 'today',
          modified_on: 'tomorrow',
        },
        {
          id: 'Munster',
          redirect: {
            source_url: 'from',
            target_url: 'to',
            status_code: 301,
          },
          created_on: 'today',
          modified_on: 'tomorrow',
        },
      ];

      const response = await uploadBulkList(list);
      expect(fetchMock).toBeCalledWith(expectedListItemsApi, {
        method: 'PUT',
        headers: {
          'content-type': 'application/json',
          'authorization': 'Bearer gatekeeper',
        },
        body: expect.any(String),
      });
      expect(fetchMock).not.toBeCalledWith(expectedListApi);
      expect(response).toBeDefined();
      expect(response.success).toBeTruthy();
      expect(response.messages).toHaveLength(0);
      expect(response.errors).toHaveLength(1);
      expect(response.errors).toContainEqual({
        code: 1003,
        message: 'Invalid or missing zone id.',
        source: {
          parameter_value_index: 1,
        },
      });
      expect(response.invalidRules).toHaveLength(1);
      expect(response.invalidRules).toContainEqual({
        id: 'Munster',
        redirect: {
          source_url: 'from',
          target_url: 'to',
          status_code: 301,
        },
        created_on: expect.any(String),
        modified_on: expect.any(String),
      });
    });
    test('light API response works', async () => {
      fetchMock.mockResponses(
        [JSON.stringify({}), { status: 200, statusText: 'OK' }],
        [JSON.stringify({}), { status: 200, statusText: 'OK' }]
      );

      const list: BulkRedirectListItem[] = [
        {
          id: 'Herman',
          redirect: {
            source_url: 'from',
            target_url: 'to',
            status_code: 301,
          },
          created_on: 'today',
          modified_on: 'tomorrow',
        },
      ];

      const response = await uploadBulkList(list);
      expect(fetchMock).toBeCalledWith(expectedListItemsApi, {
        method: 'PUT',
        headers: {
          'content-type': 'application/json',
          'authorization': 'Bearer gatekeeper',
        },
        body: expect.any(String),
      });
      expect(fetchMock).toBeCalledWith(expectedListApi, {
        method: 'PUT',
        headers: {
          'content-type': 'application/json',
          'authorization': 'Bearer gatekeeper',
        },
        body: expect.any(String),
      });
      expect(response).toBeDefined();
      expect(response).toMatchObject({
        success: undefined, // This is current behavior, might be better as false
        errors: [],
        messages: ['Cloudflare API provided operation ID undefined'],
        invalidRules: [],
      });
      expect(response.messages).toHaveLength(1);
    });
  });

  describe('getBulkListContents', () => {
    test('empty list works', async () => {
      fetchMock.mockResponses([
        JSON.stringify({
          success: true,
          result: [],
        }),
        { status: 200, statusText: 'OK' },
      ]);

      const response = await getBulkListContents();
      expect(fetchMock).toBeCalledWith(expectedListItemsApi, {
        method: 'GET',
        headers: {
          authorization: 'Bearer gatekeeper',
        },
      });
      expect(response).toMatchObject([]);
    });

    test('failure handled', async () => {
      fetchMock.mockResponses([
        JSON.stringify({
          success: false,
        }),
        { status: 200, statusText: 'OK' },
      ]);

      const response = await getBulkListContents();
      expect(fetchMock).toBeCalledWith(expectedListItemsApi, {
        method: 'GET',
        headers: {
          authorization: 'Bearer gatekeeper',
        },
      });
      expect(response).toMatchObject([]);
    });

    test('non-empty list works', async () => {
      const a_redirect: BulkRedirectListItemDetails = {
        source_url: 'from',
        target_url: 'to',
        status_code: 301,
      };
      const list: BulkRedirectListItem = {
        id: 'Herman',
        redirect: a_redirect,
        created_on: 'seconds ago',
        modified_on: 'never',
      };

      fetchMock.mockResponses([
        JSON.stringify({
          success: true,
          result: [list],
        }),
        { status: 200, statusText: 'OK' },
      ]);

      const response = await getBulkListContents();
      expect(fetchMock).toBeCalledWith(expectedListItemsApi, {
        method: 'GET',
        headers: {
          authorization: 'Bearer gatekeeper',
        },
      });
      expect(response).toEqual([list]);
    });
  });
});
