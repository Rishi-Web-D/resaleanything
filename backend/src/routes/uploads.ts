import { Router } from "express";
import { readUpload } from "../services/ads";

export const uploadsRouter = Router();

const TYPES: Record<string, string> = { jpg: "image/jpeg", png: "image/png", webp: "image/webp" };

uploadsRouter.get("/:name", async (req, res) => {
  const f = await readUpload(String(req.params.name));
  if (!f) return void res.status(404).json({ error: "Not found" });
  res.set({ "Content-Type": TYPES[f.ext], "Cache-Control": "public, max-age=31536000, immutable", "X-Content-Type-Options": "nosniff" });
  res.send(f.data);
});
