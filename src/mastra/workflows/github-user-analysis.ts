// Alternative simplified single-step workflow for GitHub user analysis
// To use this workflow, import and register it in your Mastra entrypoint (e.g., src/mastra/index.ts):
// import { githubUserAnalysisWorkflow } from "./workflows/github-user-analysis";

import { createWorkflow, createStep } from "@mastra/core/workflows";
import { z } from "zod";
import { getUserContributionActivityTool } from "../tools/GithubUser";

const getUserContributionActivityStep = createStep(getUserContributionActivityTool);

export const ContributionWorkflow = createWorkflow({
  id: "ContributionWorkflow",
  description: "Fetch GitHub user contribution activity summary (commits, PRs, issues, repos, forks) for a given time period (7d, 14d, 30d)",
  inputSchema: z.object({
    username: z.string().describe("The GitHub username to analyze"),
    period: z.enum(["7d", "14d", "30d"]).default("7d").describe("Time period for contribution analysis"),
  }),
  outputSchema: getUserContributionActivityTool.outputSchema,
})
  .then(getUserContributionActivityStep)
  .commit();
