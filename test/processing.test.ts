import { RawRedirectProps, BulkRedirectListItem } from '../src/types';
import {
  makeFullURL,
  processSheetRow,
  redirectCompare,
  ruleInList,
} from '../src/processing';
import { setupGlobal } from './setupJest';

setupGlobal();

describe('processing', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  describe('processSheetRow', () => {
    test('valid row works', () => {
      const input: RawRedirectProps = {
        source: 'http://example.org',
        destination: 'https://example.org',
        code: 301,
        localized: false,
        deleted: false,
      };
      const result = processSheetRow(input);
      expect(result).toBeDefined();
      expect(result?.source).toEqual('http://example.org');
      expect(result?.destination).toEqual('https://example.org');
      expect(result?.code).toEqual(301);
      expect(result?.localized).toEqual(false);
      expect(result?.deleted).toEqual(false);
    });

    test('defaulting works', () => {
      const input: RawRedirectProps = {
        source: '/work',
        destination: '/play',
        code: undefined,
        localized: undefined,
        deleted: undefined,
      };
      const result = processSheetRow(input);
      expect(result).toBeDefined();
      expect(result?.source).toEqual('/work');
      expect(result?.destination).toEqual('/play');
      expect(result?.code).toEqual(302);
      expect(result?.localized).toEqual(false);
      expect(result?.deleted).toEqual(false);
    });

    test('deleted returns null', () => {
      const input: RawRedirectProps = {
        source: '/dull',
        destination: '/boy',
        code: 307,
        localized: false,
        deleted: true,
      };
      const result = processSheetRow(input);
      expect(result).toBeNull();
    });

    test('self-reflection returns null', () => {
      const input: RawRedirectProps = {
        source: '/dull',
        destination: '/dull',
        code: 308,
        localized: false,
        deleted: false,
      };
      const result = processSheetRow(input);
      expect(result).toBeNull();
    });

    test('bad source returns null', () => {
      const input: RawRedirectProps = {
        source: '',
        destination: '/sheen',
        code: 301,
        localized: false,
        deleted: false,
      };
      const result = processSheetRow(input);
      expect(result).toBeNull();
    });

    test('bad destination returns null', () => {
      const input: RawRedirectProps = {
        source: '/',
        destination: '',
        code: 301,
        localized: false,
        deleted: false,
      };
      const result = processSheetRow(input);
      expect(result).toBeNull();
    });

    test('bad code works', () => {
      const input: RawRedirectProps = {
        source: '/dull',
        destination: '/sheen',
        code: 'NOTFOUND',
        localized: false,
        deleted: false,
      };
      const result = processSheetRow(input);
      expect(result).toBeDefined();
      expect(result?.source).toEqual('/dull');
      expect(result?.destination).toEqual('/sheen');
      expect(result?.code).toEqual(302);
      expect(result?.localized).toEqual(false);
      expect(result?.deleted).toEqual(false);
    });

    test('bad localized works', () => {
      const input: RawRedirectProps = {
        source: '/dull',
        destination: '/sheen',
        code: undefined,
        localized: 'WHY',
        deleted: false,
      };
      const result = processSheetRow(input);
      expect(result).toBeDefined();
      expect(result?.source).toEqual('/dull');
      expect(result?.destination).toEqual('/sheen');
      expect(result?.code).toEqual(302);
      expect(result?.localized).toEqual(false);
      expect(result?.deleted).toEqual(false);
    });

    test('bad deleted works', () => {
      const input: RawRedirectProps = {
        source: '/dull',
        destination: '/sheen',
        code: 301,
        localized: false,
        deleted: 'WAT',
      };
      const result = processSheetRow(input);
      expect(result).toBeDefined();
      expect(result?.source).toEqual('/dull');
      expect(result?.destination).toEqual('/sheen');
      expect(result?.code).toEqual(301);
      expect(result?.localized).toEqual(false);
      expect(result?.deleted).toEqual(false);
    });
  });

  describe('makeFullURL', () => {
    test('not relative works', () => {
      const result = makeFullURL('http://example.org');
      expect(result).toEqual('http://example.org');
    });

    test('relative works with no locale', () => {
      const result = makeFullURL('/path');
      expect(result).toEqual('https://any.org/path');
    });

    test('relative works with locale', () => {
      const result = makeFullURL('/path', 'en-gb');
      expect(result).toEqual('https://any.org/en-gb/path');
    });
  });

  describe('redirectCompare', () => {
    const a: BulkRedirectListItem = {
      id: 'A',
      redirect: {
        source_url: 'from',
        target_url: 'to',
        status_code: 301,
      },
    };

    test('identity works', () => {
      expect(redirectCompare(a, a)).toEqual(true);
    });

    test('same when sameish', () => {
      const b: BulkRedirectListItem = {
        id: 'B',
        redirect: {
          source_url: 'from',
          target_url: 'to',
          status_code: 301,
        },
      };
      expect(redirectCompare(a, b)).toEqual(true);
    });

    test('source and target swapped differs', () => {
      const b: BulkRedirectListItem = {
        id: 'B',
        redirect: {
          source_url: 'to',
          target_url: 'from',
          status_code: 301,
        },
      };
      expect(redirectCompare(a, b)).toEqual(false);
    });

    test('source differs', () => {
      const b: BulkRedirectListItem = {
        id: 'B',
        redirect: {
          source_url: 'hello',
          target_url: 'to',
          status_code: 301,
        },
      };
      expect(redirectCompare(a, b)).toEqual(false);
    });

    test('target differs', () => {
      const b: BulkRedirectListItem = {
        id: 'B',
        redirect: {
          source_url: 'from',
          target_url: 'two',
          status_code: 301,
        },
      };
      expect(redirectCompare(a, b)).toEqual(false);
    });

    test('status code differs', () => {
      const b: BulkRedirectListItem = {
        id: 'B',
        redirect: {
          source_url: 'from',
          target_url: 'to',
          status_code: 307,
        },
      };
      expect(redirectCompare(a, b)).toEqual(false);
    });
  });

  describe('ruleInList', () => {
    // this does not need to test all
    // the functionality of the comparitor
    const a: BulkRedirectListItem = {
      id: 'A',
      redirect: {
        source_url: 'from',
        target_url: 'to',
        status_code: 301,
      },
    };
    const b: BulkRedirectListItem = {
      id: 'B',
      redirect: {
        source_url: 'work',
        target_url: 'play',
        status_code: 307,
      },
    };
    const list: BulkRedirectListItem[] = [a, b];

    test('identity works', () => {
      expect(ruleInList(a, list)).toEqual(true);
      expect(ruleInList(b, list)).toEqual(true);
    });

    test('sameish works', () => {
      const c: BulkRedirectListItem = {
        id: 'C',
        redirect: {
          source_url: 'from',
          target_url: 'to',
          status_code: 301,
        },
      };
      expect(ruleInList(c, list)).toEqual(true);
    });

    test('no match works', () => {
      const d: BulkRedirectListItem = {
        id: 'D',
        redirect: {
          source_url: 'BOB',
          target_url: 'SALLY',
          status_code: 301,
        },
      };
      expect(ruleInList(d, list)).toEqual(false);
    });
  });
});
