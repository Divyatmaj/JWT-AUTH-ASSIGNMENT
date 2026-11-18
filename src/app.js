const express = require("express");
const authRoutes = require("./routes/auth.routes");
const accountRoutes = require("./routes/account.routes");

const app = express();

app.use(express.json());

app.get("/health", (req, res) => res.json({ status: "ok" }));

app.use(authRoutes);
app.use(accountRoutes);

app.use((req, res) => res.status(404).json({ error: "Route not found" }));

// Central error handler: log the details, keep the response generic.
app.use((err, req, res, next) => {
  if (err.type === "entity.parse.failed") {
    return res.status(400).json({ error: "Request body must be valid JSON" });
  }
  console.error(err);
  return res.status(500).json({ error: "Something went wrong" });
});

module.exports = app;
