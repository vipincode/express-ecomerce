import express from "express";
import type { Request, Response, NextFunction } from "express";
import helmet from "helmet";
import compression from "compression";
import cors from "cors";
import cookieParser from "cookie-parser";
import { httpLogger } from "./config/logger";
import { errorHandler } from "./middlewares/errorHandler";
import { globalRateLimiter } from "./middlewares/rateLimiter";

// API ROUTER
import authRoutes from "./routes/authRoutes";
import categoryRoutes from "./routes/categoryRoutes";

export const app = express();

//Security Middlewares
app.use(helmet());
// app.use(cors({ origin: "*" }));
app.use(
  cors({
    origin: "http://localhost:3000", // 👈 your frontend URL
    credentials: true, // 👈 allow sending cookies
  }),
);
app.use(compression());

//  Request logger
app.use(httpLogger);

// Add Request ID to response headers + log response time
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = process.hrtime.bigint(); // high precision timer
  const requestId = (req as any).id;

  if (requestId) {
    res.setHeader("X-Request-Id", requestId);
  }

  res.on("finish", () => {
    const end = process.hrtime.bigint();
    const durationMs = Number(end - start) / 1_000_000; // convert ns → ms
    (req as any).log.info(
      {
        id: requestId,
        method: req.method,
        url: req.url,
        statusCode: res.statusCode,
        duration: `${durationMs.toFixed(2)}ms`,
      },
      "request completed",
    );
  });

  next();
});

//  Apply rate limiter (before routes)
app.use(globalRateLimiter);

//  Body parsing
app.use(express.json());
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));

//  Routes
app.get("/", (req, res) => {
  res.json({ message: "API is running" });
});

app.get("/hello", (req, res) => {
  res.json({ success: true, message: "Hello world!" });
});

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/category", categoryRoutes);

//  Error handler (must be last)
app.use(errorHandler);
