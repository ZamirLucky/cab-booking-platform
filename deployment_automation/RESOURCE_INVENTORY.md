# Google Cloud Resource Inventory

## 1. Purpose

This document records the existing Google Cloud resources for the mCabs deployment before Terraform adoption. It is the baseline for Feature 1, Task 1.1 of the deployment automation plan.

Terraform adoption must import or reference the existing resources. It must not recreate the production Cloud SQL instance, databases, secrets, or deployed services.

No secret values are recorded in this document.

## 2. Environment

| Setting | Current value |
| --- | --- |
| Google Cloud project ID | `mcabs-496514` |
| Project display name | `mCabs` |
| Project number | `30500860100` |
| Project lifecycle | `ACTIVE` |
| Primary region | `europe-west10` |

## 3. Cloud Run Services

The deployment contains seven Cloud Run services. The logical `web-app` component is deployed with the service name `cab-booking-web`; Terraform must preserve the deployed service name.

Common configuration across all seven services:

- CPU: `1`
- Memory: `256Mi`
- Container concurrency: `20`
- Request timeout: `60` seconds
- Minimum instances: `0` (no minimum-scale annotation is configured)
- Maximum instances: `1`
- Execution environment: first generation (`gen1`)
- Startup CPU boost: enabled
- Ingress: `all`
- Traffic: 100% to the latest ready revision

| Logical component | Existing Cloud Run service | Latest ready revision | Access | Runtime service account | Cloud SQL connection | Future Terraform address |
| --- | --- | --- | --- | --- | --- | --- |
| Booking | `booking-service` | `booking-service-00001-dtp` | Private | `cab-app-user-service-account@mcabs-496514.iam.gserviceaccount.com` | `dp-cab-postgres` | `google_cloud_run_v2_service.booking` |
| Customer | `customer-service` | `customer-service-00002-4p9` | Private | `cab-app-user-service-account@mcabs-496514.iam.gserviceaccount.com` | `dp-cab-postgres` | `google_cloud_run_v2_service.customer` |
| Fare estimation | `fare-estimation-service` | `fare-estimation-service-00001-v4j` | Private | `cab-app-user-service-account@mcabs-496514.iam.gserviceaccount.com` | None | `google_cloud_run_v2_service.fare_estimation` |
| Payment | `payment-service` | `payment-service-00001-48q` | Private | `cab-app-user-service-account@mcabs-496514.iam.gserviceaccount.com` | `dp-cab-postgres` | `google_cloud_run_v2_service.payment` |
| Location | `location-service` | `location-service-00001-gn8` | Private | `cab-app-user-service-account@mcabs-496514.iam.gserviceaccount.com` | `dp-cab-postgres` | `google_cloud_run_v2_service.location` |
| Gateway | `gateway-service` | `gateway-service-00001-g7v` | Public | `cab-app-user-service-account@mcabs-496514.iam.gserviceaccount.com` | None | `google_cloud_run_v2_service.gateway` |
| Web application | `cab-booking-web` | `cab-booking-web-00001-ctn` | Public | `30500860100-compute@developer.gserviceaccount.com` | None | `google_cloud_run_v2_service.web` |

Public access means the service IAM policy contains `roles/run.invoker` for `allUsers`. Private services do not contain that binding. Ingress `all` does not bypass Cloud Run IAM authentication.

### 3.1 Retained revisions

| Service | Revision | Created (UTC) | Current traffic |
| --- | --- | --- | --- |
| `booking-service` | `booking-service-00001-dtp` | `2026-09-06T22:23:07.114905Z` | 100% |
| `customer-service` | `customer-service-00002-4p9` | `2026-09-06T00:47:17.857518Z` | 100% |
| `customer-service` | `customer-service-00001-257` | `2026-09-05T20:58:05.299551Z` | 0% |
| `fare-estimation-service` | `fare-estimation-service-00001-v4j` | `2026-09-05T20:26:57.723558Z` | 100% |
| `payment-service` | `payment-service-00001-48q` | `2026-09-07T09:53:24.472130Z` | 100% |
| `location-service` | `location-service-00001-gn8` | `2026-09-07T21:19:10.745336Z` | 100% |
| `gateway-service` | `gateway-service-00001-g7v` | `2026-09-07T23:02:44.552324Z` | 100% |
| `cab-booking-web` | `cab-booking-web-00001-ctn` | `2026-09-07T23:23:54.358202Z` | 100% |

