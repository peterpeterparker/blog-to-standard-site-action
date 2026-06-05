import { assertNotEmptyString } from "../common/asserts.ts";
import type { Result } from "../common/types.ts";
import type { Blog, BlogPost } from "../common/blog.ts";
import {
  AtProtoCreateRecordCodec,
  type AtProtoCreateRecordResponse,
  AtProtoCreateRecordResponseSchema,
  AtProtoCreateSessionCodec,
  type AtProtoCreateSessionResponse,
  AtProtoCreateSessionResponseSchema,
} from "./_types.ts";
import { safeExec } from "../common/exec.ts";

export class AtProtoApiError extends Error {}
export class AtProtoApiCreateSessionError extends AtProtoApiError {}
export class AtProtoApiCreateRecordError extends AtProtoApiError {}

export class AtProtoCreateRecordsWithError extends Error {}

export class AtProto {
  #did: string; // Decentralized Identifier
  #pwd: string;
  #rkey: string; // site.standard.document record key

  private constructor({ did, pwd, rkey }: { did: string; pwd: string; rkey: string }) {
    this.#did = did;
    this.#pwd = pwd;
    this.#rkey = rkey;
  }

  static create(): AtProto {
    const { AT_PROTO_DID, AT_PROTO_APP_PASSWORD, AT_PROTO_PUBLICATION_RKEY } = process.env;

    assertNotEmptyString(AT_PROTO_DID, "AT_PROTO_DID");
    assertNotEmptyString(AT_PROTO_APP_PASSWORD, "AT_PROTO_APP_PASSWORD");
    assertNotEmptyString(AT_PROTO_PUBLICATION_RKEY, "AT_PROTO_PUBLICATION_RKEY");

    return new this({
      did: AT_PROTO_DID,
      pwd: AT_PROTO_APP_PASSWORD,
      rkey: AT_PROTO_PUBLICATION_RKEY,
    });
  }

  async generateRecords({ posts }: Blog): Promise<Result<void>> {
    const createSession = async () => {
      return await this.#createSession();
    };

    const sessionResult = await safeExec(createSession);

    if (sessionResult.status === "error") {
      return sessionResult;
    }

    const { result: session } = sessionResult;

    const createRecord = async (post: BlogPost): Promise<Result<AtProtoCreateRecordResponse>> => {
      const fn = async () => {
        return await this.#createRecord({ ...session, post });
      };

      return await safeExec(fn);
    };

    const results = await Promise.all(posts.map(createRecord));

    this.#printSummary(results);

    const withErrors = results.find(({ status }) => status === "error");

    if (withErrors) {
      return {
        status: "error",
        err: new AtProtoCreateRecordsWithError(
          "One or more records couldn't be created. Check out the logs.",
        ),
      };
    }

    return { status: "success", result: undefined };
  }

  async #createSession(): Promise<Result<AtProtoCreateSessionResponse>> {
    const response = await fetch("https://bsky.social/xrpc/com.atproto.server.createSession", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: AtProtoCreateSessionCodec.decode({
        did: this.#did,
        pwd: this.#pwd,
      }),
    });

    if (!response.ok) {
      return {
        status: "error",
        err: new AtProtoApiCreateSessionError(
          `AtProto API failed to create session: ${await response.text()}`,
        ),
      };
    }

    const parsed = AtProtoCreateSessionResponseSchema.safeParse(await response.json());

    if (!parsed.success) {
      return { status: "error", err: parsed.error };
    }

    const { data: result } = parsed;

    return { status: "success", result };
  }

  async #createRecord({
    accessJwt,
    post,
  }: { post: BlogPost } & AtProtoCreateSessionResponse): Promise<
    Result<AtProtoCreateRecordResponse>
  > {
    const response = await fetch("https://bsky.social/xrpc/com.atproto.repo.createRecord", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessJwt}`,
        "Content-Type": "application/json",
      },
      body: AtProtoCreateRecordCodec.decode({
        did: this.#did,
        publicationRkey: this.#rkey,
        ...post,
      }),
    });

    if (!response.ok) {
      return {
        status: "error",
        err: new AtProtoApiCreateRecordError(
          `AtProto API failed to create record: ${await response.text()}`,
        ),
      };
    }

    const parsed = AtProtoCreateRecordResponseSchema.safeParse(await response.json());

    if (!parsed.success) {
      return { status: "error", err: parsed.error };
    }

    const { data: result } = parsed;

    return { status: "success", result };
  }

  #printSummary(results: Result<AtProtoCreateRecordResponse>[]) {
    for (const result of results) {
      if (result.status === "error") {
        console.error(`Failed to create record: ${result.err}`);
      } else {
        console.log(`Record created: ${result.result.uri}`);
      }
    }
  }
}
