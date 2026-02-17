import { Injectable, Inject } from '@nestjs/common';
import type { ProductRepository } from '../../domain/product.repository';
import type { ImageStorage } from '../../domain/image-storage.port';
import { ProductImage } from '../../domain/product-image.vo';

@Injectable()
export class EditProductUseCase {
  constructor(
    @Inject('ProductRepository')
    private readonly products: ProductRepository,

    @Inject('ImageStorage')
    private readonly storage: ImageStorage,
  ) {}

  async execute(params: {
    productId: string;
    actorId: string;

    patch?: {
      name?: string;
      description?: string;
      price?: number;
      stock?: number;
    };

    deleteImageIds?: string[];
    reorderToImageIds?: string[];

    replaceFiles?: {
      targetImageId: string;
      file: { buffer: Buffer; originalname: string };
    }[];

    appendFiles?: {
      buffer: Buffer;
      originalname: string;
    }[];
  }) {
    const product = await this.products.findById(params.productId);
    if (!product) {
      throw new Error('PRODUCT_NOT_FOUND');
    }

    // Save new images first (so domain receives ready ProductImage objects)

    const newAppendImages: ProductImage[] = [];

    if (params.appendFiles?.length) {
      for (const file of params.appendFiles) {
        const stored = await this.storage.save(file.buffer, file.originalname);
        newAppendImages.push(new ProductImage(stored.id, stored.url));
      }
    }

    const replaceImages: { targetImageId: string; newImage: ProductImage }[] =
      [];

    if (params.replaceFiles?.length) {
      for (const rep of params.replaceFiles) {
        const stored = await this.storage.save(
          rep.file.buffer,
          rep.file.originalname,
        );

        replaceImages.push({
          targetImageId: rep.targetImageId,
          newImage: new ProductImage(stored.id, stored.url),
        });
      }
    }

    const beforeImages = product.getImages();

    // substitute replaced IDs in reorder (client sends old target IDs)
    // extend with append image IDs at end (client only sends kept-image order)
    let reorderToImageIds = params.reorderToImageIds;
    if (reorderToImageIds) {
      const replaceById = new Map(
        replaceImages.map((r) => [r.targetImageId, r.newImage.id]),
      );
      reorderToImageIds = reorderToImageIds.map(
        (id) => replaceById.get(id) ?? id,
      );
      if (newAppendImages.length) {
        reorderToImageIds = [
          ...reorderToImageIds,
          ...newAppendImages.map((i) => i.id),
        ];
      }
    }

    // domain logic happens here
    product.edit({
      actorId: params.actorId,
      patch: params.patch,
      deleteImageIds: params.deleteImageIds,
      reorderToImageIds,
      appendImages: newAppendImages,
      replaceImages,
    });

    const afterImages = product.getImages();

    // Detect removed images for physical deletion
    const removed = beforeImages.filter(
      (img) => !afterImages.some((a) => a.id === img.id),
    );

    for (const img of removed) {
      await this.storage.delete(img.url);
    }

    await this.products.save(product);

    return product.toPrimitives();
  }
}

