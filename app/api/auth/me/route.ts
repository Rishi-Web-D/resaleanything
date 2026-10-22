import { json, route } from "@/lib/server/http";

export const GET = route({}, (_req, { user }) => json({ user: user ?? null }));
