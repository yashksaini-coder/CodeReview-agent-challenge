// To use this workflow, import and register it in your Mastra entrypoint (e.g., src/mastra/index.ts):
// import { contributionGithubWorkflow } from "./workflows/contribution";

import { createWorkflow, createStep } from "@mastra/core/workflows";
import { z } from "zod";
import { getGitHubUser } from "../tools/GithubUser";

// Input schema shared by all steps
const inputSchema = z.object({
  username: z.string(),
});

// Step: Fetch GitHub user profile
const fetchProfileStep = createStep({
  id: "fetchProfile",
  inputSchema,
  outputSchema: z.object({ profile: z.any() }),
  execute: async ({ inputData }) => ({ profile: await getGitHubUser(inputData.username) }),
});

// Main workflow: fetch profile and contributions in parallel, then combine
export const ghProfile = createWorkflow({
  id: "gh-profile-workflow",
  inputSchema,
  outputSchema: z.object({
    profile: z.any(),
  }),
})
  .then(fetchProfileStep)
  .map((result: { profile: any }) => ({ profile: result.profile }))
  .commit();
