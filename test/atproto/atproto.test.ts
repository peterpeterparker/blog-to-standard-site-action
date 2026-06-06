import { describe, expect, it, beforeEach, afterEach, spyOn, mock } from "bun:test";
import {
  AtProto,
  AtProtoApiCreateSessionError,
  AtProtoCreateRecordsWithError,
} from "../../src/atproto/atproto.ts";
import type { Blog } from "../../src/common/blog.ts";

describe("AtProto", () => {
  const mockBlog: Blog = {
    posts: [
      {
        relativePath: "src/blog/post-one.md",
        frontmatter: {
          path: "/blog/post-one",
          title: "Post One",
          description: "First post",
          publishedAt: "2026-06-05T00:00:00.000Z",
        },
      },
      {
        relativePath: "src/blog/post-two.md",
        frontmatter: {
          path: "/blog/post-two",
          title: "Post Two",
          description: "Second post",
          publishedAt: "2026-06-05T00:00:00.000Z",
        },
      },
    ],
  };

  const mockSessionResponse = {
    accessJwt: "mock-jwt-token",
  };

  const mockRecordResponse = {
    uri: "at://did:plc:fxmgj7lnas3ewnc3hmpx2vg6/site.standard.document/abc123",
    cid: "bafyreib",
  };

  beforeEach(() => {
    process.env.AT_PROTO_DID = "did:plc:fxmgj7lnas3ewnc3hmpx2vg6";
    process.env.AT_PROTO_APP_PASSWORD = "test-app-password";
    process.env.AT_PROTO_PUBLICATION_RKEY = "3mnjy5srkem2h";
  });

  afterEach(() => {
    delete process.env.AT_PROTO_DID;
    delete process.env.AT_PROTO_APP_PASSWORD;
    delete process.env.AT_PROTO_PUBLICATION_RKEY;
    mock.restore();
  });

  describe("create", () => {
    it("should throw if AT_PROTO_DID is not set", () => {
      delete process.env.AT_PROTO_DID;
      expect(() => AtProto.create()).toThrow();
    });

    it("should throw if AT_PROTO_APP_PASSWORD is not set", () => {
      delete process.env.AT_PROTO_APP_PASSWORD;
      expect(() => AtProto.create()).toThrow();
    });

    it("should throw if AT_PROTO_PUBLICATION_RKEY is not set", () => {
      delete process.env.AT_PROTO_PUBLICATION_RKEY;
      expect(() => AtProto.create()).toThrow();
    });

    it("should create instance with valid env vars", () => {
      expect(() => AtProto.create()).not.toThrow();
    });
  });

  describe("generateRecords", () => {
    it("should return error if createSession fails", async () => {
      spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response("Unauthorized", { status: 401 }),
      );

      const result = await AtProto.create().generateRecords(mockBlog);

      expect(result.status).toBe("error");
      if (result.status !== "error") {
        expect(true).toBeFalsy();
        return;
      }
      expect(result.err).toBeInstanceOf(AtProtoApiCreateSessionError);
    });

    it("should return error if one or more createRecord calls fail", async () => {
      spyOn(globalThis, "fetch")
        .mockResolvedValueOnce(new Response(JSON.stringify(mockSessionResponse), { status: 200 }))
        .mockResolvedValueOnce(new Response("Bad Request", { status: 400 }))
        .mockResolvedValueOnce(new Response(JSON.stringify(mockRecordResponse), { status: 200 }));

      const result = await AtProto.create().generateRecords(mockBlog);

      expect(result.status).toBe("error");
      if (result.status !== "error") {
        expect(true).toBeFalsy();
        return;
      }
      expect(result.err).toBeInstanceOf(AtProtoCreateRecordsWithError);
    });

    it("should return success if all records are created", async () => {
      spyOn(globalThis, "fetch")
        .mockResolvedValueOnce(new Response(JSON.stringify(mockSessionResponse), { status: 200 }))
        .mockResolvedValueOnce(new Response(JSON.stringify(mockRecordResponse), { status: 200 }))
        .mockResolvedValueOnce(new Response(JSON.stringify(mockRecordResponse), { status: 200 }));

      const result = await AtProto.create().generateRecords(mockBlog);

      expect(result.status).toBe("success");
    });

    it("should return success with empty posts", async () => {
      spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(JSON.stringify(mockSessionResponse), { status: 200 }),
      );

      const result = await AtProto.create().generateRecords({ posts: [] });

      expect(result.status).toBe("success");
      if (result.status !== "success") {
        expect(true).toBeFalsy();
        return;
      }
      expect(result.result.posts).toHaveLength(0);
    });

    it("should call createSession with correct credentials", async () => {
      const fetchSpy = spyOn(globalThis, "fetch")
        .mockResolvedValueOnce(new Response(JSON.stringify(mockSessionResponse), { status: 200 }))
        .mockResolvedValueOnce(new Response(JSON.stringify(mockRecordResponse), { status: 200 }))
        .mockResolvedValueOnce(new Response(JSON.stringify(mockRecordResponse), { status: 200 }));

      await AtProto.create().generateRecords(mockBlog);

      const [url, options] = fetchSpy.mock.calls[0] as [string, RequestInit];
      expect(url).toContain("com.atproto.server.createSession");
      const body = JSON.parse(options.body as string);
      expect(body.identifier).toBe("did:plc:fxmgj7lnas3ewnc3hmpx2vg6");
      expect(body.password).toBe("test-app-password");
    });

    it("should call createRecord with correct payload", async () => {
      const fetchSpy = spyOn(globalThis, "fetch")
        .mockResolvedValueOnce(new Response(JSON.stringify(mockSessionResponse), { status: 200 }))
        .mockResolvedValueOnce(new Response(JSON.stringify(mockRecordResponse), { status: 200 }))
        .mockResolvedValueOnce(new Response(JSON.stringify(mockRecordResponse), { status: 200 }));

      await AtProto.create().generateRecords(mockBlog);

      const [url, options] = fetchSpy.mock.calls[1] as [string, RequestInit];
      expect(url).toContain("com.atproto.repo.createRecord");
      expect(options.method).toBe("POST");
      expect(options.headers).toMatchObject({ Authorization: "Bearer mock-jwt-token" });

      const body = JSON.parse(options.body as string);
      expect(body.repo).toBe("did:plc:fxmgj7lnas3ewnc3hmpx2vg6");
      expect(body.collection).toBe("site.standard.document");
      expect(body.record.$type).toBe("site.standard.document");
      expect(body.record.path).toBe("/blog/post-one");
      expect(body.record.title).toBe("Post One");
      expect(body.record.site).toBe(
        "at://did:plc:fxmgj7lnas3ewnc3hmpx2vg6/site.standard.publication/3mnjy5srkem2h",
      );
      expect(body.record.publishedAt).toBe("2026-06-05T00:00:00.000Z");
    });

    it("should return success if all records are created", async () => {
      spyOn(globalThis, "fetch")
        .mockResolvedValueOnce(new Response(JSON.stringify(mockSessionResponse), { status: 200 }))
        .mockResolvedValueOnce(new Response(JSON.stringify(mockRecordResponse), { status: 200 }))
        .mockResolvedValueOnce(new Response(JSON.stringify(mockRecordResponse), { status: 200 }));

      const result = await AtProto.create().generateRecords(mockBlog);

      expect(result.status).toBe("success");
      if (result.status !== "success") {
        expect(true).toBeFalsy();
        return;
      }
      expect(result.result.posts).toHaveLength(2);
      expect(result.result.posts[0]?.frontmatter.standard_site).toBe(
        "at://did:plc:fxmgj7lnas3ewnc3hmpx2vg6/site.standard.document/abc123",
      );
    });
  });
});
