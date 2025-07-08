import { Agent } from "@mastra/core/agent";
import { getGitHubUserTool, getUserContributionActivityTool } from '../tools/GithubUser';
import { getRepositoryCommits, createRepository, forkRepository } from '../tools/GithubRepo';
import { getFileContent } from '../tools/GetFile';
import { getFilePaths } from '../tools/GetFilePath';
import { getRepositoryPullRequests, summarizePullRequests, reviewPullRequest, createPullRequest, commentOnPullRequest } from '../tools/GithubPR';
import { getRepositoryIssues, createIssue, commentOnIssue, summarizeIssues } from '../tools/GithubIssues';

import { instructions } from "../instructions/gh-user";
import { model } from "../config";
import { ghProfile } from "../workflows/gh-profile";
import { createAddressIssueFromReview } from "../workflows/create-issues";
import { ContributionWorkflow } from "../workflows/github-user-analysis";
export const githubAgent = new Agent({
  name: "Code Review Agent",
  instructions: instructions,
  workflows: {
    ghProfile,  
    createAddressIssueFromReview,
    ContributionWorkflow
  },
  model: model,
  tools: {
    getRepositoryCommits, getFileContent, getFilePaths, getRepositoryIssues, getRepositoryPullRequests,
    createIssue, summarizePullRequests, reviewPullRequest, commentOnPullRequest, createPullRequest,
    summarizeIssues, commentOnIssue, forkRepository, createRepository, getGitHubUserTool, getUserContributionActivityTool
  },
});