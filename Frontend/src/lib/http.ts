const BASE_URL = import.meta.env.VITE_HYPERTRON_API_URL ?? '';

export class ApiError extends Error {
  status: number;
  code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export async function parseApi<T>(response: Response): Promise<T> {
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const error = payload?.error;
    throw new ApiError(
      response.status,
      error?.code ?? 'request_failed',
      error?.message ?? `Request failed with status ${response.status}.`,
    );
  }
  return payload as T;
}

export function unreachable(): never {
  throw new ApiError(
    0,
    'unreachable',
    `Can't reach the Hypertron API at ${BASE_URL}. Start the Server and try again.`,
  );
}

export { BASE_URL };
