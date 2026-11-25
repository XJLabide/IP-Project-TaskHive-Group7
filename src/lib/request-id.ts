export const REQUEST_ID_HEADER = "x-taskhive-request-id";
export const RESPONSE_REQUEST_ID_HEADER = "x-request-id";

export function isRequestId(value: string | null): value is string {
  return value !== null && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
