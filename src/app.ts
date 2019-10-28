import { WebhookPayloadPullRequest } from "@octokit/webhooks"
import { Application, Context, Octokit } from "probot"
import { checkStatus, PR } from "./status"

export const APP_NAME = "Moai (dev)"

export type PullRequestContext = Context<WebhookPayloadPullRequest>
export type CommitsResponse = Octokit.PullsListCommitsResponseItem[]

/**
 * Returns true in the case that the branch contains a single commit, or all
 * other commits to the branch are merge commits from the base branch.
 */
const singleCommitBranch = (
  commitsResponse: CommitsResponse,
  baseBranchName: string
): boolean => {
  if (commitsResponse.length <= 1) return true
  const mergeCommitPrefix = `Merge branch \'${baseBranchName}\' into`
  const mergeCommits = commitsResponse.filter(({ commit }) =>
    commit.message.startsWith(mergeCommitPrefix)
  )
  return mergeCommits.length === commitsResponse.length - 1
}

const analysePR = async (context: PullRequestContext): Promise<PR> => {
  const { data } = await context.github.pulls.listCommits(
    context.repo({ pull_number: context.payload.pull_request.number })
  )
  const { title, base } = context.payload.pull_request
  return singleCommitBranch(data, base.label)
    ? { title, singleCommit: true, commitMessage: data[0].commit.message }
    : { title, singleCommit: false }
}

export const updateStatus = async (context: PullRequestContext) => {
  const pr = await analysePR(context)
  const status = checkStatus(pr)
  await context.github.repos.createStatus(
    context.repo({
      sha: context.payload.pull_request.head.sha,
      context: APP_NAME,
      ...status,
    })
  )
}

export default (app: Application) => {
  app.on("pull_request.opened", updateStatus)
  app.on("pull_request.edited", updateStatus)
  app.on("pull_request.synchronize", updateStatus)
}
