import type { Result } from "../common/types.ts";
import { NotEmptyStringSchema } from "../common/asserts.ts";
import { z } from "zod";
import { GitProvider } from "./_git.ts";
import type { RelativePath } from "../common/files.ts";

export class GitHubApiError extends Error {}

const GitHubFileSchema = z.object({
  filename: z.string(),
  status: z.string(),
});

const GitHubCommitSchema = z.object({
  files: z.array(GitHubFileSchema),
});

@GitProvider
export class GitHub {
  static create(): GitHub {
    return new this();
  }

  async findAddedFiles(): Promise<Result<{ files: RelativePath[] }>> {
    const { GITHUB_SHA, GITHUB_REPOSITORY, GITHUB_TOKEN } = process.env;

    const shaParsed = NotEmptyStringSchema.safeParse(GITHUB_SHA);
    if (!shaParsed.success) {
      return { status: "error", err: shaParsed.error };
    }

    const repoParsed = NotEmptyStringSchema.safeParse(GITHUB_REPOSITORY);
    if (!repoParsed.success) {
      return { status: "error", err: repoParsed.error };
    }

    const tokenParsed = NotEmptyStringSchema.safeParse(GITHUB_TOKEN);

    const { data: sha } = shaParsed;
    const { data: repository } = repoParsed;

    const response = await fetch(`https://api.github.com/repos/${repository}/commits/${sha}`, {
      headers: {
        ...(tokenParsed.success && { Authorization: `Bearer ${tokenParsed.data}` }),
        Accept: "application/vnd.github.v3+json",
      },
    });

    if (!response.ok) {
      return {
        status: "error",
        err: new GitHubApiError(`GitHub API failed: ${await response.text()}`),
      };
    }

    const parsed = GitHubCommitSchema.safeParse(await response.json());
    if (!parsed.success) {
      return { status: "error", err: parsed.error };
    }

    const files = parsed.data.files
      .filter(({ status }) => status === "added")
      .map(({ filename }) => filename);

    return { status: "success", result: { files } };
  }
}
