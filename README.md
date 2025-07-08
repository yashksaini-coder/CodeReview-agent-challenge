# CodeReview Agent: 


![Agent-101](./assets/NosanaBuildersChallengeAgents.jpg)

## Agent Overview

The **CodeReview Agent** is an AI-powered GitHub assistant that automates code review, repository analysis, and developer productivity tasks. It leverages multiple tools to fetch repository data, analyze code, review pull requests, and create actionable GitHub issues.

**Key Features:**
- Automated code review and issue creation for code smells, TODOs, and best practices.
- Fetches and summarizes user and repository statistics.
- Analyzes contribution activity over time.
- Supports pull request review, commenting, and creation.
- Can fork and create repositories programmatically.

---

## Tools (`src/mastra/tools/`)

### GitHub User Tools
- **getGitHubUserTool**: Fetch detailed GitHub user profile information.
- **getUserContributionActivityTool**: Summarize a user's contribution activity (commits, PRs, issues, repos, forks) for a given period (7d, 14d, 30d).

### Repository Tools
- **getRepositoryCommits**: List commits for a repository.
- **createRepository**: Create a new repository for the authenticated user.
- **forkRepository**: Fork a repository to the authenticated user's account.

### File Tools
- **getFileContent**: Fetch and decode file content from a repository.
- **getFilePaths**: List all file paths in a repository (by tree SHA or branch).

### Pull Request Tools
- **getRepositoryPullRequests**: List pull requests for a repository.
- **summarizePullRequests**: Summarize pull requests (counts and summary string).
- **reviewPullRequest**: Submit a review for a pull request (approve, request changes, or comment).
- **createPullRequest**: Create a new pull request in a repository.
- **commentOnPullRequest**: Add a comment to a pull request.

### Issue Tools
- **getRepositoryIssues**: List issues for a repository (excluding pull requests).
- **createIssue**: Create a new issue in a repository.
- **commentOnIssue**: Add a comment to an issue.
- **summarizeIssues**: Summarize issues (counts and summary string).

---

## Workflows (`src/mastra/workflows/`)

- **ghProfile**: Fetch a user's GitHub profile and return structured profile data.
- **createAddressIssueFromReview**: Fetch files from a repository, analyze for code smells (e.g., TODO, FIXME, `any`, `console.log`), and automatically create GitHub issues with suggested fixes.
- **ContributionWorkflow**: Summarize a user's contribution activity (commits, PRs, issues, repos, forks) for a specified period (7, 14, or 30 days).

---

## Agent Entrypoint (`src/mastra/agents/index.ts`)

The main agent, `githubAgent`, is configured with all the above tools and workflows. It is registered in `src/mastra/index.ts` as part of the Mastra application.

---

## Configuration (`src/mastra/config.ts`)

The agent uses the following environment variables (with defaults):
- `MODEL_NAME_AT_ENDPOINT` (default: `qwen2.5:1.5b`)
- `API_BASE_URL` (default: `http://127.0.0.1:11434/api`)

These control the LLM model and API endpoint used for chat and code review.

---

## Docker Usage

A `Dockerfile` is provided for easy containerized deployment. The image installs Node.js, dependencies, and Ollama for LLM inference.

### Build the Docker image:
```sh
docker build -t codereview-agent .
```

### Run the container:
```sh
docker run -p 8080:8080 \
  -e MODEL_NAME_AT_ENDPOINT=qwen2.5:1.5b \
  -e API_BASE_URL=http://127.0.0.1:11434/api \
  codereview-agent
```

- The container will start the Ollama service, pull the specified model, and launch the agent on port 8080.
- You can override the model or API endpoint by setting the environment variables above.

---

## Project Structure

- `src/mastra/tools/` — All GitHub and file tools
- `src/mastra/workflows/` — Workflows for code review, profile, and contribution analysis
- `src/mastra/agents/` — Agent entrypoint and registration
- `src/mastra/config.ts` — Model and API configuration
- `Dockerfile` — Container build and run instructions

---

## Installation & Setup

You can run the CodeReview Agent locally or with Docker.

### 1. Local Setup (pnpm)

