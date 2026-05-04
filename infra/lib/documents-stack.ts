import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';

/**
 * Mortgage-app document storage.
 *
 * Two buckets:
 *   1. msfg-mortgage-app-documents-{env}        — primary store for everything
 *      (active applications, in-flight loans, funded loans, dispositioned loans).
 *      Lifecycle policies move objects between storage classes based on object
 *      tags (loan_state) and age — no second bucket needed for cost.
 *
 *   2. msfg-mortgage-app-documents-{env}-logs   — S3 server access logs for #1.
 *      A bucket can't log to itself; this is required for audit.
 *
 * Object Lock is enabled at bucket creation (irreversible decision). Default
 * mode is `none` — we apply per-object retention via the application
 * (Compliance for closing docs, Governance for funded loan archives).
 *
 * Key convention (enforced by application code, not S3):
 *   applications/{application_id}/{party_role}/{document_type}/{document_id}-{safe_filename}
 *   loans/{loan_id}/{party_role}/{document_type}/{document_id}-{safe_filename}
 *
 * Tag convention (set by application on each PUT):
 *   loan_state       active|funded|withdrawn|denied|canceled|incomplete
 *   sensitivity      public|internal|confidential|restricted
 *   retention_class  temporary|standard|compliance_archive
 *   source           borrower_portal|dashboard|los_admin|system
 *   application_id   {application_id}
 *   loan_id          {loan_id}
 */
export interface DocumentsStackProps extends cdk.StackProps {
  /** 'prod' | 'dev' — used in bucket name suffix. */
  envName: string;
}

export class DocumentsStack extends cdk.Stack {
  public readonly documentsBucket: s3.Bucket;
  public readonly logsBucket: s3.Bucket;

  constructor(scope: Construct, id: string, props: DocumentsStackProps) {
    super(scope, id, props);

    const { envName } = props;

    // ── Logs bucket (server access logs + CloudTrail data events sink) ─────
    this.logsBucket = new s3.Bucket(this, 'LogsBucket', {
      bucketName: `msfg-mortgage-app-documents-${envName}-logs`,
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      publicReadAccess: false,
      versioned: false, // logs don't need versioning; reduces cost
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      // ACL needed for S3 access-log delivery — see below
      objectOwnership: s3.ObjectOwnership.BUCKET_OWNER_PREFERRED,
      lifecycleRules: [
        {
          id: 'expire-logs-after-1yr',
          enabled: true,
          expiration: cdk.Duration.days(365),
          abortIncompleteMultipartUploadAfter: cdk.Duration.days(7),
        },
      ],
    });

    // ── Primary documents bucket ──────────────────────────────────────────
    this.documentsBucket = new s3.Bucket(this, 'DocumentsBucket', {
      bucketName: `msfg-mortgage-app-documents-${envName}`,
      encryption: s3.BucketEncryption.S3_MANAGED, // SSE-S3 default; KMS reserved for `loans/*/closing/`
      bucketKeyEnabled: true,
      enforceSSL: true,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      publicReadAccess: false,
      versioned: true,                            // recoverable accidental deletes
      objectLockEnabled: true,                    // IRREVERSIBLE — must be at creation
      removalPolicy: cdk.RemovalPolicy.RETAIN,    // never auto-delete this bucket
      autoDeleteObjects: false,
      serverAccessLogsBucket: this.logsBucket,
      serverAccessLogsPrefix: 's3-access-logs/',

      // CORS for direct-from-browser presigned PUT/GET. The Origin allowlist
      // is intentionally tight — apply.msfgco.com (prod) and localhost (dev).
      cors: [
        {
          allowedMethods: [s3.HttpMethods.GET, s3.HttpMethods.PUT, s3.HttpMethods.POST, s3.HttpMethods.HEAD],
          allowedOrigins: envName === 'prod'
            ? ['https://apply.msfgco.com', 'https://dashboard.msfgco.com']
            : ['http://localhost:3000', 'http://localhost:5173'],
          allowedHeaders: ['*'],
          exposedHeaders: ['ETag', 'x-amz-version-id'],
          maxAge: 3600,
        },
      ],

      lifecycleRules: [
        // Everything: clean up failed multipart uploads
        {
          id: 'abort-incomplete-multipart',
          enabled: true,
          abortIncompleteMultipartUploadAfter: cdk.Duration.days(7),
        },

        // Versioning hygiene — keep non-current versions for 90 days then drop
        {
          id: 'expire-noncurrent-versions',
          enabled: true,
          noncurrentVersionExpiration: cdk.Duration.days(90),
        },

        // Funded loans cool down: STANDARD → STANDARD_IA at 90d, GLACIER_IR at 1yr,
        // GLACIER_DEEP_ARCHIVE at 7yrs (covers TRID 5-yr + cushion)
        {
          id: 'funded-loans-cooldown',
          enabled: true,
          tagFilters: { loan_state: 'funded' },
          transitions: [
            { storageClass: s3.StorageClass.INFREQUENT_ACCESS, transitionAfter: cdk.Duration.days(90) },
            { storageClass: s3.StorageClass.GLACIER_INSTANT_RETRIEVAL, transitionAfter: cdk.Duration.days(365) },
            { storageClass: s3.StorageClass.DEEP_ARCHIVE, transitionAfter: cdk.Duration.days(2555) }, // ~7 yrs
          ],
        },

        // Dispositioned (denied/withdrawn/canceled): cool fast, archive deep at 5yrs
        // (ECOA adverse-action minimum is 25 months; we keep extra cushion).
        // We use four separate rules because tagFilters is AND-only and we need OR.
        ...['withdrawn', 'denied', 'canceled', 'incomplete'].map(state => ({
          id: `dispositioned-${state}-cooldown`,
          enabled: true,
          tagFilters: { loan_state: state },
          transitions: [
            { storageClass: s3.StorageClass.GLACIER_INSTANT_RETRIEVAL, transitionAfter: cdk.Duration.days(30) },
            { storageClass: s3.StorageClass.DEEP_ARCHIVE, transitionAfter: cdk.Duration.days(1825) }, // 5 yrs
          ],
        })),

        // Temporary uploads (e.g. preview drafts) expire after 30 days
        {
          id: 'temporary-cleanup',
          enabled: true,
          tagFilters: { retention_class: 'temporary' },
          expiration: cdk.Duration.days(30),
        },
      ],
    });

    // ── Outputs (for cross-stack reference / human inspection) ────────────
    new cdk.CfnOutput(this, 'DocumentsBucketName', {
      value: this.documentsBucket.bucketName,
      exportName: `MortgageApp-${envName}-DocumentsBucket`,
    });
    new cdk.CfnOutput(this, 'DocumentsBucketArn', {
      value: this.documentsBucket.bucketArn,
      exportName: `MortgageApp-${envName}-DocumentsBucketArn`,
    });
    new cdk.CfnOutput(this, 'LogsBucketName', {
      value: this.logsBucket.bucketName,
    });
  }
}
