import { Duration, RemovalPolicy, Stack, StackProps } from 'aws-cdk-lib';
import {
  BlockPublicAccess,
  Bucket,
  BucketEncryption,
  HttpMethods,
  ObjectOwnership,
  StorageClass,
} from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';

export type EnvName = 'dev' | 'prod';

export interface DocumentsStackProps extends StackProps {
  envName: EnvName;
  /** Origins allowed to PUT directly to S3 (browser → presigned URL flow). */
  corsAllowedOrigins: string[];
}

/**
 * Documents bucket + access-log bucket.
 *
 * **The buckets already exist physically** (created Apr 29 2026). This stack is
 * the source-of-truth specification. To bring an existing bucket under CDK
 * management, run `cdk import MortgageApp-{Env}-Documents` after `cdk synth` —
 * see infra/README.md for the full procedure. Do NOT plain-`cdk deploy` against
 * existing physical buckets without importing first; CloudFormation will fail
 * because the names already exist.
 *
 * RemovalPolicy is RETAIN everywhere. Object Lock cannot be turned off once
 * enabled, so this stack assumes it's on. If the existing bucket was created
 * without Object Lock, the import will fail and we'll need to enable it
 * out-of-band first (or drop it from this spec, which weakens compliance).
 */
export class DocumentsStack extends Stack {
  public readonly documentsBucket: Bucket;
  public readonly logsBucket: Bucket;
  public readonly documentsBucketName: string;

  constructor(scope: Construct, id: string, props: DocumentsStackProps) {
    super(scope, id, props);

    const { envName, corsAllowedOrigins } = props;
    const baseName = `msfg-mortgage-app-documents-${envName}`;
    this.documentsBucketName = baseName;

    // Server-access-log bucket. Holds raw S3 access logs; a separate retention story.
    this.logsBucket = new Bucket(this, 'LogsBucket', {
      bucketName: `${baseName}-logs`,
      encryption: BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      versioned: false,
      // Required so the S3 logging service principal can write into the bucket.
      objectOwnership: ObjectOwnership.BUCKET_OWNER_PREFERRED,
      removalPolicy: RemovalPolicy.RETAIN,
      lifecycleRules: [
        {
          id: 'expire-access-logs',
          enabled: true,
          expiration: Duration.days(365),
        },
      ],
    });

    // Primary documents bucket.
    this.documentsBucket = new Bucket(this, 'DocumentsBucket', {
      bucketName: baseName,
      encryption: BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      versioned: true,
      objectLockEnabled: true,
      // Default mode left unset; the application applies per-object retention
      // (Compliance for closing docs, Governance for archives).
      serverAccessLogsBucket: this.logsBucket,
      serverAccessLogsPrefix: 's3-access-logs/',
      removalPolicy: RemovalPolicy.RETAIN,
      cors: [
        {
          allowedMethods: [HttpMethods.GET, HttpMethods.PUT, HttpMethods.POST, HttpMethods.HEAD],
          allowedOrigins: corsAllowedOrigins,
          allowedHeaders: ['*'],
          exposedHeaders: ['ETag', 'x-amz-version-id'],
          maxAge: 3600,
        },
      ],
      lifecycleRules: [
        // Hygiene
        {
          id: 'abort-incomplete-multipart',
          enabled: true,
          abortIncompleteMultipartUploadAfter: Duration.days(7),
        },
        {
          id: 'expire-noncurrent-versions',
          enabled: true,
          noncurrentVersionExpiration: Duration.days(90),
        },
        // Funded loan cooldown — long-tail compliance retention.
        {
          id: 'funded-cooldown',
          enabled: true,
          tagFilters: { loan_state: 'funded' },
          transitions: [
            { storageClass: StorageClass.INFREQUENT_ACCESS, transitionAfter: Duration.days(90) },
            { storageClass: StorageClass.GLACIER_INSTANT_RETRIEVAL, transitionAfter: Duration.days(365) },
            { storageClass: StorageClass.DEEP_ARCHIVE, transitionAfter: Duration.days(2555) }, // 7 years
          ],
        },
        // Dispositioned states — shorter retention than funded.
        ...(['withdrawn', 'denied', 'canceled', 'incomplete'] as const).map((state) => ({
          id: `dispositioned-${state}-cooldown`,
          enabled: true,
          tagFilters: { loan_state: state },
          transitions: [
            { storageClass: StorageClass.GLACIER_INSTANT_RETRIEVAL, transitionAfter: Duration.days(30) },
            { storageClass: StorageClass.DEEP_ARCHIVE, transitionAfter: Duration.days(1825) }, // 5 years
          ],
        })),
        // Temporary objects — uploads that never confirmed, scratch files, etc.
        {
          id: 'temporary-cleanup',
          enabled: true,
          tagFilters: { retention_class: 'temporary' },
          expiration: Duration.days(30),
        },
      ],
    });
  }
}
