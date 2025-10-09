export interface JwtPayload {
  id: string;
  email: string;
  username: string;
  [key: string]: unknown;
}
