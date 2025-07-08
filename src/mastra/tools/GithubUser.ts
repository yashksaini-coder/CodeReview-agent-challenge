import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { octokit } from "../../utils/octokit";

interface GitHubResponse {
    ok: true;
    username: string;
    followers: number;
    following: number;
    public_repos: number;
    bio: string;
    email: string;
    location: string;
    company: string;
    website: string;
    twitter_username: string;
    avatar_url: string;
    url: string;
    blog: string;
    repositories: {
        name: string;
        description: string;
        url: string;
    }[];
}

// Enhanced contribution activity interface
interface ContributionActivity {
    issues: Array<{
        title: string;
        url: string;
        createdAt: string;
        state: string;
        repositoryName?: string;
    }>;
    pullRequests: Array<{
        title: string;
        url: string;
        createdAt: string;
        state: string;
        repositoryName?: string;
        merged?: boolean;
    }>;
    commits: Array<{
        message: string;
        url: string;
        date: string;
        repositoryName?: string;
        sha?: string;
    }>;
    repositories: Array<{
        name: string;
        description: string;
        url: string;
        createdAt: string;
        language?: string;
        stars: number;
        forks: number;
    }>;
    summary: {
        totalCommits: number;
        totalPullRequests: number;
        totalIssues: number;
        totalRepositories: number;
        period: string;
    };
}

/**
 * Get detailed GitHub user contribution activity for a specified period
 */
export async function getUserContributionActivity(username: string, period: '7d' | '14d' | '30d' = '7d'): Promise<ContributionActivity> {
    const now = new Date();
    let since: Date;
    
    if (period === '7d') since = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    else if (period === '14d') since = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    else since = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    const sinceIso = since.toISOString();
    
    try {
        // Fetch issues created by user
        const issuesResponse = await octokit.request('GET /search/issues', {
            q: `type:issue author:${username} created:>${sinceIso}`,
            sort: 'created',
            order: 'desc',
            per_page: 100
        });

        const issues = issuesResponse.data.items.map(issue => ({
            title: issue.title,
            url: issue.html_url,
            createdAt: issue.created_at,
            state: issue.state,
            repositoryName: issue.repository_url?.split('/').pop() || ''
        }));

        // Fetch pull requests created by user
        const prsResponse = await octokit.request('GET /search/issues', {
            q: `type:pr author:${username} created:>${sinceIso}`,
            sort: 'created',
            order: 'desc',
            per_page: 100
        });

        const pullRequests = prsResponse.data.items.map(pr => ({
            title: pr.title,
            url: pr.html_url,
            createdAt: pr.created_at,
            state: pr.state,
            repositoryName: pr.repository_url?.split('/').pop() || '',
            merged: pr.pull_request?.merged_at ? true : false
        }));

        // Fetch user's repositories created in the period
        const reposResponse = await octokit.request('GET /users/{username}/repos', { 
            username,
            sort: 'created',
            direction: 'desc',
            per_page: 100
        });

        const repositories = reposResponse.data
            .filter(repo => new Date(repo.created_at || '') > since)
            .map(repo => ({
                name: repo.name,
                description: repo.description || '',
                url: repo.html_url,
                createdAt: repo.created_at || '',
                language: repo.language || '',
                stars: repo.stargazers_count || 0,
                forks: repo.forks_count || 0
            }));

        // Fetch recent commits from user's events
        const eventsResponse = await octokit.request('GET /users/{username}/events', { 
            username,
            per_page: 100
        });

        const commits: ContributionActivity['commits'] = [];
        for (const event of eventsResponse.data) {
            if (event.type === 'PushEvent' && new Date(event.created_at || '') > since) {
                const pushPayload = event.payload as any;
                if (pushPayload.commits) {
                    for (const commit of pushPayload.commits) {
                        commits.push({
                            message: commit.message,
                            url: `https://github.com/${event.repo?.name}/commit/${commit.sha}`,
                            date: event.created_at || '',
                            repositoryName: event.repo?.name?.split('/').pop() || '',
                            sha: commit.sha
                        });
                    }
                }
            }
        }

        return {
            issues,
            pullRequests,
            commits,
            repositories,
            summary: {
                totalCommits: commits.length,
                totalPullRequests: pullRequests.length,
                totalIssues: issues.length,
                totalRepositories: repositories.length,
                period
            }
        };
    } catch (error) {
        throw new Error(`Failed to fetch contribution activity for ${username}: ${error}`);
    }
}

