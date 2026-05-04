import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as s3 from 'aws-cdk-lib/aws-s3';

/**
 * IAM scaffolding for the mortgage-app.
 *
 * Just one role for now: the EC2 instance role that the Spring Boot backend
 * will assume. It can read/write the documents bucket but cannot:
 *   - delete bucket
 *   - bypass governance retention (Object Lock)
 *   - change bucket policy / ACL
 *   - touch the logs bucket (write-only, S3 service handles delivery)
 *
 * Per-user enforcement (e.g., "borrower can only access their own loan's
 * objects") is the application's job: the backend generates presigned URLs
 * scoped to the specific S3 key. The IAM policy here is the broad guardrail.
 *
 * When we add a separate borrower-portal Lambda or LOS admin service later,
 * each gets its own scoped role added to this stack.
 */
export interface IamStackProps extends cdk.StackProps {
  envName: string;
  documentsBucket: s3.IBucket;
}

export class IamStack extends cdk.Stack {
  public readonly appInstanceRole: iam.Role;

  constructor(scope: Construct, id: string, props: IamStackProps) {
    super(scope, id, props);

    const { envName, documentsBucket } = props;

    // ── EC2 instance role for the Spring Boot backend ─────────────────────
    this.appInstanceRole = new iam.Role(this, 'AppInstanceRole', {
      roleName: `MortgageApp-${envName}-AppInstanceRole`,
      assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com'),
      description: 'EC2 instance role for the mortgage-app Spring Boot backend',
      managedPolicies: [
        // Standard SSM Session Manager access — preferred over SSH
        iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonSSMManagedInstanceCore'),
        // CloudWatch agent for metrics + log shipping
        iam.ManagedPolicy.fromAwsManagedPolicyName('CloudWatchAgentServerPolicy'),
      ],
    });

    // S3 access — read/write objects in the documents bucket, no admin ops
    this.appInstanceRole.addToPolicy(new iam.PolicyStatement({
      sid: 'DocumentsBucketObjectAccess',
      effect: iam.Effect.ALLOW,
      actions: [
        's3:GetObject',
        's3:GetObjectVersion',
        's3:GetObjectTagging',
        's3:GetObjectVersionTagging',
        's3:PutObject',
        's3:PutObjectTagging',
        's3:DeleteObject', // soft-delete only — versioning preserves history
        's3:AbortMultipartUpload',
        's3:ListMultipartUploadParts',
      ],
      resources: [`${documentsBucket.bucketArn}/*`],
    }));

    this.appInstanceRole.addToPolicy(new iam.PolicyStatement({
      sid: 'DocumentsBucketList',
      effect: iam.Effect.ALLOW,
      actions: ['s3:ListBucket', 's3:GetBucketLocation', 's3:ListBucketVersions'],
      resources: [documentsBucket.bucketArn],
    }));

    // Object Lock — allow APPLYING retention (PutObjectRetention) but DENY
    // bypassing governance retention. Compliance retention can never be bypassed.
    this.appInstanceRole.addToPolicy(new iam.PolicyStatement({
      sid: 'AllowObjectRetentionApply',
      effect: iam.Effect.ALLOW,
      actions: [
        's3:PutObjectRetention',
        's3:PutObjectLegalHold',
        's3:GetObjectRetention',
        's3:GetObjectLegalHold',
      ],
      resources: [`${documentsBucket.bucketArn}/*`],
    }));
    this.appInstanceRole.addToPolicy(new iam.PolicyStatement({
      sid: 'DenyGovernanceBypass',
      effect: iam.Effect.DENY,
      actions: ['s3:BypassGovernanceRetention'],
      resources: [`${documentsBucket.bucketArn}/*`],
    }));

    // Cognito — backend creates user accounts on LO-driven invite flows
    this.appInstanceRole.addToPolicy(new iam.PolicyStatement({
      sid: 'CognitoUserManagement',
      effect: iam.Effect.ALLOW,
      actions: [
        'cognito-idp:AdminCreateUser',
        'cognito-idp:AdminAddUserToGroup',
        'cognito-idp:AdminRemoveUserFromGroup',
        'cognito-idp:AdminGetUser',
        'cognito-idp:AdminUpdateUserAttributes',
        'cognito-idp:ListUsers',
        'cognito-idp:ListGroups',
      ],
      // Scope to the shared user pool (same one the dashboard uses)
      resources: [
        `arn:aws:cognito-idp:us-west-1:${this.account}:userpool/us-west-1_S6iE2uego`,
      ],
    }));

    // SES — outbound email for borrower invites + status notifications (Phase 7)
    this.appInstanceRole.addToPolicy(new iam.PolicyStatement({
      sid: 'EmailSending',
      effect: iam.Effect.ALLOW,
      actions: ['ses:SendEmail', 'ses:SendRawEmail'],
      resources: ['*'],
      conditions: {
        StringEquals: {
          'ses:FromAddress': [
            'noreply@msfgco.com',
            'apply@msfgco.com',
          ],
        },
      },
    }));

    // ── Outputs ──────────────────────────────────────────────────────────
    new cdk.CfnOutput(this, 'AppInstanceRoleArn', {
      value: this.appInstanceRole.roleArn,
      exportName: `MortgageApp-${envName}-AppInstanceRoleArn`,
    });

    new cdk.CfnOutput(this, 'AppInstanceProfileName', {
      value: new iam.CfnInstanceProfile(this, 'AppInstanceProfile', {
        roles: [this.appInstanceRole.roleName],
        instanceProfileName: `MortgageApp-${envName}-AppInstanceProfile`,
      }).ref,
    });
  }
}