Cloud Run revisions are generated deployment artifacts. Terraform will manage each service definition, while the deployment workflow will update application image digests and create revisions.

## 4. Environment Configuration

### 4.1 Plain configuration

| Service | Setting | Current value |
| --- | --- | --- |
| `booking-service` | `NODE_ENV` | `production` |
| `booking-service` | `INSTANCE_CONNECTION_NAME` | `mcabs-496514:europe-west10:dp-cab-postgres` |
| `booking-service` | `DB_USER` | `cab_app_user` |
| `booking-service` | `DB_NAME` | `cab_booking_db` |
| `booking-service` | `CUSTOMER_SERVICE_URL` | `https://customer-service-4gyesql2qa-oe.a.run.app` |
| `customer-service` | `NODE_ENV` | `production` |
| `customer-service` | `INSTANCE_CONNECTION_NAME` | `mcabs-496514:europe-west10:dp-cab-postgres` |
| `customer-service` | `DB_USER` | `cab_app_user` |
| `customer-service` | `DB_NAME` | `cab_booking_db` |
| `fare-estimation-service` | `NODE_ENV` | `production` |
| `fare-estimation-service` | `FARE_API_URL` | `https://taxi-fare-calculator.p.rapidapi.com/search-geo?dep_lat=52.50&dep_lng=13.43&arr_lat=52.47&arr_lng=13.63` |
| `fare-estimation-service` | `FARE_API_HOST` | `taxi-fare-calculator.p.rapidapi.com` |
| `payment-service` | `NODE_ENV` | `production` |
| `payment-service` | `INSTANCE_CONNECTION_NAME` | `mcabs-496514:europe-west10:dp-cab-postgres` |
| `payment-service` | `DB_USER` | `cab_app_user` |
| `payment-service` | `DB_NAME` | `cab_booking_db` |
| `payment-service` | `FARE_SERVICE_URL` | `https://fare-estimation-service-4gyesql2qa-oe.a.run.app` |
| `location-service` | `NODE_ENV` | `production` |
| `location-service` | `INSTANCE_CONNECTION_NAME` | `mcabs-496514:europe-west10:dp-cab-postgres` |
| `location-service` | `DB_USER` | `cab_app_user` |
| `location-service` | `DB_NAME` | `cab_booking_db` |
| `location-service` | `WEATHER_API_BASE_URL` | `https://api.weatherapi.com/v1` |
| `gateway-service` | `NODE_ENV` | `production` |
| `gateway-service` | `CUSTOMER_SERVICE_URL` | `https://customer-service-4gyesql2qa-oe.a.run.app` |
| `gateway-service` | `BOOKING_SERVICE_URL` | `https://booking-service-4gyesql2qa-oe.a.run.app` |
| `gateway-service` | `PAYMENT_SERVICE_URL` | `https://payment-service-4gyesql2qa-oe.a.run.app` |
| `gateway-service` | `FARE_SERVICE_URL` | `https://fare-estimation-service-4gyesql2qa-oe.a.run.app` |
| `gateway-service` | `LOCATION_SERVICE_URL` | `https://location-service-4gyesql2qa-oe.a.run.app` |
| `cab-booking-web` | `NODE_ENV` | `production` |
| `cab-booking-web` | `GATEWAY_URL` | `https://gateway-service-4gyesql2qa-oe.a.run.app` |

These settings will be represented as non-sensitive Terraform variables, locals, or service outputs. Service URLs should be derived from Terraform-managed Cloud Run services where practical.

### 4.2 Secret references

