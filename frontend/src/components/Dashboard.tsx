import { type FormEvent, useState } from "react";

import {
  completeLead,
  fetchNextLead,
  getApiErrorMessage,
  updateAgentStatus,
  type Agent,
  type CompleteCallPayload,
  type Lead,
} from "../api/client";
import {
  CheckIcon,
  InfoIcon,
  LogoutIcon,
  PauseIcon,
  PhoneIcon,
  PlayIcon,
} from "./Icons";

const callStatuses: CompleteCallPayload["status"][] = [
  "follow_up",
  "interested",
  "not_interested",
  "no_answer",
  "converted",
];

interface DashboardProps {
  agent: Agent;
  currentLead: Lead | null;
  onAgentChange: (agent: Agent) => void;
  onLeadChange: (lead: Lead | null) => void;
  onLogout: () => void;
}

interface CallFormState {
  status: CompleteCallPayload["status"];
  notes: string;
  followupDate: string;
  callDuration: string;
}

const initialCallForm: CallFormState = {
  status: "follow_up",
  notes: "",
  followupDate: "",
  callDuration: "",
};

export const Dashboard = ({
  agent,
  currentLead,
  onAgentChange,
  onLeadChange,
  onLogout,
}: DashboardProps) => {
  const [form, setForm] = useState<CallFormState>(initialCallForm);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [pendingAction, setPendingAction] = useState<
    "lead" | "pause" | "continue" | "complete" | null
  >(null);

  const isBusy = pendingAction !== null;

  const resetFeedback = () => {
    setMessage("");
    setError("");
  };

  const handleStatusAction = async (action: "pause" | "continue") => {
    resetFeedback();
    setPendingAction(action);

    try {
      const updatedAgent = await updateAgentStatus(agent.agent_id, action);
      onAgentChange(updatedAgent);
      setMessage(
        action === "pause"
          ? "Calling has been paused."
          : "Agent is active and ready for calls.",
      );
    } catch (requestError) {
      setError(
        getApiErrorMessage(requestError, `Unable to ${action} the agent.`),
      );
    } finally {
      setPendingAction(null);
    }
  };

  const handleGetNextLead = async () => {
    resetFeedback();
    setPendingAction("lead");

    try {
      const response = await fetchNextLead(agent.agent_id);
      onLeadChange(response.lead);
      setForm(initialCallForm);
      setMessage(
        response.lead
          ? `Lead assigned: ${response.lead.lead_name}`
          : response.message ?? "No lead available",
      );
    } catch (requestError) {
      setError(
        getApiErrorMessage(requestError, "Unable to fetch the next lead."),
      );
    } finally {
      setPendingAction(null);
    }
  };

  const handleCompleteCall = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!currentLead) {
      setError("Get a lead before completing a call.");
      return;
    }

    resetFeedback();
    setPendingAction("complete");

    try {
      await completeLead({
        lead_id: currentLead.id,
        agent_id: agent.agent_id,
        status: form.status,
        notes: form.notes.trim(),
        followup_date: form.followupDate || null,
        call_duration: Number(form.callDuration),
      });

      onLeadChange(null);
      setForm(initialCallForm);
      setMessage("Call completed and saved successfully.");
    } catch (requestError) {
      setError(
        getApiErrorMessage(requestError, "Unable to complete the call."),
      );
    } finally {
      setPendingAction(null);
    }
  };

  return (
    <main className="app-shell">
      <header className="app-header">
        <div className="header-brand">
          <div className="brand-mark brand-mark-small">A7</div>
          <div>
            <h1>A7 Group Calling CRM</h1>
            <p>Agent calling workspace</p>
          </div>
        </div>

        <div className="header-actions">
          <div className="agent-identity">
            <span>
              Agent <strong>{agent.name}</strong>
            </span>
            <span className="identity-divider" aria-hidden="true" />
            <span>{agent.agent_id}</span>
            <span className={`status-dot status-${agent.status}`}>
              {agent.status}
            </span>
          </div>

          <button
            type="button"
            className="button button-warning"
            onClick={() => handleStatusAction("pause")}
            disabled={isBusy || agent.status === "paused"}
          >
            <PauseIcon />
            {pendingAction === "pause" ? "Pausing..." : "Pause"}
          </button>
          <button
            type="button"
            className="button button-primary"
            onClick={() => handleStatusAction("continue")}
            disabled={isBusy || agent.status === "active"}
          >
            <PlayIcon />
            {pendingAction === "continue" ? "Continuing..." : "Continue"}
          </button>
          <button
            type="button"
            className="button button-secondary"
            onClick={onLogout}
            disabled={isBusy}
          >
            <LogoutIcon />
            Logout
          </button>
        </div>
      </header>

      <section className="dashboard" aria-label="Calling dashboard">
        <section className="panel lead-panel">
          <div className="panel-heading">
            <div>
              <p className="section-label">Lead queue</p>
              <h2>Current Lead</h2>
            </div>
            <button
              type="button"
              className="button button-primary"
              onClick={handleGetNextLead}
              disabled={isBusy || agent.status !== "active" || !!currentLead}
            >
              <PhoneIcon />
              {pendingAction === "lead" ? "Fetching..." : "Get Next Lead"}
            </button>
          </div>

          {currentLead ? (
            <div className="lead-card">
              <div className="lead-card-header">
                <div>
                  <p className="lead-kicker">Assigned contact</p>
                  <h3>{currentLead.lead_name}</h3>
                </div>
                <span className="lead-status">{currentLead.status}</span>
              </div>

              <dl className="lead-details">
                <div>
                  <dt>Phone</dt>
                  <dd>
                    <a href={`tel:${currentLead.phone}`}>
                      {currentLead.phone}
                    </a>
                  </dd>
                </div>
                <div>
                  <dt>Source</dt>
                  <dd>{currentLead.source || "Not provided"}</dd>
                </div>
                <div>
                  <dt>Project Interest</dt>
                  <dd>{currentLead.project_interest || "Not provided"}</dd>
                </div>
                <div>
                  <dt>Lead Score</dt>
                  <dd className="lead-score">{currentLead.lead_score}</dd>
                </div>
                <div className="detail-wide">
                  <dt>Notes</dt>
                  <dd>{currentLead.notes || "No notes available"}</dd>
                </div>
              </dl>
            </div>
          ) : (
            <div className="empty-state">
              <InfoIcon />
              <div>
                <h3>No active lead</h3>
                <p>
                  {agent.status === "active"
                    ? 'Click "Get Next Lead" to claim the oldest available lead.'
                    : "Continue the agent before requesting another lead."}
                </p>
              </div>
            </div>
          )}

          {message ? (
            <div className="alert alert-success" role="status">
              <CheckIcon />
              {message}
            </div>
          ) : null}
          {error ? (
            <div className="alert alert-error" role="alert">
              {error}
            </div>
          ) : null}
        </section>

        <section className="panel call-panel">
          <div className="panel-heading">
            <div>
              <p className="section-label">Call outcome</p>
              <h2>Complete Call</h2>
            </div>
          </div>

          <form className="call-form" onSubmit={handleCompleteCall}>
            <label htmlFor="call-status">Status</label>
            <select
              id="call-status"
              value={form.status}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  status: event.target.value as CompleteCallPayload["status"],
                }))
              }
              disabled={!currentLead || isBusy}
            >
              {callStatuses.map((status) => (
                <option key={status} value={status}>
                  {status.replaceAll("_", " ")}
                </option>
              ))}
            </select>

            <label htmlFor="call-notes">Notes</label>
            <textarea
              id="call-notes"
              rows={5}
              placeholder="Add the call summary and next steps"
              value={form.notes}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  notes: event.target.value,
                }))
              }
              disabled={!currentLead || isBusy}
              required
            />

            <div className="form-row">
              <div>
                <label htmlFor="followup-date">Follow-up Date</label>
                <input
                  id="followup-date"
                  type="date"
                  value={form.followupDate}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      followupDate: event.target.value,
                    }))
                  }
                  disabled={!currentLead || isBusy}
                />
              </div>
              <div>
                <label htmlFor="call-duration">Call Duration (seconds)</label>
                <input
                  id="call-duration"
                  type="number"
                  min="0"
                  step="1"
                  placeholder="120"
                  value={form.callDuration}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      callDuration: event.target.value,
                    }))
                  }
                  disabled={!currentLead || isBusy}
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className="button button-primary button-full button-large"
              disabled={!currentLead || isBusy}
            >
              <CheckIcon />
              {pendingAction === "complete"
                ? "Saving Call..."
                : "Complete Call"}
            </button>
          </form>
        </section>
      </section>
    </main>
  );
};
