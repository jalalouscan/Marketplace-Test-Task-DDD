import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ProductOrmEntity } from './infrastructure/persistence/product.orm-entity';
import { ProductImageOrmEntity } from './infrastructure/persistence/product-image.orm-entity';
import { TypeOrmProductRepository } from './infrastructure/persistence/typeorm-product.repository';
import { LocalImageStorage } from './infrastructure/storage/local-image.storage';
import { CreateProductUseCase } from './application/use-cases/create-product.usecase';
import { EditProductUseCase } from './application/use-cases/edit-product.usecase';
import { ListProductsUseCase } from './application/use-cases/list-products.usecase';
import { ProductsController } from './infrastructure/products.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ProductOrmEntity,
      ProductImageOrmEntity,
    ]),
    AuthModule,
  ],
  controllers: [ProductsController],
  providers: [
    {
      provide: 'ProductRepository',
      useClass: TypeOrmProductRepository,
    },
    {
      provide: 'ImageStorage',
      useClass: LocalImageStorage,
    },
    CreateProductUseCase,
    EditProductUseCase,
    ListProductsUseCase,
  ],
  exports: [
    'ProductRepository',
    CreateProductUseCase,
    EditProductUseCase,
    ListProductsUseCase,
  ],
})
export class ProductsModule {}
