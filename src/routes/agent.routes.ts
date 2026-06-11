import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";

import { Router, type Request, type Response } from "express";
import { z } from "zod";

import { env } from "../config/env";
import { supabase } from "../config/supabase";
import {
  methodNotAllowed,
  sendPostEndpointGuide,
} from "../middleware/http";
import { validateBody } from "../middleware/validate";

const router = Router();

const agentIdSchema = z
  .string()
  .trim()
  .min(1)
  .max(50)
  .regex(
    /^[A-Za-z0-9_-]+$/,
    "Agent ID can contain letters, numbers, hyphens, and underscores only",
  );

const phoneSchema = z
  .string()
  .trim()
  .min(7, "Phone number is required")
  .max(30)
  .regex(
    /^[0-9+\-\s()]+$/,
    "Phone can contain numbers, spaces, +, -, and parentheses only",
  );

const agentLoginSchema = z
  .object({
    agent_id: agentIdSchema,
    name: z.string().trim().min(1),
  })
  .strict();

const agentStatusSchema = z
  .object({
    agent_id: agentIdSchema,
  })
  .strict();

const addAgentAccessSchema = z
  .object({
    access_code: z.string().trim().min(1),
  })
  .strict();

const createAgentSchema = z
  .object({
    agent_id: agentIdSchema.optional(),
    name: z.string().trim().min(1).max(100),
    phone: phoneSchema,
    status: z.enum(["active", "paused", "inactive"]).default("active"),
  })
  .strict();

const updateAgentSchema = z
  .object({
    name: z.string().trim().min(1).max(100),
    phone: phoneSchema,
    status: z.enum(["active", "paused", "inactive"]),
  })
  .strict();

const adminSearchSchema = z.object({
  search: z.string().trim().max(100).optional(),
});

interface AddAgentTokenPayload {
  scope: "add-agent";
  exp: number;
}

const addAgentTokenTtlMs = 15 * 60 * 1000;

const signAddAgentValue = (value: string): string =>
  createHmac("sha256", env.ADD_AGENT_ACCESS_CODE).update(value).digest("base64url");

const createAddAgentToken = (): string => {
  const payload: AddAgentTokenPayload = {
    scope: "add-agent",
    exp: Date.now() + addAgentTokenTtlMs,
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload), "utf8").toString(
    "base64url",
  );

  return `${encodedPayload}.${signAddAgentValue(encodedPayload)}`;
};

const verifyAddAgentToken = (token: string | undefined): boolean => {
  if (!token) {
    return false;
  }

  const [encodedPayload, signature] = token.split(".");

  if (!encodedPayload || !signature) {
    return false;
  }

  const expectedSignature = signAddAgentValue(encodedPayload);
  const providedBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (
    providedBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(providedBuffer, expectedBuffer)
  ) {
    return false;
  }

  try {
    const payload = JSON.parse(
      Buffer.from(encodedPayload, "base64url").toString("utf8"),
    ) as AddAgentTokenPayload;

    return payload.scope === "add-agent" && payload.exp > Date.now();
  } catch {
    return false;
  }
};

const getBearerToken = (authorizationHeader: string | undefined): string | undefined => {
  if (!authorizationHeader?.startsWith("Bearer ")) {
    return undefined;
  }

  return authorizationHeader.slice("Bearer ".length).trim();
};

const hasValidAddAgentSession = (req: Request): boolean =>
  verifyAddAgentToken(getBearerToken(req.header("Authorization")));

const sendMissingAdminSession = (res: Response): Response =>
  res.status(401).json({
    success: false,
    message: "Add-agent session is missing or expired",
  });

const isMissingPhoneColumnError = (error: { message?: string } | null): boolean =>
  Boolean(
    error?.message?.toLowerCase().includes("phone") &&
      error.message.toLowerCase().includes("column"),
  );

const getNextAgentIdFromValues = (agentIds: string[]): string => {
  const maxNumber = agentIds.reduce((max, agentId) => {
    const match = /^A7-(\d+)$/i.exec(agentId);

    if (!match) {
      return max;
    }

    return Math.max(max, Number(match[1]));
  }, 0);

  return `A7-${String(maxNumber + 1).padStart(3, "0")}`;
};

const fetchNextAgentId = async (): Promise<{
  error: unknown;
  nextAgentId: string | null;
}> => {
  const { data, error } = await supabase.from("agents").select("agent_id");

  if (error) {
    return { error, nextAgentId: null };
  }

  return {
    error: null,
    nextAgentId: getNextAgentIdFromValues(
      data.map((agent: any) => agent.agent_id).filter(Boolean),
    ),
  };
};

