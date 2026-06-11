export interface ApiEndpoint {
  method: "DELETE" | "GET" | "PATCH" | "POST";
  path: string;
  description: string;
  query?: Record<string, string>;
  body?: Record<string, unknown>;
}

export const apiEndpoints: ApiEndpoint[] = [
  {
    method: "GET",
    path: "/",
    description: "Check whether the backend is running.",
  },
  {
    method: "POST",
    path: "/api/agent/login",
    description: "Verify that an agent exists and is active.",
    body: {
      agent_id: "A7-001",
      name: "Ali",
    },
  },
  {
    method: "POST",
    path: "/api/agent/add-login",
    description: "Start an add-agent session with the backend access code.",
    body: {
      access_code: "A7-ADMIN-2026",
    },
  },
  {
    method: "POST",
    path: "/api/agent/add",
    description: "Create a new calling CRM agent with an auto-generated ID.",
    body: {
      name: "Sara",
      phone: "0333-1234567",
      status: "active",
    },
  },
  {
    method: "GET",
    path: "/api/agent/admin/list",
    description: "List agents for the admin panel, optionally filtered by search.",
    query: {
      search: "A7-001",
    },
  },
  {
    method: "GET",
    path: "/api/agent/admin/next-id",
    description: "Return the next auto-generated agent ID.",
  },
  {
    method: "PATCH",
    path: "/api/agent/admin/:agent_id",
    description: "Edit an agent's name, phone, or status.",
    body: {
      name: "Sara",
      phone: "0333-1234567",
      status: "active",
    },
  },
  {
    method: "DELETE",
    path: "/api/agent/admin/:agent_id",
    description: "Delete an agent by agent ID.",
  },
  {
    method: "GET",
    path: "/api/leads/next",
    description:
      "Claim the oldest new or pending lead assigned to an agent.",
    query: {
      agent_id: "A7-001",
    },
  },
  {
    method: "POST",
    path: "/api/leads/complete",
    description: "Complete a lead and create its call log.",
    body: {
      lead_id: "00000000-0000-4000-8000-000000000000",
      agent_id: "A7-001",
      status: "follow_up",
      notes: "Client is interested",
      followup_date: "2026-06-15",
      call_duration: 120,
    },
  },
  {
    method: "POST",
    path: "/api/agent/pause",
    description: "Change an agent's status to paused.",
    body: {
      agent_id: "A7-001",
    },
  },
  {
    method: "POST",
    path: "/api/agent/continue",
    description: "Change an agent's status to active.",
    body: {
      agent_id: "A7-001",
    },
  },
];

export const findApiEndpoint = (
  method: ApiEndpoint["method"],
  path: string,
): ApiEndpoint | undefined =>
  apiEndpoints.find(
    (endpoint) => endpoint.method === method && endpoint.path === path,
  );
