import { validatePath, validateBoolean, validateCode } from '../src/validators';
import { setupGlobal } from './setupJest';

setupGlobal();

describe('validators', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  describe('validatePath', () => {
    test('valid relative path works', () => {
      const result = validatePath('/hi');
      expect(result).toEqual('/hi');
    });
    test('valid http path works', () => {
      const result = validatePath('http://example.org');
      expect(result).toEqual('http://example.org');
    });
    test('valid http path works', () => {
      const result = validatePath('https://example.org');
      expect(result).toEqual('https://example.org');
    });
    test('blank throws as expected', () => {
      expect(() => validatePath('')).toThrow('Bad path "". Skipping');
    });
    test('invalid path throws as expected', () => {
      expect(() => validatePath('HI MOM')).toThrow('Bad path "HI MOM". Skipping');
    });
  });

  describe('validateBoolean', () => {
    test('undefined returns default', () => {
      expect(validateBoolean(undefined, false)).toEqual(false);
      expect(validateBoolean(undefined, true)).toEqual(true);
    });
    test('blank returns default', () => {
      expect(validateBoolean('', false)).toEqual(false);
      expect(validateBoolean('', true)).toEqual(true);
    });
    test('unexpected input returns default', () => {
      expect(validateBoolean('HELLO', false)).toEqual(false);
      expect(validateBoolean('HELLO', true)).toEqual(true);
    });
    test('truth-like returns true', () => {
      // intentionally pass the opposite default
      expect(validateBoolean('y', false)).toEqual(true);
      expect(validateBoolean('yes', false)).toEqual(true);
      expect(validateBoolean('1', false)).toEqual(true);
      expect(validateBoolean('t', false)).toEqual(true);
      expect(validateBoolean('true', false)).toEqual(true);
    });
    test('false-like returns false', () => {
      // intentionally pass the opposite default
      expect(validateBoolean('n', true)).toEqual(false);
      expect(validateBoolean('no', true)).toEqual(false);
      expect(validateBoolean('0', true)).toEqual(false);
      expect(validateBoolean('f', true)).toEqual(false);
      expect(validateBoolean('false', true)).toEqual(false);
    });
    test('case does not matter', () => {
      // intentionally pass the opposite default
      expect(validateBoolean('Y', false)).toEqual(true);
      expect(validateBoolean('yEs', false)).toEqual(true);
      expect(validateBoolean('1', false)).toEqual(true);
      expect(validateBoolean('t', false)).toEqual(true);
      expect(validateBoolean('tRuE', false)).toEqual(true);

      expect(validateBoolean('N', true)).toEqual(false);
      expect(validateBoolean('NO', true)).toEqual(false);
      expect(validateBoolean('0', true)).toEqual(false);
      expect(validateBoolean('F', true)).toEqual(false);
      expect(validateBoolean('FaLsE', true)).toEqual(false);
    });
  });

  describe('validateCode', () => {
    test('expected integers work', () => {
      // intentionally pass a different default
      expect(validateCode(301, 302)).toEqual(301);
      expect(validateCode(302, 301)).toEqual(302);
      expect(validateCode(307, 301)).toEqual(307);
      expect(validateCode(308, 301)).toEqual(308);
    });
    test('expected strings work', () => {
      // intentionally pass a different default
      expect(validateCode('301', 302)).toEqual(301);
      expect(validateCode('302', 301)).toEqual(302);
      expect(validateCode('307', 301)).toEqual(307);
      expect(validateCode('308', 301)).toEqual(308);
    });
    test('undefined returns default', () => {
      expect(validateCode(undefined, 301)).toEqual(301);
      expect(validateCode(undefined, 302)).toEqual(302);
    });
    test('blank returns default', () => {
      expect(validateCode('', 302)).toEqual(302);
      expect(validateCode(' ', 301)).toEqual(301);
    });
    test('unexpected strings return default', () => {
      expect(validateCode('HELLO', 301)).toEqual(301);
      expect(validateCode('0', 302)).toEqual(302);
      expect(validateCode('200', 307)).toEqual(307);
    });
    test('unexpected integers return default', () => {
      expect(validateCode(200, 301)).toEqual(301);
      expect(validateCode(0, 302)).toEqual(302);
      expect(validateCode(3.14159, 307)).toEqual(307);
    });
  });
});