router.get("/login", (_req, res) => {
  return sendPostEndpointGuide(res, "/api/agent/login");
});

router.post("/login", validateBody(agentLoginSchema), async (req, res) => {
  const { agent_id, name } = agentLoginSchema.parse(req.body);

  const { data: agent, error } = await supabase
    .from("agents")
    .select("*")
    .eq("agent_id", agent_id)
    .eq("name", name)
    .maybeSingle();

  if (error) {
    console.error("Agent login lookup failed:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to verify agent",
    });
  }

  if (!agent) {
    return res.status(404).json({
      success: false,
      message: "Agent not found",
    });
  }

  if (agent.status !== "active") {
    return res.status(403).json({
      success: false,
      message: "Agent is paused or inactive",
    });
  }

  return res.json({
    success: true,
    agent,
  });
});

router.get("/add-login", (_req, res) => {
  return sendPostEndpointGuide(res, "/api/agent/add-login");
});

router.post(
  "/add-login",
  validateBody(addAgentAccessSchema),
  async (req, res) => {
    const { access_code } = addAgentAccessSchema.parse(req.body);

    if (access_code !== env.ADD_AGENT_ACCESS_CODE) {
      return res.status(403).json({
        success: false,
        message: "Invalid add-agent access code",
      });
    }

    return res.json({
      success: true,
      token: createAddAgentToken(),
      expires_in_seconds: Math.floor(addAgentTokenTtlMs / 1000),
    });
  },
);

router.get("/add", (_req, res) => {
  return sendPostEndpointGuide(res, "/api/agent/add");
});

router.post("/add", validateBody(createAgentSchema), async (req, res) => {
  if (!hasValidAddAgentSession(req)) {
    return sendMissingAdminSession(res);
  }

  const { agent_id: providedAgentId, name, phone, status } =
    createAgentSchema.parse(req.body);

  const agent_id = providedAgentId ?? (await fetchNextAgentId()).nextAgentId;

  if (!agent_id) {
    return res.status(500).json({
      success: false,
      message: "Unable to generate next agent ID",
    });
  }

  const { data: existingAgent, error: lookupError } = await supabase
    .from("agents")
    .select("id")
    .eq("agent_id", agent_id)
    .maybeSingle();

  if (lookupError) {
    console.error("Agent create lookup failed:", lookupError);
    return res.status(500).json({
      success: false,
      message: "Unable to check existing agent",
    });
  }

  if (existingAgent) {
    return res.status(409).json({
      success: false,
      message: "Agent ID already exists",
    });
  }

  const { data: agent, error: insertError } = await supabase
    .from("agents")
    .insert({
      id: randomUUID(),
      agent_id,
      name,
      phone,
      status,
      created_at: new Date().toISOString(),
    })
    .select("*")
    .single();

  if (insertError) {
    if (isMissingPhoneColumnError(insertError)) {
      const { data: fallbackAgent, error: fallbackInsertError } = await supabase
        .from("agents")
        .insert({
          id: randomUUID(),
          agent_id,
          name,
          status,
          created_at: new Date().toISOString(),
        })
        .select("*")
        .single();

      if (!fallbackInsertError && fallbackAgent) {
        return res.status(201).json({
          success: true,
          agent: {
            ...fallbackAgent,
            phone,
          },
          warning:
            "Agent created, but phone was not persisted because agents.phone column is missing.",
        });
      }
    }

    console.error("Agent create insert failed:", insertError);
    return res.status(500).json({
      success: false,
      message: "Unable to create agent",
    });
  }

  return res.status(201).json({
    success: true,
    agent,
  });
});

router.get("/admin/list", async (req, res) => {
  if (!hasValidAddAgentSession(req)) {
    return sendMissingAdminSession(res);
  }

  const parsedQuery = adminSearchSchema.safeParse(req.query);

  if (!parsedQuery.success) {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: parsedQuery.error.flatten(),
    });
  }

  const { search } = parsedQuery.data;
  const query = supabase
    .from("agents")
    .select("*")
    .order("created_at", { ascending: false });

  const { data: agents, error } = await query;

  if (error) {
    console.error("Agent admin list failed:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to list agents",
    });
  }

  const { nextAgentId } = await fetchNextAgentId();
  const normalizedSearch = search?.toLowerCase();
  const filteredAgents = normalizedSearch
    ? agents.filter(
        (agent: any) =>
          agent.agent_id.toLowerCase().includes(normalizedSearch) ||
          agent.name.toLowerCase().includes(normalizedSearch),
      )
    : agents;

  return res.json({
    success: true,
    agents: filteredAgents,
    next_agent_id: nextAgentId,
  });
});

