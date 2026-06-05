import type { Result } from "./common/types.ts";
import { GitHub } from "./git/github.ts";
import { Blog } from "./blog/blog.ts";
import { AtProto } from "./atproto/atproto.ts";

export const run = async (): Promise<Result<void>> => {
  // 1. Collect new blog posts from GitHub commit

  console.log('Running...');

  const addedFilesResult = await GitHub.create().findAddedFiles();

  console.log("Found:", addedFilesResult);

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

  const blogPostsResult = await Blog.create().build({ files });

  if (blogPostsResult.status === "error") {
    return blogPostsResult;
  }

  const { result: blog } = blogPostsResult;

  // 2. Generate AtProto records

  const recordsResult = await AtProto.create().generateRecords(blog);

  if (recordsResult.status === "error") {
    return recordsResult;
  }

  return { status: "success", result: undefined };
};
