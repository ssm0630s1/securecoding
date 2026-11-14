const assert = require("node:assert/strict");
const { mkdtemp, rm } = require("node:fs/promises");
const { tmpdir } = require("node:os");
const { join } = require("node:path");
const { once } = require("node:events");
const { test } = require("node:test");
const express = require("express");
const { pool } = require("../dist/db/pool.js");

test("week 10: route validation and SQL value separation", async (t) => {
  const cwd = process.cwd();
  const sandbox = await mkdtemp(join(tmpdir(), "secure-board-test-"));
  process.chdir(sandbox);

  const queries = [];
  const execute = pool.execute;
  pool.execute = async (sql, values) => {
    queries.push({ sql, values });
    if (sql.startsWith("INSERT INTO posts")) return [{ insertId: 12 }];
    if (sql.includes("FROM users WHERE")) return [[{ id: 1, email: values[0], name: "학생", role: "USER" }]];
    if (sql.includes("WHERE p.id=")) return [[{ id: values[0], title: "테스트" }]];
    return [[]];
  };

  const app = express();
  app.use(express.json());
  app.use((req, res, next) => {
    req.session = {};
    next();
  });
  app.use("/api/posts/:postId/comments", require("../dist/routes/comments.js").commentRouter);
  app.use("/api/posts", require("../dist/routes/posts.js").postRouter);
  app.use("/api/auth", require("../dist/routes/auth.js").authRouter);
  app.use("/api/admin", require("../dist/routes/admin.js").adminRouter);
  app.use("/api/files", require("../dist/routes/files.js").fileRouter);

  const server = app.listen(0, "127.0.0.1");
  t.after(async () => {
    pool.execute = execute;
    await new Promise((resolve, reject) => server.close(err => err ? reject(err) : resolve()));
    process.chdir(cwd);
    await rm(sandbox, { recursive: true, force: true });
  });
  await once(server, "listening");

  const base = "http://127.0.0.1:" + server.address().port + "/api";
  const request = (method, path, data) => fetch(base + path, {
    method,
    ...(data instanceof FormData ? { body: data } : data === undefined ? {} :
      { headers: { "content-type": "application/json" }, body: JSON.stringify(data) }),
  });
  async function rejectInput(method, path, data) {
    const count = queries.length;
    const response = await request(method, path, data);
    assert.equal(response.status, 400, method + " " + path);
    assert.equal(queries.length, count, "invalid input must not reach the database");
    await response.json();
  }
  async function ok(method, path, data) {
    const response = await request(method, path, data);
    assert.equal(response.status, 200, method + " " + path);
    return response.json();
  }

  await t.test("search: missing, quoted text, type and length", async () => {
    await ok("GET", "/posts");
    assert.deepEqual(queries.at(-1).values, ["%%"]);
    const ordinary = "O'Reilly";
    await ok("GET", "/posts?q=" + encodeURIComponent(ordinary));
    assert.match(queries.at(-1).sql, /LIKE \?/);
    assert.deepEqual(queries.at(-1).values, ["%" + ordinary + "%"]);
    await ok("GET", "/posts?q=" + "a".repeat(50));
    await rejectInput("GET", "/posts?q=a&q=b");
    await rejectInput("GET", "/posts?q=" + "a".repeat(51));
  });

  await t.test("post details, write, edit and delete", async () => {
    const post = await ok("GET", "/posts/4");
    assert.equal(post.id, 4);
    assert.deepEqual(post.attachments, []);
    assert.deepEqual(queries.slice(-2).map(q => q.values), [[4], [4]]);
    await rejectInput("GET", "/posts/0");
    await rejectInput("GET", "/posts/1.5");
    await rejectInput("GET", "/posts/9007199254740992");
    for (const method of ["POST", "PUT"]) {
      const path = method === "POST" ? "/posts" : "/posts/4";
      for (const title of ["", [], {}, "가".repeat(101)]) {
        await rejectInput(method, path, { title, content: "본문" });
      }
      for (const content of ["", [], {}, "가".repeat(5001)]) {
        await rejectInput(method, path, { title: "제목", content });
      }
      await ok(method, path, { title: "가".repeat(100), content: "가".repeat(5000) });
      assert.match(queries.at(-1).sql, /\?/);
    }
    await rejectInput("PUT", "/posts/0", { title: "제목", content: "본문" });
    await rejectInput("DELETE", "/posts/0");
    await ok("DELETE", "/posts/4");
    assert.deepEqual(queries.at(-1).values, [4]);
  });

  await t.test("comment, account and role validation", async () => {
    await rejectInput("GET", "/posts/0/comments");
    await rejectInput("POST", "/posts/0/comments", { content: "댓글" });
    await rejectInput("DELETE", "/posts/0/comments/1");
    await rejectInput("DELETE", "/posts/4/comments/0");
    await rejectInput("POST", "/posts/4/comments", { content: [] });
    await rejectInput("POST", "/posts/4/comments", { content: "가".repeat(501) });
    await ok("GET", "/posts/4/comments");
    await ok("POST", "/posts/4/comments", { content: "가".repeat(500) });
    assert.deepEqual(queries.at(-1).values.slice(0, 2), [4, 1]);
    await ok("DELETE", "/posts/4/comments/1");

    const account = { email: "test@example.test", password: "test-password" };
    await rejectInput("POST", "/auth/register", { ...account, name: "가".repeat(31) });
    await rejectInput("POST", "/auth/register", { ...account, name: [] });
    await ok("POST", "/auth/register", { ...account, name: "가".repeat(30) });
    assert.match(queries.at(-1).sql, /VALUES \(\?, \?, \?,/);
    await rejectInput("POST", "/auth/login", { ...account, email: {} });
    assert.equal((await ok("POST", "/auth/login", account)).email, account.email);
    assert.match(queries.at(-1).sql, /email=\? AND password_hash=\?/);

    await rejectInput("GET", "/admin/users?role=USER&role=USER");
    await rejectInput("POST", "/admin/users/0/role", { role: "USER" });
    await rejectInput("POST", "/admin/users/1/role", { role: [] });
    await ok("POST", "/admin/users/1/role", { role: "USER" });
    assert.deepEqual(queries.at(-1).values, ["USER", 1]);
  });

  await t.test("attachment: valid ID and values passed separately", async () => {
    function upload(id) {
      const form = new FormData();
      form.append("postId", id);
      form.append("file", new Blob(["demo"], { type: "text/plain" }), "sample.txt");
      return form;
    }
    await rejectInput("POST", "/files/upload", upload("0"));
    await rejectInput("GET", "/files/download?name=a&name=b");
    await ok("POST", "/files/upload", upload("4"));
    assert.match(queries.at(-1).sql, /VALUES \(\?, \?, \?, \?, \?, \?\)/);
    assert.equal(queries.at(-1).values[0], 4);
    assert.equal(queries.at(-1).values[2], "sample.txt");
  });
});
