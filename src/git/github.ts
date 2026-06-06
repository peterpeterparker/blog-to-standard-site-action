import type { Result } from "../common/types.ts";
import { assertNotEmptyString, NotEmptyStringSchema } from "../common/asserts.ts";
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
  #repository: string;
  #token: string;
  #refName: string;

  constructor({
    repository,
    token,
    refName,
  }: {
    repository: string;
    token: string;
    refName: string;
  }) {
    this.#repository = repository;
    this.#token = token;
    this.#refName = refName;
  }

  static create(): GitHub {
    const { GITHUB_REPOSITORY, GITHUB_TOKEN, GITHUB_REF_NAME } = process.env;

    assertNotEmptyString(GITHUB_REPOSITORY, "GITHUB_REPOSITORY");
    assertNotEmptyString(GITHUB_TOKEN, "GITHUB_TOKEN");
    assertNotEmptyString(GITHUB_REF_NAME, "GITHUB_REF_NAME");

    return new this({
      repository: GITHUB_REPOSITORY,
      token: GITHUB_TOKEN,
      refName: GITHUB_REF_NAME,
    });
  }

  async findAddedFiles(): Promise<Result<{ files: RelativePath[] }>> {
    const { GITHUB_SHA } = process.env;

    const shaParsed = NotEmptyStringSchema.safeParse(GITHUB_SHA);
    if (!shaParsed.success) {
      return { status: "error", err: shaParsed.error };
    }

    const { data: sha } = shaParsed;

    const response = await fetch(
      `https://api.github.com/repos/${this.#repository}/commits/${sha}`,
      {
        headers: {
          Authorization: `Bearer ${this.#token}`,
          Accept: "application/vnd.github.v3+json",
        },
      },
    );

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
