import { DirectomaticResponse, RedirectProps, BulkRedirectListItem } from './types';
import { Locales } from './globals';
import { makeFullURL } from './processing';

// For the list metadata
const listApi = (): string => {
  return `${CF_API_ENDPOINT}/accounts/${CF_ACCT_ID}/rules/lists/${CF_LIST_ID}`;
};

// To the redirects contained in that list
const listItemsApi = (): string => {
  return `${CF_API_ENDPOINT}/accounts/${CF_ACCT_ID}/rules/lists/${CF_LIST_ID}/items`;
};

/**
 * Take the list of redirect rows, add the destination domain, make an item for
 * each locale, and return them as objects ready for Dash.
 *
 * @param input (RedirectProps[]) A clean list of redirect entries
 * @returns (BulkRedirectListItem[]) Raw redirect list entries for a CF Bulk Redirect List
 */
export const makeBulkList = (input: RedirectProps[]): BulkRedirectListItem[] => {
  const default_locale = DEFAULT_LOCALE || 'en-US'; // assume en-US
  const collator = new Intl.Collator(default_locale, { sensitivity: 'base' });
  return input.flatMap((row) => {
    const list = [
      {
        source_url: makeFullURL(row.source),
        target_url: makeFullURL(row.destination),
        status_code: row.code,
      },
    ];

    // Add in locale-prefixed paths for localized redirects.
    if (row.localized) {
      for (const locale of Locales) {
        // Do not emit localized versions for the default locale
        if (collator.compare(locale, default_locale) === 0) {
          continue;
        }

        // For other locales, add a redirect for that locale, too.
        list.push({
          source_url: makeFullURL(row.source, locale),
          target_url: makeFullURL(row.destination, locale),
          status_code: row.code,
        });
      }
    }

    // Per https://developers.cloudflare.com/rules/bulk-redirects/create-api/
    // the actual stucture isn't an array of rules, it's an array of { redirect: rule }
    return list.map((row) => ({ redirect: row }));
  });
};

/**
 * Query the Cloudflare API about the Rules List to see if it is accessible and
 * contains any rows already.
 *
 * @returns (Promise<DirectomaticResponse>) Status information
 */
export const getBulkListStatus = async (): Promise<DirectomaticResponse> => {
  const response = await fetch(listApi(), {
    method: 'GET',
    headers: {
      'content-type': 'application/json',
      'authorization': `Bearer ${CF_API_TOKEN}`,
    },
  });

  const payload: any = await response.json();
  const messages = [
    `Cloudflare Rules List URL https://dash.cloudflare.com/${CF_ACCT_ID}/configurations/lists/${CF_LIST_ID}`,
  ];

  if (payload?.result) {
    messages.push(
      `Cloudflare list ${payload.result?.name} contains ${payload.result?.num_items} rules and referenced by ${payload.result?.num_referencing_filters} filters.`
    );
    messages.push(`Cloudflare list description: ${payload.result?.description}`);
  }

  const result: DirectomaticResponse = {
    success: response.ok && payload.success,
    errors: response.ok
      ? payload.errors
      : [
          `Cloudflare API returned ${response.status}, ${response.statusText}`,
          payload.errors,
        ].flat(),
    messages: [messages, payload.messages].flat(),
  };
  return result;
};

/**
 * Given the new list of rules, PUT (completely replace) the destination list in
 * the Cloudflare Rules List API.
 *
 * @param list (BulkRedirectListItem[]) The rules ready to upload
 * @returns TBD -- API response from Cloudflare directly
 */
export const uploadBulkList = async (
  list: BulkRedirectListItem[]
): Promise<DirectomaticResponse> => {
  const response: any = await fetch(listItemsApi(), {
    method: 'PUT',
    headers: {
      'content-type': 'application/json',
      'authorization': `Bearer ${CF_API_TOKEN}`,
    },
    body: JSON.stringify(list),
  }).then((res) => res.json());

  const report: DirectomaticResponse = {
    success: response?.success,
    errors: response?.errors || [],
    messages: response?.messages || [],
    invalidRules: [],
  };

  // Pick apart the response from Cloudflare to determine which of the Bulk Rules
  // the API objected to. These won't match rows from the spreadsheet exactly.
  if (response?.errors?.length) {
    report.invalidRules = response.errors.map((e: any) => {
      return list[e.source.parameter_value_index];
    });
  }

  // No errors on upload, update the description with the name of this app + date
  else {
    report.messages?.push(
      `Cloudflare API provided operation ID ${response.result?.operation_id}`
    );

    await fetch(listApi(), {
      method: 'PUT',
      headers: {
        'content-type': 'application/json',
        'authorization': `Bearer ${CF_API_TOKEN}`,
      },
      body: JSON.stringify({ description: `Updated by Directomatic on ${Date()}` }),
    });
  }

  return report;
};

/**
 * Query the Cloudflare API to fetch all currently published redirects.
 *
 * @returns (Promise<BulkRedirectListItem[]>) Published redirect list rules
 */
export const getBulkListContents = async (): Promise<BulkRedirectListItem[]> => {
  const response = await fetch(listItemsApi(), {
    method: 'GET',
    headers: {
      authorization: `Bearer ${CF_API_TOKEN}`,
    },
  });

  const payload: any = await response.json();

  if (payload?.success && payload?.result?.length) {
    return payload.result as BulkRedirectListItem[];
  }

  return [];
};
