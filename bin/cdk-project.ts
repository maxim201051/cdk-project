#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { DeployWebAppStack } from '../lib/deploy-web-app/deploy-web-app-stack';
import { ProductLambdaStack } from '../lib/product-lambda/product-lambda-stack';
import { ImportServiceStack } from '../lib/import-service/import-service-stack';

const app = new cdk.App();
new DeployWebAppStack(app, 'DeployWebAppStack', {});
new ProductLambdaStack(app, 'ProductLambdaStack', {});
new ImportServiceStack(app, 'ImportServiceStack', {})
