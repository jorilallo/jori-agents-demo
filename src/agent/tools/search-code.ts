import { tool } from "ai";
import z from "zod";
import { github } from "../../services/github";

export const searchCodeTool = tool({
  type: "function",
  description:
    "Search the codebase for relevant information using the GitHub API. You can use any search query that GitHub code search supports, except for the repo parameter, which is predefined.",
  inputSchema: z.object({
    query: z.string().describe("The query to search the codebase for."),
    includeFragments: z
      .boolean()
      .describe("Whether to include code fragments in the response.")
      .optional()
      .default(false),
  }),

  async execute(args) {
    const { query, includeFragments } = args;

    const response = await github.search.code({
      q: `repo:linear/linear ${query}`,

      headers: {
        ...(includeFragments && {
          Accept: "application/vnd.github.text-match+json",
        }),
        Accept: "application/vnd.github.text-match+json",
      },
    });

    return response.data.items.map((item) => ({
      title: item.name,
      url: item.html_url,
      fragments: item.text_matches?.map((match) => match.fragment) ?? [],
    }));
  },
});
