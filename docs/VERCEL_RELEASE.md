# Vercel release operations

Vercel is Copeit's canonical frontend host. The deployed site remains protected while the pilot is being built; Supabase stays the Auth, database, Storage, and Edge Function platform.

## GitHub setup

Create GitHub environments `vercel-preview` and `vercel-production`. Give `vercel-production` a named required reviewer, prevent self-approval, restrict it to `main`, and disable administrator bypass.

Add `VERCEL_TOKEN`, `VERCEL_ORG_ID`, and `VERCEL_PROJECT_ID` as secrets in both environments. Use a scoped Vercel token limited to the Copeit project. Vercel itself stores the public `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_ASK_COPEIT_MODE`, optional `VITE_SENTRY_DSN`, and `VITE_RELEASE` values. Never add Gemini, Supabase secret, database, or worker credentials to Vercel.

## Release rules

- Preview deployments run for pull requests and use the isolated staging Supabase project.
- Production promotion is manual through the protected GitHub environment and must remain `offline` until the RAG staging gate passes.
- The Vercel CSP currently permits only the staging Supabase origin. Replace it with the exact production Supabase origin only after production ownership, domain, and security review are complete.
- Keep Deployment Protection enabled until the pilot workspace and legal launch gates pass.

## Pilot workspace provisioning

Pilot users cannot create workspaces through the browser. After applying `20261030084937_pilot_workspace_provisioners.sql` to staging, add the designated initial owner to `workspace_provisioners` with a service-only administrative workflow, then let that owner create the initial tenant. Everyone else joins through an email-bound, single-use invitation code. Do not grant browser clients write access to the provisioner table.
