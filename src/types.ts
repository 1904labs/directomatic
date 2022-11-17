export type RedirectCode = 301 | 302 | 307 | 308;

/**
 * A validated and sanitized redirect object.
 */
export interface RedirectProps {
  source: string;
  destination: string;
  code: RedirectCode;
  localized: boolean;
  deleted: boolean;
  description: string;
}

/**
 * A raw spreadsheet row that could be a redirect object.
 */
export interface RawRedirectProps {
  source: string;
  destination: string;
  code?: string | number;
  localized?: string | boolean;
  deleted?: string | boolean;
  description?: string;
}

/**
 * Work-in-progress, but all responses from this service will be one of these.
 */
export interface DirectomaticResponse {
  success?: boolean; // If an action was requested
  errors?: any[]; // Error messages either from CF or from this code
  messages?: any[]; // This would be from the CF API
  inputRules?: RedirectProps[];
  invalidRules?: BulkRedirectListItem[] | RawRedirectProps[];
}

/**
 * Key properties of the rule list itself.
 */
export interface BulkRedirectList {
  name: string;
  description: string;
  kind: 'redirect';
}

/**
 * The Rules List API refers to an array of [{ redirect: theRedirectObj }, ...]
 * entries with some metadata we don't track but need to keep nested properly.
 */
export interface BulkRedirectListItem {
  id?: string;
  redirect: BulkRedirectListItemDetails;
  created_on?: string;
  modified_on?: string;
}

/**
 * The actual redirect rule formatted for the Rules List API. Source and dest
 * must both be complete URLs and the status code must be one of the allowable
 * HTTP 3xx response codes. Nothing else is stored at the row-level.
 */
export interface BulkRedirectListItemDetails {
  source_url: string;
  target_url: string;
  status_code: RedirectCode;
}

export interface BulkUploadReport {
  success: boolean;
  operation_id?: string;
  errors: any[];
  messages: any[];
  invalid_rules: BulkRedirectListItem[];
}
