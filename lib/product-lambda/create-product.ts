import z from "zod";
import { Product, ProductSchema } from "./entities/product";
import { productService } from "./service/product-service";

export const main = async (event: any) => {
    try {
        const body = event.body;
        const product: Product = ProductSchema.parse(body);
        
        await productService.createProduct(product);
        return product;
    } catch (error: any) {
        if(error instanceof z.ZodError) {
            return {
                error: "Invalid product data", details: error.issues
            }
        }
        return {
            error: "Failed to create product"
        };
    }
}
