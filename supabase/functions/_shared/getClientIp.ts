// Extração do IP do cliente considerando proxies (Vercel, Cloudflare, etc.).
// X-Forwarded-For: o primeiro valor é o cliente original; demais são proxies.
// https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/X-Forwarded-For

export function getClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for") ?? req.headers.get("X-Forwarded-For");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  const realIp = req.headers.get("x-real-ip") ?? req.headers.get("X-Real-IP");
  if (realIp) return realIp.trim();
  const cf = req.headers.get("cf-connecting-ip");
  if (cf) return cf.trim();
  return "unknown";
}
