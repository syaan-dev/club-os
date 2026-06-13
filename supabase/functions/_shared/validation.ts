// Pure request-validation helpers shared across Edge Functions.
//
// These contain NO Deno or network dependencies so they can be unit tested in
// isolation (see validation.test.ts).

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function requireObject(body: unknown): Record<string, unknown> {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    throw new ValidationError("Request body must be a JSON object");
  }
  return body as Record<string, unknown>;
}

export function requireString(
  body: Record<string, unknown>,
  field: string,
  opts: { min?: number; max?: number } = {},
): string {
  const value = body[field];
  if (typeof value !== "string") {
    throw new ValidationError(`Field '${field}' is required and must be a string`);
  }
  const trimmed = value.trim();
  const min = opts.min ?? 1;
  if (trimmed.length < min) {
    throw new ValidationError(`Field '${field}' must be at least ${min} characters`);
  }
  if (opts.max !== undefined && trimmed.length > opts.max) {
    throw new ValidationError(`Field '${field}' must be at most ${opts.max} characters`);
  }
  return trimmed;
}

export function optionalString(
  body: Record<string, unknown>,
  field: string,
  opts: { max?: number } = {},
): string | null {
  const value = body[field];
  if (value === undefined || value === null || value === "") {
    return null;
  }
  if (typeof value !== "string") {
    throw new ValidationError(`Field '${field}' must be a string`);
  }
  const trimmed = value.trim();
  if (opts.max !== undefined && trimmed.length > opts.max) {
    throw new ValidationError(`Field '${field}' must be at most ${opts.max} characters`);
  }
  return trimmed.length === 0 ? null : trimmed;
}

export function requireUuid(
  body: Record<string, unknown>,
  field: string,
): string {
  const value = requireString(body, field);
  if (!UUID_RE.test(value)) {
    throw new ValidationError(`Field '${field}' must be a valid UUID`);
  }
  return value;
}

export function requirePositiveNumber(
  body: Record<string, unknown>,
  field: string,
): number {
  const raw = body[field];
  const value = typeof raw === "string" ? Number(raw) : raw;
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    throw new ValidationError(`Field '${field}' must be a positive number`);
  }
  return value;
}

export function requireNonNegativeInteger(
  body: Record<string, unknown>,
  field: string,
  fallback?: number,
): number {
  const raw = body[field];
  if ((raw === undefined || raw === null) && fallback !== undefined) {
    return fallback;
  }
  const value = typeof raw === "string" ? Number(raw) : raw;
  if (
    typeof value !== "number" ||
    !Number.isInteger(value) ||
    value < 0
  ) {
    throw new ValidationError(`Field '${field}' must be a non-negative integer`);
  }
  return value;
}

export function requireEnum<T extends string>(
  body: Record<string, unknown>,
  field: string,
  allowed: readonly T[],
): T {
  const value = requireString(body, field);
  if (!allowed.includes(value as T)) {
    throw new ValidationError(
      `Field '${field}' must be one of: ${allowed.join(", ")}`,
    );
  }
  return value as T;
}

export function requireIsoDate(
  body: Record<string, unknown>,
  field: string,
): string {
  const value = requireString(body, field);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(Date.parse(value))) {
    throw new ValidationError(`Field '${field}' must be an ISO date (YYYY-MM-DD)`);
  }
  return value;
}

export function isE164Phone(value: string): boolean {
  return /^\+[1-9]\d{7,14}$/.test(value);
}

export function requirePhone(
  body: Record<string, unknown>,
  field: string,
): string {
  const value = requireString(body, field);
  if (!isE164Phone(value)) {
    throw new ValidationError(
      `Field '${field}' must be an E.164 phone number (e.g. +919876543210)`,
    );
  }
  return value;
}
