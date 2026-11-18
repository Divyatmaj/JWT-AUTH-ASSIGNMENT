const { randomUUID } = require("crypto");
const jwt = require("jsonwebtoken");

const TOKEN_LIFETIME = "1h";

function getSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is not set");
  return secret;
}

// Each token gets its own jti so individual tokens can be told apart.
function issueToken(account) {
  return jwt.sign({ sub: String(account.id), email: account.email }, getSecret(), {
    expiresIn: TOKEN_LIFETIME,
    jwtid: randomUUID(),
  });
}

function readToken(token) {
  return jwt.verify(token, getSecret());
}

module.exports = { issueToken, readToken };
