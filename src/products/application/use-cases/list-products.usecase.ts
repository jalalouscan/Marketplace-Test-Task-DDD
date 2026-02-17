import { Injectable, Inject } from '@nestjs/common';
import type { ProductRepository } from '../../domain/product.repository';

@Injectable()
export class ListProductsUseCase {
  constructor(
    @Inject('ProductRepository')
    private readonly products: ProductRepository,
  ) {}

  async execute(params: { merchantId: string }) {
    const products = await this.products.findByMerchantId(params.merchantId);
    return products.map((p) => p.toPrimitives());
  }
}
