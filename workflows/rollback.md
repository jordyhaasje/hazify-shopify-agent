# Rollback Workflow

Rollback is file-focused.

Before pushing, record:

- Changed files.
- Target theme ID and name.
- Date and reason for push.
- A local diff or backup of previous file versions when practical.

To roll back:

1. Identify the files from the rollback note.
2. Restore only those files unless a broader revert is requested.
3. Run Theme Check.
4. Push to development or unpublished target first.
5. Publish live only after explicit approval.
