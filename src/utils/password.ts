import bcrypt from "bcrypt";
import env from "../config/env";

export const hashPassword = async (password: string) => {
  const salt = await bcrypt.genSalt(env.BCRYPT_ROUNDS);
  return await bcrypt.hash(password, salt);
};

export const comparePasswords = async (password: string, hash: string) => {
  return await bcrypt.compare(password, hash);
};
