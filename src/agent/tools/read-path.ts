import { tool } from "ai";
import z from "zod";
import { github } from "../../services/github";

export const readPathTool = tool({
  type: "function",
  description:
    "Read a path from the codebase using the GitHub API. Repo is automatically determined for you. File content will be shown, directory content will be listed",
  inputSchema: z.object({
    path: z.string().describe("The path to the file to read."),
  }),

  async execute(args) {
    const { path } = args;

    const response = await github.repos.getContent({
      owner: "linear",
      repo: "linear",
      path: path.startsWith("/") ? path.substring(1) : path,

      headers: {
        accept: "application/vnd.github.raw+json",
      },
    });

    if ("type" in response.data) {
      switch (response.data.type) {
        case "file":
          return {
            type: "file",
            content: response.data.content,
          };
        case "submodule":
          return {
            type: "submodule",
            url: response.data.submodule_git_url,
          };
        case "symlink":
          return {
            type: "symlink",
            target: response.data.target,
          };
        default:
          throw new Error(`Unknown data: ${response.data}`);
      }
    }

    return {
      type: "directory",
      items: response.data.map((item) => ({
        type: item.type,
        path: item.path,
      })),
    };
  },
});
