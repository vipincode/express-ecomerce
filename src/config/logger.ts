import pino from "pino";
import pinoHttp, { Options as PinoHttpOptions } from "pino-http";
import type { IncomingMessage, ServerResponse } from "http";
import type { LevelWithSilent } from "pino";
import { randomUUID } from "crypto";
import env from "./env";

// Create base logger based on env
export const logger = pino({
  transport:
    env.NODE_ENV === "development" && env.LOG_PRETTY === "true"
      ? {
          target: "pino-pretty",
          options: { colorize: true, translateTime: "SYS:standard" },
        }
      : undefined, // in production → raw JSON logs
  level: env.NODE_ENV === "production" ? "info" : "debug",
});

// HTTP logger (middleware)
const httpLoggerOptions: PinoHttpOptions = {
  logger,
  autoLogging: true,

  // Generate unique request IDs
  genReqId: (req: IncomingMessage) => {
    return (req.headers["x-request-id"] as string) || randomUUID();
  },

  serializers: {
    req: (req: IncomingMessage) => ({
      id: (req as any).id, // pino-http attaches req.id automatically
      method: req.method,
      url: req.url,
    }),
    res: (res: ServerResponse) => ({
      statusCode: res.statusCode,
    }),
  },

  customLogLevel: (req: IncomingMessage, res: ServerResponse, err?: Error): LevelWithSilent => {
    if (err || res.statusCode >= 500) return "error";
    if (res.statusCode >= 400) return "warn";
    return "info";
  },
};

export const httpLogger = pinoHttp(httpLoggerOptions);
