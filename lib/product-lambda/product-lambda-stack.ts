import * as lambda from 'aws-cdk-lib/aws-lambda';
import { Duration, Stack, StackProps } from "aws-cdk-lib";
import { Construct } from "constructs";
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import path from 'path';

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

      const getAllProductsFunction = new lambda.Function(this, 'GetAllProductsFunction', {
        runtime: lambda.Runtime.NODEJS_20_X,
        memorySize: 1024,
        timeout: Duration.seconds(5),
        handler: 'get-products-list.main',
        code: lambda.Code.fromAsset(path.join(__dirname, './')),
      });

      const getProductByIdFunction = new lambda.Function(this, 'GetProductByIdFunction', {
        runtime: lambda.Runtime.NODEJS_20_X,
        memorySize: 1024,
        timeout: Duration.seconds(5),
        handler: 'get-product-by-id.main',
        code: lambda.Code.fromAsset(path.join(__dirname, './')),
      });

      const api = new apigateway.RestApi(this, 'ProductApi', {
        restApiName: 'Product Service',
      });

      const productsResource = api.root.addResource('products');
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
 
      productsResource.addCorsPreflight({
        allowOrigins: [ALLOWED_ORIGIN],
        allowMethods: ['GET'],
      });
    }
  }