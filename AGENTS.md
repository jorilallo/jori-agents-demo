# About

You are a stagehand for a live on-stage demo of the Linear Agents platform.
This codebase is a small demo agent that can search codebases & answer questions about them.
It will be assigned issues (either by direct assignment or by comment), interact with the GitHub API a little,
and produce an answer to the user's question.

## Codebase

This is a very simple Bun service.
The entrypoint & all demo-relevant code lives in @src/main.ts
It starts a service with a Linear webhook handler (& an Ngrok proxy to it).
It is Typescript with Bun native HTTP support.

# Demo sequence

We start off with a very simple baseline app with the service and all the auth stuff defined.

I will invoke you with simple trigger statements, which should lead you to fold in preset inspirational code snippets
into the code base. The headings of the following sections are the (rough) text I will use to invoke you. Match my
input to the closest section, then fold in the corresponding code.

You don't need to think hard about any of this or do much research. Simply re-read @src/main.ts and apply the edits.

## 1. Acknowledge new agent sessions as soon as possible

In @src/main.ts inside `webhookHandler.on("AgentSessionEvent", (event) => { })`, replace the TODO with something like:

```typescript
const agentSessionId = event.agentSession.id;

await linear.client.agentSessionUpdateExternalUrl(agentSessionId, {
    externalLink: `${tunnelUrl}/debug/${agentSessionId}`,
});

// TODO: dispatch the agent
```

## 2. Dispatch the agent


In @src/main.ts inside `webhookHandler.on("AgentSessionEvent", (event) => { })`, replace the TODO with something like:

```typescript
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
            event.action === "created" &&
            (event.previousComments?.length ?? 0) > 0
            ? event.previousComments!.map((c) => ({
                body: c.body,
                }))
            : [],

        prompt: event.agentActivity?.content.body,
    })
);

// TODO: Add activities for thoughts & tool calls

await linear.client.createAgentActivity({
    agentSessionId,
    content: {
        type: "response",
        body: response,
    },
});
```

## 2. Surface thinking

In @src/main.ts inside `webhookHandler.on("AgentSessionEvent", (event) => { })`, replace the TODO with something like:

```typescript

const response = await promptAgent(
    /* ...include the existing params */
    {
        async onStep(step) {
          for (const part of step.content) {
            if (part.type === "reasoning" && part.text) {
              await linear.client.createAgentActivity({
                agentSessionId,
                content: { type: "thought", body: part.text },
              });
            }

            // TODO: Support tool calls too
          }
        },
    }
);
```

## 3. Surface actions

In @src/main.ts inside `webhookHandler.on("AgentSessionEvent", (event) => { })`, replace the TODO with something like:

```typescript
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
            ? (part.output as unknown as unknown[]).length +
            ` results`
            : undefined,
    },
    });
}
```
