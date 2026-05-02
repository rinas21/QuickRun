import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth, requireRole } from "../lib/auth";
import { UpdateUserStatusBody, ListUsersQueryParams } from "@workspace/api-zod";

const router = Router();

// GET /api/users — admin only
router.get("/users", requireAuth, requireRole("admin"), async (req, res) => {
  const params = ListUsersQueryParams.safeParse(req.query);
  const limit = params.success ? (params.data.limit ?? 50) : 50;
  const offset = params.success ? (params.data.offset ?? 0) : 0;
  const roleFilter = params.success ? params.data.role : undefined;

  const conditions = [];
  if (roleFilter) {
    conditions.push(eq(usersTable.role, roleFilter));
  }

  const users = await db
    .select({
      id: usersTable.id,
      name: usersTable.name,
      email: usersTable.email,
      phone: usersTable.phone,
      role: usersTable.role,
      isActive: usersTable.isActive,
      isOnline: usersTable.isOnline,
      latitude: usersTable.latitude,
      longitude: usersTable.longitude,
      createdAt: usersTable.createdAt,
    })
    .from(usersTable)
    .where(conditions.length ? and(...conditions) : undefined)
    .limit(limit)
    .offset(offset)
    .orderBy(usersTable.createdAt);

  res.json(users);
});

// PATCH /api/users/:userId/status — admin only
router.patch("/users/:userId/status", requireAuth, requireRole("admin"), async (req, res) => {
  const userId = Number(req.params.userId);
  const parsed = UpdateUserStatusBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }

  const [user] = await db
    .update(usersTable)
    .set({ isActive: parsed.data.isActive })
    .where(eq(usersTable.id, userId))
    .returning({
      id: usersTable.id,
      name: usersTable.name,
      email: usersTable.email,
      phone: usersTable.phone,
      role: usersTable.role,
      isActive: usersTable.isActive,
      isOnline: usersTable.isOnline,
      latitude: usersTable.latitude,
      longitude: usersTable.longitude,
      createdAt: usersTable.createdAt,
    });

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  res.json(user);
});

// GET /api/users/drivers/available
router.get("/users/drivers/available", requireAuth, async (req, res) => {
  const drivers = await db
    .select({
      id: usersTable.id,
      name: usersTable.name,
      email: usersTable.email,
      phone: usersTable.phone,
      role: usersTable.role,
      isActive: usersTable.isActive,
      isOnline: usersTable.isOnline,
      latitude: usersTable.latitude,
      longitude: usersTable.longitude,
      createdAt: usersTable.createdAt,
    })
    .from(usersTable)
    .where(and(eq(usersTable.role, "driver"), eq(usersTable.isActive, true)));

  res.json(drivers);
});

export default router;
