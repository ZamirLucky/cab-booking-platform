
Done when:

Migrations run locally and in CI.
Applied migrations are stored in a history table.
Failed migrations return a non-zero exit code.
Database credentials come from environment variables or Secret Manager.
Task 2.2 — Create the Initial Baseline Migration

Convert the approved canonical schema into the first migration.

It should contain all approved:

Tables
Primary keys
Foreign keys
Unique constraints
Check constraints
Defaults
Indexes
Sequences
Timestamp behaviour
Required PostgreSQL extensions

Done when:

An empty database can be created using migrations only.
The generated schema matches the canonical schema.
Manual SQL from the deployment runbook is not required.
Running migrations again reports no pending changes.
Task 2.3 — Adopt the Existing Database Safely

The baseline creation migration must not be executed destructively against the existing populated database.

Create a baseline-adoption process that:

Inspects the existing schema.
Compares it with the approved baseline.
Stops if unexpected differences are found.
Records the baseline as applied only after validation succeeds.
Preserves all existing data.

Done when:

Existing tables and data are not recreated or deleted.
A schema mismatch blocks baseline adoption.
The migration-history record is created transactionally.
Backups or point-in-time recovery are confirmed first.
Task 2.4 — Define Migration Development Rules

Every database change must be delivered through a new migration. Previously released migrations must not be edited.

Use the expand-and-contract pattern:

Add compatible schema elements.
Deploy code that supports the old and new forms.
Backfill data where required.
Remove obsolete elements in a later release.

Done when:

Destructive changes require review and a recovery plan.
Long-running operations are identified before release.
Migration rollback limitations are documented.
Application rollback does not assume database rollback.
Task 2.5 — Create a Cloud Run Migration Job

Package the migration project as a containerized Cloud Run Job.

The job must have:

Cloud SQL connectivity
A least-privilege service account
Access to the database connection secret
No public endpoint
One task unless parallel execution is proven safe
An appropriate timeout

Done when:

The job applies pending migrations.
GitHub Actions can execute it and wait for completion.
Migration failure blocks service deployment.
Logs identify the migration version.
Concurrent migration execution is prevented.
Feature 3 — Add Continuous Integration

Objective: Detect dependency, application, migration and container problems before merging.

Task 3.1 — Create the CI Workflow

Create:

.github/workflows/ci.yml

Run it for pull requests and relevant pushes.

Done when:

Node.js 22 is used.
npm ci is used for locked dependency installation.
Tests run without interactive prompts.
Any required failure fails the workflow.
Workflow permissions follow least privilege.
Task 3.2 — Test Migrations with Temporary PostgreSQL

CI must:

Start a temporary PostgreSQL service.
Create an empty database.
Apply every migration.
Verify expected schema objects.
Run migrations again.
Confirm that no migration remains pending.

Done when:

A new database requires no manual SQL.
CI does not connect to Cloud SQL.
Test credentials are temporary.
Migration failures are clearly reported.
Task 3.3 — Run Service and API Tests

Run each component’s automated tests.

Adapt Newman collections where necessary to remove:

Interactive prompts
Hard-coded local URLs
Assumptions about manually running services
Production credentials
Production data dependencies

Mock or isolate paid third-party APIs where practical.

Done when:

Tests are deterministic.
Production secrets are not required.
Failure output identifies the affected service.
Tests cannot change production data.
Task 3.4 — Build All Containers

Build the seven component images without pushing them.

Done when:

Every Dockerfile builds with Node.js 22.
Build contexts are correct.
Containers follow the Cloud Run PORT contract.
Any container failure blocks merging.
Task 3.5 — Protect the Main Branch

Enable branch protection after CI is stable.

Done when:

Required checks must pass before merging.
Unreviewed direct changes are restricted.
An emergency administrator process is documented.
Feature 4 — Secure GitHub-to-Google Authentication

Objective: Authenticate GitHub Actions without storing a service-account key in GitHub.

Task 4.1 — Configure Workload Identity Federation

Create:

