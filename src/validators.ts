import { RedirectCode } from './types';

/**
 * Check that a path is either a full URL with a schema or a root-relative path.
 *
 * @TODO: Weird that this returns the unaltered path or throws an error...
 *
 * @param input (string) string to check
 * @returns (string) original input if it is valid
 */
export const validatePath = (input: string): string => {
  // The only validation we want todo here non-blanks 
  if (input.length) {
    return input.trim();
  } else {
    throw new Error(`Bad path "${input}". Skipping.`);
  }
};

/**
 * Sanitize an input string into a boolean, using a default value if the input
 * is blank or confusing.
 *
 * @param input (string) A value to test
 * @param preferred (boolean) The default value
 * @returns (boolean) The input as a boolean, or the default if indeterminate
 */
export const validateBoolean = (
  input: string | boolean | undefined,
  preferred: boolean
): boolean => {
  if (typeof input === 'undefined' || (typeof input === 'string' && input.length === 0)) {
    return preferred;
  }
  const test = input.toString().toLowerCase();
  if (['y', '1', 't', 'yes', 'true'].includes(test)) {
    return true;
  } else if (['n', '0', 'f', 'no', 'false'].includes(test)) {
    return false;
  } else {
    return preferred;
  }
};

/**
 * Sanitize an input string into an HTTP redirect (3xx) status, using a default
 * value if the input is blank, invalid, or not castable as numeric.
 *
 * @param input (string) A value to test
 * @param preferred (RedirectCode) The default value
 * @returns (RedirectCode) An allowed HTTP redirect status code
 */
export const validateCode = (
  input: number | string | undefined,
  preferred: RedirectCode
): RedirectCode => {
  if (!input) {
    return preferred;
  }

  const test = parseInt(input.toString());
  const codes = [301, 302, 307, 308];

  if (codes.includes(test)) {
    return test as RedirectCode;
  }

  return preferred;
};
