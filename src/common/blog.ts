import { z } from "zod";
import { NotEmptyStringSchema } from "./asserts.ts";

export const BlogPostSchema = z.strictObject({
  path: NotEmptyStringSchema,
  title: NotEmptyStringSchema,
  description: NotEmptyStringSchema,
});

export const BlogPostsSchema = z.array(BlogPostSchema);

export type BlogPost = z.infer<typeof BlogPostSchema>;
export type BlogPosts = z.infer<typeof BlogPostsSchema>;

export const BlogSchema = z.strictObject({
  posts: BlogPostsSchema,
});

export type Blog = z.infer<typeof BlogSchema>;
