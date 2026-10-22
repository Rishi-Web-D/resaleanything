import { unstable_rethrow } from "next/navigation";
import { connection, NextResponse } from "next/server";
import { currentUser, type User } from "./auth";

export class HttpError extends Error {
  constructor(public status: number, message: string, public fields?: Record<string, string>) {
    super(message);
  }
}

export const json = (data: unknown, status = 200) => NextResponse.json(data, { status });

/** Reject cross-site state-changing requests (cookies are SameSite=Lax as a second layer). */
function checkOrigin(req: Request) {
  const origin = req.headers.get("origin");
  if (!origin) return;
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  if (new URL(origin).host !== host) throw new HttpError(403, "Cross-origin request blocked");
}

type Ctx<P> = { params: Promise<P> };

export function route<P = Record<string, never>>(
  opts: { auth?: boolean },
  fn: (req: Request, ctx: { params: P; user: User }) => Promise<Response> | Response,
) {
  return async (req: Request, ctx: Ctx<P>) => {
    try {
      await connection(); // always per-request; never prerendered
      if (!["GET", "HEAD"].includes(req.method)) checkOrigin(req);
      const user = await currentUser();
      if (opts.auth && !user) throw new HttpError(401, "Please log in");
      return await fn(req, { params: await ctx.params, user: user as User });
    } catch (e) {
      if (e instanceof HttpError) return json({ error: e.message, fields: e.fields }, e.status);
      unstable_rethrow(e); // let Next handle its own control-flow errors
      console.error(e);
      return json({ error: "Internal server error" }, 500);
    }
  };
}

export async function body<T = Record<string, unknown>>(req: Request): Promise<T> {
  try {
    return (await req.json()) as T;
  } catch {
    throw new HttpError(400, "Invalid JSON body");
  }
}

// Tiny fixed-window limiter for auth endpoints (per process).
const hits = new Map<string, { n: number; reset: number }>();
export function rateLimit(key: string, max: number, windowMs: number) {
  const now = Date.now();
  const h = hits.get(key);
  if (!h || h.reset < now) {
    hits.set(key, { n: 1, reset: now + windowMs });
    return;
  }
  if (++h.n > max) throw new HttpError(429, "Too many attempts, try again later");
}
export const clientIp = (req: Request) => req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "local";
