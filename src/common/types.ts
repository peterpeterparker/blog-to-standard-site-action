export interface Factory<T> {
  /** @throws {Error} if required configuration is missing */
  create(): T;
}

export type Result<T> = { status: "success"; result: T } | { status: "error"; err: unknown };
