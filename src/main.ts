import type { AgentSessionEventWebhookPayload } from "@linear/sdk/webhooks";
import * as linear from "./services/linear";
import { startNgrokTunnel } from "./services/ngrok";
import { debugAgentSession } from "./utils/debug";

async function handleAgentSessionEvent(event: AgentSessionEventWebhookPayload) {
  // TODO: Handle the event
}

const webhookHandler = linear.webhooks.createHandler();

webhookHandler.on("AgentSessionEvent", (event) => {
  void handleAgentSessionEvent(event).catch((ex) => {
    console.error(ex);
  });
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
