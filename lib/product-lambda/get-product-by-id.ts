import { productService } from "./service/product-service";

export const main = async (event: any) => {
    try {
        const productId = event.pathParameters?.id;
        const product = await productService.getProductById(productId);
        if (!product) {
            return {
              statusCode: 404,
              body: JSON.stringify({ message: 'Product not found' }),
            };
          }
        return {
            statusCode: 200,
            body: JSON.stringify({ data: product }),
          };
    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Failed to fetch product' }),
        };
    }
}