type ApiProblem = {
  error?: unknown;
  code?: unknown;
};

export class MarketplaceApiError extends Error {
  readonly status: number;
  readonly code: string | null;
  readonly details: Record<string, unknown>;

  constructor(
    message: string,
    status: number,
    code: string | null,
    details: Record<string, unknown> = {},
  ) {
    super(message);
    this.name = "MarketplaceApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

/** Reads the app's standard API envelope and keeps server failures actionable. */
export async function requestData<T>(
  input: RequestInfo | URL,
  init: RequestInit = {},
): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }

  const response = await fetch(input, {
    ...init,
    headers,
    credentials: "same-origin",
    cache: "no-store",
  });
  const body: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const problem = isRecord(body) ? (body as ApiProblem) : {};
    throw new MarketplaceApiError(
      typeof problem.error === "string"
        ? problem.error
        : "The request could not be completed. Please try again.",
      response.status,
      typeof problem.code === "string" ? problem.code : null,
      problem,
    );
  }

  if (!isRecord(body) || !("data" in body)) {
    throw new MarketplaceApiError("Invalid server response.", response.status, null);
  }

  return body.data as T;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
