import type { Result } from "./common/types.ts";
import { GitHub } from "./git/github.ts";
import { Blog } from "./blog/blog.ts";
import { AtProto } from "./atproto/atproto.ts";

export const run = async (): Promise<Result<void>> => {
  // 1. Collect new blog posts from GitHub commit

  const addedFilesResult = await GitHub.create().findAddedFiles();

  if (addedFilesResult.status === "error") {
    return addedFilesResult;
  }

  const {
    result: { files },
  } = addedFilesResult;

  if (files.length === 0) {
    console.info("No blog files found. Skipping.");
    return { status: "success", result: undefined };
  }

  // 2. Extract metadata for the posts

  const blog = await Blog.create();

  const blogPostsResult = await blog.build({ files });

  if (blogPostsResult.status === "error") {
    return blogPostsResult;
  }

  const { result: blogData } = blogPostsResult;

  if (blogData.posts.length === 0) {
    console.info("No blog posts without an existing Standard.Site record found.");
    return { status: "success", result: undefined };
  }

  // 3. Generate AtProto records

  const recordsResult = await AtProto.create().generateRecords(blogData);

  if (recordsResult.status === "error") {
    return recordsResult;
  }

  const { result: blogDataWithStandardSite } = recordsResult;

  // 4. Update the blog posts frontmatter with Standard Site URI

  return await blog.update(blogDataWithStandardSite);
};
