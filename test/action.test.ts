import { describe, expect, it, spyOn, mock, afterEach, beforeEach } from "bun:test";
import { run } from "../src/action.ts";
import { GitHub } from "../src/git/github.ts";
import { Blog } from "../src/blog/blog.ts";
import { AtProto } from "../src/atproto/atproto.ts";
import type { Blog as BlogType, BlogWithStandardSite } from "../src/common/blog.ts";

describe("Action", () => {
  const mockBlog: BlogType = {
    posts: [
      {
        relativePath: "__fixtures__/blog/hello-world.md",
        frontmatter: {
          path: "/blog/hello-world",
          title: "Hello World",
          description: "A post",
          published_at: "2026-06-05T00:00:00.000Z",
        },
      },
    ],
  };

  const mockBlogWithStandardSite: BlogWithStandardSite = {
    posts: [
      {
        relativePath: "__fixtures__/blog/hello-world.md",
        frontmatter: {
          path: "/blog/hello-world",
          title: "Hello World",
          description: "A post",
          published_at: "2026-06-05T00:00:00.000Z",
          standard_site: "at://did:plc:fxmgj7lnas3ewnc3hmpx2vg6/site.standard.document/abc123",
        },
      },
    ],
  };

  describe("run", () => {
    beforeEach(() => {
      process.env.BLOG_POSTS_PATH = "__fixtures__/blog";
      process.env.AT_PROTO_DID = "did:plc:fxmgj7lnas3ewnc3hmpx2vg6";
      process.env.AT_PROTO_APP_PASSWORD = "test-app-password";
      process.env.AT_PROTO_PUBLICATION_RKEY = "3mnjy5srkem2h";
      process.env.GITHUB_TOKEN = "token123";
      process.env.GITHUB_REPOSITORY = "peterpeterparker/my-blog";
      process.env.GITHUB_SHA = "abc123";
    });

    afterEach(() => {
      delete process.env.BLOG_POSTS_PATH;
      delete process.env.AT_PROTO_DID;
      delete process.env.AT_PROTO_APP_PASSWORD;
      delete process.env.AT_PROTO_PUBLICATION_RKEY;
      delete process.env.GITHUB_TOKEN;
      delete process.env.GITHUB_REPOSITORY;
      delete process.env.GITHUB_SHA;
      mock.restore();
    });

    it("should return error if findAddedFiles fails", async () => {
      spyOn(GitHub.prototype, "findAddedFiles").mockResolvedValueOnce({
        status: "error",
        err: new Error("git failed"),
      });

      const result = await run();

      expect(result.status).toBe("error");
      if (result.status !== "error") {
        expect(true).toBeFalsy();
        return;
      }
      expect(result.err).toBeInstanceOf(Error);
    });

    it("should return success if no blog posts found", async () => {
      spyOn(GitHub.prototype, "findAddedFiles").mockResolvedValueOnce({
        status: "success",
        result: { files: [] },
      });

      const result = await run();

      expect(result.status).toBe("success");
    });

    it("should return success if no posts need Standard.Site records", async () => {
      spyOn(GitHub.prototype, "findAddedFiles").mockResolvedValueOnce({
        status: "success",
        result: { files: ["__fixtures__/blog/hello-world.md"] },
      });

      spyOn(Blog.prototype, "build").mockResolvedValueOnce({
        status: "success",
        result: { posts: [] },
      });

      const result = await run();

      expect(result.status).toBe("success");
    });

    it("should return error if blog build fails", async () => {
      spyOn(GitHub.prototype, "findAddedFiles").mockResolvedValueOnce({
        status: "success",
        result: { files: ["__fixtures__/blog/hello-world.md"] },
      });

      spyOn(Blog.prototype, "build").mockResolvedValueOnce({
        status: "error",
        err: new Error("blog failed"),
      });

      const result = await run();

      expect(result.status).toBe("error");
      if (result.status !== "error") {
        expect(true).toBeFalsy();
        return;
      }
      expect(result.err).toBeInstanceOf(Error);
    });

    it("should return error if generateRecords fails", async () => {
      spyOn(GitHub.prototype, "findAddedFiles").mockResolvedValueOnce({
        status: "success",
        result: { files: ["__fixtures__/blog/hello-world.md"] },
      });

      spyOn(Blog.prototype, "build").mockResolvedValueOnce({
        status: "success",
        result: mockBlog,
      });

      spyOn(AtProto.prototype, "generateRecords").mockResolvedValueOnce({
        status: "error",
        err: new Error("atproto failed"),
      });

      const result = await run();

      expect(result.status).toBe("error");
      if (result.status !== "error") {
        expect(true).toBeFalsy();
        return;
      }
      expect(result.err).toBeInstanceOf(Error);
    });

    it("should return success when all steps succeed", async () => {
      spyOn(GitHub.prototype, "findAddedFiles").mockResolvedValueOnce({
        status: "success",
        result: { files: ["__fixtures__/blog/hello-world.md"] },
      });

      spyOn(Blog.prototype, "build").mockResolvedValueOnce({
        status: "success",
        result: mockBlog,
      });

      spyOn(AtProto.prototype, "generateRecords").mockResolvedValueOnce({
        status: "success",
        result: mockBlogWithStandardSite,
      });

      spyOn(Blog.prototype, "update").mockResolvedValueOnce({
        status: "success",
        result: undefined,
      });

      const result = await run();

      expect(result.status).toBe("success");
    });

    it("should return error if update fails", async () => {
      spyOn(GitHub.prototype, "findAddedFiles").mockResolvedValueOnce({
        status: "success",
        result: { files: ["__fixtures__/blog/hello-world.md"] },
      });

      spyOn(Blog.prototype, "build").mockResolvedValueOnce({
        status: "success",
        result: mockBlog,
      });

      spyOn(AtProto.prototype, "generateRecords").mockResolvedValueOnce({
        status: "success",
        result: mockBlogWithStandardSite,
      });

      spyOn(Blog.prototype, "update").mockResolvedValueOnce({
        status: "error",
        err: new Error("update failed"),
      });

      const result = await run();

      expect(result.status).toBe("error");
      if (result.status !== "error") {
        expect(true).toBeFalsy();
        return;
      }
      expect(result.err).toBeInstanceOf(Error);
    });
  });
});
