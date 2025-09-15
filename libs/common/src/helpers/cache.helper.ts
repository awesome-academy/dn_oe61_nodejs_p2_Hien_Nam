export function buildKeyCache(
  prefix: string,
  options?: Record<string, string | number | boolean | undefined>,
  endPrefix?: string,
): string {
  const keyParts = [prefix];
  if (options && Object.keys(options).length > 0) {
    Object.entries(options)
      .filter(([, value]) => value !== undefined && value !== null && value !== '')
      .sort(([a], [b]) => a.localeCompare(b))
      .forEach(([key, value]) => {
        keyParts.push(`${key}:${value}`);
      });
  }
  if (endPrefix) {
    keyParts.push(endPrefix);
  }
  return keyParts.join(':');
}
