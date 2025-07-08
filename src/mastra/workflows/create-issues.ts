import { createWorkflow, createStep } from "@mastra/core/workflows";
import { z } from "zod";
import { createIssue } from "../tools/GithubIssues";
import { getFileContent } from "../tools/GetFile";

// Types for file and problem
const FileSchema = z.object({ path: z.string(), content: z.string().optional() });
const ProblemSchema = z.object({ path: z.string(), line: z.number(), code: z.string(), suggestion: z.string() });
const IssueSchema = z.object({ url: z.string(), title: z.string(), body: z.string() });

// Step 1: Fetch files and contents
const fetchFilesStep = createStep({
  id: "fetch-files",
  description: "Fetch all file paths and contents from the repo (first 10 files for demo).",
  inputSchema: z.object({
    owner: z.string(),
    repo: z.string(),
    tree_sha: z.string().optional().default("main"),
  }),
  outputSchema: z.object({
    files: z.array(FileSchema),
    owner: z.string(),
    repo: z.string(),
  }),
  async execute({ inputData, runtimeContext }) {
    const { getFilePaths } = await import("../tools/GetFilePath");
    const { getFileContent } = await import("../tools/GetFile");
    const { owner, repo, tree_sha } = inputData;
    if (!getFilePaths?.execute) throw new Error("getFilePaths tool not found");
    if (!getFileContent?.execute) throw new Error("getFileContent tool not found");
    const getFileContentExec = getFileContent.execute;
    const filePaths: string[] = await getFilePaths.execute({ context: { owner, repo, tree_sha: tree_sha || "main" }, runtimeContext });
    const filesToFetch = filePaths.filter((p: string) => !p.endsWith("/")).slice(0, 10);
    const files: Array<{ path: string; content?: string }> = await Promise.all(
      filesToFetch.map(async (path: string) => {
        const res = await getFileContentExec({ context: { owner, repo, path }, runtimeContext });
        return { path, content: (res as any).ok ? (res as any).content : undefined };
      })
    );
    return { files, owner, repo };
  },
});

// Step 2: Analyze faulty code
const analyzeFaultyCodeStep = createStep({
  id: "analyze-faulty-code",
  description: "Analyze files for TODO, FIXME, console.log, or any.",
  inputSchema: z.object({
    files: z.array(FileSchema),
    owner: z.string(),
    repo: z.string(),
    tree_sha: z.string().optional().default("main"),
  }),
  outputSchema: z.object({
    problems: z.array(ProblemSchema),
    owner: z.string(),
    repo: z.string(),
    tree_sha: z.string().optional().default("main"),
  }),
  async execute({ inputData }) {
    const problems: Array<{ path: string; line: number; code: string; suggestion: string }> = [];
    for (const file of inputData.files) {
      if (!file.content) continue;
      const lines = file.content.split("\n");
      lines.forEach((line, idx) => {
        if (/TODO|FIXME|console\.log|any /.test(line)) {
          problems.push({
            path: file.path,
            line: idx + 1,
            code: line.trim(),
            suggestion: line.includes('TODO') || line.includes('FIXME')
              ? 'Resolve the TODO/FIXME with proper implementation.'
              : line.includes('console.log')
              ? 'Remove debug statements before production.'
              : line.includes('any ')
              ? 'Replace `any` with a specific type.'
              : 'Review this line for best practices.',
          });
        }
      });
    }
    return {
      problems,
      owner: inputData.owner,
      repo: inputData.repo,
      tree_sha: inputData.tree_sha ?? "main",
    };
  },
});

// Step 3: Create issues for problems
const createIssuesForProblemsStep = createStep({
  id: "create-issues-for-problems",
  description: "Create a GitHub issue for each faulty code snippet.",
  inputSchema: z.object({
    owner: z.string(),
    repo: z.string(),
    tree_sha: z.string().optional().default("main"),
    problems: z.array(ProblemSchema),
  }),
  outputSchema: z.object({
    issues: z.array(IssueSchema),
    owner: z.string(),
    repo: z.string(),
    tree_sha: z.string().optional().default("main"),
  }),
  async execute({ inputData, runtimeContext }) {
    if (!createIssue || !createIssue.execute) throw new Error("createIssue tool not found");
    const { owner, repo, problems, tree_sha } = inputData;
    const issues: Array<{ url: string; title: string; body: string }> = [];
    for (const problem of problems) {
      const title = `Code Issue in ${problem.path} at line ${problem.line}`;
      const body = `**File:** ${problem.path}\n**Line:** ${problem.line}\n\n**Problem:**\n\n${problem.code}\n\n**Suggestion:**\n${problem.suggestion}`;
      const res = await createIssue.execute({ context: { owner, repo, title, body }, runtimeContext });
      if (res && (res as any).ok) {
        issues.push({ url: (res as any).url, title, body });
      }
    }
    return { issues, owner, repo, tree_sha };
  },
});

// Step 4: Generate summary
const generateSummaryStep = createStep({
  id: "generate-summary",
  description: "Summarize the issues created.",
  inputSchema: z.object({
    issues: z.array(IssueSchema),
    owner: z.string(),
    repo: z.string(),
    tree_sha: z.string().optional().default("main"),
  }),
  outputSchema: z.object({ summary: z.string(), issues: z.array(IssueSchema) }),
  async execute({ inputData }) {
    const summary = `Created ${inputData.issues.length} issues for faulty code found during review.`;
    return { summary, issues: inputData.issues };
  },
});

export const createAddressIssueFromReview = createWorkflow({
  id: "create-address-issue-from-review",
  description: "Run a code review, highlight faulty code, and create an issue with a suggested fix.",
  inputSchema: z.object({
    owner: z.string(),
    repo: z.string(),
    tree_sha: z.string().optional().default("main"),
  }),
  outputSchema: z.object({
    summary: z.string(),
    issues: z.array(IssueSchema),
  }),
})
  .then(fetchFilesStep)
  .map(({ inputData, getInitData }) => ({
    files: inputData.files,
    owner: getInitData().owner,
    repo: getInitData().repo,
    tree_sha: getInitData().tree_sha ?? "main",
  }))
  .then(analyzeFaultyCodeStep)
  .map(({ inputData, getInitData }) => ({
    owner: inputData.owner,
    repo: inputData.repo,
    tree_sha: inputData.tree_sha ?? "main",
    problems: inputData.problems,
  }))
  .then(createIssuesForProblemsStep)
  .map(({ inputData, getInitData }) => ({
    issues: inputData.issues,
    owner: inputData.owner,
    repo: inputData.repo,
    tree_sha: inputData.tree_sha ?? "main",
  }))
  .then(generateSummaryStep)
  .commit();
