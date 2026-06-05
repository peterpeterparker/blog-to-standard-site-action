import type { Result } from "../common/types.ts";
import { NotEmptyStringSchema } from "../common/asserts.ts";
import { extname, join } from "node:path";
import { envRepoRoot } from "../env.ts";
import type { RelativePath } from "../common/files.ts";
import {
  type Blog as BlogType,
  type BlogPost,
  type BlogPosts,
  BlogPostSchema,
} from "../common/blog.ts";

export class NoBlogPostsError extends Error {}

export class Blog {
  private constructor() {}

  static create(): Blog {
    return new this();
  }

  async build(params: { files: RelativePath[] }): Promise<Result<BlogType>> {
    const result = await this.#collect(params);

    if (result.status === "error") {
      return result;
    }

    const { result: posts } = result;

    return {
      status: "success",
      result: {
        posts,
      },
    };
  }

  async #collect(params: { files: RelativePath[] }): Promise<Result<BlogPosts>> {
    const result = await this.#findLatestBlogPosts(params);

    if (result.status === "error") {
      return result;
    }

    const {
      result: { relativePaths },
    } = result;

    const repoRoot = envRepoRoot();

    const buildBlogPost = async (relativePath: RelativePath): Promise<BlogPost | undefined> => {
      const post = await this.#buildBlogPost({ relativePath, repoRoot });

      const parsedPost = BlogPostSchema.safeParse(post);

      if (!parsedPost.success) {
        return undefined;
      }

      return parsedPost.data;
    };

    try {
      const builtPosts = await Promise.all(relativePaths.map(buildBlogPost));
      const posts = builtPosts.filter((post) => post !== undefined);

      if (posts.length === 0) {
        return { status: "error", err: new NoBlogPostsError("No blog posts metadata found.") };
      }

      return { status: "success", result: posts };
    } catch (err: unknown) {
      return { status: "error", err };
    }
  }

  async #buildBlogPost({
    relativePath,
    repoRoot,
  }: {
    relativePath: RelativePath;
    repoRoot: string;
  }): Promise<Partial<BlogPost> | undefined> {
    const file = Bun.file(join(repoRoot, relativePath));
    const content = await file.text();

    // Remove frontmatter YAML - https://stackoverflow.com/a/33537453/5404186
    const metadataRegex = /^---((.|\n)*?)---/g;

    const rawMetdata = metadataRegex
      .exec(content)?.[1]
      ?.split("\n")
      ?.filter((value: string) => value !== "");

    return rawMetdata?.reduce<Partial<BlogPost>>(
      (acc: Partial<BlogPost>, value: string) => {
        const [key, ...rest] = value.split(":");

        if (key === undefined) {
          return acc;
        }

        const obj: Record<string, string> = {};
        obj[key] = rest.join(":").replace(/"/g, "").trim();

        return { ...acc, ...obj };
      },
      {
        publishedAt: new Date().toISOString(),
      },
    );
  }

  async #findLatestBlogPosts({
    files,
  }: {
    files: RelativePath[];
  }): Promise<Result<{ relativePaths: RelativePath[] }>> {
    const { BLOG_POSTS_PATH } = process.env;

    const blogPathParsed = NotEmptyStringSchema.safeParse(BLOG_POSTS_PATH);

    if (!blogPathParsed.success) {
      return { status: "error", err: blogPathParsed.error };
    }

    const { data: blogRelativePath } = blogPathParsed;

    const mdFiles = files.filter(
      (entry) => entry.includes(blogRelativePath) && extname(entry) === ".md",
    );

    return { status: "success", result: { relativePaths: mdFiles } };
  }
}
