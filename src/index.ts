import { createApp } from "./app";
import { env } from "./config/env";

const app = createApp();

app.listen(env.PORT, () => {
  console.log(`A7 Group CRM backend listening on port ${env.PORT}`);
});
