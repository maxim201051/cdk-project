import { DynamoDBClient, PutItemCommand } from "@aws-sdk/client-dynamodb";
import { Product } from "../lib/product-lambda/entities/product";
import { products } from "./test-data/products";

const REGION = "eu-west-2";

const dynamoDBClient = new DynamoDBClient({ region: REGION });

const insertIntoProductsTable = async (item: Product) => {
  const params = {
    TableName: "products",
    Item: {
      id: { S: item.id },
      title: { S: item.title },
      description: { S: item.description || "" },
      price: { N: item.price.toString() },
    },
  };

  try {
    const command = new PutItemCommand(params);
    await dynamoDBClient.send(command);
    console.log(`Inserted into products table: ${item.title}`);
  } catch (error) {
    console.error(`Error inserting into products table: ${item.title}`, error);
  }
};

const insertIntoStockTable = async (item: Product) => {
  const params = {
    TableName: "stock",
    Item: {
      product_id: { S: item.id },
      count: { N: item.count.toString() },
    },
  };

  try {
    const command = new PutItemCommand(params);
    await dynamoDBClient.send(command);
    console.log(`Inserted into stock table: ${item.title}`);
  } catch (error) {
    console.error(`Error inserting into stock table: ${item.title}`, error);
  }
};

const insertTestData = async () => {
  for (const item of products) {
    await insertIntoProductsTable(item); 
    await insertIntoStockTable(item); 
  }
};

insertTestData();