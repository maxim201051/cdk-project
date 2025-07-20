import * as lambda from 'aws-cdk-lib/aws-lambda';
import { Duration, Stack, StackProps } from "aws-cdk-lib";
import { Construct } from "constructs";
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import path from 'path';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Table } from 'aws-cdk-lib/aws-dynamodb';

const ALLOWED_ORIGIN = 'https://d31bu5dobdv1pd.cloudfront.net';
const CORS_RESPONSE_PARAMETERS = {
  'method.response.header.Access-Control-Allow-Origin': "'" + ALLOWED_ORIGIN + "'",
};
const CORS_METHOD_RESPONSE_PARAMETERS = {
  'method.response.header.Access-Control-Allow-Origin': true,
};

export class ProductLambdaStack extends Stack {
    constructor(scope: Construct, id: string, props?: StackProps) {
      super(scope, id, props);

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
            responseParameters: CORS_RESPONSE_PARAMETERS,
          },
          {
            statusCode: '500',
            selectionPattern: '.*Failed to fetch product.*',
            responseParameters: CORS_RESPONSE_PARAMETERS
          }
        ],
        proxy: false,
      });
      productsResource.addMethod('GET', getAllProductsLambdaIntegration, {
        methodResponses: [
          { 
            statusCode: '200',
            responseParameters: CORS_METHOD_RESPONSE_PARAMETERS,
          },
          { 
            statusCode: '500',
            responseParameters: CORS_METHOD_RESPONSE_PARAMETERS 
          },
        ]
      });

      //create product
      const createProductIntegration = new apigateway.LambdaIntegration(createProductFunction, {
        integrationResponses: [
          {
            statusCode: '201',
            responseParameters: CORS_RESPONSE_PARAMETERS,
          },
          {
            statusCode: '400',
            selectionPattern: '.*Invalid product data.*',
            responseParameters: CORS_RESPONSE_PARAMETERS,
          },
          {
            statusCode: '500',
            selectionPattern: '.*Failed to create product.*',
            responseParameters: CORS_RESPONSE_PARAMETERS
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
            responseParameters: CORS_METHOD_RESPONSE_PARAMETERS,
          },
          { 
            statusCode: '400',
            responseParameters: CORS_METHOD_RESPONSE_PARAMETERS,
          },
          { 
            statusCode: '500',
            responseParameters: CORS_METHOD_RESPONSE_PARAMETERS 
          },
        ]
      });

      // "/products/{id}"
      const productByIdResource = productsResource.addResource('{id}');
      const getProductByIdLambdaIntegration = new apigateway.LambdaIntegration(getProductByIdFunction, {
        integrationResponses: [
          {
            statusCode: '200',
            responseParameters: CORS_RESPONSE_PARAMETERS,
          },
          {
            statusCode: '400',
            selectionPattern: '.*Product id required.*',
            responseParameters: CORS_RESPONSE_PARAMETERS,
          },
          {
            statusCode: '404',
            selectionPattern: '.*Product not found.*',
            responseParameters: CORS_RESPONSE_PARAMETERS,
          },
          {
            statusCode: '500',
            selectionPattern: '.*Failed to fetch products.*',
            responseParameters: CORS_RESPONSE_PARAMETERS,
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
            responseParameters: CORS_METHOD_RESPONSE_PARAMETERS,
          },
          { 
            statusCode: '400',
            responseParameters: CORS_METHOD_RESPONSE_PARAMETERS 
          },
          { 
            statusCode: '404',
            responseParameters: CORS_METHOD_RESPONSE_PARAMETERS,
          },
          { 
            statusCode: '500',
            responseParameters: CORS_METHOD_RESPONSE_PARAMETERS 
          },
        ]
      });
 
      //permissions
      const productsTable = Table.fromTableName(this, "ImportedProductsTable", "products");
      productsTable.grantReadData(getAllProductsFunction);
      productsTable.grantReadData(getProductByIdFunction);
      productsTable.grantWriteData(createProductFunction);

      const stockTable = Table.fromTableName(this, "ImportedStockTable", "stock");
      stockTable.grantReadData(getAllProductsFunction);
      stockTable.grantReadData(getProductByIdFunction);
      stockTable.grantWriteData(createProductFunction);

      //CORS
      productsResource.addCorsPreflight({
        allowOrigins: [ALLOWED_ORIGIN],
        allowMethods: ['GET', 'POST'],
      });
    }
  }