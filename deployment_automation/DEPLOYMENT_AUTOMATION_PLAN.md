
# Deployment Automation Plan

## 1. Purpose

This document defines the implementation plan for resolving the following limitation in the `cab-booking-platform` repository:

> Infrastructure and database migrations are not automated in the repository.

The plan converts the existing manual Google Cloud deployment into a secure, repeatable, testable, and reviewable deployment process.

The existing Google Cloud deployment runbook should remain available for manual recovery and troubleshooting.

---

## 2. Current State

The platform contains seven deployable components:

1. `customer-service`
2. `booking-service`
3. `payment-service`
4. `fare-estimation-service`
5. `location-service`
6. `gateway-service`
7. `web-app`

The deployed environment uses:

- Google Cloud Run
- Cloud Build
- Artifact Registry
- Cloud SQL for PostgreSQL
- Secret Manager
- IAM service accounts
- Region: `europe-west10`

The repository already contains Dockerfiles, tests, Postman collections, and deployment documentation. However, it does not currently contain:

- Versioned database migrations
- Pull-request CI checks
- Automated application releases
- Terraform configuration
- Workload Identity Federation for GitHub Actions
- An automated Cloud Run migration job
- Automated hosted smoke tests

### Known issues that must be resolved first

1. The Dockerfiles use Node.js 20, but locked dependencies in Gateway, Booking, and Payment require Node.js 22 or later.
2. The deployment documentation refers to an `event_log` table in a verification query, but the main schema section does not create it. The live database schema must be inspected before approving the migration baseline.

---

## 3. Target Outcome

| Capability             | Target result                                                                                                         |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Continuous integration | Every pull request validates dependencies, tests, migrations, and all seven container builds.                         |
| Database migrations    | Schema changes are versioned, tested, recorded, and applied before services are deployed.                             |
| Application delivery   | A release builds immutable images, runs migrations, deploys services in order, and runs smoke tests.                  |
| Infrastructure as code | Existing Google Cloud resources are adopted and managed through Terraform without recreating the production database. |

---

## 4. Target Release Flow

1. A developer opens a pull request.
2. CI installs locked dependencies using Node.js 22.
3. CI starts a temporary PostgreSQL database.
4. CI applies every migration to the empty database.
5. CI runs automated tests.
6. CI builds all seven containers without publishing them.
7. The reviewed pull request is merged.
8. The deployment workflow authenticates using Workload Identity Federation.
9. Images are built and tagged with the Git commit SHA.
10. Images are pushed to Artifact Registry.
11. The Cloud Run migration job runs.
12. The workflow waits for migration success.
13. The five backend services are deployed.
14. `gateway-service` is deployed.
15. `web-app` is deployed.
16. Hosted health checks and smoke tests run.
17. The release succeeds only when every required check passes.

Production deployments must be serialized. Two workflows must not run production migrations or update production services simultaneously.

---

# 5. Features and Tasks

## Feature 1 — Confirm the Deployment Baseline

**Objective:** Establish an accurate starting point before introducing automation.

### Task 1.1 — Inventory Google Cloud Resources

Record the current configuration of:

- Cloud Run services and revisions
- Artifact Registry repositories
- Cloud Build service account
- Cloud SQL instance, database and users
- Secret Manager secret references
- Runtime and deployment service accounts
- IAM bindings
- Public and private access
- Environment variables
- CPU and memory
- Minimum and maximum instances
- Concurrency and timeout settings

**Deliverable:** A resource inventory mapping every existing resource to its future Terraform resource.

**Done when:**

- All seven components are included.
- Existing resource names are confirmed.
- The `europe-west10` region is confirmed.
- No secret values are copied into the repository.
- Public and private access matches the working deployment.

### Task 1.2 — Reconcile the Database Schema

Compare the live Cloud SQL schema with:

- SQL from the deployment runbook
- Database usage documented by each service
- SQL queries in the application
- Expected foreign keys
- Indexes
- Defaults
- Check and unique constraints
- Sequences and generated identifiers

The `event_log` inconsistency must be resolved.

**Deliverable:** An approved canonical database schema and schema comparison report.

**Done when:**

- Every production schema object is accounted for.
- The status of `event_log` is documented.
- Unintended differences are corrected.
- The approved schema supports all current services.

### Task 1.3 — Standardize Node.js 22

Update:

- All Dockerfiles
- CI configuration
- Package engine declarations
- Local-development instructions
- Deployment documentation

**Deliverable:** One Node.js runtime policy across the repository.

**Done when:**

- `npm ci` succeeds for every package.
- Every container builds.
- Gateway, Booking and Payment meet their dependency requirements.
- Documentation identifies Node.js 22 as the supported version.

### Task 1.4 — Define Configuration Ownership

| Configuration                                                                                    | Owner                                                 |
| ------------------------------------------------------------------------------------------------ | ----------------------------------------------------- |
| Cloud SQL, IAM, service accounts, Artifact Registry, secret containers and Cloud Run definitions | Terraform                                             |
| Application image tag or digest                                                                  | Deployment workflow                                   |
| Secret values                                                                                    | Secret Manager administration outside Terraform state |
| Database schema                                                                                  | Versioned migrations                                  |
| Emergency deployment procedure                                                                   | Manual deployment runbook                             |

**Done when:**

- Terraform and deployment commands do not overwrite each other.
- Secret values are excluded from Git and Terraform state.
- Application releases do not create unmanaged infrastructure drift.

---

## Feature 2 — Introduce Versioned Database Migrations

**Objective:** Make database creation and schema evolution repeatable and traceable.

### Task 2.1 — Add a Central Migration Package

Use one repository-level migration package because the services share one PostgreSQL database.

A suitable Node.js migration tool is `node-pg-migrate`. The selected version must be locked.

Recommended structure:

```text
database/
├── Dockerfile
├── README.md
├── package.json
├── package-lock.json
├── migrations/
└── scripts/
```
