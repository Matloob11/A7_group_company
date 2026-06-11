import { type FormEvent, useCallback, useEffect, useState } from "react";

import {
  createAgent,
  deleteAdminAgent,
  getApiErrorMessage,
  getNextAgentId,
  listAdminAgents,
  updateAdminAgent,
  type Agent,
  type CreateAgentPayload,
} from "../api/client";

interface AdminAgentPanelProps {
  token: string;
  onBackToLogin: () => void;
}

const emptyForm: CreateAgentPayload = {
  name: "",
  phone: "",
  status: "active",
};

export const AdminAgentPanel = ({
  token,
  onBackToLogin,
}: AdminAgentPanelProps) => {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [search, setSearch] = useState("");
  const [nextAgentId, setNextAgentId] = useState("");
  const [form, setForm] = useState<CreateAgentPayload>(emptyForm);
  const [editingAgentId, setEditingAgentId] = useState<string | null>(null);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const selectedAgent =
    agents.find((agent) => agent.agent_id === selectedAgentId) ?? null;
  const isEditing = editingAgentId !== null;

  const loadAgents = useCallback(
    async (searchText = search) => {
      setIsLoading(true);
      setError("");

      try {
        const [agentList, generatedAgentId] = await Promise.all([
          listAdminAgents(token, searchText.trim()),
          getNextAgentId(token),
        ]);

        setAgents(agentList.agents);
        setNextAgentId(agentList.next_agent_id ?? generatedAgentId);
      } catch (requestError) {
        setError(
          getApiErrorMessage(requestError, "Unable to load admin agents."),
        );
      } finally {
        setIsLoading(false);
      }
    },
    [search, token],
  );

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void loadAgents(search);
    }, 250);

    return () => window.clearTimeout(timeout);
  }, [loadAgents, search]);

  const resetForm = () => {
    setForm(emptyForm);
    setEditingAgentId(null);
    setSelectedAgentId(null);
  };

  const selectAgent = (agent: Agent) => {
    setSelectedAgentId(agent.agent_id);
    setEditingAgentId(agent.agent_id);
    setForm({
      name: agent.name,
      phone: agent.phone ?? "",
      status: agent.status as CreateAgentPayload["status"],
    });
    setMessage("");
    setError("");
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);
    setError("");
    setMessage("");

    try {
      const payload = {
        name: form.name.trim(),
        phone: form.phone.trim(),
        status: form.status,
      };

      const savedAgent = isEditing
        ? await updateAdminAgent(editingAgentId, payload, token)
        : await createAgent(payload, token);

      setMessage(
        isEditing
          ? `Agent ${savedAgent.agent_id} updated.`
          : `Agent ${savedAgent.agent_id} - ${savedAgent.name} added successfully.`,
      );
      setSelectedAgentId(savedAgent.agent_id);
      setEditingAgentId(savedAgent.agent_id);
      setForm({
        name: savedAgent.name,
        phone: savedAgent.phone ?? payload.phone,
        status: savedAgent.status as CreateAgentPayload["status"],
      });
      await loadAgents(search);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Unable to save agent."));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!editingAgentId) {
      return;
    }

    const confirmed = window.confirm(
      `Delete agent ${editingAgentId}? This cannot be undone.`,
    );

    if (!confirmed) {
      return;
    }

    setIsSaving(true);
    setError("");
    setMessage("");

    try {
      const deletedAgent = await deleteAdminAgent(editingAgentId, token);
      setMessage(`Agent ${deletedAgent.agent_id} deleted.`);
      resetForm();
      await loadAgents(search);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Unable to delete agent."));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <main className="admin-page">
      <section className="admin-shell" aria-labelledby="admin-title">
        <aside className="admin-sidebar">
          <div className="admin-sidebar-header">
            <div className="brand-mark brand-mark-small">A7</div>
            <div>
              <h1 id="admin-title">Agent Admin</h1>
              <p>{agents.length} agents shown</p>
            </div>
          </div>

          <label htmlFor="agent-search">Search Agents</label>
          <input
            id="agent-search"
            value={search}
            placeholder="Search by name or ID"
            onChange={(event) => setSearch(event.target.value)}
          />

          <div className="admin-sidebar-actions">
            <button
              type="button"
              className="button button-secondary button-full"
              onClick={() => loadAgents(search)}
              disabled={isLoading}
            >
              {isLoading ? "Refreshing..." : "Refresh List"}
            </button>
            <button
              type="button"
              className="button button-primary button-full"
              onClick={resetForm}
              disabled={isSaving}
            >
              New Agent
            </button>
          </div>

          <div className="agent-list" aria-label="All agents">
            {agents.map((agent) => (
              <button
                type="button"
                key={agent.id}
                className={`agent-list-item ${
                  selectedAgentId === agent.agent_id ? "selected" : ""
                }`}
                onClick={() => selectAgent(agent)}
              >
                <span>
                  <strong>{agent.name}</strong>
                  <small>{agent.agent_id}</small>
                </span>
                <em>{agent.status}</em>
              </button>
            ))}

            {!isLoading && agents.length === 0 ? (
              <div className="admin-empty">No agents found.</div>
            ) : null}
          </div>
        </aside>

        <section className="admin-content">
          <div className="admin-content-header">
            <div>
              <p className="section-label">Admin panel</p>
              <h2>{isEditing ? "Edit Agent" : "Create New Agent"}</h2>
            </div>
            <button
              type="button"
              className="button button-secondary"
              onClick={onBackToLogin}
              disabled={isSaving}
            >
              Back to Login
            </button>
          </div>

          {message ? (
            <div className="alert alert-success" role="status">
              {message}
            </div>
          ) : null}
          {error ? (
            <div className="alert alert-error" role="alert">
              {error}
            </div>
          ) : null}

          <div className="agent-summary">
            <span>Next Agent ID</span>
            <strong>{isEditing ? editingAgentId : nextAgentId || "Loading..."}</strong>
          </div>

          <form className="admin-form" onSubmit={handleSubmit}>
            <label htmlFor="admin-agent-id">Agent ID</label>
            <input
              id="admin-agent-id"
              value={isEditing ? editingAgentId ?? "" : nextAgentId}
              readOnly
              aria-readonly="true"
            />

            <label htmlFor="admin-agent-name">Name</label>
            <input
              id="admin-agent-name"
              placeholder="Enter agent name"
              value={form.name}
              onChange={(event) =>
                setForm((current) => ({ ...current, name: event.target.value }))
              }
              required
            />

            <label htmlFor="admin-agent-phone">Phone Number</label>
            <input
              id="admin-agent-phone"
              type="tel"
              placeholder="0333-1234567"
              value={form.phone}
              onChange={(event) =>
                setForm((current) => ({ ...current, phone: event.target.value }))
              }
              required
            />

            <label htmlFor="admin-agent-status">Status</label>
            <select
              id="admin-agent-status"
              value={form.status}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  status: event.target.value as CreateAgentPayload["status"],
                }))
              }
            >
              <option value="active">active</option>
              <option value="paused">paused</option>
              <option value="inactive">inactive</option>
            </select>

            <div className="admin-form-actions">
              <button
                type="submit"
                className="button button-primary"
                disabled={isSaving}
              >
                {isSaving
                  ? "Saving..."
                  : isEditing
                    ? "Update Agent"
                    : "Add Agent"}
              </button>
              {isEditing ? (
                <button
                  type="button"
                  className="button button-danger"
                  onClick={handleDelete}
                  disabled={isSaving}
                >
                  Delete Agent
                </button>
              ) : null}
            </div>
          </form>

          {selectedAgent ? (
            <div className="selected-agent-card">
              <span>Selected Agent</span>
              <strong>
                {selectedAgent.agent_id} - {selectedAgent.name}
              </strong>
              <p>{selectedAgent.phone || "No phone saved yet"}</p>
            </div>
          ) : null}
        </section>
      </section>
    </main>
  );
};
