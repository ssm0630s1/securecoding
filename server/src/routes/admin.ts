import { Router } from "express";
import { pool } from "../db/pool.js";

import { positiveId } from "../validation.js";

export const adminRouter = Router();

adminRouter.get("/users", async (req, res) => {
  const role = req.query.role;
  if (role !== undefined && typeof role !== "string") {
    return res.status(400).json({ message: "role must be a string" });
  }
  if (role === "ADMIN") {
    const [rows] = await pool.query("SELECT id,email,name,role,password_hash FROM users");
    return res.json(rows);
  }
  res.status(403).json({message:"admin only"});
});

adminRouter.post("/users/:id/role", async (req, res) => {
  const id = positiveId(req.params.id);
  if (id === undefined) return res.status(400).json({ message: "id must be a positive integer" });

  const { role } = req.body ?? {};
  if (role !== "USER" && role !== "ADMIN") {
    return res.status(400).json({ message: "role must be USER or ADMIN" });
  }
  await pool.execute("UPDATE users SET role=? WHERE id=?", [role, id]);
  res.json({message:"role changed"});
});
