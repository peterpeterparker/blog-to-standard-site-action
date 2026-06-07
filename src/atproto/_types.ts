import { z } from "zod";
import { FrontmatterSchema } from "../common/blog.ts";

export const AtProtoCreateSessionArgsSchema = z.strictObject({
  did: z.string(),
  pwd: z.string(),
});

export const AtProtoCreateSessionResponseSchema = z.object({
  accessJwt: z.string(),
});

export type AtProtoCreateSessionResponse = z.infer<typeof AtProtoCreateSessionResponseSchema>;

export const AtProtoCreateRecordArgsSchema = z.strictObject({
  did: z.string(),
  publicationRkey: z.string(),
  ...FrontmatterSchema.omit({ standard_site: true }).shape,
});

export const AtProtoCreateRecordResponseSchema = z.object({
  uri: z.string(),
  cid: z.string(),
});

export type AtProtoCreateRecordResponse = z.infer<typeof AtProtoCreateRecordResponseSchema>;

export const AtProtoCreateSessionCodec = z.codec(AtProtoCreateSessionArgsSchema, z.string(), {
  decode: ({ did: identifier, pwd: password }) =>
    // https://github.com/bluesky-social/atproto/blob/main/lexicons/com/atproto/server/createSession.json
    JSON.stringify({ identifier, password }),
  encode: (json) => JSON.parse(json),
});

export const AtProtoCreateRecordCodec = z.codec(AtProtoCreateRecordArgsSchema, z.string(), {
  decode: ({ did, publicationRkey, published_at, ...frontmatter }) =>
    // https://github.com/bluesky-social/atproto/blob/main/lexicons/com/atproto/repo/createRecord.json
    JSON.stringify({
      repo: did,
      collection: "site.standard.document",
      record: {
        $type: "site.standard.document",
        site: `at://${did}/site.standard.publication/${publicationRkey}`,
        // https://standard.site/docs/lexicons/document#schema
        ...frontmatter,
        publishedAt: published_at,
      },
    }),
  encode: (json) => JSON.parse(json),
});
