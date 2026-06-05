import type { Result } from "./types.ts";

export const safeExec = async <T>(fn: () => Promise<Result<T>>): Promise<Result<T>> => {
  try {
    return await fn();
  } catch (err: unknown) {
    return { status: "error", err };
  }
};
