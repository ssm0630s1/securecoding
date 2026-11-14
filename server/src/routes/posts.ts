import { Router } from "express";
import type { ResultSetHeader, RowDataPacket } from "mysql2";
import { pool } from "../db/pool.js";
import { boundedText, positiveId } from "../validation.js";

export const postRouter = Router();

postRouter.get("/", async (req, res) => {
  const raw = req.query.q;
  if (raw !== undefined && typeof raw !== "string") {
    return res.status(400).json({ message: "q must be a string" });
  }
  const q = raw ?? "";
  if (Array.from(q).length > 50) {
    return res.status(400).json({ message: "q is too long" });
  }

  const [rows] = await pool.execute(
    `SELECT p.id, p.user_id, p.title, p.content, p.created_at, u.name AS authorName
     FROM posts p JOIN users u ON p.user_id=u.id
     WHERE p.title LIKE ?
     ORDER BY p.id DESC`,
    [`%${q}%`]
  );
  res.json(rows);
});

postRouter.get("/:id", async (req, res) => {
  const id = positiveId(req.params.id);
  if (id === undefined) return res.status(400).json({ message: "id must be a positive integer" });

  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT p.*, u.name AS authorName
     FROM posts p JOIN users u ON p.user_id=u.id
     WHERE p.id=?`,
    [id]
  );
  if (rows.length === 0) return res.status(404).json({ message: "not found" });

  const [attachments] = await pool.execute(
    "SELECT id, original_name, stored_name, size FROM attachments WHERE post_id=?",
    [id]
  );
  res.json({ ...rows[0], attachments });
});

postRouter.post("/", async (req, res) => {
  const { title, content, userId } = req.body ?? {};
  if (!boundedText(title, 100)) {
    return res.status(400).json({ message: "title must be a string of 1 to 100 characters" });
  }
  if (!boundedText(content, 5000)) {
    return res.status(400).json({ message: "content must be a string of 1 to 5000 characters" });
  }

  const authorId = userId === undefined ? (req.session.user?.id ?? 1) : positiveId(userId);
  if (authorId === undefined) return res.status(400).json({ message: "userId must be a positive integer" });

  const [result] = await pool.execute<ResultSetHeader>(
    "INSERT INTO posts(user_id, title, content) VALUES (?, ?, ?)",
    [authorId, title, content]
  );
  res.json({ message: "created", id: result.insertId });
});

postRouter.put("/:id", async (req, res) => {
  const id = positiveId(req.params.id);
  if (id === undefined) return res.status(400).json({ message: "id must be a positive integer" });

  const { title, content } = req.body ?? {};
  if (!boundedText(title, 100)) {
    return res.status(400).json({ message: "title must be a string of 1 to 100 characters" });
  }
  if (!boundedText(content, 5000)) {
    return res.status(400).json({ message: "content must be a string of 1 to 5000 characters" });
  }
  await pool.execute("UPDATE posts SET title=?, content=? WHERE id=?", [title, content, id]);
  res.json({ message: "updated" });
});

postRouter.delete("/:id", async (req, res) => {
  const id = positiveId(req.params.id);
  if (id === undefined) return res.status(400).json({ message: "id must be a positive integer" });

  await pool.execute("DELETE FROM posts WHERE id=?", [id]);
  res.json({ message: "deleted" });
});