export async function getGitHubUser(username: string): Promise<GitHubResponse> {
    try {
        const { data } = await octokit.request('GET /users/{username}', {
            username
        });

        const repositories = await octokit.request('GET /users/{username}/repos', {
            username
        });
        return {
            ok: true,
            username: data.login,
            followers: data.followers,
            following: data.following,
            public_repos: data.public_repos,
            bio: data.bio || '',
            email: data.email || '',
            location: data.location || '',
            company: data.company || '',
            website: data.blog || '',
            twitter_username: data.twitter_username || '',
            avatar_url: data.avatar_url,
            url: data.url,
            blog: data.blog || '',
            repositories: repositories.data.map(repo => ({
                name: repo.name,
                description: repo.description || '',
                url: repo.html_url,
            })),
        };
    } catch (error) {
        throw new Error(`Failed to fetch GitHub user information for ${username}: ${error}`);
    }
}

// ------------------- SCHEMAS -------------------

// Input Schemas
export const githubUserInputSchema = z.object({
    username: z.string().describe('GitHub username'),
});

export const contributionActivityInputSchema = z.object({
    username: z.string().describe('GitHub username'),
    period: z.enum(['7d', '14d', '30d']).default('7d').describe('Time period for activity'),
});

// Output Schemas
export const githubUserOutputSchema = z.union([
    z.object({
        ok: z.literal(true),
        username: z.string(),
        followers: z.number(),
        following: z.number(),
        public_repos: z.number(),
        bio: z.string(),
        email: z.string(),
        location: z.string(),
        company: z.string(),
        website: z.string(),
        twitter_username: z.string(),
        avatar_url: z.string(),
        url: z.string(),
        blog: z.string(),
        repositories: z.array(z.object({
            name: z.string(),
            description: z.string(),
            url: z.string(),
        })),
    }),
    z.object({
        ok: z.literal(false),
        message: z.string(),
    }),
]);

export const contributionActivitySummaryOutputSchema = z.object({
    commits: z.number(),
    pullRequests: z.number(),
    issues: z.number(),
    reposCreated: z.number(),
    forks: z.number(),
    summary: z.string(),
});

export const contributionActivityFullOutputSchema = z.object({
    issues: z.array(z.object({
        title: z.string(),
        url: z.string(),
        createdAt: z.string(),
        state: z.string(),
        repositoryName: z.string().optional(),
    })),
    pullRequests: z.array(z.object({
        title: z.string(),
        url: z.string(),
        createdAt: z.string(),
        state: z.string(),
        repositoryName: z.string().optional(),
        merged: z.boolean().optional(),
    })),
    commits: z.array(z.object({
        message: z.string(),
        url: z.string(),
        date: z.string(),
        repositoryName: z.string().optional(),
        sha: z.string().optional(),
    })),
    repositories: z.array(z.object({
        name: z.string(),
        description: z.string(),
        url: z.string(),
        createdAt: z.string(),
        language: z.string().optional(),
        stars: z.number(),
        forks: z.number(),
    })),
    summary: z.object({
        totalCommits: z.number(),
        totalPullRequests: z.number(),
        totalIssues: z.number(),
        totalRepositories: z.number(),
        period: z.string(),
    })
});

// ------------------- TOOLS -------------------

export const getGitHubUserTool = createTool({
    id: 'getGitHubUser',
    description: 'Get GitHub user information',
    inputSchema: githubUserInputSchema,
    outputSchema: githubUserOutputSchema,
    execute: async ({ context }) => {
        return await getGitHubUser(context.username);
    }
});

export const getUserContributionActivityTool = createTool({
    id: 'getUserContributionActivity',
    description: 'Fetch user contribution activity summary (commits, PRs, issues, repos, forks) for a given time period (7d, 14d, 30d)',
    inputSchema: contributionActivityInputSchema,
    outputSchema: contributionActivitySummaryOutputSchema,
    execute: async ({ context }) => {
        const { username, period } = context;
        const activity = await getUserContributionActivity(username, period);
        return {
            commits: activity.summary.totalCommits,
            pullRequests: activity.summary.totalPullRequests,
            issues: activity.summary.totalIssues,
            reposCreated: activity.summary.totalRepositories,
            forks: activity.repositories.filter(r => r.forks > 0).length,
            summary: `In the last ${period}, ${username} made ${activity.summary.totalCommits} commits, opened ${activity.summary.totalPullRequests} PRs, ${activity.summary.totalIssues} issues, created ${activity.summary.totalRepositories} repos.`
        };
    }
});