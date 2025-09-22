import { LinearClient } from "@linear/sdk";
import { LinearWebhookClient } from "@linear/sdk/webhooks";

export const client = new LinearClient({
  accessToken: process.env.LINEAR_DEVELOPER_TOKEN,
});

export const webhooks = new LinearWebhookClient(
  process.env.LINEAR_WEBHOOK_SIGNING_SECRET!
);
