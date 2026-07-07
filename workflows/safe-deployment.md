# Safe Deployment Workflow

Before pushing theme changes:

1. Review changed files.
2. Run `npm run theme:check`.
3. Create a rollback note under `.hazify/rollback/`.
4. Confirm the target theme is development or unpublished.
5. Push to that target only.
6. Share the preview/admin URL or next verification step.

Live theme pushes require explicit user approval that names the live target.
