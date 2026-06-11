import { useState } from "react";

import type { Agent, Lead } from "./api/client";
import { Dashboard } from "./components/Dashboard";
import { Login } from "./components/Login";
import "./styles.css";

const AGENT_STORAGE_KEY = "a7_crm_agent_v1";
const LEAD_STORAGE_KEY = "a7_crm_current_lead_v1";

const readStoredValue = <T,>(key: string): T | null => {
  try {
    const value = localStorage.getItem(key);
    return value ? (JSON.parse(value) as T) : null;
  } catch {
    localStorage.removeItem(key);
    return null;
  }
};

function App() {
  const [agent, setAgent] = useState<Agent | null>(() =>
    readStoredValue<Agent>(AGENT_STORAGE_KEY),
  );
  const [currentLead, setCurrentLead] = useState<Lead | null>(() =>
    readStoredValue<Lead>(LEAD_STORAGE_KEY),
  );

  const handleLogin = (loggedInAgent: Agent) => {
    localStorage.setItem(AGENT_STORAGE_KEY, JSON.stringify(loggedInAgent));
    setAgent(loggedInAgent);
  };

  const handleAgentChange = (updatedAgent: Agent) => {
    localStorage.setItem(AGENT_STORAGE_KEY, JSON.stringify(updatedAgent));
    setAgent(updatedAgent);
  };

  const handleLeadChange = (lead: Lead | null) => {
    if (lead) {
      localStorage.setItem(LEAD_STORAGE_KEY, JSON.stringify(lead));
    } else {
      localStorage.removeItem(LEAD_STORAGE_KEY);
    }

    setCurrentLead(lead);
  };

  const handleLogout = () => {
    localStorage.removeItem(AGENT_STORAGE_KEY);
    localStorage.removeItem(LEAD_STORAGE_KEY);
    setCurrentLead(null);
    setAgent(null);
  };

  return agent ? (
    <Dashboard
      agent={agent}
      currentLead={currentLead}
      onAgentChange={handleAgentChange}
      onLeadChange={handleLeadChange}
      onLogout={handleLogout}
    />
  ) : (
    <Login onLogin={handleLogin} />
  );
}

export default App;
