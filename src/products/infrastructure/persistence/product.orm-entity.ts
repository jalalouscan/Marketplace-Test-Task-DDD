import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ProductImageOrmEntity } from './product-image.orm-entity';

@Entity('products')
export class ProductOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  merchant_id!: string;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'text' })
  description!: string;

  @Column({ type: 'numeric' })
  price!: number;

  @Column({ type: 'int' })
  stock!: number;

  @OneToMany(() => ProductImageOrmEntity, (img) => img.product, {
    cascade: true,
    eager: true,
    orphanedRowAction: 'delete',
  })
  images!: ProductImageOrmEntity[];

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}
