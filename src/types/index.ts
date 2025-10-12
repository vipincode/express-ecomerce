export interface JwtPayload {
  id: string;
  email: string;
  username: string;
  [key: string]: unknown;
}

export interface QueryParamsType {
  search?: string;
  category?: string;
  page?: string;
  limit?: string;
  sortBy?: string;
  order?: string;
}
