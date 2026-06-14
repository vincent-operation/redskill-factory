/**
 * Request Timeout Middleware
 *
 * Prevents hanging connections from blocking the server.
 * LLM calls can take 10-30s, so default timeout is generous.
 */
import type { Request, Response, NextFunction } from "express";

const DEFAULT_TIMEOUT_MS = 60_000; // 60 seconds

export function timeout(ms: number = DEFAULT_TIMEOUT_MS) {
  return (_req: Request, res: Response, next: NextFunction): void => {
    const timer = setTimeout(() => {
      if (!res.headersSent) {
        res.status(504).json({
          error: {
            code: "REQUEST_TIMEOUT",
            message: `Request timed out after ${ms}ms`,
          },
        });
      }
    }, ms);

    // Clean up on response finish
    res.on("finish", () => clearTimeout(timer));

    next();
  };
}
