import z from "zod";
import { Product, ProductSchema } from "./entities/product";
import { productService } from "./service/product-service";
import { PublishCommand, SNSClient } from "@aws-sdk/client-sns";

const snsClient = new SNSClient({ region: 'eu-west-2' });
const snsTopicArn = process.env.SNS_TOPIC_ARN!;

export const main = async (event: any) => {
    console.log('Processing SQS messages:', JSON.stringify(event, null, 2));

    const createdProducts: Product[] = [];

    for (const record of event.Records) {
        try {
            const body = JSON.parse(record.body);
            const product: Product = ProductSchema.parse(body);
            
            const { id, title, description, price, count } = body;
            if (!id || !title || !price || count === undefined) {
                return {
                    error: "Missing required fields: id, title, price, or count" 
                };
            }
            await productService.createProduct(product);
            createdProducts.push(product);
        } catch (error: any) {
            if(error instanceof z.ZodError) {
                console.error('Validation errors:', error.issues);
            } else {
                console.error('Error creating product:', error);
            }
        }
    }

    if (createdProducts.length > 0) {
        const message = `The following products were created: ${JSON.stringify(createdProducts)}`;
        try {
            await snsClient.send(
                new PublishCommand({
                TopicArn: snsTopicArn,
                Subject: 'New Products Created',
                Message: message,
                })
            );
            console.log('SNS notification sent.');
        } catch (error) {
            console.error('Error sending SNS notification:', error);
        }
    }

    return { message: 'Batch process completed.' };

}
