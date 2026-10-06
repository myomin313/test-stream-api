function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: "Session has expired. Please log in again." });
}

module.exports = ensureAuthenticated;
