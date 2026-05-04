#!/usr/bin/env node
import 'source-map-support/register';
import { App } from 'aws-cdk-lib';
import { DocumentsStack } from '../lib/documents-stack';
import { IamStack } from '../lib/iam-stack';

const app = new App();

const devEnv = {
  account: '116981808374',
  region: 'us-west-1',
};

// Dev — primary documents bucket already exists at msfg-mortgage-app-documents-dev.
// See README before running `cdk deploy` against the documents stack.
const devDocs = new DocumentsStack(app, 'MortgageApp-Dev-Documents', {
  env: devEnv,
  envName: 'dev',
  corsAllowedOrigins: ['http://localhost:3000', 'http://localhost:5173'],
});

new IamStack(app, 'MortgageApp-Dev-Iam', {
  env: devEnv,
  envName: 'dev',
  documentsBucketName: devDocs.documentsBucketName,
});

// Prod — placeholder. Add when prod buckets exist and prod domains are confirmed.
// const prodEnv = { account: '116981808374', region: 'us-west-1' };
// const prodDocs = new DocumentsStack(app, 'MortgageApp-Prod-Documents', {
//   env: prodEnv,
//   envName: 'prod',
//   corsAllowedOrigins: ['https://apply.msfgco.com', 'https://dashboard.msfgco.com'],
// });
// new IamStack(app, 'MortgageApp-Prod-Iam', {
//   env: prodEnv,
//   envName: 'prod',
//   documentsBucketName: prodDocs.documentsBucketName,
// });
