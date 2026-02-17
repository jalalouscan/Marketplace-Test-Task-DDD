import { Injectable, Inject } from '@nestjs/common';
import { randomUUID } from 'crypto';
import type { ProductRepository } from '../../domain/product.repository';
import type { ImageStorage } from '../../domain/image-storage.port';
import { Product } from '../../domain/product.entity';
import { ProductImage } from '../../domain/product-image.vo';

@Injectable()
export class CreateProductUseCase {
  constructor(
    @Inject('ProductRepository')
    private readonly products: ProductRepository,

    @Inject('ImageStorage')
    private readonly storage: ImageStorage,
  ) {}

  async execute(params: {
    merchantId: string;
    name: string;
    description: string;
    price: number;
    stock: number;
    files: { buffer: Buffer; originalname: string }[];
  }) {
    if (!params.files?.length) {
      throw new Error('AT_LEAST_ONE_IMAGE_REQUIRED');
    }
    if (params.files.length > 5) {
      throw new Error('MAX_5_IMAGES');
    }

    const images: ProductImage[] = [];
    for (const file of params.files) {
      const stored = await this.storage.save(file.buffer, file.originalname);
      images.push(new ProductImage(stored.id, stored.url));
    }

    const product = new Product(
      randomUUID(),
      params.merchantId,
      params.name,
      params.description,
      params.price,
      params.stock,
      images,
    );

    await this.products.save(product);
    return product.toPrimitives();
  }
}