| Service | Environment variable | Secret | Version currently referenced |
| --- | --- | --- | --- |
| `booking-service` | `DB_PASSWORD` | `cab-db-password` | `latest` |
| `booking-service` | `JWT_SECRET` | `cab-jwt-secret` | `latest` |
| `customer-service` | `DB_PASSWORD` | `cab-db-password` | `latest` |
| `customer-service` | `JWT_SECRET` | `cab-jwt-secret` | `latest` |
| `fare-estimation-service` | `FARE_API_KEY` | `cab-rapidapi-key` | `latest` |
| `payment-service` | `DB_PASSWORD` | `cab-db-password` | `latest` |
| `payment-service` | `JWT_SECRET` | `cab-jwt-secret` | `latest` |
| `location-service` | `DB_PASSWORD` | `cab-db-password` | `latest` |
| `location-service` | `JWT_SECRET` | `cab-jwt-secret` | `latest` |
| `location-service` | `WEATHER_API_KEY` | `cab-weatherapi-key` | `latest` |
| `gateway-service` | `JWT_SECRET` | `cab-jwt-secret` | `latest` |
| `cab-booking-web` | None | None | Not applicable |

Secret containers will be managed by Terraform. Secret values and secret versions will remain outside Terraform state.

## 5. Artifact Registry and Cloud Build

| Existing resource | Current configuration | Future Terraform mapping |
| --- | --- | --- |
| Artifact Registry repository `cloud-run-source-deploy` | Docker; standard repository; `europe-west10`; Google-managed encryption | `google_artifact_registry_repository.application` |
| Cloud Build default service account | `30500860100-compute@developer.gserviceaccount.com` | Reference during transition; replace with a dedicated deployment identity |

Seven successful regional builds were observed in `europe-west10`. They used the default Compute Engine service account. No global builds were returned because these builds are regional.

Application images currently reside under:

```text
europe-west10-docker.pkg.dev/mcabs-496514/cloud-run-source-deploy/
```

The release workflow will publish immutable images tagged with the Git commit SHA. The workflow, rather than Terraform, will own deployed image digests.

## 6. Cloud SQL

| Setting | Current value |
| --- | --- |
| Instance | `dp-cab-postgres` |
| Connection name | `mcabs-496514:europe-west10:dp-cab-postgres` |
| Database engine | PostgreSQL 18 |
| Region | `europe-west10` |
| State at inventory time | `RUNNABLE` |
| Activation policy | `ALWAYS` |
| Edition | `ENTERPRISE` |
| Tier | `db-custom-1-3840` |
| Availability | `ZONAL` |
| Storage | 60 GB `PD_SSD` |
| Automatic storage increase | Disabled |
| Deletion protection | Enabled |
| Automated backups | Disabled |
| Point-in-time recovery | Disabled |

| Existing database resource | Future Terraform mapping |
| --- | --- |
| Instance `dp-cab-postgres` | `google_sql_database_instance.postgres` |
| Database `cab_booking_db` | `google_sql_database.application` |
| Default database `postgres` | Provider-created system database; do not manage |
| Built-in user `cab_app_user` | `google_sql_user.application` |
| IAM database user `cab-app-user-service-account@mcabs-496514.iam` | `google_sql_user.runtime_iam` |
| Built-in administrative user `postgres` | Existing administrative user; password remains outside Terraform |

The existing instance must be imported before Terraform can manage it. Terraform planning must demonstrate that the instance and its data will not be replaced.

## 7. Secret Manager

| Existing secret | Replication | Resource-level accessor | Future Terraform mapping |
| --- | --- | --- | --- |
| `cab-db-password` | Automatic | `cab-app-user-service-account@mcabs-496514.iam.gserviceaccount.com` | `google_secret_manager_secret.db_password` |
| `cab-jwt-secret` | Automatic | `cab-app-user-service-account@mcabs-496514.iam.gserviceaccount.com` | `google_secret_manager_secret.jwt` |
| `cab-rapidapi-key` | Automatic | `cab-app-user-service-account@mcabs-496514.iam.gserviceaccount.com` | `google_secret_manager_secret.rapidapi_key` |
| `cab-weatherapi-key` | Automatic | `cab-app-user-service-account@mcabs-496514.iam.gserviceaccount.com` | `google_secret_manager_secret.weatherapi_key` |

Each resource-level binding grants `roles/secretmanager.secretAccessor`. Future bindings will use `google_secret_manager_secret_iam_member`. Terraform must not read or manage the secret payloads.

## 8. Service Accounts and IAM

