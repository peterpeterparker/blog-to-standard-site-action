import type { Result } from "../common/types.ts";
import { notEmptyString, NotEmptyStringSchema } from "../common/asserts.ts";
import { extname, join } from "node:path";
import { envRepoRoot } from "../env.ts";
import type { RelativePath } from "../common/files.ts";
import {
  type Blog as BlogType,
  type BlogPost,
  type BlogPosts,
  BlogPostSchema,
  type BlogPostWithStandardSite,
  type BlogWithStandardSite,
  type Frontmatter,
} from "../common/blog.ts";
import { safeExec } from "../common/exec.ts";

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

  async update(blog: BlogWithStandardSite): Promise<Result<void>> {
    return this.#updatePosts(blog);
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

      const [postsToSubmit, postsWithStandardSite] = posts.reduce<[BlogPosts, BlogPosts]>(
        ([toSubmit, withSite], post) =>
          notEmptyString(post.frontmatter.standard_site)
            ? [toSubmit, [...withSite, post]]
            : [[...toSubmit, post], withSite],
        [[], []],
      );

      // We do not want to create records for those who already have AT Protocol records.
      // For simplicity reasons, we assume that if a URI exists in the frontmatter, it effectively exists.
      postsWithStandardSite.forEach(({ relativePath }) =>
        console.info(`Skipping ${relativePath}: standard_site already set.`),
      );

      return { status: "success", result: postsToSubmit };
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
  }): Promise<Pick<BlogPost, "relativePath"> & { frontmatter: Partial<Frontmatter> | undefined }> {
    const file = Bun.file(join(repoRoot, relativePath));
    const content = await file.text();

    // Remove frontmatter YAML - https://stackoverflow.com/a/33537453/5404186
    const metadataRegex = /^---((.|\n)*?)---/g;

    const rawMetadata = metadataRegex
      .exec(content)?.[1]
      ?.split("\n")
      ?.filter((value: string) => value !== "");

    const frontmatter = rawMetadata?.reduce<Partial<Frontmatter>>(
      (acc: Partial<Frontmatter>, value: string) => {
        const [key, ...rest] = value.trim().split(":");

        if (!notEmptyString(key)) {
          return acc;
        }

        const obj: Record<string, string> = {};
        obj[key] = rest.join(":").replace(/"/g, "").trim();

        return { ...acc, ...obj };
      },
      {
        published_at: new Date().toISOString(),
      },
    );

    return {
      relativePath,
      frontmatter,
    };
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

  async #updatePosts({ posts }: BlogWithStandardSite): Promise<Result<void>> {
    const update = async (post: BlogPostWithStandardSite) => {
      return await this.#updateFrontmatter(post);
    };

    const updatePosts = async (): Promise<Result<void>> => {
      try {
        await Promise.all(posts.map(update));

        return { status: "success", result: undefined };
      } catch (err: unknown) {
        return { status: "error", err };
      }
    };

    return await safeExec(updatePosts);
  }

  async #updateFrontmatter({
    relativePath,
    frontmatter: { standard_site },
  }: BlogPostWithStandardSite) {
    const repoRoot = envRepoRoot();
    const filePath = join(repoRoot, relativePath);

    const file = Bun.file(filePath);
    const content = await file.text();

    const updateRegex = /standard_site:.*/;
    const insertRegex = /^(---[\s\S]*?)(---)$/m;

    const updated = content.match(/standard_site:/)
      ? content.replace(updateRegex, `standard_site: "${standard_site}"`)
      : content.replace(insertRegex, `$1standard_site: "${standard_site}"\n$2`);

    await Bun.write(filePath, updated);
  }
}
