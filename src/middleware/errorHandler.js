export class AppError extends Error {
  constructor(message, statusCode, code) {
    super(message);
    this.message = message;
    this.statusCode = statusCode || 500;
    this.code = code;
    Error.captureStackTrace(this, this.constructor);
  }
}

// for next(err)
// export default function errorHandler(err, req, res, next) {
//   const status = err.statusCode || 500;
//   const safe = {
//     success: false,
//     error: {
//       code: err.code || "INTERNAL_ERROR",
//       message: err.message || "Internal Server Error"
//     }
//   };
//   if (process.env.NODE_ENV !== "production" && err.stack) {
//     safe.error.stack = err.stack;
//   }
//   res.status(status).json(safe);
// }
