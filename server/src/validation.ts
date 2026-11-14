export function positiveId(value: unknown): number | undefined {
  if (typeof value !== "number" && (typeof value !== "string" || value === "" || /[^0-9]/.test(value))) {
    return undefined;
  }
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : undefined;
}

export function boundedText(value: unknown, max: number): value is string {
  if (typeof value !== "string") return false;
  const length = Array.from(value).length;
  return length >= 1 && length <= max;
}
