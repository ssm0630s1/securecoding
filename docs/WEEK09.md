# 시큐어 코딩 9주차 프로젝트 분석 보고서
## M1. 프로젝트 실행 및 정상 작동 확인

### 1. 개발 환경

| 항목 | 사용 환경 |
|---|---|
| 운영체제 | Windows |
| 개발 도구 | Visual Studio Code |
| Node.js | 22.x |
| MySQL | 8.0.46 |
| 프론트엔드 | React + TypeScript |
| 백엔드 | Express + TypeScript |
| 데이터베이스 | MySQL |

### 2. 프로젝트 실행 과정

1. `secure-board-starter-v2` 프로젝트를 VS Code에서 열었다.
2. `server/.env` 파일을 생성하고 MySQL 연결 정보를 설정하였다.
3. 서버 폴더에서 `npm install`을 실행하여 필요한 패키지를 설치하였다.
4. `npm run db:reset`으로 데이터베이스를 초기화하였다.
5. `npm run dev`로 백엔드 서버를 실행하였다.
6. 클라이언트 폴더에서도 `npm install`과 `npm run dev`를 실행하였다.
7. 웹 브라우저에서 `http://localhost:5173`에 접속하여 게시판 화면을 확인하였다.

### 3. 실행 결과

| 확인 항목 | 결과 |
|---|---|
| 서버 패키지 설치 | 정상 완료 |
| 데이터베이스 초기화 | 정상 완료 |
| 게시판 접속 | 성공 |
| 학생 계정 로그인 | 성공 |
| 게시글 작성 및 검색 | 미확인 |
| 댓글 작성 | 미확인 |
| 첨부파일 업로드 | 미확인 |
| 관리자 화면 | 미확인 |

### 4. 실행 결과 정리

프로젝트 개발 환경을 구성하고 데이터베이스 초기화 및 게시판 실행을 완료하였다.

브라우저에서 게시판에 접속하여 학생 계정으로 로그인이 정상적으로 이루어지는 것을 확인하였다.

이후 게시글 검색, 로그인, 관리자 기능의 코드 흐름을 분석하였다.

## M2. 게시글 검색 흐름

**처리 흐름**

검색어 입력 → `load()` → `api()` → 서버 검색 처리 → DB 조회 → 목록 표시

### 관련 파일 및 역할

| 파일 | 함수 및 처리부 | 역할 |
|---|---|---|
| `client/src/pages/PostList.tsx` | `PostList()`, `load(keyword)` | 검색어를 관리하고 검색 요청을 보낸다. |
| `client/src/api.ts` | `api()` | `fetch()`로 요청하고 JSON 응답을 읽는다. |
| `server/src/index.ts` | `app.use("/api/posts", postRouter)` | 게시글 요청을 담당 라우터로 연결한다. |
| `server/src/routes/posts.ts` | `postRouter.get("/")` | 검색어를 받아 DB에서 게시글을 조회한다. |

### 처리 과정

1. 사용자가 검색창에 검색어를 입력하면 `q` 상태에 저장된다.
2. 검색 버튼을 누르면 `load(q)` 함수가 실행된다.
3. `api()` 함수를 통해 `GET /api/posts?q=검색어` 요청이 서버로 전달된다.
4. 서버는 `req.query.q`로 검색어를 받아 제목에 검색어가 포함된 게시글을 최신 번호순으로 조회한다.
5. 조회된 게시글은 JSON 배열로 반환된다.
6. 화면은 결과를 `posts` 상태에 저장하고 `posts.map()`으로 목록을 표시한다.
7. `highlight()` 함수는 검색된 단어를 강조하는 역할을 한다.

---

## M3. 로그인 위치와 처리 과정

**처리 흐름**

이메일·비밀번호 입력 → `submit()` → 로그인 API → 계정 조회 → 세션 저장 → 화면 갱신

### 관련 파일 및 역할

| 파일 | 함수 및 처리부 | 역할 |
|---|---|---|
| `client/src/pages/Login.tsx` | `Login()`, `submit(e)` | 입력값을 받아 로그인 요청을 보낸다. |
| `client/src/api.ts` | `api()` | 이메일과 비밀번호를 JSON으로 전송한다. |
| `server/src/routes/auth.ts` | `authRouter.post("/login")` | 계정을 조회하고 로그인 결과를 반환한다. |
| `client/src/App.tsx` | `App()`의 `onLogin` 콜백 | 로그인한 사용자 정보를 화면 상태에 반영한다. |

### 처리 과정

