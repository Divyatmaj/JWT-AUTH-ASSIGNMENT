const { readToken } = require("../lib/tokens");

module.exports = function authenticate(req, res, next) {
  const [scheme, token] = (req.get("Authorization") || "").split(" ");

  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({ error: "Missing bearer token" });
  }

  try {
    const claims = readToken(token);
    req.auth = { accountId: Number(claims.sub), email: claims.email, tokenId: claims.jti };
    return next();
  } catch {
    return res.status(401).json({ error: "Token is invalid or has expired" });
  }
};
