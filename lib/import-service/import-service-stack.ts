import * as lambda from 'aws-cdk-lib/aws-lambda';
import { CfnOutput, Duration, RemovalPolicy, Stack, StackProps } from "aws-cdk-lib";
import { BlockPublicAccess, Bucket, EventType, HttpMethods } from "aws-cdk-lib/aws-s3";
import { BucketDeployment, Source } from "aws-cdk-lib/aws-s3-deployment";
import { Construct } from "constructs";
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import path from "path";
import { LambdaDestination } from 'aws-cdk-lib/aws-s3-notifications';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { ProductLambdaStack } from '../product-lambda/product-lambda-stack';

const ALLOWED_ORIGIN = 'https://d31bu5dobdv1pd.cloudfront.net';
const CORS_RESPONSE_PARAMETERS = {
  'method.response.header.Access-Control-Allow-Origin': "'" + ALLOWED_ORIGIN + "'",
};
const CORS_METHOD_RESPONSE_PARAMETERS = {
  'method.response.header.Access-Control-Allow-Origin': true,
};


export class ImportServiceStack extends Stack {
  constructor(scope: Construct, id: string, productlambdaStack: ProductLambdaStack, props?: StackProps) {
    super(scope, id, props);

    const importBucket = new Bucket(this, "ImportBucket", {
      removalPolicy: RemovalPolicy.DESTROY, 
      autoDeleteObjects: true, 
      versioned: true,
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL, 
      cors: [
        {
          allowedMethods: [HttpMethods.PUT, HttpMethods.GET], 
          allowedOrigins: [ALLOWED_ORIGIN],
          allowedHeaders: ["*"], 
        },
      ],
    });

    new BucketDeployment(this, "UploadFolderDeployment", {
      sources: [Source.asset(path.join(__dirname, "../../assets/placeholder"))],
      destinationBucket: importBucket,
      destinationKeyPrefix: "uploaded/", 
    });

    const importProductsFileFunction = new lambda.Function(this, 'ImportProductsFileFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      memorySize: 1024,
      timeout: Duration.seconds(5),
      handler: 'import-products-file.main',
      code: lambda.Code.fromAsset(path.join(__dirname, './')),
    });

    const importFileParserFunction = new NodejsFunction(this, 'ImportFileParserFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      memorySize: 1024,
      timeout: Duration.seconds(30),
      handler: 'main',
      entry: path.join(__dirname, './import-file-parser.ts'),
    });

    importBucket.grantReadWrite(importProductsFileFunction);
    importBucket.grantReadWrite(importFileParserFunction);
    importBucket.grantDelete(importFileParserFunction);

    const api = new apigateway.RestApi(this, 'ImportApi', {
      restApiName: 'Import Service',
    });

    const importResource = api.root.addResource("import");
    const importProductsFileLambdaIntegration = new apigateway.LambdaIntegration(importProductsFileFunction, {
      integrationResponses: [
        {
          statusCode: '200',
          responseParameters: CORS_RESPONSE_PARAMETERS,
        },
        {
          statusCode: '400',
          selectionPattern: '.*File name is required as a query parameter.*',
          responseParameters: CORS_RESPONSE_PARAMETERS
        },
        {
          statusCode: '500',
          selectionPattern: '.*Could not generate signed URL.*',
          responseParameters: CORS_RESPONSE_PARAMETERS
        }
      ],
      requestTemplates: {
        'application/json': JSON.stringify({
          queryStringParameters: {
            name: "$input.params('name')",
          },
        }),
      },
      proxy: false,
    });

    importResource.addMethod("GET", importProductsFileLambdaIntegration, {
      methodResponses: [
        { 
          statusCode: '200',
          responseParameters: CORS_METHOD_RESPONSE_PARAMETERS,
        },
        { 
          statusCode: '400',
          responseParameters: CORS_METHOD_RESPONSE_PARAMETERS 
        },
        { 
          statusCode: '500',
          responseParameters: CORS_METHOD_RESPONSE_PARAMETERS 
        },
      ],
    });

    //CORS
    importResource.addCorsPreflight({
      allowOrigins: [ALLOWED_ORIGIN],
      allowMethods: ['GET'],
    });

    importBucket.addEventNotification(
      EventType.OBJECT_CREATED,
      new LambdaDestination(importFileParserFunction),
      { prefix: "uploaded/" } 
    );
    
    const catalogItemsQueue = productlambdaStack.catalogItemsQueue;
    importFileParserFunction.addEnvironment('CATALOG_ITEMS_QUEUE_URL', catalogItemsQueue.queueUrl);
    catalogItemsQueue.grantSendMessages(importFileParserFunction);

    new CfnOutput(this, "BucketName", {
      value: importBucket.bucketName,
      description: "The name of the S3 bucket",
    });
    
    new CfnOutput(this, "ApiUrl", {
      value: api.url,
      description: "The URL of the Import API Gateway",
    });
  }
}
