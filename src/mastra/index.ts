import { Mastra } from "@mastra/core/mastra";
import { PinoLogger } from "@mastra/loggers";
import { githubAgent } from "./agents";
import { createAddressIssueFromReview } from "./workflows/create-issues";
import { ghProfile } from "./workflows/gh-profile";
import { ContributionWorkflow } from "./workflows/github-user-analysis";

export const mastra = new Mastra({
	workflows: { 
		createAddressIssueFromReview, 
		ghProfile, 
		ContributionWorkflow
	},
	agents: { githubAgent },
	logger: new PinoLogger({
		name: "Mastra",
		level: "info",
	}),
	server: {
		port: 8080,
		// timeout: 10000,
	},
});
