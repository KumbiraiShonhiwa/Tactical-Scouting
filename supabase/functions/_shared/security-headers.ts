// VibeSec audit finding (medium): no Edge Function response set any hardening headers. A
// `_`-prefixed folder under supabase/functions/ is never deployed as its own function by the
// Supabase CLI — only importable by the real functions — so this doesn't add a fourth
// deployment. Mirrors api/app/main.py's FastAPI middleware: these are JSON-only responses,
// never HTML/JS, so the CSP is maximally strict (default-src 'none').
export const SECURITY_HEADERS: Record<string, string> = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Content-Security-Policy": "default-src 'none'",
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
};
