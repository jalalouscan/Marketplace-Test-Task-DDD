import {
  Controller,
  Post,
  Put,
  Param,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFiles,
  Req,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../../auth/infrastructure/jwt/jwt.guard';
import { CreateProductUseCase } from '../application/use-cases/create-product.usecase';
import { EditProductUseCase } from '../application/use-cases/edit-product.usecase';

@Controller('products')
export class ProductsController {
  constructor(
    private readonly createUC: CreateProductUseCase,
    private readonly editUC: EditProductUseCase,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FilesInterceptor('files', 5))
  async createProduct(
    @UploadedFiles() files: Express.Multer.File[],
    @Body() body: Record<string, string>,
    @Req() req: { user: { id: string; role: string } },
  ) {
    if (req.user.role !== 'merchant') {
      throw new ForbiddenException('Merchant only');
    }
    try {
      const appendFiles =
        files?.map((f) => ({
          buffer: f.buffer,
          originalname: f.originalname,
        })) ?? [];
      return await this.createUC.execute({
        merchantId: req.user.id,
        name: body.name ?? '',
        description: body.description ?? '',
        price: parseFloat(body.price ?? '0'),
        stock: parseInt(body.stock ?? '0', 10),
        files: appendFiles,
      });
    } catch (e: unknown) {
      if (e instanceof Error) {
        if (e.message === 'AT_LEAST_ONE_IMAGE_REQUIRED') {
          throw new BadRequestException('At least one image required');
        }
        if (e.message === 'MAX_5_IMAGES') {
          throw new BadRequestException('Maximum 5 images allowed');
        }
      }
      throw e;
    }
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FilesInterceptor('files', 10)) // allow multiple uploads
  async editProduct(
    @Param('id') id: string,
    @UploadedFiles() files: Express.Multer.File[],
    @Body() body: Record<string, string>,
    @Req() req: { user: { id: string; role: string } },
  ) {
    if (req.user.role !== 'merchant') {
      throw new ForbiddenException('Merchant only');
    }

    try {
      const actorId = req.user.id;

      // Parse JSON fields sent as string (common with multipart)
      const patch = body.patch ? JSON.parse(body.patch) : undefined;
      const deleteImageIds = body.deleteImageIds
        ? JSON.parse(body.deleteImageIds)
        : undefined;
      const reorderToImageIds = body.reorderToImageIds
        ? JSON.parse(body.reorderToImageIds)
        : undefined;
      const replaceTargets = body.replaceTargets
        ? (JSON.parse(body.replaceTargets) as string[])
        : undefined;

      // First N files map to replaceTargets (replace at same index); rest append
      const replaceCount = replaceTargets?.length ?? 0;
      const allFiles =
        files?.map((f) => ({
          buffer: f.buffer,
          originalname: f.originalname,
        })) ?? [];
      const replaceFiles =
        replaceCount > 0 && allFiles.length >= replaceCount
          ? replaceTargets!.map((targetImageId, i) => ({
              targetImageId,
              file: allFiles[i],
            }))
          : undefined;
      const appendFiles = allFiles.slice(replaceCount);

      return await this.editUC.execute({
        productId: id,
        actorId,
        patch,
        deleteImageIds,
        reorderToImageIds,
        replaceFiles,
        appendFiles,
      });
    } catch (e: unknown) {
      if (e instanceof Error) {
        if (e.message === 'PRODUCT_NOT_FOUND') {
          throw new NotFoundException('Product not found');
        }
        if (e.message === 'UNAUTHORIZED_PRODUCT_EDIT') {
          throw new ForbiddenException('Not allowed to edit this product');
        }
        if (e.message === 'AT_LEAST_ONE_IMAGE_REQUIRED') {
          throw new BadRequestException('At least one image required');
        }
        if (e.message === 'MAX_5_IMAGES') {
          throw new BadRequestException('Maximum 5 images allowed');
        }
        if (e.message === 'INVALID_REPLACE_TARGET') {
          throw new BadRequestException('Invalid replace target');
        }
        if (e.message === 'INVALID_REORDER_LENGTH' || e.message === 'INVALID_REORDER_ID') {
          throw new BadRequestException('Invalid reorder');
        }
      }
      throw e;
    }
  }
}
