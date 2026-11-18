const { Router } = require("express");
const bcrypt = require("bcrypt");
const db = require("../lib/prisma");
const { issueToken } = require("../lib/tokens");

const SALT_ROUNDS = 10;
const MIN_PASSWORD_LENGTH = 6;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const publicFields = { id: true, email: true, displayName: true, createdAt: true };

const router = Router();

function normaliseEmail(value) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

router.post("/signup", async (req, res, next) => {
  try {
    const email = normaliseEmail(req.body?.email);
    const { password, name } = req.body ?? {};

    if (!EMAIL_PATTERN.test(email)) {
      return res.status(400).json({ error: "A valid email is required" });
    }
    if (typeof password !== "string" || password.length < MIN_PASSWORD_LENGTH) {
      return res
        .status(400)
        .json({ error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters` });
    }

    const taken = await db.account.findUnique({ where: { email }, select: { id: true } });
    if (taken) {
      return res.status(409).json({ error: "An account with this email already exists" });
    }

    const account = await db.account.create({
      data: {
        email,
        passwordHash: await bcrypt.hash(password, SALT_ROUNDS),
        displayName: typeof name === "string" && name.trim() ? name.trim() : null,
      },
      select: publicFields,
    });

    return res.status(201).json({ account, token: issueToken(account) });
  } catch (err) {
    // Unique constraint hit by a concurrent signup with the same email.
    if (err.code === "P2002") {
      return res.status(409).json({ error: "An account with this email already exists" });
    }
    return next(err);
  }
});

router.post("/login", async (req, res, next) => {
  try {
    const email = normaliseEmail(req.body?.email);
    const password = req.body?.password;

    if (!email || typeof password !== "string" || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const record = await db.account.findUnique({ where: { email } });
    const valid = record && (await bcrypt.compare(password, record.passwordHash));

    if (!valid) {
      return res.status(401).json({ error: "Incorrect email or password" });
    }

    const { passwordHash, ...account } = record;
    return res.json({ account, token: issueToken(account) });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
