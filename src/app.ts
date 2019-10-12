import { Application } from "probot"

export default (app: Application) => {
  app.on("issues.opened", async context => {
    const issueComment = context.issue({
      body: ":moyai:",
    })
    await context.github.issues.createComment(issueComment)
  })
}