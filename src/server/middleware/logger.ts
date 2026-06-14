/**
 * HTTP 请求日志中间件
 */
import type { Request, Response, NextFunction } from "express";

export function requestLogger(req: Request, _res: Response, next: NextFunction): void {
  const start = Date.now();
  const { method, url } = req;

  _res.on("finish", () => {
    const duration = Date.now() - start;
    const { statusCode } = _res;
    const emoji = statusCode < 400 ? "✓" : statusCode < 500 ? "⚠" : "✗";
    console.log(`  ${emoji} ${method} ${url} → ${statusCode} (${duration}ms)`);
  });

  next();
}
