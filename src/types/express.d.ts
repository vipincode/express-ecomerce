import type { JwtPayload } from "./jwt-payload"; // adjust the import path if needed

declare global {
  namespace Express {
    export interface Request {
      id?: JwtPayload;
      user?: JwtPayload;
    }
  }
}
