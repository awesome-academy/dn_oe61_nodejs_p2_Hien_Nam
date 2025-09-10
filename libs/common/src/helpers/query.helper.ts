export function buildDataRange(start?: Date, end?: Date) {
  if (start && end)
    return {
      gte: start,
      lte: end,
    };
  if (start) {
    return { gte: start };
  }
  if (end) {
    return { lte: end };
  }
  return undefined;
}
export const toQueryParam = (value?: string[] | string, key?: string) =>
  value ? { [key!]: Array.isArray(value) ? value.join(',') : value } : {};
