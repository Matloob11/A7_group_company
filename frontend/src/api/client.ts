import axios, { AxiosError } from "axios";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "") ??
  "http://localhost:5000";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
  timeout: 15000,
});

export interface Agent {
  id: string;
  agent_id: string;
  name: string;
  phone?: string | null;
  status: string;
  created_at: string;
}

export interface Lead {
  id: string;
  lead_name: string;
  phone: string;
  source: string;
  assigned_agent_id: string;
  status: string;
  project_interest: string;
  lead_score: number;
  followup_date: string | null;
  notes: string | null;
  created_at: string;
}

interface LoginResponse {
  success: true;
  agent: Agent;
}

interface AgentStatusResponse {
  success: true;
  agent: Agent;
}

interface AddAgentLoginResponse {
  success: true;
  token: string;
  expires_in_seconds: number;
}

export interface CreateAgentPayload {
  name: string;
  phone: string;
  status: "active" | "paused" | "inactive";
}

interface CreateAgentResponse {
  success: true;
  agent: Agent;
  warning?: string;
}

interface AdminAgentListResponse {
  success: true;
  agents: Agent[];
  next_agent_id: string | null;
}

interface NextAgentIdResponse {
  success: true;
  next_agent_id: string;
}

interface NextLeadResponse {
  success: true;
  message?: string;
  lead: Lead | null;
}

export interface CompleteCallPayload {
  lead_id: string;
  agent_id: string;
  status:
    | "follow_up"
    | "interested"
    | "not_interested"
    | "no_answer"
    | "converted";
  notes: string;
  followup_date: string | null;
  call_duration: number;
}

interface CompleteCallResponse {
  success: true;
  lead: Lead;
  call_log: {
    id: string;
    lead_id: string;
    agent_id: string;
    call_status: string;
    call_summary: string | null;
    call_duration: number;
    created_at: string;
  };
}

interface ApiErrorBody {
  message?: string;
  errors?: {
    fieldErrors?: Record<string, string[]>;
    formErrors?: string[];
  };
}

export const getApiErrorMessage = (
  error: unknown,
  fallback: string,
): string => {
  if (!axios.isAxiosError<ApiErrorBody>(error)) {
    return fallback;
  }

  const axiosError = error as AxiosError<ApiErrorBody>;
  const body = axiosError.response?.data;
  const fieldMessage = body?.errors?.fieldErrors
    ? Object.values(body.errors.fieldErrors).flat()[0]
    : undefined;

  if (!axiosError.response) {
    return "Cannot reach the backend. Make sure it is running on port 5000.";
  }

  return fieldMessage ?? body?.message ?? fallback;
};

export const loginAgent = async (
  agentId: string,
  name: string,
): Promise<Agent> => {
  const { data } = await api.post<LoginResponse>("/api/agent/login", {
    agent_id: agentId,
    name,
  });

  return data.agent;
};

export const updateAgentStatus = async (
  agentId: string,
  action: "pause" | "continue",
): Promise<Agent> => {
  const { data } = await api.post<AgentStatusResponse>(
    `/api/agent/${action}`,
    { agent_id: agentId },
  );

  return data.agent;
};

export const loginAddAgentAccess = async (
  accessCode: string,
): Promise<string> => {
  const { data } = await api.post<AddAgentLoginResponse>(
    "/api/agent/add-login",
    { access_code: accessCode },
  );

  return data.token;
};

export const createAgent = async (
  payload: CreateAgentPayload,
  token: string,
): Promise<Agent> => {
  const { data } = await api.post<CreateAgentResponse>(
    "/api/agent/add",
    payload,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );

  return data.agent;
};

export const listAdminAgents = async (
  token: string,
  search = "",
): Promise<AdminAgentListResponse> => {
  const { data } = await api.get<AdminAgentListResponse>(
    "/api/agent/admin/list",
    {
      params: search ? { search } : undefined,
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );

  return data;
};

export const getNextAgentId = async (token: string): Promise<string> => {
  const { data } = await api.get<NextAgentIdResponse>(
    "/api/agent/admin/next-id",
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );

  return data.next_agent_id;
};

export const updateAdminAgent = async (
  agentId: string,
  payload: CreateAgentPayload,
  token: string,
): Promise<Agent> => {
  const { data } = await api.patch<CreateAgentResponse>(
    `/api/agent/admin/${encodeURIComponent(agentId)}`,
    payload,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );

  return data.agent;
};

export const deleteAdminAgent = async (
  agentId: string,
  token: string,
): Promise<Agent> => {
  const { data } = await api.delete<CreateAgentResponse>(
    `/api/agent/admin/${encodeURIComponent(agentId)}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );

  return data.agent;
};

export const fetchNextLead = async (
  agentId: string,
): Promise<NextLeadResponse> => {
  const { data } = await api.get<NextLeadResponse>("/api/leads/next", {
    params: { agent_id: agentId },
  });

  return data;
};

export const completeLead = async (
  payload: CompleteCallPayload,
): Promise<CompleteCallResponse> => {
  const { data } = await api.post<CompleteCallResponse>(
    "/api/leads/complete",
    payload,
  );

  return data;
};
