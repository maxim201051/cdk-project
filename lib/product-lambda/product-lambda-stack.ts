import * as lambda from 'aws-cdk-lib/aws-lambda';
import { Duration, Stack, StackProps } from "aws-cdk-lib";
import { Construct } from "constructs";
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import path from 'path';

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
      productsResource.addMethod('GET', new apigateway.LambdaIntegration(getAllProductsFunction));

      const productByIdResource = productsResource.addResource('{id}');
      productByIdResource.addMethod('GET', new apigateway.LambdaIntegration(getProductByIdFunction));
 
    }
  }