/**
 * Saved-search (#187) and watchlist (#189) endpoints.
 *
 *   POST   /api/saved-searches           create a saved search
 *   GET    /api/saved-searches           list the caller's saved searches
 *   DELETE /api/saved-searches/:id
 *   POST   /api/watchlist                watch a listing
 *   GET    /api/watchlist
 *   DELETE /api/watchlist/:listingId
 *
 * The acting user is always derived from a verified Firebase ID token; a
 * client-supplied `userId` is never trusted.
 */

import { Router } from "express";
import { z } from "zod";
import { listingAlertService } from "../services/listing-alert.service";
import { verifyIdToken } from "../services/auth.service";

export const savedSearchesRouter = Router();
export const watchlistRouter = Router();

const searchSchema = z.object({
  eventName: z.string().min(1),
  maxPrice: z.number().positive().optional(),
  section: z.string().optional(),
  email: z.string().email().optional(),
  pushToken: z.string().optional(),
});

const watchSchema = z.object({
  listingId: z.string().min(1),
  eventName: z.string().optional(),
  price: z.number().nonnegative().optional(),
  email: z.string().email().optional(),
  pushToken: z.string().optional(),
});

/**
 * Resolve the authenticated caller's uid from the Firebase ID token, or
 * `undefined` when the request is unauthenticated. Mirrors the token
 * verification pattern used in `sync-user.ts`.
 */
const authenticatedUserId = async (req: { headers: Record<string, unknown> }): Promise<string | undefined> => {
  const header = req.headers.authorization;
  const token = typeof header === "string" && header.startsWith("Bearer ")
    ? header.slice("Bearer ".length).trim()
    : undefined;
  if (!token) return undefined;
  try {
    const decoded = await verifyIdToken(token);
    return decoded?.uid;
  } catch {
    return undefined;
  }
};

savedSearchesRouter.post("/", async (req, res) => {
  const userId = await authenticatedUserId(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  const parsed = searchSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid saved search", details: parsed.error.flatten() });
  }
  return res.status(201).json(listingAlertService.createSearch({ ...parsed.data, userId }));
});

savedSearchesRouter.get("/", async (req, res) => {
  const userId = await authenticatedUserId(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  return res.json(listingAlertService.listSearches(userId));
});

savedSearchesRouter.delete("/:id", async (req, res) => {
  const userId = await authenticatedUserId(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  return listingAlertService.deleteSearch(req.params.id, userId)
    ? res.status(204).end()
    : res.status(404).json({ error: "Saved search not found" });
});

watchlistRouter.post("/", async (req, res) => {
  const userId = await authenticatedUserId(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  const parsed = watchSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid watchlist payload", details: parsed.error.flatten() });
  }
  return res.status(201).json(listingAlertService.watch({ ...parsed.data, userId }));
});

watchlistRouter.get("/", async (req, res) => {
  const userId = await authenticatedUserId(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  return res.json(listingAlertService.listWatched(userId));
});

watchlistRouter.delete("/:listingId", async (req, res) => {
  const userId = await authenticatedUserId(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  return listingAlertService.unwatch(userId, req.params.listingId)
    ? res.status(204).end()
    : res.status(404).json({ error: "Not on watchlist" });
});
