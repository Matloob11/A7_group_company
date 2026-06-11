# A7 Group Calling CRM Frontend

React, Vite, TypeScript, Axios, and CSS frontend for the A7 Group Calling CRM backend.

## Setup

```powershell
npm install
Copy-Item .env.example .env
npm run dev
```

The frontend defaults to `http://localhost:5000` for API requests. Set
`VITE_API_BASE_URL` only when the backend is running elsewhere.

No Supabase credentials belong in this project. All data access goes through
the Express backend.

## Add Agent Flow

Click `Add Agent` on the login screen, enter the backend
`ADD_AGENT_ACCESS_CODE`, then use the admin panel to:

- Search all agents by name or ID
- Add a new agent with name, phone number, and status
- Use the backend-generated next `A7-###` agent ID
- Edit existing agent name, phone, and status
- Delete an agent

The frontend receives a short-lived backend token for this flow. It never uses
the Supabase service-role key.

Phone persistence requires the backend database to include:

```sql
alter table public.agents
  add column if not exists phone text;
```

## Scripts

- `npm run dev` starts Vite.
- `npm run build` performs the TypeScript and production build.
- `npm run lint` runs ESLint.
- `npm run preview` serves the production build locally.
