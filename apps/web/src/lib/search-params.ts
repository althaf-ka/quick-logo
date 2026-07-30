export function readSearchString(
  value: unknown,
  maxLength = Number.POSITIVE_INFINITY,
): string | undefined {
  return typeof value === "string" && value.length <= maxLength
    ? value
    : undefined;
}
