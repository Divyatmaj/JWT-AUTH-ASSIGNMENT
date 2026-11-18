# JWT Auth API

A REST API for user registration and login, built with **Node.js**, **Express 5**, **Prisma 7**, **PostgreSQL**, **bcrypt** and **JSON Web Tokens**.

Users sign up or log in and get back a short-lived JWT. They send that token with later requests to reach protected routes.

---

## Features

- **Registration**: email and password, with an optional display name.
  - Email is trimmed, lower-cased and checked for a valid format.
  - Password must be at least 6 characters.
  - Duplicate emails are rejected with `409 Conflict`.
- **Password hashing**: bcrypt with 10 salt rounds. Plain-text passwords are never stored and the hash is never returned.
- **Login**: checks the password against the stored hash and returns the same generic error whether the email or the password is wrong.
- **JWT tokens**:
  - signed with HS256 using `JWT_SECRET`
  - expire after **1 hour**
  - carry a unique `jti` (token ID) so each issued token can be identified
- **Route protection**: the `authenticate` middleware reads the `Authorization: Bearer <token>` header and rejects missing, invalid or expired tokens.
- **Consistent errors**: every error response looks like `{ "error": "..." }`, and a central handler keeps server errors generic.

---

## Tech stack

| Purpose        | Package                               |
|----------------|---------------------------------------|
| HTTP server    | `express` 5                           |
| Database ORM   | `prisma` / `@prisma/client` 7         |
| DB driver      | `pg` + `@prisma/adapter-pg`           |
| Hashing        | `bcrypt`                              |
| Tokens         | `jsonwebtoken`                        |
| Config         | `dotenv`                              |

---

## Getting started

### Prerequisites

- Node.js 20 or newer
- A running PostgreSQL server

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

```bash
cp .env.example .env
```

| Variable       | Required | Description                                            |
|----------------|----------|--------------------------------------------------------|
| `DATABASE_URL` | yes      | PostgreSQL connection string                           |
| `JWT_SECRET`   | yes      | Secret used to sign tokens. Use a long, random string  |
| `PORT`         | no       | Port to listen on (default `3000`)                     |

Example:

```env
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/jwt_auth_api"
JWT_SECRET="replace-with-a-long-random-string"
PORT=3000
```

To generate a strong secret:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

### 3. Set up the database

```bash
npx prisma migrate dev     # creates the "accounts" table
npx prisma generate        # builds the Prisma client
```

### 4. Run the server

```bash
npm start          # normal start
npm run dev        # restarts automatically when files change
```

The API is now available at `http://localhost:3000`.

---

## API reference

| Method | Path         | Auth required | Description                      |
|--------|--------------|---------------|----------------------------------|
| GET    | `/health`    | No            | Health check                     |
| POST   | `/signup`    | No            | Create an account                |
| POST   | `/login`     | No            | Log in and receive a token       |
| GET    | `/me`        | Yes           | Get the logged-in account        |
| GET    | `/dashboard` | Yes           | Personalised greeting            |

### `POST /signup`

Request:

```json
{ "email": "jane@example.com", "password": "secret12", "name": "Jane" }
```

Response `201 Created`:

```json
{
  "account": {
    "id": 1,
    "email": "jane@example.com",
    "displayName": "Jane",
    "createdAt": "2026-11-18T06:32:21.557Z"
  },
  "token": "<jwt>"
}
```

### `POST /login`

Request:

```json
{ "email": "jane@example.com", "password": "secret12" }
```

Response `200 OK`: the same shape as signup (`account` and `token`).

### `GET /me`

Header: `Authorization: Bearer <jwt>`

Response `200 OK`:

```json
{ "account": { "id": 1, "email": "jane@example.com", "displayName": "Jane", "createdAt": "..." } }
```

### `GET /dashboard`

Header: `Authorization: Bearer <jwt>`

Response `200 OK`:

```json
{ "greeting": "Hello Jane, you are signed in." }
```

### Error responses

| Status | When                                                          |
|--------|---------------------------------------------------------------|
| `400`  | Invalid email, short password, missing fields, malformed JSON |
| `401`  | Wrong credentials, or a missing, invalid or expired token     |
| `404`  | Unknown route, or the token's account no longer exists        |
| `409`  | Email already registered                                      |
| `500`  | Unexpected server error                                       |

---

## Token format

Decoded payload of an issued token:

```json
{
  "sub": "1",
  "email": "jane@example.com",
  "iat": 1794983541,
  "exp": 1794987141,
  "jti": "7a751d28-937b-40ad-9b06-8351fd8d31ef"
}
```

- `sub` is the account ID.
- `exp` is `iat` + 3600 seconds (1 hour).
- `jti` is a random UUID generated for every token.

---

## Trying it out with curl

```bash
# Sign up
curl -X POST http://localhost:3000/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"jane@example.com","password":"secret12","name":"Jane"}'

# Log in (copy the token from the response)
curl -X POST http://localhost:3000/login \
  -H "Content-Type: application/json" \
  -d '{"email":"jane@example.com","password":"secret12"}'

# Use the token
curl http://localhost:3000/me -H "Authorization: Bearer <token>"
curl http://localhost:3000/dashboard -H "Authorization: Bearer <token>"
```

---

## Project structure

```text
jwt-auth-api/
├── prisma/
│   ├── migrations/            # SQL migrations generated by Prisma
│   └── schema.prisma          # Account model
├── src/
│   ├── server.js              # Loads .env and starts the HTTP server
│   ├── app.js                 # Express app, route mounting, 404 + error handling
│   ├── lib/
│   │   ├── prisma.js          # Prisma client using the pg adapter
│   │   └── tokens.js          # issueToken / readToken (1h expiry, jti)
│   ├── middleware/
│   │   └── authenticate.js    # Verifies the Bearer token and sets req.auth
│   └── routes/
│       ├── auth.routes.js     # POST /signup, POST /login
│       └── account.routes.js  # GET /me, GET /dashboard
├── .env.example
├── .gitignore
├── package.json
└── prisma.config.ts
```

---

## Database schema

```prisma
model Account {
  id           Int      @id @default(autoincrement())
  email        String   @unique
  passwordHash String   @map("password_hash")
  displayName  String?  @map("display_name")
  createdAt    DateTime @default(now()) @map("created_at")

  @@map("accounts")
}
```

---

## Security notes

- Only bcrypt hashes are stored. Passwords never appear in responses or logs.
- Login gives the same error for an unknown email and a wrong password, so attackers can't use it to find out which emails are registered.
- Tokens are short-lived (1 hour), and the app refuses to sign or verify tokens if `JWT_SECRET` is missing.
- `.env` is git-ignored, so keep real secrets out of version control.
- Error details are logged on the server, and clients only get a generic message.
