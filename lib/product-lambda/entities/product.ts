import { z } from "zod";

export interface Product {
    id: string;
    title: string;
    description?: string;
    price: number;
    count: number;
  }

export const ProductSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().optional(), 
  price: z.number(),
  count: z.number(),
});
