import type { Factory, Result } from "../common/types.ts";
import type { RelativePath } from "../common/files.ts";

interface Git {
  findAddedFiles(): Promise<Result<{ files: RelativePath[] }>>;
}

export function GitProvider(_constructor: Factory<Git>) {}
