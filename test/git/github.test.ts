import { describe, expect, it, afterEach, beforeEach, spyOn, mock } from "bun:test";
import { GitHub, GitHubApiError } from "../../src/git/github.ts";
import { ZodError } from "zod";

describe("GitHub", () => {
  let gitHub: GitHub;

  beforeEach(() => {
    process.env.GITHUB_SHA = "abc123";
    process.env.GITHUB_REPOSITORY = "peterpeterparker/my-blog";
    process.env.GITHUB_TOKEN = "token123";

    gitHub = GitHub.create();
  });

  afterEach(() => {
    delete process.env.GITHUB_SHA;
    delete process.env.GITHUB_REPOSITORY;
    delete process.env.GITHUB_TOKEN;

    mock.restore();
  });

  describe("create", () => {
    it("should throw if GITHUB_REPOSITORY is not set", () => {
      delete process.env.GITHUB_REPOSITORY;
      expect(() => GitHub.create()).toThrow();
    });

    it("should throw if GITHUB_TOKEN is not set", () => {
      delete process.env.GITHUB_TOKEN;
      expect(() => GitHub.create()).toThrow();
    });

    it("should create instance with valid env vars", () => {
      expect(() => GitHub.create()).not.toThrow();
    });
  });

  describe("findAddedFiles", () => {
    it("should return error if GITHUB_SHA is not set", async () => {
      delete process.env.GITHUB_SHA;

      const result = await gitHub.findAddedFiles();

      expect(result.status).toBe("error");

      if (result.status !== "error") {
        expect(true).toBeFalsy();
        return;
      }

      expect(result.err).toBeInstanceOf(ZodError);
    });

    it("should return error if GITHUB_SHA is empty string", async () => {
      process.env.GITHUB_SHA = "";

      const result = await gitHub.findAddedFiles();

      expect(result.status).toBe("error");

      if (result.status !== "error") {
        expect(true).toBeFalsy();
        return;
      }

      expect(result.err).toBeInstanceOf(ZodError);
    });

    it("should call GitHub API with Authorization header", async () => {
      const fetchSpy = spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(JSON.stringify({ files: [] }), { status: 200 }),
      );

      await gitHub.findAddedFiles();

      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining("api.github.com"),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: "Bearer token123",
          }),
        }),
      );
    });

    it("should return error if GitHub API fails", async () => {
      spyOn(globalThis, "fetch").mockResolvedValueOnce(new Response("Not found", { status: 404 }));

      const result = await gitHub.findAddedFiles();

      expect(result.status).toBe("error");

      if (result.status !== "error") {
        expect(true).toBeFalsy();
        return;
      }

      expect(result.err).toBeInstanceOf(GitHubApiError);
    });

    it("should return a single added file", async () => {
      spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            files: [
              { filename: "src/routes/blog/my-post/index.md", status: "added" },
              { filename: "src/lib/utils.ts", status: "modified" },
              { filename: "src/routes/blog/old-post/index.md", status: "removed" },
            ],
          }),
          { status: 200 },
        ),
      );

      const result = await gitHub.findAddedFiles();

      expect(result.status).toBe("success");

      if (result.status !== "success") {
        expect(true).toBeFalsy();
        return;
      }

      expect(result.result.files).toEqual(["src/routes/blog/my-post/index.md"]);
    });

    it("should return only added files", async () => {
      spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            files: [
              { filename: "src/routes/blog/my-post/index.md", status: "added" },
              { filename: "src/routes/blog/my-post/index2.md", status: "added" },
              { filename: "src/lib/utils.ts", status: "modified" },
              { filename: "src/routes/blog/old-post/index.md", status: "removed" },
            ],
          }),
          { status: 200 },
        ),
      );

      const result = await gitHub.findAddedFiles();

      expect(result.status).toBe("success");

      if (result.status !== "success") {
        expect(true).toBeFalsy();
        return;
      }

      expect(result.result.files).toHaveLength(2);
    });

    it("should return empty array if no files were added", async () => {
      spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            files: [{ filename: "src/lib/utils.ts", status: "modified" }],
          }),
          { status: 200 },
        ),
      );

      const result = await gitHub.findAddedFiles();

      expect(result.status).toBe("success");

      if (result.status !== "success") {
        expect(true).toBeFalsy();
        return;
      }

      expect(result.result.files).toHaveLength(0);
    });
  });
});
