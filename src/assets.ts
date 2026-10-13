/** Public files must remain inside the configured deployment prefix. */
export function publicAsset(path: string, base = import.meta.env.BASE_URL): string {
  return base + path.replace(/^\/+/, '');
}
