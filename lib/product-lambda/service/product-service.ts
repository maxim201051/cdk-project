import { products } from "../data/products";

export const productService = {
    async getAllProducts() {
        return products;
    },
  
    async getProductById(productId: string) {
        return products.find(product => product.id === productId);
    },

};