/**
 * 全局错误处理中间件
 */
import type { Request, Response, NextFunction } from "express";

export interface ApiError extends Error {
  statusCode?: number;
  code?: string;
}

export function errorHandler(
  err: ApiError,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  const statusCode = err.statusCode ?? 500;
  const message = err.message ?? "Internal Server Error";

  console.error(`[ERROR] ${statusCode} - ${message}`);
  if (statusCode === 500) {
    console.error(err.stack);
  }

  res.status(statusCode).json({
    error: {
      code: err.code ?? "INTERNAL_ERROR",
      message,
    },
  });
}

export class NotFoundError extends Error {
  statusCode = 404;
  code = "NOT_FOUND";
  constructor(resource: string) {
    super(`${resource} not found`);
  }
}

export class ValidationError extends Error {
  statusCode = 400;
  code = "VALIDATION_ERROR";
  constructor(message: string) {
    super(message);
  }
}
