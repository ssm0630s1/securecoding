import { Router } from "express";
import multer from "multer";
import path from "node:path";
import fs from "node:fs";
import { pool } from "../db/pool.js";

import { positiveId } from "../validation.js";

export const fileRouter = Router();

const uploadDir = path.join(process.cwd(), "uploads");
fs.mkdirSync(uploadDir, {recursive:true});

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => {
      fs.mkdirSync(uploadDir, {recursive:true});
      cb(null, uploadDir);
    },
    filename: (_req, file, cb) => {
      // 브라우저가 보낸 한글 파일명이 깨지지 않도록 UTF-8로 다시 읽음
      file.originalname = Buffer.from(file.originalname, "latin1").toString("utf8");
      cb(null, `${Date.now()}_${path.basename(file.originalname)}`);
    }
  })
});

fileRouter.post("/upload", upload.single("file"), async (req, res) => {
  const user = req.session.user;
  const file = req.file;
  if (!file) return res.status(400).json({message: "no file"});

  const postId = positiveId(req.body?.postId);
  if (postId === undefined) {
    await fs.promises.rm(file.path, { force: true });
    return res.status(400).json({ message: "postId must be a positive integer" });
  }
  await pool.execute(
    "INSERT INTO attachments(post_id, user_id, original_name, stored_name, mime_type, size) VALUES (?, ?, ?, ?, ?, ?)",
    [postId, user?.id ?? 1, file.originalname, file.filename, file.mimetype, file.size]
  );
  res.json({
    message: "uploaded",
    file
  });
});

fileRouter.get("/download", (req, res) => {
  const name = req.query.name;
  if (typeof name !== "string" || name.length === 0) {
    return res.status(400).json({ message: "name must be a non-empty string" });
  }
  const target = path.join(uploadDir, name);
  res.sendFile(target);
});
