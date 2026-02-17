import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import type { ProductRepository } from '../../domain/product.repository';
import type { Product } from '../../domain/product.entity';
import { ProductOrmEntity } from './product.orm-entity';
import { ProductImageOrmEntity } from './product-image.orm-entity';
import { ProductMapper } from './product.mapper';

@Injectable()
export class TypeOrmProductRepository implements ProductRepository {
  constructor(
    @InjectRepository(ProductOrmEntity)
    private readonly repo: Repository<ProductOrmEntity>,
    @InjectRepository(ProductImageOrmEntity)
    private readonly imageRepo: Repository<ProductImageOrmEntity>,
  ) {}

  async findById(id: string): Promise<Product | null> {
    const row = await this.repo.findOne({
      where: { id },
      relations: ['images'],
    });

    return row ? ProductMapper.toDomain(row) : null;
  }

  async findByMerchantId(merchantId: string): Promise<Product[]> {
    const rows = await this.repo.find({
      where: { merchant_id: merchantId },
      relations: ['images'],
      order: { updated_at: 'DESC' },
    });
    return rows.map((r) => ProductMapper.toDomain(r));
  }

  async save(product: Product): Promise<void> {
    const existing = await this.repo.findOne({
      where: { id: product.id },
      relations: ['images'],
    });

    if (!existing) {
      const row = ProductMapper.toOrm(product);
      await this.repo.save(row);
      return;
    }

    const primitive = product.toPrimitives();
    existing.merchant_id = primitive.merchantId;
    existing.name = primitive.name;
    existing.description = primitive.description;
    existing.price = primitive.price;
    existing.stock = primitive.stock;

    // Reuse existing image entities; explicitly delete removed ones.
    // (TypeORM's orphanedRowAction sets product_id=null first, which violates NOT NULL.)
    const keptIds = new Set(primitive.images.map((img) => img.id));
    const toDelete = existing.images.filter((img) => !keptIds.has(img.id));
    if (toDelete.length) {
      await this.imageRepo.remove(toDelete);
    }

    const existingById = new Map(
      existing.images.filter((img) => keptIds.has(img.id)).map((img) => [img.id, img]),
    );
    existing.images = primitive.images.map((img, idx) => {
      const existingImg = existingById.get(img.id);
      if (existingImg) {
        existingImg.url = img.url;
        existingImg.order_index = idx;
        return existingImg;
      }
      const imgRow = new ProductImageOrmEntity();
      imgRow.id = img.id;
      imgRow.url = img.url;
      imgRow.product_id = primitive.id;
      imgRow.order_index = idx;
      return imgRow;
    });
    await this.repo.save(existing);
  }
}
