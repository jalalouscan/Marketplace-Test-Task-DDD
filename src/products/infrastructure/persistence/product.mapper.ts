import { Product } from '../../domain/product.entity';
import { ProductImage } from '../../domain/product-image.vo';
import { ProductOrmEntity } from './product.orm-entity';
import { ProductImageOrmEntity } from './product-image.orm-entity';

export class ProductMapper {
  static toDomain(row: ProductOrmEntity): Product {
    const sortedImages = [...row.images].sort(
      (a, b) => (a.order_index ?? 0) - (b.order_index ?? 0),
    );
    return new Product(
      row.id,
      row.merchant_id,
      row.name,
      row.description,
      Number(row.price),
      row.stock,
      sortedImages.map((img) => new ProductImage(img.id, img.url)),
    );
  }

  static toOrm(product: Product): ProductOrmEntity {
    const primitive = product.toPrimitives();

    const row = new ProductOrmEntity();
    row.id = primitive.id;
    row.merchant_id = primitive.merchantId;
    row.name = primitive.name;
    row.description = primitive.description;
    row.price = primitive.price;
    row.stock = primitive.stock;

    row.images = primitive.images.map((img, idx) => {
      const imgRow = new ProductImageOrmEntity();
      imgRow.id = img.id;
      imgRow.url = img.url;
      imgRow.product_id = primitive.id;
      imgRow.order_index = idx;
      return imgRow;
    });

    return row;
  }
}
