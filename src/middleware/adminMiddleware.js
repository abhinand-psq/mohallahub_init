// src/middleware/adminMiddleware.js
function adminMiddleware(req, res, next) {
  if (!req.user) return res.status(401).json({ success: false, error: { message: "Not authenticated" } });
  if (req.user.role !== "admin") return res.status(403).json({ success: false, error: { message: "Admin only" } });
  next();
}


export { adminMiddleware}
