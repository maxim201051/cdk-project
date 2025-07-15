import { productService } from "./service/product-service";


export const main = async () => {
    try {
        const products = await productService.getAllProducts();
        return {
            statusCode: 200,
            body: JSON.stringify({ data: products })
        };
    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Failed to fetch products' }),
        };
    }
}