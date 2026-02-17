import { ProductImage } from './product-image.vo';

export class Product {
  constructor(
    public readonly id: string,
    public readonly merchantId: string,
    private name: string,
    private description: string,
    private price: number,
    private stock: number,
    private images: ProductImage[],
  ) {}

  // =============================
  // PUBLIC READERS
  // =============================

  getImages(): ProductImage[] {
    return [...this.images];
  }

  toPrimitives() {
    return {
      id: this.id,
      merchantId: this.merchantId,
      name: this.name,
      description: this.description,
      price: this.price,
      stock: this.stock,
      images: this.images.map((i) => ({ id: i.id, url: i.url })),
    };
  }

  // =============================
  // CORE BUSINESS METHOD
  // =============================

  edit(params: {
    actorId: string;

    patch?: {
      name?: string;
      description?: string;
      price?: number;
      stock?: number;
    };

    deleteImageIds?: string[];

    replaceImages?: {
      targetImageId: string;
      newImage: ProductImage;
    }[];

    reorderToImageIds?: string[];

    appendImages?: ProductImage[];
  }) {
    // 🔒 Rule 1: Only owner can edit
    if (params.actorId !== this.merchantId) {
      throw new Error('UNAUTHORIZED_PRODUCT_EDIT');
    }

    // =============================
    // Patch scalar fields
    // =============================

    if (params.patch?.name !== undefined) {
      this.name = params.patch.name;
    }

    if (params.patch?.description !== undefined) {
      this.description = params.patch.description;
    }

    if (params.patch?.price !== undefined) {
      this.price = params.patch.price;
    }

    if (params.patch?.stock !== undefined) {
      this.stock = params.patch.stock;
    }

    // =============================
    // Delete images
    // =============================

    if (params.deleteImageIds?.length) {
      this.images = this.images.filter(
        (img) => !params.deleteImageIds!.includes(img.id),
      );
    }

    // =============================
    // Replace images (same position)
    // =============================

    if (params.replaceImages?.length) {
      for (const rep of params.replaceImages) {
        const index = this.images.findIndex((i) => i.id === rep.targetImageId);
        if (index === -1) {
          throw new Error('INVALID_REPLACE_TARGET');
        }

        this.images[index] = rep.newImage;
      }
    }

    // =============================
    // Append new images
    // =============================

    if (params.appendImages?.length) {
      this.images = [...this.images, ...params.appendImages];
    }

    // =============================
    // Reorder images
    // =============================

    if (params.reorderToImageIds?.length) {
      const currentIds = new Set(this.images.map((i) => i.id));

      // must match exactly
      if (params.reorderToImageIds.length !== this.images.length) {
        throw new Error('INVALID_REORDER_LENGTH');
      }

      for (const id of params.reorderToImageIds) {
        if (!currentIds.has(id)) {
          throw new Error('INVALID_REORDER_ID');
        }
      }

      const map = new Map(this.images.map((i) => [i.id, i]));
      this.images = params.reorderToImageIds.map((id) => map.get(id)!);
    }

    // =============================
    // FINAL RULE VALIDATION
    // =============================

    if (this.images.length < 1) {
      throw new Error('AT_LEAST_ONE_IMAGE_REQUIRED');
    }

    if (this.images.length > 5) {
      throw new Error('MAX_5_IMAGES');
    }
  }
}
