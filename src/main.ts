import { promptAgent } from "./agent";
import * as linear from "./services/linear";
import { startNgrokTunnel } from "./services/ngrok";
import { objectToXML } from "./utils/xml";
import { debugAgentSession } from "./utils/debug";
import type { AgentSessionEventWebhookPayload } from "@linear/sdk/webhooks";

async function processAgentSessionEvent(
  event: AgentSessionEventWebhookPayload
) {
  const agentSessionId = event.agentSession.id;

  await linear.client.agentSessionUpdateExternalUrl(agentSessionId, {
    externalLink: `${tunnelUrl}/debug/${agentSessionId}`,
  });

  const issue = event.agentSession.issue!;

  const response = await promptAgent(
    agentSessionId,
    objectToXML({
      issue:
        event.action === "created"
          ? {
              team: `${issue.team.name} (${issue.team.key})`,
              identifier: issue.identifier,
              title: issue.title,
              description: issue.description,
            }
          : undefined,
      comment:
        event.action === "created" && (event.previousComments?.length ?? 0) > 0
          ? event.previousComments!.map((c) => ({
              body: c.body,
            }))
          : [],

      prompt: event.agentActivity?.content.body,
    }),
    {
      async onStep(step) {
        for (const part of step.content) {
          if (part.type === "reasoning" && part.text) {
            await linear.client.createAgentActivity({
              agentSessionId,
              content: { type: "thought", body: part.text },
            });
          }

          if (
            (part.type === "tool-call" || part.type === "tool-result") &&
            part.toolName === "read_path"
          ) {
            await linear.client.createAgentActivity({
              agentSessionId,
              ephemeral: part.type === "tool-call",
              content: {
                type: "action",
                action: "Reading",
                parameter: (part.input as { path: string }).path,
                result:
                  part.type === "tool-result"
                    ? `\`\`\`\n${(part.output as { content: string }).content}\n\`\`\``
                    : undefined,
              },
            });
          }

          if (
            (part.type === "tool-call" || part.type === "tool-result") &&
            part.toolName === "search_code"
          ) {
            await linear.client.createAgentActivity({
              agentSessionId,
              ephemeral: part.type === "tool-call",
              content: {
                type: "action",
                action: "Searching",
                parameter: (part.input as { query: string }).query,
                result:
                  part.type === "tool-result"
                    ? (part.output as unknown as unknown[]).length + ` results`
                    : undefined,
              },
            });
          }
        }
      },
    }
  );

  await linear.client.createAgentActivity({
    agentSessionId,
    content: {
      type: "response",
      body: response,
    },
  });
}

const webhookHandler = linear.webhooks.createHandler();

webhookHandler.on("AgentSessionEvent", async (event) => {
  void processAgentSessionEvent(event).catch((err) => console.error(err));
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
