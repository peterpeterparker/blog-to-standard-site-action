import { z } from "zod";
import { NotEmptyStringSchema } from "./asserts.ts";

export const BlogPostSchema = z.object({
  path: NotEmptyStringSchema,
  title: NotEmptyStringSchema,
  description: NotEmptyStringSchema,
  publishedAt: z.iso.datetime(),
  standardSite: NotEmptyStringSchema.optional(),
});

export const BlogPostWithStandardSiteSchema = BlogPostSchema.required({
  standardSite: true,
});

export const BlogPostsSchema = z.array(BlogPostSchema);
export const BlogPostsWithStandardSiteSchema = z.array(BlogPostWithStandardSiteSchema);

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
