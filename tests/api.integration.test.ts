import request from "supertest";
import { describe, expect, it } from "vitest";

import { createApp } from "../src/app";

const app = createApp();

describe("API discoverability and HTTP behavior", () => {
  it("lists every public endpoint at GET /api", async () => {
    const response = await request(app).get("/api").expect(200);

    expect(response.body.success).toBe(true);
    expect(response.headers["cache-control"]).toBe("no-store");
    expect(response.body.endpoints).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          method: "POST",
          path: "/api/agent/login",
        }),
        expect.objectContaining({
          method: "POST",
          path: "/api/agent/add-login",
        }),
        expect.objectContaining({
          method: "POST",
          path: "/api/agent/add",
        }),
        expect.objectContaining({
          method: "GET",
          path: "/api/agent/admin/list",
        }),
        expect.objectContaining({
          method: "GET",
          path: "/api/agent/admin/next-id",
        }),
        expect.objectContaining({
          method: "PATCH",
          path: "/api/agent/admin/:agent_id",
        }),
        expect.objectContaining({
          method: "DELETE",
          path: "/api/agent/admin/:agent_id",
        }),
        expect.objectContaining({
          method: "GET",
          path: "/api/leads/next",
        }),
        expect.objectContaining({
          method: "POST",
          path: "/api/leads/complete",
        }),
      ]),
    );
  });

  it.each([
    ["/api/agent/login", "POST"],
    ["/api/agent/add-login", "POST"],
    ["/api/agent/add", "POST"],
    ["/api/agent/pause", "POST"],
    ["/api/agent/continue", "POST"],
    ["/api/leads/complete", "POST"],
  ])("shows browser-friendly usage for GET %s", async (path, method) => {
    const response = await request(app).get(path).expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.endpoint).toEqual(
      expect.objectContaining({ method, path }),
    );
  });

  it("returns 405 and allowed methods for an unsupported route method", async () => {
    const response = await request(app)
      .put("/api/agent/login")
      .send({})
      .expect(405);

    expect(response.headers.allow).toBe("GET, POST");
    expect(response.body.allowed_methods).toEqual(["GET", "POST"]);
  });

  it.each([
    ["post", "/", ["GET"]],
    ["post", "/api", ["GET"]],
    ["post", "/api/leads/next", ["GET"]],
    ["put", "/api/agent/pause", ["GET", "POST"]],
    ["patch", "/api/agent/add-login", ["GET", "POST"]],
    ["delete", "/api/agent/add", ["GET", "POST"]],
    ["post", "/api/agent/admin/list", ["GET"]],
    ["post", "/api/agent/admin/next-id", ["GET"]],
    ["delete", "/api/agent/continue", ["GET", "POST"]],
    ["patch", "/api/leads/complete", ["GET", "POST"]],
  ] as const)(
    "returns 405 for %s %s",
    async (method, path, allowedMethods) => {
      const response = await request(app)[method](path).send({}).expect(405);

      expect(response.body.allowed_methods).toEqual(allowedMethods);
      expect(response.body.message).toContain(path);
    },
  );

  it("returns 400 for malformed JSON", async () => {
    const response = await request(app)
      .post("/api/agent/login")
      .set("Content-Type", "application/json")
      .send("{bad json")
      .expect(400);

    expect(response.body).toEqual({
      success: false,
      message: "Malformed JSON body",
    });
  });

  it("rejects invalid add-agent access code", async () => {
    const response = await request(app)
      .post("/api/agent/add-login")
      .send({ access_code: "wrong-code" })
      .expect(403);

    expect(response.body).toEqual({
      success: false,
      message: "Invalid add-agent access code",
    });
  });

  it("rejects add-agent create requests without a token", async () => {
    const response = await request(app)
      .post("/api/agent/add")
      .send({
        agent_id: "A7-999",
        name: "New Agent",
        phone: "0333-1234567",
        status: "active",
      })
      .expect(401);

    expect(response.body).toEqual({
      success: false,
      message: "Add-agent session is missing or expired",
    });
  });

  it("validates add-agent create body before contacting Supabase", async () => {
    const response = await request(app)
      .post("/api/agent/add")
      .set("Authorization", "Bearer invalid-token")
      .send({
        name: "",
        phone: "",
        status: "sleeping",
      })
      .expect(400);

    expect(response.body.errors.fieldErrors).toEqual(
      expect.objectContaining({
        name: expect.any(Array),
        phone: expect.any(Array),
        status: expect.any(Array),
      }),
    );
  });

  it.each([
    ["get", "/api/agent/admin/list", {}],
    ["get", "/api/agent/admin/next-id", {}],
    [
      "patch",
      "/api/agent/admin/A7-001",
      { name: "Ali", phone: "0333-1234567", status: "active" },
    ],
    ["delete", "/api/agent/admin/A7-001", {}],
  ] as const)("requires an add-agent token for %s %s", async (method, path, body) => {
    const response = await request(app)[method](path).send(body).expect(401);

    expect(response.body.message).toBe("Add-agent session is missing or expired");
  });

  it("validates admin edit body before contacting Supabase", async () => {
    const response = await request(app)
      .patch("/api/agent/admin/A7-001")
      .set("Authorization", "Bearer invalid-token")
      .send({
        name: "",
        phone: "",
        status: "sleeping",
      })
      .expect(400);

    expect(response.body.errors.fieldErrors).toEqual(
      expect.objectContaining({
        name: expect.any(Array),
        phone: expect.any(Array),
        status: expect.any(Array),
      }),
    );
  });

  it("returns endpoint guidance when next-lead agent_id is missing", async () => {
    const response = await request(app).get("/api/leads/next").expect(400);

    expect(response.body.message).toBe("Validation failed");
    expect(response.body.endpoint).toEqual(
      expect.objectContaining({
        method: "GET",
        path: "/api/leads/next",
      }),
    );
  });

  it("returns complete body validation details before contacting Supabase", async () => {
    const response = await request(app)
      .post("/api/leads/complete")
      .send({
        lead_id: "not-a-uuid",
        agent_id: "",
        status: "",
        notes: "",
        followup_date: "2026-02-30",
        call_duration: -1,
      })
      .expect(400);

    expect(response.body.errors.fieldErrors).toEqual(
      expect.objectContaining({
        lead_id: expect.any(Array),
        agent_id: expect.any(Array),
        followup_date: expect.any(Array),
        call_duration: expect.any(Array),
      }),
    );
  });

  it("returns 413 for JSON payloads larger than the configured limit", async () => {
    const response = await request(app)
      .post("/api/agent/login")
      .send({
        agent_id: "A7-001",
        name: "x".repeat(1024 * 1024 + 1),
      })
      .expect(413);

    expect(response.body).toEqual({
      success: false,
      message: "Request body is too large",
    });
  });

  it("returns useful route details for unknown paths", async () => {
    const response = await request(app).get("/does-not-exist").expect(404);

    expect(response.body).toEqual(
      expect.objectContaining({
        success: false,
        method: "GET",
        path: "/does-not-exist",
        api_index: "/api",
      }),
    );
  });
});
