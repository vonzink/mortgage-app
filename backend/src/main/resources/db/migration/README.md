# Flyway migrations

Postgres-flavored SQL (H2 runs in `MODE=PostgreSQL` for dev). Never edit a
committed migration — add a new one. JPA `ddl-auto` is `validate`, so Hibernate
fails boot on any drift between entity classes and the post-Flyway schema.

| Version | Adds |
|---|---|
| V1 | Initial schema — loan_applications + borrowers/employments/income_sources/residences/declarations/properties/liabilities/reo_properties/documents |
| V2 | `loan_status_history` audit table |
| V3 | `users` + assigned_lo_id FK + `borrowers.user_id`, `loan_agents` join table |
| V4 | Document visibility flags (`visible_to_borrower`, `visible_to_agent`) |
| V5 | `assets` table (entity existed before the schema did) |
| V6 | `created_at` / `updated_at` audit columns on entities already declaring them |
| V7 | Document S3 fields — `doc_uuid`, `safe_filename`, `upload_status`, `content_type`, `file_size` |
| V8 | Loan identifiers — `lendingpad_loan_number`, `investor_loan_number`, `mers_min` |
| V9 | `mismo_imports` audit table |
| V10 | `closing_information` (1:1) + `closing_fees` (1:N) for closing-stage data |
| V11 | Workspace folders — `folders` self-referencing tree, `documents.folder_id` FK |
| V12 | Loan dashboard tables — `loan_terms`, `housing_expenses` |
| V13 | `purchase_credits` + `loan_conditions` |
| V14 | `properties.purchase_price`, `purchase_credits.received_at`, additional MISMO-derived fields |

Add the next migration as `V15__short_description.sql`. Match the existing
header-comment style (banner, intent, then DDL).
