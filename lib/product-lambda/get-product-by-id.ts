import { productService } from "./service/product-service";

export const main = async (event: any) => {
    try {
        const productId = event.pathParameters?.id;
        if(!productId) {
          return {
            error: 'Product id required'
          };
        }
        const product = await productService.getProductById(productId);
        if (!product) {
            return {
              error: 'Product not found'
            };
          }
        return product;
    } catch (error) {
        return {
          error: 'Failed to fetch product'
        };
    }
}