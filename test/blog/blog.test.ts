import { describe, expect, it, beforeEach } from "bun:test";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { ZodError } from "zod";
import { Blog, NoBlogPostsError } from "../../src/blog/blog.ts";

const TEST_DIR = join(process.cwd(), "__fixtures__", "blog");

const frontmatter = (path: string, title: string, description: string, date?: string) => `---
path: "${path}"
title: "${title}"
description: "${description}"${date ? `\ndate: "${date}"` : ""}
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

    it("should return error if no .md files match blog path", async () => {
      const result = await Blog.create().build({
        files: ["src/lib/utils.ts", "__fixtures__/blog/notes.txt"],
      });

      expect(result.status).toBe("error");

      if (result.status !== "error") {
        expect(true).toBeFalsy();
        return;
      }

      expect(result.err).toBeInstanceOf(NoBlogPostsError);
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
      expect(result.result.posts[0]?.relativePath).toBe("__fixtures__/blog/hello-world.md");
      expect(result.result.posts[0]?.frontmatter.path).toBe("/blog/hello-world");
      expect(result.result.posts[0]?.frontmatter.title).toBe("Hello World");
      expect(result.result.posts[0]?.frontmatter.description).toBe("A hello world post");
      expect(result.result.posts[0]?.frontmatter.publishedAt).toBeDefined();
    });

    it("should return error if blog post has no valid frontmatter", async () => {
      await writeFile(join(TEST_DIR, "invalid.md"), "# No frontmatter");

      const result = await Blog.create().build({
        files: ["__fixtures__/blog/invalid.md"],
      });

      expect(result.status).toBe("error");

      if (result.status !== "error") {
        expect(true).toBeFalsy();
        return;
      }

      expect(result.err).toBeInstanceOf(NoBlogPostsError);
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

    it("should use current date as publishedAt", async () => {
      await writeFile(
        join(TEST_DIR, "dated.md"),
        frontmatter("/blog/dated", "Dated Post", "A dated post"),
      );

      const before = new Date().toISOString();

      const result = await Blog.create().build({
        files: ["__fixtures__/blog/dated.md"],
      });

      const after = new Date().toISOString();

      expect(result.status).toBe("success");

      if (result.status !== "success") {
        expect(true).toBeFalsy();
        return;
      }

      const publishedAt = result.result.posts[0]?.frontmatter.publishedAt ?? "";
      expect(publishedAt >= before).toBe(true);
      expect(publishedAt <= after).toBe(true);
    });

    it("should return error if blog posts have no valid frontmatter", async () => {
      await writeFile(join(TEST_DIR, "no-meta.md"), "# No frontmatter");

      const result = await Blog.create().build({
        files: ["__fixtures__/blog/no-meta.md"],
      });

      expect(result.status).toBe("error");

      if (result.status !== "error") {
        expect(true).toBeFalsy();
        return;
      }

      expect(result.err).toBeInstanceOf(NoBlogPostsError);
    });

    it("should skip posts that already have standard_site set", async () => {
      await writeFile(
        join(TEST_DIR, "with-standard-site.md"),
        `---\npath: "/blog/with-standard-site"\ntitle: "With Standard Site"\ndescription: "A post"\nstandard_site: "at://did:plc:xxx/site.standard.document/abc123"\n---`,
      );

      const result = await Blog.create().build({
        files: ["__fixtures__/blog/with-standard-site.md"],
      });

      expect(result.status).toBe("error");
      if (result.status !== "error") {
        expect(true).toBeFalsy();
        return;
      }
      expect(result.err).toBeInstanceOf(NoBlogPostsError);
    });

    it("should only return posts without standard_site set", async () => {
      await writeFile(
        join(TEST_DIR, "without-standard-site.md"),
        frontmatter("/blog/without-standard-site", "Without", "A post"),
      );
      await writeFile(
        join(TEST_DIR, "with-standard-site-2.md"),
        `---\npath: "/blog/with-standard-site-2"\ntitle: "With"\ndescription: "A post"\nstandard_site: "at://did:plc:xxx/site.standard.document/abc123"\n---`,
      );

      const result = await Blog.create().build({
        files: [
          "__fixtures__/blog/without-standard-site.md",
          "__fixtures__/blog/with-standard-site-2.md",
        ],
      });

      expect(result.status).toBe("success");
      if (result.status !== "success") {
        expect(true).toBeFalsy();
        return;
      }
      expect(result.result.posts).toHaveLength(1);
      expect(result.result.posts[0]?.relativePath).toBe(
        "__fixtures__/blog/without-standard-site.md",
      );
    });
  });

  describe("update", () => {
    it("should add standard_site to frontmatter", async () => {
      const filePath = join(TEST_DIR, "update-test.md");
      await writeFile(filePath, frontmatter("/blog/update-test", "Update Test", "A test post"));

      const result = await Blog.create().update({
        posts: [
          {
            relativePath: "__fixtures__/blog/update-test.md",
            frontmatter: {
              path: "/blog/update-test",
              title: "Update Test",
              description: "A test post",
              publishedAt: "2026-06-05T00:00:00.000Z",
              standardSite: "at://did:plc:xxx/site.standard.document/abc123",
            },
          },
        ],
      });

      expect(result.status).toBe("success");

      const content = await Bun.file(filePath).text();
      expect(content).toContain('standard_site: "at://did:plc:xxx/site.standard.document/abc123"');
    });

    it("should update existing standard_site in frontmatter", async () => {
      const filePath = join(TEST_DIR, "update-existing.md");
      await writeFile(
        filePath,
        `---\npath: "/blog/update-existing"\ntitle: "Update Existing"\ndescription: "A test post"\nstandard_site: "at://did:plc:xxx/site.standard.document/old"\n---`,
      );

      const result = await Blog.create().update({
        posts: [
          {
            relativePath: "__fixtures__/blog/update-existing.md",
            frontmatter: {
              path: "/blog/update-existing",
              title: "Update Existing",
              description: "A test post",
              publishedAt: "2026-06-05T00:00:00.000Z",
              standardSite: "at://did:plc:xxx/site.standard.document/new",
            },
          },
        ],
      });

      expect(result.status).toBe("success");

      const content = await Bun.file(filePath).text();
      expect(content).toContain('standard_site: "at://did:plc:xxx/site.standard.document/new"');
      expect(content).not.toContain("old");
    });
  });
});