Workload identity pool
Workload identity provider
Deployment service account
Repository-specific trust conditions

Restrict access to the intended repository and approved branch or GitHub environment.

Done when:

No JSON service-account key is stored in GitHub.
Untrusted repositories and branches cannot impersonate the account.
Authentication succeeds from an approved workflow.
Terraform manages the configuration after adoption.
Task 4.2 — Apply Least-Privilege IAM

Separate permissions for:

CI validation
Container image building
Artifact Registry publishing
Cloud Run deployment
Cloud Run Job execution
Cloud SQL connectivity
Terraform planning and application

Done when:

Routine workflows do not use Owner or Editor.
Service-account impersonation is restricted.
Runtime services cannot modify infrastructure.
IAM changes are reviewable.
Task 4.3 — Configure GitHub Environments

Create a production GitHub environment and optionally staging.

Production may require manual approval.

Done when:

Production settings are separated from CI.
Runtime secrets remain in Secret Manager.
Production deployments can require approval.
Project and region settings do not duplicate secret values.
Feature 5 — Automate Application Releases

Objective: Deploy a verified release after changes reach the main branch.

Task 5.1 — Create the Deployment Workflow

Create:

.github/workflows/deploy.yml

Initially use workflow_dispatch because Cloud SQL is normally stopped when the application is not being used.

Automatic deployment following a merge to main can be enabled after several successful controlled releases.

Done when:

The production GitHub environment is used.
Only one production deployment runs at a time.
A newer workflow cannot interrupt an active migration.
Missing authentication or configuration fails early.
Task 5.2 — Build Immutable Images

Build each image once and tag it with the Git commit SHA.

A readable release tag may also be added, but latest must not be the only deployment identifier.

Done when:

Every deployed revision maps to an exact commit.
The tested image is the deployed image.
An image-publishing failure blocks deployment.
Artifact names are consistent across workflows and Terraform.
Task 5.3 — Add the Migration Gate

Before deploying application revisions:

Check whether Cloud SQL is running.
Start it when required by the cost-control process.
Execute the migration job.
Wait for the migration result.
Stop deployment if migration fails.

Done when:

Application deployment cannot continue after migration failure.
Migration logs can be found from the workflow.
Pending migrations apply exactly once.
The workflow distinguishes migration failures from application failures.
Task 5.4 — Deploy Services in Dependency Order

Use the following initial deployment order:

customer-service
fare-estimation-service
booking-service
payment-service
location-service
gateway-service
web-app

Independent backend deployments may be parallelized later after the sequential process is proven reliable.

Done when:

Backend services remain private.
Gateway and web retain their intended public access.
Service URLs are correct.
Environment variables are correct.
Secret Manager references are preserved.
Health checks pass before dependent components continue.
Task 5.5 — Add Hosted Smoke Tests

Minimum smoke tests should confirm that:

The web application loads.
The Gateway health endpoint responds.
Registration works using disposable test data.
Login works.
An authenticated request reaches a private backend through Gateway.
A database-backed operation succeeds.

Avoid paid third-party API calls unless a safe testing mode exists.

Done when:

A critical user-flow failure fails the workflow.
Test data is identifiable and can be cleaned safely.
Private services are not made public for testing.
Secrets are masked in logs.
Task 5.6 — Define Application Rollback

Record the previous successful image digest or Cloud Run revision for every service.

Rollback means routing traffic to a previous compatible revision. It does not automatically reverse a database migration.

Done when:

A previous compatible revision can be restored.
Database compatibility is checked before rollback.
Failed smoke tests stop further rollout.
Destructive database rollback is never automatic.
Feature 6 — Manage Infrastructure with Terraform

Objective: Adopt the existing Google Cloud environment without recreating production resources.

Task 6.1 — Create the Terraform Structure

Recommended structure:

infrastructure/
└── terraform/
    ├── bootstrap/
    ├── environments/
    │   └── production/
    ├── modules/
    └── README.md

Pin the Terraform and Google provider versions.

Done when:

