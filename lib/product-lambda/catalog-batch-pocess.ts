import z from "zod";
import { Product, ProductSchema } from "./entities/product";
import { productService } from "./service/product-service";
import { notificationService } from "./service/notification-service";

export const main = async (event: any) => {
    console.log('Processing SQS messages:', JSON.stringify(event, null, 2));

    const createdProducts: Product[] = [];

    for (const record of event.Records) {
        try {
            const body = JSON.parse(record.body);
            const product: Product = ProductSchema.parse(body);

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
        await notificationService.sendProductsCreatedNotification(createdProducts);
    }

    return { message: 'Batch process completed.' };

}
