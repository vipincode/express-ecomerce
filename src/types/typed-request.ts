import { Request } from "express";

export type TypedRequest<
  Params = Record<string, never>,
  Body = Record<string, never>,
  Query = Record<string, never>,
> = Request<Params, unknown, Body, Query>;