terraform fmt succeeds.
terraform validate succeeds.
Variables contain no secret values.
Resource names match the existing deployment.
Project and region are explicit inputs.
Task 6.2 — Bootstrap Remote State

Create a protected Cloud Storage state bucket with:

Restricted IAM
Object versioning
Recovery capability
Concurrency protection

The bootstrap process may initially be performed manually.

Done when:

Terraform state is not committed to Git.
State access is restricted.
Previous state versions can be recovered.
Concurrent infrastructure applies are controlled.
Task 6.3 — Model and Import Existing Resources

Write matching Terraform configuration before importing resources.

Import where appropriate:

Artifact Registry
Cloud Run services
Cloud Run migration job
Cloud SQL instance
Cloud SQL database
Service accounts
IAM bindings
Secret containers
Workload Identity Federation
Required Google Cloud APIs

Secret payload values must not be imported into Terraform.

Done when:

Cloud SQL is not recreated or deleted.
The first reviewed plan contains no unexpected destructive action.
Existing access behaviour remains unchanged.
Production data is unaffected.
Task 6.4 — Create the Terraform Workflow

Create:

.github/workflows/terraform.yml

Pull requests should run:

terraform fmt -check
terraform validate
terraform plan

Terraform apply should initially require workflow_dispatch and production approval.

Done when:

Plans are reviewable without exposing secrets.
Apply uses the reviewed commit.
Application deployment does not automatically run Terraform apply.
A failed plan blocks apply.
Task 6.5 — Add Drift and Lifecycle Protection

Protect critical resources, especially Cloud SQL.

Done when:

Database deletion protection is enabled where supported.
Unexpected resource replacement blocks approval.
Manual console changes appear in later Terraform plans.
Application image updates do not produce false infrastructure drift.
Feature 7 — Add Operational and Security Controls

Objective: Make automation safe to operate and troubleshoot.

Task 7.1 — Add Release Traceability

Record:

Git commit SHA
Container image digest
Workflow run
Migration version
Cloud Run revision
Deployment result

Done when:

Every production revision can be traced to source.
Migration failures can be diagnosed.
Logs do not expose credentials.
Task 7.2 — Protect Secrets

Use Secret Manager for runtime secrets.

GitHub environment secrets should only be used when Workload Identity Federation or non-secret configuration cannot provide the value.

Done when:

Secrets are absent from workflow YAML.
Secrets are absent from Terraform values and state.
Secrets are absent from container build arguments.
Secrets are masked in logs.
Secret rotation does not require source-code changes.
Task 7.3 — Preserve Database Recovery

Verify Cloud SQL backups and point-in-time recovery before:

Baseline adoption
Destructive migrations
Long-running data migrations
Terraform import or major infrastructure changes

Done when:

Recovery settings are documented.
Restore is tested outside production where practical.
High-risk migrations include a recovery checkpoint.
Task 7.4 — Preserve Cost Controls

Cloud SQL may remain stopped while the academic application is not needed.

Cloud Run minimum instances should remain 0 unless availability requirements change.

Done when:

Deployment checks or starts Cloud SQL before migrations.
Stopping Cloud SQL is not confused with deleting it.
Terraform does not unintentionally increase database size.
Terraform does not unintentionally increase minimum instances.
Scheduled startup and shutdown are introduced only when justified.
Task 7.5 — Document the Timer Limitation

Booking Service uses in-memory timers for delayed cab-ready notifications.

A Cloud Run revision change or instance shutdown can lose pending timers.

Durable scheduling using Cloud Tasks, Pub/Sub, or persisted scheduled events should be treated as a separate future improvement.

Done when:

The deployment plan does not claim to solve timer durability.
The remaining limitation is visible.
Timer redesign does not block deployment automation unless it becomes a release requirement.
6. Expected Repository Additions
.github/
└── workflows/
    ├── ci.yml
    ├── deploy.yml
    └── terraform.yml

database/
├── Dockerfile
├── README.md
├── package.json
├── package-lock.json
├── migrations/
│   └── 001_initial_schema.js
└── scripts/
    ├── check-schema.js
    └── verify-baseline.js

