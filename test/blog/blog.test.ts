import { describe, expect, it, beforeEach } from "bun:test";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { ZodError } from "zod";
import { Blog } from "../../src/blog/blog.ts";

const TEST_DIR = join(process.cwd(), "__fixtures__", "blog");

const frontmatter = (path: string, title: string, description: string) => `---
path: "${path}"
title: "${title}"
description: "${description}"
---`;

describe("Blog", () => {
  beforeEach(() => {
    process.env.BLOG_POSTS_PATH = "__fixtures__/blog";
  });

  describe("build", () => {
    it("should return error if BLOG_POSTS_PATH is not set", async () => {
      delete process.env.BLOG_POSTS_PATH;

      const result = await Blog.create().build({ files: [] });

      expect(result.status).toBe("error");

      if (result.status !== "error") {
        expect(true).toBeFalsy();
        return;
      }

      expect(result.err).toBeInstanceOf(ZodError);
    });

    it("should return error if BLOG_POSTS_PATH is empty string", async () => {
      process.env.BLOG_POSTS_PATH = "";

      const result = await Blog.create().build({ files: [] });

      expect(result.status).toBe("error");

      if (result.status !== "error") {
        expect(true).toBeFalsy();
        return;
      }

      expect(result.err).toBeInstanceOf(ZodError);
    });

    it("should return empty posts if no .md files match blog path", async () => {
      const result = await Blog.create().build({
        files: ["src/lib/utils.ts", "__fixtures__/blog/notes.txt"],
      });

      expect(result.status).toBe("success");

      if (result.status !== "success") {
        expect(true).toBeFalsy();
        return;
      }

      expect(result.result.posts).toHaveLength(0);
    });

    it("should return blog post with path, title and description", async () => {
      await writeFile(
        join(TEST_DIR, "hello-world.md"),
        frontmatter("/blog/hello-world", "Hello World", "A hello world post"),
      );

      const result = await Blog.create().build({
        files: ["__fixtures__/blog/hello-world.md"],
      });

      expect(result.status).toBe("success");

      if (result.status !== "success") {
        expect(true).toBeFalsy();
        return;
      }

      expect(result.result.posts).toHaveLength(1);
      expect(result.result.posts[0]?.path).toBe("/blog/hello-world");
      expect(result.result.posts[0]?.title).toBe("Hello World");
      expect(result.result.posts[0]?.description).toBe("A hello world post");
    });

    it("should skip posts with missing frontmatter fields", async () => {
      await writeFile(join(TEST_DIR, "invalid.md"), "# No frontmatter");

      const result = await Blog.create().build({
        files: ["__fixtures__/blog/invalid.md"],
      });

      expect(result.status).toBe("success");

      if (result.status !== "success") {
        expect(true).toBeFalsy();
        return;
      }

      expect(result.result.posts).toHaveLength(0);
    });

    it("should return multiple blog posts", async () => {
      await writeFile(
        join(TEST_DIR, "post-one.md"),
        frontmatter("/blog/post-one", "Post One", "First post"),
      );
      await writeFile(
        join(TEST_DIR, "post-two.md"),
        frontmatter("/blog/post-two", "Post Two", "Second post"),
      );

      const result = await Blog.create().build({
        files: ["__fixtures__/blog/post-one.md", "__fixtures__/blog/post-two.md"],
      });

      expect(result.status).toBe("success");

      if (result.status !== "success") {
        expect(true).toBeFalsy();
        return;
      }

      expect(result.result.posts).toHaveLength(2);
    });
  });
});
