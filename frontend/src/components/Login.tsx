import { type FormEvent, useState } from "react";

import { getApiErrorMessage, loginAddAgentAccess, loginAgent, type Agent } from "../api/client";
import { AdminAgentPanel } from "./AdminAgentPanel";

interface LoginProps {
  onLogin: (agent: Agent) => void;
}

type LoginMode = "agent-login" | "add-access" | "admin-panel";

export const Login = ({ onLogin }: LoginProps) => {
  const [mode, setMode] = useState<LoginMode>("agent-login");
  const [agentId, setAgentId] = useState("");
  const [name, setName] = useState("");
  const [accessCode, setAccessCode] = useState("");
  const [addAgentToken, setAddAgentToken] = useState("");
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const clearFeedback = () => {
    setSuccess("");
    setError("");
  };

  const switchMode = (nextMode: LoginMode) => {
    clearFeedback();
    setMode(nextMode);
  };

  const handleAgentLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    clearFeedback();
    setIsLoading(true);

    try {
      const agent = await loginAgent(agentId.trim(), name.trim());
      onLogin(agent);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Unable to log in."));
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddAccessLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    clearFeedback();
    setIsLoading(true);

    try {
      const token = await loginAddAgentAccess(accessCode.trim());
      setAddAgentToken(token);
      setMode("admin-panel");
      setSuccess("");
    } catch (requestError) {
      setError(
        getApiErrorMessage(requestError, "Unable to verify add-agent access."),
      );
    } finally {
      setIsLoading(false);
    }
  };

  const title =
    mode === "agent-login"
      ? "Agent Login"
      : "Add Agent Access";

  if (mode === "admin-panel") {
    return (
      <AdminAgentPanel
        token={addAgentToken}
        onBackToLogin={() => {
          setAccessCode("");
          setAddAgentToken("");
          switchMode("agent-login");
        }}
      />
    );
  }

  return (
    <main className="login-page">
      <section className="login-card" aria-labelledby="login-title">
        <div className="brand-mark" aria-hidden="true">
          A7
        </div>
        <h1 id="login-title">A7 Group Calling CRM</h1>
        <p className="login-subtitle">{title}</p>

        {success ? (
          <div className="alert alert-success" role="status">
            {success}
          </div>
        ) : null}
        {error ? (
          <div className="alert alert-error" role="alert">
            {error}
          </div>
        ) : null}

        {mode === "agent-login" ? (
          <>
            <form onSubmit={handleAgentLogin} className="login-form">
              <label htmlFor="agent-id">Agent ID</label>
              <input
                id="agent-id"
                name="agent_id"
                autoComplete="username"
                placeholder="Enter your agent ID, e.g. A7-001"
                value={agentId}
                onChange={(event) => setAgentId(event.target.value)}
                required
              />

              <label htmlFor="agent-name">Name</label>
              <input
                id="agent-name"
                name="name"
                autoComplete="name"
                placeholder="Enter your name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
              />

              <button
                type="submit"
                className="button button-primary button-full"
                disabled={isLoading}
              >
                {isLoading ? "Logging in..." : "Login"}
              </button>
            </form>

            <div className="login-divider">or</div>
            <button
              type="button"
              className="button button-secondary button-full"
              onClick={() => switchMode("add-access")}
              disabled={isLoading}
            >
              Add Agent
            </button>
          </>
        ) : null}

        {mode === "add-access" ? (
          <form onSubmit={handleAddAccessLogin} className="login-form">
            <label htmlFor="add-agent-code">Add Agent Access Code</label>
            <input
              id="add-agent-code"
              name="access_code"
              type="password"
              autoComplete="current-password"
              placeholder="Enter add-agent access code"
              value={accessCode}
              onChange={(event) => setAccessCode(event.target.value)}
              required
            />

            <button
              type="submit"
              className="button button-primary button-full"
              disabled={isLoading}
            >
              {isLoading ? "Verifying..." : "Continue"}
            </button>
            <button
              type="button"
              className="button button-text button-full"
              onClick={() => switchMode("agent-login")}
              disabled={isLoading}
            >
              Back to Login
            </button>
          </form>
        ) : null}

        <p className="login-help">
          {mode === "agent-login"
            ? "Use your assigned Agent ID and name to log in."
            : "Only authorized users should create new agents."}
        </p>
      </section>
    </main>
  );
};
