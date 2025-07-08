import { octokit } from "../../utils/octokit";
import { Tool } from "@mastra/core/tools";
import { z } from "zod";

const inputSchema = z.object({
  owner: z
    .string()
    .describe("The owner of the repository. As facebook in facebook/react"),
  repo: z
    .string()
    .describe("The name of the repository. As react in facebook/react"),
  state: z
    .enum(["open", "closed", "all"])
    .default("all")
    .describe("The state of the pull request"),
  page: z
    .number()
    .int()
    .default(1)
    .describe("The page number of the results to fetch."),
  perPage: z
    .number()
    .int()
    .max(100)
    .default(30)
    .describe("The number of results per page (max 100)."),
});

const outputSchema = z.union([
  z.array(
    z.object({
      body: z.string().nullable().describe("The body content of the pr"),
      number: z.number().int().describe("The pull request number"),
      state: z
        .enum(["open", "closed"])
        .describe("The state of the pull request"),
      title: z.string().describe("The title of the pull request"),
      url: z.string().url().describe("The url to the pull request"),
      user: z
        .object({
          avatarUrl: z
            .string()
            .url()
            .nullable()
            .describe("The url of the user"),
          url: z.string().url().nullable().describe("The url to the user"),
          username: z.string().nullable().describe("The github user name"),
        })
        .describe("The user details"),
    }),
  ),
  z.object({
    ok: z.literal(false),
    message: z.string().describe("Error message"),
  }),
]);

export const getRepositoryPullRequests = new Tool({
  id: "getRepositoryPullRequests",
  description: "Get pull requests for a repository",
  inputSchema,
  outputSchema,
  execute: async ({ context }) => {
    const { owner, page, perPage: per_page, repo, state } = context;

    try {
      const response = await octokit.request("GET /repos/{owner}/{repo}/pulls", {
        owner,
        repo,
        state,
        page,
        per_page,
      });

      const pullRequests = response.data.map((r) => ({
        body: r.body ?? null,
        number: r.number,
        state: r.state as "open" | "closed",
        title: r.title,
        url: r.html_url,
        user: {
          url: r.user?.html_url ?? null,
          avatarUrl: r.user?.avatar_url ?? null,
          username: r.user?.login ?? null,
        },
      }));

      return pullRequests;
    } catch (error) {
      console.error("Error fetching pull requests:", error);
      return {
        ok: false as const,
        message:
          error instanceof Error
            ? error.message
            : "Failed to fetch pull requests",
      };
    }
  },
});

export const commentOnPullRequest = new Tool({
  id: "commentOnPullRequest",
  description: "Add a comment to a pull request in a repository",
  inputSchema: z.object({
    owner: z.string().describe("The owner of the repository"),
    repo: z.string().describe("The name of the repository"),
    pull_number: z.number().describe("The number of the pull request"),
    body: z.string().describe("The comment body"),
  }),
  outputSchema: z.union([
    z.object({ ok: z.literal(true), url: z.string().url() }),
    z.object({ ok: z.literal(false), message: z.string() }),
  ]),
  execute: async ({ context }) => {
    const { owner, repo, pull_number, body } = context;
    try {
      const response = await octokit.request("POST /repos/{owner}/{repo}/issues/{pull_number}/comments", {
        owner,
        repo,
        issue_number: pull_number,
        body,
      });
      return { ok: true as const, url: response.data.html_url };
    } catch (error) {
      return { ok: false as const, message: error instanceof Error ? error.message : "Unknown error" };
    }
  },
});

export const createPullRequest = new Tool({
  id: "createPullRequest",
  description: "Create a new pull request in a repository",
  inputSchema: z.object({
      owner: z.string().describe("The owner of the repository"),
      repo: z.string().describe("The name of the repository"),
      title: z.string().describe("The title of the pull request"),
      head: z.string().describe("The name of the branch where changes are implemented"),
      base: z.string().describe("The name of the branch you want the changes pulled into"),
      body: z.string().optional().describe("The body content of the pull request"),
  }),
  outputSchema: z.union([
      z.object({ ok: z.literal(true), url: z.string().url() }),
      z.object({ ok: z.literal(false), message: z.string() }),
  ]),
  execute: async ({ context }) => {
      const { owner, repo, title, head, base, body } = context;
      try {
          const response = await octokit.request("POST /repos/{owner}/{repo}/pulls", {
              owner,
              repo,
              title,
              head,
              base,
              body,
          });
          return { ok: true as const, url: response.data.html_url };
      } catch (error) {
          return { ok: false as const, message: error instanceof Error ? error.message : "Unknown error" };
      }
  },
});

export const reviewPullRequest = new Tool({
  id: "reviewPullRequest",
  description: "Submit a review for a pull request (approve, request changes, or comment)",
  inputSchema: z.object({
      owner: z.string().describe("The owner of the repository"),
      repo: z.string().describe("The name of the repository"),
      pull_number: z.number().describe("The number of the pull request"),
      event: z.enum(["APPROVE", "REQUEST_CHANGES", "COMMENT"]).describe("The type of review event"),
      body: z.string().optional().describe("The body of the review comment"),
  }),
  outputSchema: z.union([
      z.object({ ok: z.literal(true), url: z.string().url() }),
      z.object({ ok: z.literal(false), message: z.string() }),
  ]),
  execute: async ({ context }) => {
      const { owner, repo, pull_number, event, body } = context;
      try {
          const response = await octokit.request("POST /repos/{owner}/{repo}/pulls/{pull_number}/reviews", {
              owner,
              repo,
              pull_number,
              event,
              body,
          });
          return { ok: true as const, url: response.data.html_url };
      } catch (error) {
          return { ok: false as const, message: error instanceof Error ? error.message : "Unknown error" };
      }
  },
});

export const summarizePullRequests = new Tool({
  id: "summarizePullRequests",
  description: "Summarize pull requests for a repository, returning counts and a summary string.",
  inputSchema: z.object({
      owner: z.string().describe("The owner of the repository"),
      repo: z.string().describe("The name of the repository"),
  }),
  outputSchema: z.object({
      openCount: z.number(),
      closedCount: z.number(),
      totalCount: z.number(),
      summary: z.string(),
  }),
  execute: async ({ context }) => {
      const { owner, repo } = context;
      try {
          const response = await octokit.request("GET /repos/{owner}/{repo}/pulls", {
              owner,
              repo,
              state: "all",
              per_page: 100,
          });
          const openCount = response.data.filter((pr) => pr.state === "open").length;
          const closedCount = response.data.filter((pr) => pr.state === "closed").length;
          const totalCount = response.data.length;
          const summary = `There are ${openCount} open and ${closedCount} closed pull requests (total: ${totalCount}).`;
          return { openCount, closedCount, totalCount, summary };
      } catch (error) {
          return { openCount: 0, closedCount: 0, totalCount: 0, summary: error instanceof Error ? error.message : "Unknown error" };
      }
  },
});