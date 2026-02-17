import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ProductOrmEntity } from './product.orm-entity';

@Entity('product_images')
export class ProductImageOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 500 })
  url!: string;

  @Column({ type: 'uuid' })
  product_id!: string;

  @Column({ type: 'int', default: 0 })
  order_index!: number;

  @ManyToOne(() => ProductOrmEntity, (product) => product.images, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'product_id' })
  product!: ProductOrmEntity;
}
