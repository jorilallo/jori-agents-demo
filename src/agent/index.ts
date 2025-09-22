import {
  convertToModelMessages,
  stepCountIs,
  streamText,
  type StreamTextOnStepFinishCallback,
  type ToolSet,
  type UIMessage,
} from "ai";
import { PROMPT } from "./prompt";
import { openai, type OpenAIResponsesProviderOptions } from "@ai-sdk/openai";
import { readPathTool } from "./tools/read-path";
import { searchCodeTool } from "./tools/search-code";

type AgentState = {
  id: string;
  messages: UIMessage[];

  task?: {
    controller: AbortController;
  };
};

declare global {
  var agents: Map<string, AgentState> | undefined;
}

globalThis.agents ??= new Map<string, AgentState>();

const agents = globalThis.agents;
const tools = {
  read_path: readPathTool,
  search_code: searchCodeTool,
} satisfies ToolSet;

async function createAgent(id: string) {
  const agent: AgentState = {
    id,
    messages: [
      {
        role: "system",
        id: Bun.randomUUIDv7(),
        parts: [{ type: "text", text: PROMPT }],
      },
    ],
  };
  agents.set(id, agent);

  return agent;
}

export async function promptAgent(
  id: string,
  prompt: string,
  options?: {
    onStep: StreamTextOnStepFinishCallback<typeof tools>;
  }
) {
  let agent = agents.get(id);
  if (!agent) {
    agent = await createAgent(id);
  } else {
    agent.messages.push({
      role: "user",
      id: Bun.randomUUIDv7(),
      parts: [{ type: "text", text: prompt }],
    });
  }

  if (agent.task) {
    agent.task.controller.abort();
    agent.task = undefined;

    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  const controller = new AbortController();
  agent.task = { controller };
  agent.messages.push({
    role: "user",
    id: Bun.randomUUIDv7(),
    parts: [{ type: "text", text: prompt }],
  });

  const stream = streamText({
    model: openai.responses("gpt-5"),
    providerOptions: {
      openai: {
        reasoningEffort: "low",
        reasoningSummary: "auto",
        textVerbosity: "low",

        serviceTier: "priority",
      } satisfies OpenAIResponsesProviderOptions,
    },

    stopWhen: stepCountIs(25),
    onStepFinish: async (step) => {
      if (controller.signal.aborted) {
        return;
      }
      console.dir(step, { depth: null });

      await options?.onStep?.(step);
    },

    messages: convertToModelMessages(agent.messages),
    tools,

    abortSignal: controller.signal,
  });

  const uiStream = stream.toUIMessageStream({
    generateMessageId: () => Bun.randomUUIDv7(),
    sendReasoning: true,

    onError(error) {
      console.error(error);
      return error instanceof Error ? error.message : String(error);
    },

    onFinish({ messages }) {
      console.dir({ messages }, { depth: null });
      if (controller.signal.aborted) {
        return;
      }

      agent.messages.push(...messages);
    },
  });

  for await (const chunk of uiStream) {
    // Do nothing, just consume the stream
  }

  return await stream.text;
}

export async function stopAgent(id: string) {
  const agent = agents.get(id);
  if (agent?.task) {
    agent.task.controller.abort();
    agent.task = undefined;
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
}

export function getAgentMessages(id: string) {
  const agent = agents.get(id);
  if (!agent) {
    return [];
  }
  return agent.messages;
}