1. 사용자가 로그인 화면에 이메일과 비밀번호를 입력한다.
2. 로그인 버튼을 누르면 `submit()` 함수가 기본 폼 제출을 막고 로그인 요청을 보낸다.
3. `POST /api/auth/login` 주소로 `{ email, password }` 데이터가 전달된다.
4. 서버는 입력받은 비밀번호를 해시값으로 변환한 뒤 이메일과 함께 DB에서 계정을 조회한다.
5. 일치하는 계정이 없으면 `401` 오류를 반환한다.
6. 로그인에 성공하면 사용자 정보를 `req.session.user`에 저장하고 `{ id, email, name, role }`을 반환한다.
7. 프론트엔드는 `onLogin`으로 사용자 정보를 `me` 상태에 저장하고 게시판 화면으로 이동한다.
8. 앱을 다시 실행하면 `GET /api/auth/me` 요청으로 기존 로그인 상태를 확인한다.

---

## M4. 관리자 메뉴와 API 처리

### 관련 파일 및 역할

| 파일 | 함수 및 처리부 | 역할 |
|---|---|---|
| `client/src/App.tsx` | `App()` | 사용자 역할이 `ADMIN`일 때 관리자 메뉴를 표시한다. |
| `client/src/pages/Admin.tsx` | `Admin()`, `load()` | 회원 목록을 요청하고 화면에 표시한다. |
| `client/src/pages/Admin.tsx` | `changeRole(id, role)` | 선택한 회원의 권한 변경을 요청한다. |
| `server/src/routes/admin.ts` | `adminRouter.get("/users")` | 관리자 회원 목록 조회 요청을 처리한다. |
| `server/src/routes/admin.ts` | `adminRouter.post("/users/:id/role")` | 회원 권한 변경 요청을 처리한다. |

### 처리 과정

1. `App.tsx`에서는 `me?.role === "ADMIN"` 조건일 때 관리자 메뉴를 표시한다.
2. 관리자 메뉴를 누르면 `page` 상태가 `admin`으로 변경되고 `Admin` 화면이 표시된다.
3. `Admin.load()` 함수는 `GET /api/admin/users` 요청에 현재 사용자 역할 값을 쿼리로 함께 전달한다.
4. 서버의 회원 목록 처리 함수는 전달된 역할 값에 따라 회원 목록을 반환하거나 `403` 오류를 반환한다.
5. 관리자가 회원 권한 선택 상자를 변경하면 `changeRole()` 함수가 실행된다.
6. `POST /api/admin/users/:id/role` 요청으로 변경할 역할 정보가 전달된다.
7. 서버는 DB의 회원 권한을 변경하고, 화면은 회원 목록을 다시 불러온다.

---

## M5. 이상해 보이는 코드 3곳

### M5-1. 게시글 검색어 처리

**파일:** `server/src/routes/posts.ts`

**의심스러운 코드:**

```typescript
const q = String(req.query.q ?? "");

const [rows] = await pool.query(
  `SELECT p.id, p.user_id, p.title, p.content, p.created_at, u.name AS authorName
   FROM posts p JOIN users u ON p.user_id=u.id
   WHERE p.title LIKE '%${q}%'
   ORDER BY p.id DESC`
);
```

**이상하다고 생각한 이유:**

사용자가 입력한 검색어를 별도의 검증 없이 SQL 문장에 직접 삽입하여 데이터베이스에 전달하는 부분이 의심스럽다.

### M5-2. 로그인 실패 메시지 처리

**파일:** `server/src/routes/auth.ts`

**의심스러운 코드:**

```typescript
if (rows.length === 0) {
  return res.status(401).json({
    message: `login failed: ${email} / ${password}`
  });
}
```

**이상하다고 생각한 이유:**

로그인에 실패했을 때 사용자가 입력한 이메일과 비밀번호를 오류 메시지에 그대로 포함하여 반환하는 부분이 의심스럽다.

### M5-3. 관리자 권한 확인

**파일:** `server/src/routes/admin.ts`

**의심스러운 코드:**

```typescript
const role = String(req.query.role ?? "");

if (role === "ADMIN") {
  const [rows] = await pool.query(
    "SELECT id,email,name,role,password_hash FROM users"
  );
  return res.json(rows);
}
```

**이상하다고 생각한 이유:**

실제 로그인한 사용자의 권한이 아니라 외부에서 전달받은 `role` 값을 기준으로 관리자 접근 여부를 판단하는 부분이 의심스럽다.

---

## 9주차 정리

이번 주차에는 게시판 프로젝트의 기본 구조와 주요 기능의 처리 과정을 확인하였다.

게시글 검색, 로그인, 관리자 기능이 프론트엔드에서 백엔드로 요청을 전달하고 데이터베이스와 상호작용하는 과정을 분석하였다.

또한 소스코드를 확인하면서 보안상 의심스러운 부분 3곳을 선정하고 그 이유를 정리하였다.

9주차에는 코드를 직접 수정하지 않고 프로젝트 구조와 각 기능의 처리 흐름을 이해하는 데 중점을 두었다.