router.get("/admin/next-id", async (req, res) => {
  if (!hasValidAddAgentSession(req)) {
    return sendMissingAdminSession(res);
  }

  const { error, nextAgentId } = await fetchNextAgentId();

  if (error || !nextAgentId) {
    console.error("Agent next-id lookup failed:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to generate next agent ID",
    });
  }

  return res.json({
    success: true,
    next_agent_id: nextAgentId,
  });
});

router.patch(
  "/admin/:agent_id",
  validateBody(updateAgentSchema),
  async (req, res) => {
    if (!hasValidAddAgentSession(req)) {
      return sendMissingAdminSession(res);
    }

    const agentIdResult = agentIdSchema.safeParse(req.params.agent_id);

    if (!agentIdResult.success) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: agentIdResult.error.flatten(),
      });
    }

    const { name, phone, status } = updateAgentSchema.parse(req.body);
    const { data: agent, error } = await supabase
      .from("agents")
      .update({ name, phone, status })
      .eq("agent_id", agentIdResult.data)
      .select("*")
      .maybeSingle();

    if (error) {
      if (isMissingPhoneColumnError(error)) {
        const { data: fallbackAgent, error: fallbackUpdateError } =
          await supabase
            .from("agents")
            .update({ name, status })
            .eq("agent_id", agentIdResult.data)
            .select("*")
            .maybeSingle();

        if (!fallbackUpdateError && fallbackAgent) {
          return res.json({
            success: true,
            agent: {
              ...fallbackAgent,
              phone,
            },
            warning:
              "Agent updated, but phone was not persisted because agents.phone column is missing.",
          });
        }
      }

      console.error("Agent admin update failed:", error);
      return res.status(500).json({
        success: false,
        message: "Unable to update agent",
      });
    }

    if (!agent) {
      return res.status(404).json({
        success: false,
        message: "Agent not found",
      });
    }

    return res.json({
      success: true,
      agent,
    });
  },
);

router.delete("/admin/:agent_id", async (req, res) => {
  if (!hasValidAddAgentSession(req)) {
    return sendMissingAdminSession(res);
  }

  const agentIdResult = agentIdSchema.safeParse(req.params.agent_id);

  if (!agentIdResult.success) {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: agentIdResult.error.flatten(),
    });
  }

  const { data: agent, error } = await supabase
    .from("agents")
    .delete()
    .eq("agent_id", agentIdResult.data)
    .select("*")
    .maybeSingle();

  if (error) {
    console.error("Agent admin delete failed:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to delete agent",
    });
  }

  if (!agent) {
    return res.status(404).json({
      success: false,
      message: "Agent not found",
    });
  }

  return res.json({
    success: true,
    agent,
  });
});

const updateAgentStatus =
  (status: "active" | "paused") => async (req: Request, res: Response) => {
    const { agent_id } = agentStatusSchema.parse(req.body);

    const { data: agent, error } = await supabase
      .from("agents")
      .update({ status })
      .eq("agent_id", agent_id)
      .select("*")
      .maybeSingle();

    if (error) {
      console.error(`Agent ${status} update failed:`, error);
      return res.status(500).json({
        success: false,
        message: "Unable to update agent status",
      });
    }

    if (!agent) {
      return res.status(404).json({
        success: false,
        message: "Agent not found",
      });
    }

    return res.json({
      success: true,
      agent,
    });
  };

router.post("/pause", validateBody(agentStatusSchema), updateAgentStatus("paused"));
router.post(
  "/continue",
  validateBody(agentStatusSchema),
  updateAgentStatus("active"),
);

router.get("/pause", (_req, res) =>
  sendPostEndpointGuide(res, "/api/agent/pause"),
);
router.get("/continue", (_req, res) =>
  sendPostEndpointGuide(res, "/api/agent/continue"),
);

router.all("/login", methodNotAllowed(["GET", "POST"]));
router.all("/add-login", methodNotAllowed(["GET", "POST"]));
router.all("/add", methodNotAllowed(["GET", "POST"]));
router.all("/admin/list", methodNotAllowed(["GET"]));
router.all("/admin/next-id", methodNotAllowed(["GET"]));
router.all("/admin/:agent_id", methodNotAllowed(["PATCH", "DELETE"]));
router.all("/pause", methodNotAllowed(["GET", "POST"]));
router.all("/continue", methodNotAllowed(["GET", "POST"]));

export default router;