infrastructure/
└── terraform/
    ├── bootstrap/
    ├── environments/
    │   └── production/
    ├── modules/
    └── README.md

scripts/
└── smoke-test.js

Exact names may change during implementation, but the separation of responsibilities should remain.

7. Recommended Implementation Order
   Phase	Work	Release gate
   Phase 1	Tasks 1.1–1.4: inventory, schema, Node.js 22 and ownership	The existing application still builds and runs.
   Phase 2	Tasks 2.1–2.4: migration package and baseline	A fresh database can be created and the existing schema can be validated.
   Phase 3	Tasks 3.1–3.4: CI, tests and container builds	Pull-request tests and all seven builds pass.
   Phase 4	Tasks 4.1–4.3 and 2.5: federation, IAM, environments and migration job	Keyless authentication and migration-job execution succeed.
   Phase 5	Tasks 5.1–5.6: release automation	A manually triggered production deployment succeeds from start to finish.
   Phase 6	Tasks 6.1–6.5: Terraform adoption	Existing resources are imported without an unexpected destructive plan.
   Phase 7	Tasks 3.5 and 7.1–7.5: enforcement and operations	Required checks and operational safeguards are active.
8. Definition of Done

The limitation is considered resolved when:

Database changes are stored as ordered, versioned migrations.
An empty database can be created using migrations only.
The existing Cloud SQL database has been safely baselined.
Pull requests test migrations.
Pull requests build all seven containers.
GitHub Actions authenticates using Workload Identity Federation.
Release images use immutable commit tags or digests.
The migration job runs before service deployment.
A failed migration prevents application rollout.
Services deploy in the correct dependency order.
Hosted smoke tests validate critical user flows.
Existing Google Cloud infrastructure is represented in Terraform state.
Terraform produces a reviewable plan before apply.
Secret values are absent from Git and Terraform state.
Production deployments cannot overlap.
Application and database rollback limitations are documented.
The manual deployment runbook remains available for recovery.
9. Key Decisions and Cautions
Central Migration Sequence

Use one central migration sequence initially because all services share one PostgreSQL database.

Separate per-service migrations would introduce ordering and ownership problems without providing database isolation.

Manual Deployment Trigger First

Begin with workflow_dispatch while Cloud SQL is normally stopped.

Enable deployment following merges to main only after the controlled workflow has been tested successfully several times.

Import Existing Infrastructure

Write Terraform configuration and import existing resources.

Do not recreate the production database merely to place it under Terraform management.

Database-Compatible Rollback

Rolling back a Cloud Run revision does not reverse a database migration.

Production migrations must remain compatible with the previously deployed application revision during the release window.

Deployment Concurrency

Use GitHub Actions concurrency controls and migration locking.

Only one production release and one production migration may run simultaneously.

Remaining Timer Risk

Cloud Run deployments can terminate instances and lose in-memory Booking Service timers.

Timer durability remains separate from this automation limitation.

10. Official References
    GitHub Actions
    Google authentication for GitHub Actions
    Cloud Run continuous deployment
    Create Cloud Run Jobs
    Execute Cloud Run Jobs
    Cloud Run service identity
    Connect Cloud Run to Cloud SQL
    Workload Identity Federation
    Artifact Registry
    Secret Manager
    Terraform Google provider
    Terraform import
    node-pg-migrate
11. Final Recommendation

Implement the work through three major milestones:

Migration readiness
Confirm the production schema.
Resolve the event_log inconsistency.
Standardize Node.js 22.
Add versioned migrations.
Prove that migrations can create a fresh database.
Safe application delivery
Add continuous integration.
Configure Workload Identity Federation.
Add the Cloud Run migration job.
Build immutable images.
Deploy services in dependency order.
Run hosted smoke tests.
Infrastructure adoption
Model the existing environment in Terraform.
Import existing resources safely.
Introduce reviewed Terraform plans.
Require controlled approval before infrastructure changes.

This order addresses the highest risk first: an application release must never run before the database state is understood, versioned, and safely migratable.
