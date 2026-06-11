import { Router } from "express";
import { z } from "zod";

import { findApiEndpoint } from "../config/api";
import { supabase } from "../config/supabase";
import {
  methodNotAllowed,
  sendPostEndpointGuide,
} from "../middleware/http";
import { validateBody } from "../middleware/validate";

const router = Router();
const eligibleLeadStatuses = ["new", "pending"] as const;
const maxClaimAttempts = 5;

const nextLeadQuerySchema = z.object({
  agent_id: z.string().trim().min(1),
});

const isoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Expected date in YYYY-MM-DD format")
  .refine(
    (value) => {
      const date = new Date(`${value}T00:00:00Z`);
      return (
        !Number.isNaN(date.getTime()) &&
        date.toISOString().slice(0, 10) === value
      );
    },
    "Invalid date",
  );

const completeLeadSchema = z
  .object({
    lead_id: z.string().uuid(),
    agent_id: z.string().trim().min(1),
    status: z.string().trim().min(1),
    notes: z.string().trim().min(1),
    followup_date: isoDateSchema.nullable().optional(),
    call_duration: z.number().int().nonnegative(),
  })
  .strict();

router.get("/next", async (req, res) => {
  const parsedQuery = nextLeadQuerySchema.safeParse(req.query);

  if (!parsedQuery.success) {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: parsedQuery.error.flatten(),
      endpoint: findApiEndpoint("GET", "/api/leads/next"),
    });
  }

  const { agent_id } = parsedQuery.data;

  for (let attempt = 0; attempt < maxClaimAttempts; attempt += 1) {
    const { data: candidate, error: findError } = await supabase
      .from("leads")
      .select("*")
      .eq("assigned_agent_id", agent_id)
      .in("status", eligibleLeadStatuses)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (findError) {
      console.error("Next lead lookup failed:", findError);
      return res.status(500).json({
        success: false,
        message: "Unable to fetch next lead",
      });
    }

    if (!candidate) {
      return res.json({
        success: true,
        message: "No lead available",
        lead: null,
      });
    }

    const { data: claimedLead, error: claimError } = await supabase
      .from("leads")
      .update({ status: "in_progress" })
      .eq("id", candidate.id)
      .eq("assigned_agent_id", agent_id)
      .in("status", eligibleLeadStatuses)
      .select("*")
      .maybeSingle();

    if (claimError) {
      console.error("Lead claim failed:", claimError);
      return res.status(500).json({
        success: false,
        message: "Unable to claim next lead",
      });
    }

    if (claimedLead) {
      return res.json({
        success: true,
        lead: claimedLead,
      });
    }
  }

  return res.status(409).json({
    success: false,
    message: "Lead assignment changed during request. Please retry.",
  });
});

router.get("/complete", (_req, res) =>
  sendPostEndpointGuide(res, "/api/leads/complete"),
);

router.post("/complete", validateBody(completeLeadSchema), async (req, res) => {
  const {
    lead_id,
    agent_id,
    status,
    notes,
    followup_date = null,
    call_duration,
  } = completeLeadSchema.parse(req.body);

  const { data: currentLead, error: lookupError } = await supabase
    .from("leads")
    .select("*")
    .eq("id", lead_id)
    .eq("assigned_agent_id", agent_id)
    .maybeSingle();

  if (lookupError) {
    console.error("Lead lookup failed:", lookupError);
    return res.status(500).json({
      success: false,
      message: "Unable to find lead",
    });
  }

  if (!currentLead) {
    return res.status(404).json({
      success: false,
      message: "Lead not found or not assigned to this agent",
    });
  }

  const { data: updatedLead, error: updateError } = await supabase
    .from("leads")
    .update({
      status,
      notes,
      followup_date,
    })
    .eq("id", lead_id)
    .eq("assigned_agent_id", agent_id)
    .select("*")
    .single();

  if (updateError) {
    console.error("Lead completion update failed:", updateError);
    return res.status(500).json({
      success: false,
      message: "Unable to update lead",
    });
  }

  const { data: callLog, error: callLogError } = await supabase
    .from("call_logs")
    .insert({
      lead_id,
      agent_id,
      call_status: status,
      call_summary: notes,
      call_duration,
    })
    .select("*")
    .single();

  if (callLogError) {
    console.error("Call log insertion failed:", callLogError);

    const { error: rollbackError } = await supabase
      .from("leads")
      .update({
        status: currentLead.status,
        notes: currentLead.notes,
        followup_date: currentLead.followup_date,
      })
      .eq("id", lead_id);

    if (rollbackError) {
      console.error("Lead rollback failed:", rollbackError);
    }

    return res.status(500).json({
      success: false,
      message: "Unable to create call log",
    });
  }

  return res.json({
    success: true,
    lead: updatedLead,
    call_log: callLog,
  });
});

router.all("/next", methodNotAllowed(["GET"]));
router.all("/complete", methodNotAllowed(["GET", "POST"]));

export default router;
