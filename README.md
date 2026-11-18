# JWT Auth API

A small authentication API built with Express 5, Prisma 7 (PostgreSQL) and JSON Web Tokens.

## What it does

- **Sign up** with email + password (email is trimmed and lower-cased, password must be ≥ 6 characters).
- Passwords are hashed with **bcrypt** (10 salt rounds); the hash is never sent back to the client.
- **Log in** to receive a signed JWT that **expires after 1 hour** and carries a unique **`jti`** (token ID).
- An `authenticate` middleware checks the `Authorization: Bearer <token>` header and protects `/me` and `/dashboard`.
- One central error handler keeps 500 responses generic and handles malformed JSON.

## Setup

```bash
npm install
cp .env.example .env        # then fill in DATABASE_URL and JWT_SECRET
npx prisma migrate dev      # creates the "accounts" table
npx prisma generate
npm start                   # or: npm run dev  (auto-restart on change)
```

The server listens on `PORT` (default `3000`).

## Endpoints

| Method | Path         | Auth | Body                          | Success                    |
|--------|--------------|------|-------------------------------|----------------------------|
| GET    | `/health`    | –    | –                             | `200 { status }`           |
| POST   | `/signup`    | –    | `{ email, password, name? }`  | `201 { account, token }`   |
| POST   | `/login`     | –    | `{ email, password }`         | `200 { account, token }`   |
| GET    | `/me`        | JWT  | –                             | `200 { account }`          |
| GET    | `/dashboard` | JWT  | –                             | `200 { greeting }`         |

Errors are returned as `{ "error": "..." }` with status `400`, `401`, `404`, `409` or `500`.

### Example

```bash
curl -X POST localhost:3000/signup -H "Content-Type: application/json" \
  -d '{"email":"me@example.com","password":"secret12","name":"Me"}'

curl localhost:3000/me -H "Authorization: Bearer <token>"
```

## Project layout

```text
src/
├── server.js                 # loads env, starts the HTTP server
├── app.js                    # express app, route mounting, error handling
├── lib/
│   ├── prisma.js             # Prisma client (pg adapter)
│   └── tokens.js             # issueToken / readToken (1h expiry, jti)
├── middleware/
│   └── authenticate.js       # Bearer token check -> req.auth
└── routes/
    ├── auth.routes.js        # /signup, /login
    └── account.routes.js     # /me, /dashboard
prisma/
├── schema.prisma             # Account model
└── migrations/
prisma.config.ts
```
# JWT-AUTH-ASSIGNMENT
