# Database Decision

## Decision

Use Google Cloud SQL for PostgreSQL.

## Reason

The assignment allows cloud databases such as Google Cloud SQL, Back4App, Firebase, MongoDB, or preferred. Google Cloud SQL is a strong fit because the project needs stable business records:
- users
- bookings
- payments
- notifications
- favourite locations

The user also has Google Cloud credits, and the deployment plan uses Google Cloud Run.

## Handling Dynamic / Unstructured Data

PostgreSQL supports `json` and `jsonb` data types. This means PostgreSQL can store semi-structured/dynamic JSON objects where needed.

Use JSONB selectively for:
- external fare API response snapshot
- weather API response snapshot
- payment calculation breakdown
- notification payload

Do not store all core records as unstructured JSON. Important fields should remain normal relational columns.

## Reason for JSONB

External API responses can change shape. Storing them as JSONB snapshots preserves relevant data without forcing every API field into a rigid relational schema.

## Example

```sql
CREATE TABLE payments (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  booking_id UUID NOT NULL,
  total_price NUMERIC(10,2) NOT NULL,
  status VARCHAR(30) NOT NULL,
  calculation_breakdown JSONB,
  fare_snapshot JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Documentation

- Google Cloud SQL for PostgreSQL:
  https://docs.cloud.google.com/sql/docs/postgres

- PostgreSQL JSON types:
  https://www.postgresql.org/docs/current/datatype-json.html

- PostgreSQL JSON functions and operators:
  https://www.postgresql.org/docs/current/functions-json.html

## Assignment Tasks Supported

- Task 1: user account details and notifications
- Task 2: bookings
- Task 3: payment records and calculation breakdown
- Task 4: favourite locations and weather snapshots
- Task 9: cloud database
- Task 14: cloud database explanation
