const { Router } = require("express");
const db = require("../lib/prisma");
const authenticate = require("../middleware/authenticate");

const router = Router();

async function loadAccount(req, res, next) {
  try {
    const account = await db.account.findUnique({
      where: { id: req.auth.accountId },
      select: { id: true, email: true, displayName: true, createdAt: true },
    });
    if (!account) return res.status(404).json({ error: "Account no longer exists" });
    req.account = account;
    return next();
  } catch (err) {
    return next(err);
  }
}

router.get("/me", authenticate, loadAccount, (req, res) => {
  res.json({ account: req.account });
});

router.get("/dashboard", authenticate, loadAccount, (req, res) => {
  const { displayName, email } = req.account;
  res.json({ greeting: `Hello ${displayName || email}, you are signed in.` });
});

module.exports = router;
