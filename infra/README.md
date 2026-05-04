# Mortgage App Infra (CDK v2 / TypeScript)

Source-of-truth for the documents bucket configuration, server-access-log
bucket, and the EC2 instance role the Spring backend assumes.

## Stacks

| Stack name | Purpose |
|---|---|
| `MortgageApp-Dev-Documents` | Primary `msfg-mortgage-app-documents-dev` bucket + `-logs` sibling. Lifecycle, CORS, Object Lock, encryption, access logging. |
| `MortgageApp-Dev-Iam` | `MortgageAppBackend-dev` EC2 instance role + instance profile. Object-level read/write/tag, Object Lock retention controls, explicit deny on governance bypass. |

Account: `116981808374` Region: `us-west-1` (CDK bootstrap qualifier `hnb659fds` already in place).

Prod stacks are stubbed in [`bin/mortgage-app.ts`](bin/mortgage-app.ts) — uncomment when prod buckets exist and prod CORS origins are confirmed.

## Setup

```bash
cd infra
npm install
npx cdk synth                           # local-only, validates the templates
```

## Deploy: IAM stack (safe, no existing resources)

The IAM stack creates a brand-new role and references the documents bucket by name:

```bash
npx cdk diff MortgageApp-Dev-Iam        # preview
npx cdk deploy MortgageApp-Dev-Iam      # creates MortgageAppBackend-dev role
```

## Deploy: Documents stack (existing buckets — IMPORT, don't deploy)

The buckets `msfg-mortgage-app-documents-dev` and `msfg-mortgage-app-documents-dev-logs`
**already exist physically** (created Apr 29 2026, before CDK was set up).

A plain `cdk deploy MortgageApp-Dev-Documents` will fail because CloudFormation
will try to *create* buckets with names that are already taken. The
non-destructive path is `cdk import`, which adopts the existing buckets into
the stack without touching their contents.

### Pre-import checklist

Before running `cdk import`, verify the existing buckets match the spec in
[`lib/documents-stack.ts`](lib/documents-stack.ts). The import will fail noisily if any of these don't line up:

```bash
# Versioning enabled?
aws s3api get-bucket-versioning --bucket msfg-mortgage-app-documents-dev

# Object Lock enabled?
aws s3api get-object-lock-configuration --bucket msfg-mortgage-app-documents-dev

# Encryption set to SSE-S3?
aws s3api get-bucket-encryption --bucket msfg-mortgage-app-documents-dev

# Public access blocked?
aws s3api get-public-access-block --bucket msfg-mortgage-app-documents-dev
```

If any property is missing, either set it on the bucket out-of-band first
(e.g. `aws s3api put-bucket-versioning ...`) or relax the CDK spec to match
current reality. **Object Lock cannot be retroactively disabled** — if the
bucket doesn't have it, decide whether to enable it (irreversible) or remove
`objectLockEnabled: true` from the stack.

### Import procedure

```bash
npx cdk import MortgageApp-Dev-Documents
```

`cdk import` will prompt for the physical bucket names — supply
`msfg-mortgage-app-documents-dev` and `msfg-mortgage-app-documents-dev-logs`.
After import, the stack owns the buckets and any further `cdk deploy` will
diff and apply config changes (lifecycle rules, CORS, etc.) safely.

### After import

```bash
npx cdk diff MortgageApp-Dev-Documents     # preview pending config changes
npx cdk deploy MortgageApp-Dev-Documents   # apply lifecycle / CORS / etc.
```

## Bucket spec at a glance

Documents bucket:

- **Encryption**: SSE-S3 (S3-managed keys). KMS could be layered on for closing-stage docs later.
- **Versioning**: enabled.
- **Object Lock**: enabled, no default retention. Backend applies per-object retention at confirm time.
- **Public access**: fully blocked.
- **Server access logs**: delivered to `-logs` bucket under `s3-access-logs/`.
- **CORS**: `GET / PUT / POST / HEAD` from listed origins; exposes `ETag` and `x-amz-version-id`.
- **Lifecycle** (driven primarily by **object tags**, not key prefixes):
  - Abort incomplete multipart after 7 days
  - Expire noncurrent versions after 90 days
  - Tag `loan_state=funded` → IA at 90d → Glacier IR at 1y → Deep Archive at 7y
  - Tag `loan_state` ∈ {`withdrawn`, `denied`, `canceled`, `incomplete`} → Glacier IR at 30d → Deep Archive at 5y
  - Tag `retention_class=temporary` → expire at 30d

Logs bucket: SSE-S3, public access blocked, BUCKET_OWNER_PREFERRED ownership (so the S3 logging service can write), 365-day expiration on logs.

## Why import instead of recreate?

- Object Lock decisions are irreversible.
- Versioning history would be lost.
- Existing object tags would be lost.
- Server access logs would be cut off.
- Bucket names are global — recreating means a different name.

`cdk import` is the AWS-blessed way to bring drift-free existing resources
under stack management. Once imported, every future change goes through diff/deploy and is auditable.

## Never `cdk destroy`

`removalPolicy: RETAIN` is set on every stateful resource. `cdk destroy` will
warn and refuse to delete the buckets — which is the intended behavior. Object
Lock and the borrower-PII tag class make destruction an irreversible
compliance event.
