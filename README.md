# A7 Group AI Calling CRM Backend

Node.js, TypeScript, Express, and Supabase backend for agent login, lead assignment, call completion, and agent status management.

The React frontend lives in `frontend/` and runs separately:

```powershell
cd frontend
npm install
npm run dev
```

## Requirements

- Node.js 20 or newer
- An existing Supabase project with the `agents`, `leads`, `projects`, and `call_logs` tables
- The Supabase project URL and service-role key

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create your local environment file:

   ```powershell
   Copy-Item .env.example .env
   ```

3. Set the real values in `.env`:

   ```dotenv
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   ADD_AGENT_ACCESS_CODE=A7-ADMIN-2026
   PORT=5000
   ```

   Keep the service-role key on the server only. Never expose it in a browser or commit `.env`.
   `ADD_AGENT_ACCESS_CODE` is the password used by the frontend Add Agent flow.

4. Start development mode:

   ```bash
   npm run dev
   ```

## Scripts

- `npm run dev` starts the API with file watching.
- `npm test` runs the API integration tests.
- `npm run typecheck` checks TypeScript without generating files.
- `npm run build` compiles TypeScript into `dist/`.
- `npm start` runs the compiled server.

## API Testing

The examples below assume the API is running at `http://localhost:5000`.

Open `http://localhost:5000/api` in a browser to see every endpoint, method,
query parameter, and example JSON body.

Opening a POST-only endpoint such as `/api/leads/complete` in a browser sends a
GET request. The backend returns usage instructions in that case. Use a
frontend, Postman, Thunder Client, `curl`, or PowerShell to execute the real
POST action.

### Health

```bash
curl http://localhost:5000/
```

### Agent Login

```bash
curl -X POST http://localhost:5000/api/agent/login \
  -H "Content-Type: application/json" \
  -d '{"agent_id":"A7-001","name":"Ali"}'
```

### Add Agent Access Login

```bash
curl -X POST http://localhost:5000/api/agent/add-login \
  -H "Content-Type: application/json" \
  -d '{"access_code":"A7-ADMIN-2026"}'
```

Use the returned token as a Bearer token for creating a new agent.

### Create Agent

```bash
curl -X POST http://localhost:5000/api/agent/add \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN_FROM_ADD_LOGIN" \
  -d '{"name":"Sara","phone":"0333-1234567","status":"active"}'
```

The backend auto-generates the next `A7-###` agent ID.

### Agent Admin APIs

```bash
curl "http://localhost:5000/api/agent/admin/list?search=Ali" \
  -H "Authorization: Bearer TOKEN_FROM_ADD_LOGIN"

curl http://localhost:5000/api/agent/admin/next-id \
  -H "Authorization: Bearer TOKEN_FROM_ADD_LOGIN"

curl -X PATCH http://localhost:5000/api/agent/admin/A7-001 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN_FROM_ADD_LOGIN" \
  -d '{"name":"Ali","phone":"0333-1234567","status":"active"}'

curl -X DELETE http://localhost:5000/api/agent/admin/A7-001 \
  -H "Authorization: Bearer TOKEN_FROM_ADD_LOGIN"
```

### Get Next Lead

```bash
curl "http://localhost:5000/api/leads/next?agent_id=A7-001"
```

The oldest `new` or `pending` lead assigned to the agent is changed to `in_progress`.

### Complete Lead

```bash
curl -X POST http://localhost:5000/api/leads/complete \
  -H "Content-Type: application/json" \
  -d '{"lead_id":"00000000-0000-0000-0000-000000000000","agent_id":"A7-001","status":"follow_up","notes":"Client is interested","followup_date":"2026-06-15","call_duration":120}'
```

### Pause Agent

```bash
curl -X POST http://localhost:5000/api/agent/pause \
  -H "Content-Type: application/json" \
  -d '{"agent_id":"A7-001"}'
```

### Continue Agent

```bash
curl -X POST http://localhost:5000/api/agent/continue \
  -H "Content-Type: application/json" \
  -d '{"agent_id":"A7-001"}'
```

## Suggested Database Indexes

For efficient agent and lead lookups, add these indexes if equivalent indexes do not already exist:

```sql
create unique index if not exists agents_agent_id_idx
  on public.agents (agent_id);

create index if not exists leads_agent_queue_idx
  on public.leads (assigned_agent_id, created_at)
  where status in ('new', 'pending');
```

For the frontend admin panel phone field, add this column if it does not exist:

```sql
alter table public.agents
  add column if not exists phone text;
```
