import { getAgentMessages } from "../agent";

export function debugAgentSession(agentSessionId: string): Response {
  const messages = getAgentMessages(agentSessionId);

  function getRoleBadgeClass(role: string): string {
    switch (role) {
      case "system":
        return "bg-purple-100 text-purple-800";
      case "user":
        return "bg-blue-100 text-blue-800";
      case "assistant":
        return "bg-green-100 text-green-800";
      case "tool":
        return "bg-orange-100 text-orange-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  }

  function getPartBorderClass(type: string): string {
    switch (type) {
      case "text":
        return "border-blue-200";
      case "tool-call":
        return "border-orange-300";
      case "tool-result":
        return "border-green-300";
      case "reasoning":
        return "border-purple-300";
      default:
        return "border-gray-200";
    }
  }

  function getPartBadgeClass(type: string): string {
    switch (type) {
      case "text":
        return "bg-blue-50 text-blue-700";
      case "tool-call":
        return "bg-orange-50 text-orange-700";
      case "tool-result":
        return "bg-green-50 text-green-700";
      case "reasoning":
        return "bg-purple-50 text-purple-700";
      default:
        return "bg-gray-50 text-gray-700";
    }
  }

  function renderPartContent(part: any): string {
    function escapeHtml(text: string): string {
      return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
    }

    switch (part.type) {
      case "text":
        return `<div class="prose prose-sm max-w-none"><pre class="whitespace-pre-wrap text-sm text-gray-700">${escapeHtml(part.text || "")}</pre></div>`;

      case "tool-call":
        return `
          <div class="bg-orange-50 rounded p-3">
            <div class="font-medium text-orange-800 mb-1">🔧 ${escapeHtml(part.toolName)}</div>
            <div class="text-sm text-orange-700 mb-2">ID: <code>${escapeHtml(part.toolCallId)}</code></div>
            <details class="text-sm">
              <summary class="cursor-pointer text-orange-700 hover:text-orange-800">Arguments</summary>
              <pre class="mt-2 p-2 bg-white rounded border text-xs overflow-x-auto">${escapeHtml(JSON.stringify(part.args, null, 2))}</pre>
            </details>
          </div>
        `;

      case "tool-result":
        return `
          <div class="bg-green-50 rounded p-3">
            <div class="font-medium text-green-800 mb-1">✅ Tool Result</div>
            <div class="text-sm text-green-700 mb-2">ID: <code>${escapeHtml(part.toolCallId)}</code></div>
            <details class="text-sm">
              <summary class="cursor-pointer text-green-700 hover:text-green-800">Result</summary>
              <pre class="mt-2 p-2 bg-white rounded border text-xs overflow-x-auto">${escapeHtml(JSON.stringify(part.result, null, 2))}</pre>
            </details>
          </div>
        `;

      case "reasoning":
        return `
          <div class="bg-purple-50 rounded p-3">
            <div class="font-medium text-purple-800 mb-1">🧠 Reasoning</div>
            <div class="text-sm text-purple-700 whitespace-pre-wrap">${escapeHtml(part.reasoning || "<empty>")}</div>
          </div>
        `;

      default:
        if (part.type.startsWith("tool-")) {
          return `
          <div class="bg-green-50 rounded p-3">
            <div class="font-medium text-green-800 mb-1">✅ Tool Result</div>
            <div class="text-sm text-green-700 mb-2">ID: <code>${escapeHtml(part.toolCallId)}</code></div>
            <details class="text-sm">
              <summary class="cursor-pointer text-green-700 hover:text-green-800">Input</summary>
              <pre class="mt-2 p-2 bg-white rounded border text-xs overflow-x-auto">${escapeHtml(JSON.stringify(part.input, null, 2))}</pre>
            </details>
            <details class="text-sm">
              <summary class="cursor-pointer text-green-700 hover:text-green-800">Output</summary>
              <pre class="mt-2 p-2 bg-white rounded border text-xs overflow-x-auto">${escapeHtml(JSON.stringify(part.output, null, 2))}</pre>
            </details>
          </div>
        `;
        }

        return "";
    }
  }

  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Agent Debug - ${agentSessionId}</title>
      <script src="https://cdn.tailwindcss.com"></script>
    </head>
    <body class="bg-gray-50 min-h-screen">
      <div class="max-w-4xl mx-auto p-6">
        <div class="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <h1 class="text-2xl font-bold text-gray-900 mb-2">Agent Messages</h1>
          <p class="text-gray-600">Session ID: <code class="bg-gray-100 px-2 py-1 rounded text-sm">${agentSessionId}</code></p>
          <p class="text-gray-600 mt-1">Total Messages: ${messages.length}</p>
        </div>

        <div class="space-y-4">
          ${messages
            .map(
              (message, index) => `
            <div class="bg-white rounded-lg shadow-sm border p-4">
              <div class="flex items-center justify-between mb-3">
                <div class="flex items-center space-x-3">
                  <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleBadgeClass(message.role)}">
                    ${message.role}
                  </span>
                  <span class="text-sm text-gray-500">#${index + 1}</span>
                </div>
                <span class="text-xs text-gray-400 font-mono">${message.id}</span>
              </div>

              <div class="space-y-3">
                ${
                  message.parts
                    ?.map(
                      (part, partIndex) => `
                  <div class="border-l-4 ${getPartBorderClass(part.type)} pl-4">
                    <div class="flex items-center justify-between mb-2">
                      <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getPartBadgeClass(part.type)}">
                        ${part.type}
                      </span>
                    </div>
                    ${renderPartContent(part)}
                  </div>
                `
                    )
                    .join("") || '<p class="text-gray-500 italic">No parts</p>'
                }
              </div>
            </div>
          `
            )
            .join("")}
        </div>

        ${
          messages.length === 0
            ? `
          <div class="bg-white rounded-lg shadow-sm border p-8 text-center">
            <div class="text-gray-400 text-lg mb-2">🤖</div>
            <p class="text-gray-600">No messages found for this agent session.</p>
          </div>
        `
            : ""
        }
      </div>
    </body>
    </html>
  `;

  return new Response(html, {
    headers: { "Content-Type": "text/html" },
  });
}