#### Prerequisites
- [Node.js](https://nodejs.org/) (v18+ recommended)
- [pnpm](https://pnpm.io/) (install globally if not present)

```sh
npm install -g pnpm
```

#### Install dependencies
```sh
pnpm install
```

#### Build the project
```sh
pnpm run build
```

#### Run the agent (development mode)
```sh
pnpm run dev
```

### 2. Environment Variables

Create a `.env` file in the project root (or set these variables in your environment):

```env
MODEL_NAME_AT_ENDPOINT=qwen2.5:1.5b
API_BASE_URL=http://127.0.0.1:11434/api
```
- `MODEL_NAME_AT_ENDPOINT`: The LLM model to use (default: `qwen2.5:1.5b`).
- `API_BASE_URL`: The base URL for the Ollama API (default: `http://127.0.0.1:11434/api`).

You can change these to use a different model or endpoint as needed.

### 3. LLM Endpoint
The CodeReview Agent relies on a Large Language Model (LLM) to perform its tasks, such as code analysis, summarization, and issue creation. The agent is designed to work with any LLM that supports the OpenAI API format, but it is optimized for the `qwen2.5:1.5b` model provided by Ollama.

#### Nosana Endpoint

You can use the following endpoint and model for testing, if you wish:

```
MODEL_NAME_AT_ENDPOINT=qwen2.5:1.5b
API_BASE_URL= https://dashboard.nosana.com/jobs/GPVMUckqjKR6FwqnxDeDRqbn34BH7gAa5xWnWuNH1drf
```

#### Running Your Own LLM with Ollama

The default configuration uses a local [Ollama](https://ollama.com) LLM.
For local development or if you prefer to use your own LLM, you can use [Ollama](https://ollama.ai) to serve the lightweight `qwen2.5:1.5b` mode.

**Installation & Setup:**

1. **[ Install Ollama ](https://ollama.com/download)**:

2. **Start Ollama service**:

```bash
ollama serve
```

3. **Pull and run the `qwen2.5:1.5b` model**:

```bash
ollama pull qwen2.5:1.5b
ollama run qwen2.5:1.5b
```

4. **Update your `.env` file**

There are two predefined environments defined in the `.env` file. One for local development and another, with a larger model, `qwen2.5:32b`, for more complex use cases.

**Why `qwen2.5:1.5b`?**

- Lightweight (only ~1GB)
- Fast inference on CPU
- Supports tool calling
- Great for development and testing

Do note `qwen2.5:1.5b` is not suited for complex tasks.

The Ollama server will run on `http://localhost:11434` by default and is compatible with the OpenAI API format that Mastra expects.


### 4. Docker Setup

A `Dockerfile` is provided for containerized deployment.

#### Build the Docker image

```sh
docker build -t codereview-agent .
```

#### Run the container

```sh

docker run -p 8080:8080 \
  -e MODEL_NAME_AT_ENDPOINT=qwen2.5:1.5b \
  -e API_BASE_URL=http://127.0.0.1:11434/api \
  codereview-agent
```

- The container will start the Ollama service, pull the specified model, and launch the agent on port 8080.
- You can override the model or API endpoint by setting the environment variables above.



## Nosana Deployment

- Deploy your Docker container on Nosana
- Your agent must successfully run on the Nosana network
- Include the Nosana job ID or deployment link

##### Nosana Job Definition

We have included a Nosana job definition at <./nos_job_def/nosana_mastra.json>, that you can use to publish your agent to the Nosana network.

**A. Deploying using [@nosana/cli](https://github.com/nosana-ci/nosana-cli/)**

- Edit the file and add in your published docker image to the `image` property. `"image": "docker.io/yourusername/agent-challenge:latest"`
- Download and install the [@nosana/cli](https://github.com/nosana-ci/nosana-cli/)
- Load your wallet with some funds
  - Retrieve your address with: `nosana address`
  - Go to our [Discord](https://nosana.com/discord) and ask for some NOS and SOL to publish your job.
- Run: `nosana job post --file nosana_mastra.json --market nvidia-3060 --timeout 30`
- Go to the [Nosana Dashboard](https://dashboard.nosana.com/deploy) to see your job

**B. Deploying using the [Nosana Dashboard](https://dashboard.nosana.com/deploy)**

- Make sure you have https://phantom.com/, installed for your browser.
- Go to our [Discord](https://nosana.com/discord) and ask for some NOS and SOL to publish your job.
- Click the `Expand` button, on the [Nosana Dashboard](https://dashboard.nosana.com/deploy)
- Copy and Paste your edited Nosana Job Definition file into the Textarea
- Choose an appropriate GPU for the AI model that you are using
- Click `Deploy`



This agent is deployed on the [Nosana Builders Challenge](https://builders.nosana.io/) platform, which provides a serverless environment for running AI agents.
For more information, visit the [Nosana Builders Challenge](https://builders.nosana.io/) website.

---

<h2>Developers</h2>
<div align="center">    
<table>
    <tbody>
        <tr>
            <td align="center" width="33.33%">
                <img src="https://avatars.githubusercontent.com/u/115717039?v=4" width="130px;"/>
                <br/>
                <h4 align="center">
                    <b>Yash K. Saini</b>
                </h4>
                <div align="center">
                    <a href="https://linkedin.com/in/yashksaini"><img src="https://skillicons.dev/icons?i=linkedin" width="25" alt="LinkedIn"/></a>
                    <a href="https://twitter.com/yash_k_saini"><img src="https://skillicons.dev/icons?i=twitter" width="25" alt="Twitter"/></a>
                    <a href="https://github.com/yashksaini-coder"><img src="https://skillicons.dev/icons?i=github" width="25" alt="GitHub"/></a>
                </div>
            </td>
            <td align="left" valign="middle" width="70%">
                <ul>
                    <li>
                        A self-taught software developer and a computer science student from India.
                    </li>
                    <li>
                        Building products & systems that can benefit & solve problems for many other DEVs.
                    </li>
                    <li>
                        Passionate about AI, Open Source, and building scalable systems.
                    </li>
                </ul>
            </td>
        </tr>
    </tbody>
</table>