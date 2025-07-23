import { DynamoDBClient, ScanCommand, GetItemCommand, PutItemCommand } from "@aws-sdk/client-dynamodb";
import { Product } from "../entities/product";
import { unmarshall } from "@aws-sdk/util-dynamodb";
import { constants } from "./../constants/constants";

const dynamoDBClient = new DynamoDBClient({ region: constants.REGION });

export const productService = {
  async getAllProducts(): Promise<Product[]> {
    try {
      const productsCommand = new ScanCommand({
        TableName: constants.PRODUCTS_TABLE_NAME,
      });
      const productsResponse = await dynamoDBClient.send(productsCommand);

      const products = productsResponse.Items?.map(item => unmarshall(item) as Product) || [];

      const stockCommand = new ScanCommand({
        TableName: constants.STOCK_TABLE_NAME,
      });
      const stockResponse = await dynamoDBClient.send(stockCommand);

      const stockMap = stockResponse.Items?.reduce((map, item) => {
        const stock = unmarshall(item); 
        map[stock.product_id] = stock.count;
        return map;
      }, {} as Record<string, number>) || {};

      const productsWithStock = products.map(product => ({
        ...product,
        count: stockMap[product.id] || 0, 
      }));

      return productsWithStock;
    } catch (error: any) {
      console.error("Error fetching all products:", error);
      throw new Error("Could not fetch products");
    }
  },

  async getProductById(productId: string): Promise<Product | null> {
    try {
      const productCommand = new GetItemCommand({
        TableName: constants.PRODUCTS_TABLE_NAME,
        Key: {
          id: { S: productId },
        },
      });
      const productResponse = await dynamoDBClient.send(productCommand);

      if (!productResponse.Item) {
        return null;
      }

      const product = unmarshall(productResponse.Item) as Product;

      const stockCommand = new GetItemCommand({
        TableName: constants.STOCK_TABLE_NAME,
        Key: {
          product_id: { S: productId },
        },
      });
      const stockResponse = await dynamoDBClient.send(stockCommand);

      if (stockResponse.Item) {
        const stock = unmarshall(stockResponse.Item);
        product.count = stock.count || 0;
      } else {
        product.count = 0; 
      }

      return product;
    } catch (error: any) {
      console.error(`Error fetching product with ID ${productId}:`, error);
      throw new Error(`Could not fetch product with ID ${productId}`);
    }
  },

  async createProduct(product: Product): Promise<void> {
    try {
      const productsCommand = new PutItemCommand({
        TableName: constants.PRODUCTS_TABLE_NAME,
        Item: {
          id: { S: product.id },
          title: { S: product.title },
          description: { S: product.description || "" },
          price: { N: product.price.toString() },
        },
      });
      await dynamoDBClient.send(productsCommand);
  
      const stockCommand = new PutItemCommand({
        TableName: constants.STOCK_TABLE_NAME,
        Item: {
          product_id: { S: product.id },
          count: { N: product.count.toString() },
        },
      });
      await dynamoDBClient.send(stockCommand);
    } catch(error: any) {
      console.error("Error creating product:", error);
      throw new Error(`Could not create product`);
    }
  }
};