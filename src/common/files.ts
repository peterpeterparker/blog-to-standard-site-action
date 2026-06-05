import { z } from "zod";

export const RelativePathSchema = z.string();
export type RelativePath = z.infer<typeof RelativePathSchema>;
