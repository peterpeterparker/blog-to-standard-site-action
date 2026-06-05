import { afterEach, beforeEach } from "bun:test";
import { mkdir, rm } from "node:fs/promises";
import { join } from "node:path";

const REPO_ROOT = process.cwd();
const BLOG_POSTS_PATH = join("__fixtures__", "blog");
const BLOG_TEST_DIR = join(REPO_ROOT, BLOG_POSTS_PATH);

beforeEach(async () => {
  process.env.REPO_ROOT = REPO_ROOT;
  process.env.BLOG_POSTS_PATH = BLOG_POSTS_PATH;

  await mkdir(BLOG_TEST_DIR, { recursive: true });
});

afterEach(async () => {
  await rm(BLOG_TEST_DIR, { recursive: true, force: true });
});
