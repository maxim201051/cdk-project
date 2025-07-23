import * as lambda from 'aws-cdk-lib/aws-lambda';
import { Duration, Stack, StackProps } from "aws-cdk-lib";
import { Construct } from "constructs";
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import path from 'path';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Table } from 'aws-cdk-lib/aws-dynamodb';
import { Queue } from 'aws-cdk-lib/aws-sqs';
import { SqsEventSource } from 'aws-cdk-lib/aws-lambda-event-sources';
import { Topic } from 'aws-cdk-lib/aws-sns';
import { EmailSubscription } from 'aws-cdk-lib/aws-sns-subscriptions';
import { constants } from './constants/constants';

export class ProductLambdaStack extends Stack {
    public readonly catalogItemsQueue: Queue;

    constructor(scope: Construct, id: string, props?: StackProps) {
      super(scope, id, props);

      //sns
      const createProductTopic = new Topic(this, 'CreateProductTopic', {
        displayName: 'Create Product Notifications',
      });

      createProductTopic.addSubscription(
        new EmailSubscription('maksym201051@mailinator.com') 
      );

      //functions
      const getAllProductsFunction = new NodejsFunction(this, 'GetAllProductsFunction', {
        runtime: lambda.Runtime.NODEJS_20_X,
        memorySize: 1024,
        timeout: Duration.seconds(5),
        handler: 'main',
        entry: path.join(__dirname, './get-products-list.ts'),
      });

      const getProductByIdFunction = new NodejsFunction(this, 'GetProductByIdFunction', {
        runtime: lambda.Runtime.NODEJS_20_X,
        memorySize: 1024,
        timeout: Duration.seconds(5),
        handler: 'main',
        entry: path.join(__dirname, './get-product-by-id.ts'),
      });

      const createProductFunction = new NodejsFunction(this, 'CreateProductFunction', {
        runtime: lambda.Runtime.NODEJS_20_X,
        memorySize: 1024,
        timeout: Duration.seconds(5),
        handler: 'main',
        entry: path.join(__dirname, './create-product.ts'),
      });

      const catalogBatchProcessFunction = new NodejsFunction(this, 'CatalogBatchProcess', {
        runtime: lambda.Runtime.NODEJS_20_X,
        memorySize: 1024,
        timeout: Duration.seconds(5),
        handler: 'main',
        entry: path.join(__dirname, './catalog-batch-pocess.ts'),
        environment: {
          SNS_TOPIC_ARN: createProductTopic.topicArn, 
        },
      });

      const api = new apigateway.RestApi(this, 'ProductApi', {
        restApiName: 'Product Service',
      });

      // "/products"
      const productsResource = api.root.addResource('products');
      
      //get all products
      const getAllProductsLambdaIntegration = new apigateway.LambdaIntegration(getAllProductsFunction, {
        integrationResponses: [
          {
            statusCode: '200',
            responseParameters: constants.CORS_RESPONSE_PARAMETERS,
          },
          {
            statusCode: '500',
            selectionPattern: '.*Failed to fetch product.*',
            responseParameters: constants.CORS_RESPONSE_PARAMETERS
          }
        ],
        proxy: false,
      });
      productsResource.addMethod('GET', getAllProductsLambdaIntegration, {
        methodResponses: [
          { 
            statusCode: '200',
            responseParameters: constants.CORS_METHOD_RESPONSE_PARAMETERS,
          },
          { 
            statusCode: '500',
            responseParameters: constants.CORS_METHOD_RESPONSE_PARAMETERS 
          },
        ]
      });

      //create product
      const createProductIntegration = new apigateway.LambdaIntegration(createProductFunction, {
        integrationResponses: [
          {
            statusCode: '201',
            responseParameters: constants.CORS_RESPONSE_PARAMETERS,
          },
          {
            statusCode: '400',
            selectionPattern: '.*Invalid product data.*',
            responseParameters: constants.CORS_RESPONSE_PARAMETERS,
          },
          {
            statusCode: '500',
            selectionPattern: '.*Failed to create product.*',
            responseParameters: constants.CORS_RESPONSE_PARAMETERS
          }
        ],
        requestTemplates: {
          "application/json": `
            #set($inputRoot = $input.path('$'))
            {
              "body": $input.json('$')
            }
          `,
        },
        proxy: false,
      });
      productsResource.addMethod('POST', createProductIntegration, {
        methodResponses: [
          { 
            statusCode: '201',
            responseParameters: constants.CORS_METHOD_RESPONSE_PARAMETERS,
          },
          { 
            statusCode: '400',
            responseParameters: constants.CORS_METHOD_RESPONSE_PARAMETERS,
          },
          { 
            statusCode: '500',
            responseParameters: constants.CORS_METHOD_RESPONSE_PARAMETERS 
          },
        ]
      });

      // "/products/{id}"
      const productByIdResource = productsResource.addResource('{id}');
      const getProductByIdLambdaIntegration = new apigateway.LambdaIntegration(getProductByIdFunction, {
        integrationResponses: [
          {
            statusCode: '200',
            responseParameters: constants.CORS_RESPONSE_PARAMETERS,
          },
          {
            statusCode: '400',
            selectionPattern: '.*Product id required.*',
            responseParameters: constants.CORS_RESPONSE_PARAMETERS,
          },
          {
            statusCode: '404',
            selectionPattern: '.*Product not found.*',
            responseParameters: constants.CORS_RESPONSE_PARAMETERS,
          },
          {
            statusCode: '500',
            selectionPattern: '.*Failed to fetch products.*',
            responseParameters: constants.CORS_RESPONSE_PARAMETERS,
          },
        ],
        requestTemplates: {
          'application/json': JSON.stringify({
            pathParameters: {
              id: "$input.params('id')",
            },
          }),
        },
        proxy: false,
      });
      productByIdResource.addMethod('GET', getProductByIdLambdaIntegration, {
        methodResponses: [
          { 
            statusCode: '200',
            responseParameters: constants.CORS_METHOD_RESPONSE_PARAMETERS,
          },
          { 
            statusCode: '400',
            responseParameters: constants.CORS_METHOD_RESPONSE_PARAMETERS 
          },
          { 
            statusCode: '404',
            responseParameters: constants.CORS_METHOD_RESPONSE_PARAMETERS,
          },
          { 
            statusCode: '500',
            responseParameters: constants.CORS_METHOD_RESPONSE_PARAMETERS 
          },
        ]
      });
 
      //permissions
      const productsTable = Table.fromTableName(this, "ImportedProductsTable", "products");
      productsTable.grantReadData(getAllProductsFunction);
      productsTable.grantReadData(getProductByIdFunction);
      productsTable.grantWriteData(createProductFunction);
      productsTable.grantWriteData(catalogBatchProcessFunction);

      const stockTable = Table.fromTableName(this, "ImportedStockTable", "stock");
      stockTable.grantReadData(getAllProductsFunction);
      stockTable.grantReadData(getProductByIdFunction);
      stockTable.grantWriteData(createProductFunction);
      stockTable.grantWriteData(catalogBatchProcessFunction);

      createProductTopic.grantPublish(catalogBatchProcessFunction);

      //CORS
      productsResource.addCorsPreflight({
        allowOrigins: [constants.ALLOWED_ORIGIN],
        allowMethods: ['GET', 'POST'],
      });

      //sqs
      this.catalogItemsQueue = new Queue(this, 'CatalogItemsQueue', {
        visibilityTimeout: Duration.seconds(30), 
        receiveMessageWaitTime: Duration.seconds(20),
      });

      catalogBatchProcessFunction.addEventSource(
        new SqsEventSource(this.catalogItemsQueue, {
          batchSize: 5,
        })
      );

    }
}