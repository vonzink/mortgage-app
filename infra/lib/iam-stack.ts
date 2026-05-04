import { Stack, StackProps } from 'aws-cdk-lib';
import { Effect, InstanceProfile, PolicyStatement, Role, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
import { EnvName } from './documents-stack';

export interface IamStackProps extends StackProps {
  envName: EnvName;
  /** Bucket name to grant on. Reference-by-name so this stack is independent of DocumentsStack deploy order. */
  documentsBucketName: string;
}

/**
 * EC2 instance role that the Spring backend assumes when running on EC2/ECS.
 *
 * Permissions are scoped to the documents bucket only. Object Lock retention
 * actions are allowed (the backend applies per-object retention at confirm time),
 * but {@code BypassGovernanceRetention} is **explicitly denied** — even if some
 * future policy widens the role, this role can never delete a governance-locked
 * object. Compliance retention can never be bypassed by anyone.
 */
export class IamStack extends Stack {
  public readonly instanceRole: Role;

  constructor(scope: Construct, id: string, props: IamStackProps) {
    super(scope, id, props);

    const { envName, documentsBucketName } = props;

    const bucketArn = `arn:aws:s3:::${documentsBucketName}`;
    const objectArn = `${bucketArn}/*`;

    this.instanceRole = new Role(this, 'BackendInstanceRole', {
      roleName: `MortgageAppBackend-${envName}`,
      assumedBy: new ServicePrincipal('ec2.amazonaws.com'),
      description: `Backend EC2 instance role for ${envName} — documents bucket access only.`,
    });

    // Object-level: read, write, tag, delete, and clean up failed multipart.
    this.instanceRole.addToPolicy(new PolicyStatement({
      sid: 'DocumentsBucketObjectAccess',
      effect: Effect.ALLOW,
      actions: [
        's3:GetObject',
        's3:PutObject',
        's3:PutObjectTagging',
        's3:GetObjectTagging',
        's3:DeleteObject',
        's3:AbortMultipartUpload',
      ],
      resources: [objectArn],
    }));

    // Bucket-level: list, location, version listing.
    this.instanceRole.addToPolicy(new PolicyStatement({
      sid: 'DocumentsBucketList',
      effect: Effect.ALLOW,
      actions: ['s3:ListBucket', 's3:GetBucketLocation', 's3:ListBucketVersions'],
      resources: [bucketArn],
    }));

    // Object Lock retention controls — needed when the backend applies per-object retention.
    this.instanceRole.addToPolicy(new PolicyStatement({
      sid: 'AllowObjectRetentionApply',
      effect: Effect.ALLOW,
      actions: [
        's3:PutObjectRetention',
        's3:GetObjectRetention',
        's3:PutObjectLegalHold',
        's3:GetObjectLegalHold',
      ],
      resources: [objectArn],
    }));

    // Hard guard: never let this role bypass governance retention, regardless of
    // any future allow statement.
    this.instanceRole.addToPolicy(new PolicyStatement({
      sid: 'DenyGovernanceBypass',
      effect: Effect.DENY,
      actions: ['s3:BypassGovernanceRetention'],
      resources: [objectArn],
    }));

    new InstanceProfile(this, 'BackendInstanceProfile', {
      role: this.instanceRole,
      instanceProfileName: `MortgageAppBackend-${envName}`,
    });
  }
}
