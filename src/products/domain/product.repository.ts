import type { Product } from './product.entity';

export interface ProductRepository {
  findById(id: string): Promise<Product | null>;
  findByMerchantId(merchantId: string): Promise<Product[]>;
  save(product: Product): Promise<void>;
}
