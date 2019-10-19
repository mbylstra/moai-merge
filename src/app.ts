import { WebhookPayloadPullRequest } from "@octokit/webhooks"
import { Application, Context } from "probot"
import { checkStatus, PR } from "./status"

export const APP_NAME = "Moai"

export type PullRequestContext = Context<WebhookPayloadPullRequest>

const analysePR = async (context: PullRequestContext): Promise<PR> => {
  const { data } = await context.github.pulls.listCommits(
    context.repo({ pull_number: context.payload.pull_request.number })
  )
  const { title } = context.payload.pull_request
  return data.length > 1
    ? { title, singleCommit: false }
    : { title, singleCommit: true, commitMessage: data[0].commit.message }
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
