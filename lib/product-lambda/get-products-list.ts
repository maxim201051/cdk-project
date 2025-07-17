import { productService } from "./service/product-service";


export const main = async () => {
    try {
        const products = await productService.getAllProducts();
        return products;
    } catch (error) {
        return {
           error: 'Failed to fetch products' 
        };
    }
}