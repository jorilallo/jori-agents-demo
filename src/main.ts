import * as linear from "./services/linear";
import { startNgrokTunnel } from "./services/ngrok";
import { debugAgentSession } from "./utils/debug";

const webhookHandler = linear.webhooks.createHandler();

webhookHandler.on("AgentSessionEvent", async (event) => {
  try {
    // TODO: Let's handle some events
  } catch (ex) {
    console.error(ex);
    throw ex;
  }
});

const server = Bun.serve({
  routes: {
    "/": () => new Response("OK"),

    "/hooks/linear": webhookHandler,

    "/debug/:agentSessionId": (req) =>
      debugAgentSession(req.params.agentSessionId),
  },
  port: 4567,
});

console.log(`Server is running on ${server.url}`);

const tunnelUrl = await startNgrokTunnel(server.url.toString());
