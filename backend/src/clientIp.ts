import type { Request } from "express";

/**
 * The client address Express derived from X-Forwarded-For, without a port.
 * Some hosts (Azure App Service) append the source port ("203.0.113.7:51234"),
 * which would otherwise give every connection its own rate-limit bucket.
 */
export function clientIp(req: Request): string {
  const ip = req.ip ?? req.socket.remoteAddress ?? "unknown";
  const bracketed = /^\[([0-9a-fA-F:.]+)\](?::\d+)?$/.exec(ip); // [2001:db8::1]:443
  if (bracketed) return bracketed[1];
  const v4 = /^(\d{1,3}(?:\.\d{1,3}){3}):\d+$/.exec(ip); // 203.0.113.7:51234
  return v4 ? v4[1] : ip;
}