| Identity | Current use | Current project-level roles | Future Terraform mapping |
| --- | --- | --- | --- |
| `cab-app-user-service-account@mcabs-496514.iam.gserviceaccount.com` | Runtime identity for six Cloud Run services | `roles/cloudsql.client`, `roles/cloudsql.editor`, `roles/cloudsql.instanceUser` | `google_service_account.runtime` plus narrowly scoped IAM member resources |
| `30500860100-compute@developer.gserviceaccount.com` | Cloud Build identity and `cab-booking-web` runtime identity | `roles/run.builder` | Reference during transition; replace with dedicated build/deployment and web runtime identities |

Cloud Run invocation policy:

| Service | `allUsers` has `roles/run.invoker` | Future Terraform mapping |
| --- | --- | --- |
| `booking-service` | No | Authenticated service-to-service invoker binding |
| `customer-service` | No | Authenticated service-to-service invoker binding |
| `fare-estimation-service` | No | Authenticated service-to-service invoker binding |
| `payment-service` | No | Authenticated service-to-service invoker binding |
| `location-service` | No | Authenticated service-to-service invoker binding |
| `gateway-service` | Yes | `google_cloud_run_v2_service_iam_member.gateway_public` |
| `cab-booking-web` | Yes | `google_cloud_run_v2_service_iam_member.web_public` |

Project IAM should use additive `google_project_iam_member` resources so Terraform does not overwrite unrelated project policy bindings.

## 9. Baseline Findings Requiring Later Decisions

The following findings are recorded without changing the working deployment:

1. Cloud SQL is currently running because its activation policy is `ALWAYS`.
2. Automated backups and point-in-time recovery are disabled.
3. The runtime service account has the broad `roles/cloudsql.editor` role in addition to client and instance-user roles.
4. The default Compute Engine service account is shared by Cloud Build and the web runtime.
5. Every service permits ingress from `all`; IAM authentication still protects the five private services.
6. Cloud Run secret references use the mutable `latest` version alias.
7. `FARE_API_URL` includes fixed departure and arrival coordinates and must be checked against application behavior during configuration reconciliation.
8. The existing Artifact Registry repository was created for Cloud Run source deployments. Its long-term name and ownership should be confirmed before import.

These are inputs to later security, configuration-ownership, Terraform and deployment-workflow tasks. They are not authorization to change the existing resources during inventory.

## 10. Task 1.1 Completion Check

- [x] All seven deployable components are recorded.
- [x] Existing resource names are confirmed.
- [x] Region `europe-west10` is confirmed.
- [x] Cloud Run services and retained revisions are recorded.
- [x] Artifact Registry and Cloud Build identity are recorded.
- [x] Cloud SQL instance, databases and users are recorded.
- [x] Secret containers and service references are recorded without secret values.
- [x] Runtime service accounts and observed IAM bindings are recorded.
- [x] Public and private invocation access matches the working deployment.
- [x] Environment-variable names, safe plain values and secret sources are recorded.
- [x] CPU, memory, scaling, concurrency and timeout settings are recorded.
- [x] Existing resources are mapped to intended Terraform resource types and addresses.

Task 1.1 is complete once this inventory is reviewed and committed to the deployment-automation branch.

## 11. Official References

- [Terraform on Google Cloud](https://cloud.google.com/docs/terraform)
- [Import Google Cloud resources into Terraform](https://cloud.google.com/docs/terraform/resource-management/import)
- [Terraform Google provider reference](https://registry.terraform.io/providers/hashicorp/google/latest/docs)
- [Cloud Run environment variables](https://cloud.google.com/run/docs/configuring/services/environment-variables)
- [Cloud Run revisions](https://cloud.google.com/run/docs/managing/revisions)
- [Cloud Run ingress](https://cloud.google.com/run/docs/securing/ingress)
- [Cloud Run authentication](https://cloud.google.com/run/docs/authenticating/overview)
- [Cloud SQL for PostgreSQL documentation](https://cloud.google.com/sql/docs/postgres)
- [Secret Manager access control](https://cloud.google.com/secret-manager/docs/access-control)
- [Artifact Registry documentation](https://cloud.google.com/artifact-registry/docs)
