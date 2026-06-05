import { run } from "./action.ts";

const result = await run();

if (result.status === "error") {
  console.error(result.err);
  process.exit(1);
}
