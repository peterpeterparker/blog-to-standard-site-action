import { z } from "zod";
import { NotEmptyStringSchema } from "./asserts.ts";
import { RelativePathSchema } from "./files.ts";

export const FrontmatterSchema = z.object({
  path: NotEmptyStringSchema,
  title: NotEmptyStringSchema,
  description: NotEmptyStringSchema.optional(),
  published_at: z.iso.datetime(),
  standard_site: NotEmptyStringSchema.optional(),
});

export const FrontmatterWithStandardSiteSchema = FrontmatterSchema.required({
  standard_site: true,
});

export const BlogPostSchema = z.strictObject({
  relativePath: RelativePathSchema,
  frontmatter: FrontmatterSchema,
});

export const BlogPostWithStandardSiteSchema = BlogPostSchema.extend({
  frontmatter: FrontmatterWithStandardSiteSchema,
});

export const BlogPostsSchema = z.array(BlogPostSchema);
export const BlogPostsWithStandardSiteSchema = z.array(BlogPostWithStandardSiteSchema);

export type Frontmatter = z.infer<typeof FrontmatterSchema>;
export type FrontmatterWithStandardSite = z.infer<typeof FrontmatterWithStandardSiteSchema>;
export type BlogPost = z.infer<typeof BlogPostSchema>;
export type BlogPosts = z.infer<typeof BlogPostsSchema>;
export type BlogPostWithStandardSite = z.infer<typeof BlogPostWithStandardSiteSchema>;
export type BlogPostsWithStandardSite = z.infer<typeof BlogPostsWithStandardSiteSchema>;

export const BlogSchema = z.strictObject({
  posts: BlogPostsSchema,
});

export const BlogWithStandardSiteSchema = z.strictObject({
  posts: BlogPostsWithStandardSiteSchema,
});

export type Blog = z.infer<typeof BlogSchema>;
export type BlogWithStandardSite = z.infer<typeof BlogWithStandardSiteSchema>;
