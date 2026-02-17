import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Res,
  Req,
  UseGuards,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
  UseInterceptors,
  UploadedFiles,
} from '@nestjs/common';
import type { Response } from 'express';
import {
  FileFieldsInterceptor,
  FilesInterceptor,
} from '@nestjs/platform-express';
import { JwtService } from '@nestjs/jwt';
import { LoginUseCase } from '../../auth/application/use-cases/login.usecase';
import { CreateProductUseCase } from '../../products/application/use-cases/create-product.usecase';
import { ListProductsUseCase } from '../../products/application/use-cases/list-products.usecase';
import { EditProductUseCase } from '../../products/application/use-cases/edit-product.usecase';
import { DashboardJwtGuard } from './jwt/dashboard-jwt.guard';

@Controller('dashboard')
export class DashboardController {
  constructor(
    private readonly loginUC: LoginUseCase,
    private readonly createProductUC: CreateProductUseCase,
    private readonly listProductsUC: ListProductsUseCase,
    private readonly editProductUC: EditProductUseCase,
    private readonly jwtService: JwtService,
  ) {}

  @Get('login')
  async loginPage(
    @Res() res: Response,
    @Req() req: { cookies?: { token?: string } },
  ) {
    const token = req.cookies?.token;
    if (token) {
      try {
        const payload = await this.jwtService.verifyAsync(token);
        if (payload?.role === 'merchant') {
          return res.redirect('/dashboard');
        }
      } catch {
        // invalid token, show login
      }
    }
    return res.render('login', { error: null });
  }

  @Post('login')
  async login(
    @Body('email') email: string,
    @Body('password') password: string,
    @Res() res: Response,
  ) {
    try {
      const result = await this.loginUC.execute({ email, password });
      if (result.user.role !== 'merchant') {
        return res.render('login', {
          error: 'Only merchants can access the dashboard',
        });
      }
      res.cookie('token', result.accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 3600 * 1000,
        path: '/',
      });
      return res.redirect('/dashboard');
    } catch (e: unknown) {
      if (e instanceof Error && e.message === 'INVALID_CREDENTIALS') {
        return res.render('login', { error: 'Invalid email or password' });
      }
      throw e;
    }
  }

  @Get('logout')
  logout(@Res() res: Response) {
    res.clearCookie('token', { path: '/' });
    return res.redirect('/dashboard/login');
  }

  @Get()
  @UseGuards(DashboardJwtGuard)
  async dashboard(
    @Res() res: Response,
    @Req() req: { user: { id: string; role: string; email: string } },
  ) {
    if (req.user.role !== 'merchant') {
      return res.redirect('/dashboard/login');
    }
    const products = await this.listProductsUC.execute({
      merchantId: req.user.id,
    });
    return res.render('dashboard', { products, user: req.user });
  }

  @Get('products/new')
  @UseGuards(DashboardJwtGuard)
  createProductPage(
    @Res() res: Response,
    @Req() req: { user: { id: string; role: string; email: string } },
  ) {
    if (req.user.role !== 'merchant') {
      return res.redirect('/dashboard/login');
    }
    return res.render('create-product', { user: req.user, error: null });
  }

  @Post('products')
  @UseGuards(DashboardJwtGuard)
  @UseInterceptors(FilesInterceptor('files', 5))
  async createProduct(
    @Body() body: Record<string, string>,
    @UploadedFiles() files: Express.Multer.File[],
    @Res() res: Response,
    @Req() req: { user: { id: string; role: string } },
  ) {
    if (req.user.role !== 'merchant') {
      return res.redirect('/dashboard/login');
    }
    try {
      const appendFiles =
        files?.map((f) => ({
          buffer: f.buffer,
          originalname: f.originalname,
        })) ?? [];
      await this.createProductUC.execute({
        merchantId: req.user.id,
        name: body.name ?? '',
        description: body.description ?? '',
        price: parseFloat(body.price ?? '0'),
        stock: parseInt(body.stock ?? '0', 10),
        files: appendFiles,
      });
      return res.redirect('/dashboard');
    } catch (e: unknown) {
      if (e instanceof Error) {
        if (e.message === 'AT_LEAST_ONE_IMAGE_REQUIRED') {
          return res.render('create-product', {
            user: req.user,
            error: 'At least one image is required',
            body,
          });
        }
        if (e.message === 'MAX_5_IMAGES') {
          return res.render('create-product', {
            user: req.user,
            error: 'Maximum 5 images allowed',
            body,
          });
        }
      }
      throw e;
    }
  }

  @Get('products/:id/edit')
  @UseGuards(DashboardJwtGuard)
  async editProductPage(
    @Param('id') id: string,
    @Res() res: Response,
    @Req() req: { user: { id: string; role: string } },
  ) {
    if (req.user.role !== 'merchant') {
      return res.redirect('/dashboard/login');
    }
    const products = await this.listProductsUC.execute({
      merchantId: req.user.id,
    });
    const product = products.find((p) => p.id === id);
    if (!product) {
      throw new NotFoundException('Product not found');
    }
    return res.render('edit-product', { product, user: req.user });
  }

  @Post('products/:id')
  @UseGuards(DashboardJwtGuard)
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'files', maxCount: 10 },
      { name: 'replaceFiles', maxCount: 5 },
    ]),
  )
  async editProduct(
    @Param('id') id: string,
    @Body() body: Record<string, string>,
    @UploadedFiles()
    uploaded: { files?: Express.Multer.File[]; replaceFiles?: Express.Multer.File[] },
    @Res() res: Response,
    @Req() req: { user: { id: string; role: string } },
  ) {
    if (req.user.role !== 'merchant') {
      return res.redirect('/dashboard/login');
    }
    try {
      const patch: Record<string, unknown> = {};
      if (body.name !== undefined) patch.name = body.name;
      if (body.description !== undefined) patch.description = body.description;
      if (body.price !== undefined) patch.price = parseFloat(body.price);
      if (body.stock !== undefined) patch.stock = parseInt(body.stock, 10);

      const deleteImageIdsRaw = body.deleteImageIds;
      const deleteImageIds = deleteImageIdsRaw
        ? Array.isArray(deleteImageIdsRaw)
          ? (deleteImageIdsRaw as string[]).filter(Boolean)
          : (deleteImageIdsRaw as string).split(',').filter(Boolean)
        : undefined;

      const reorderInput = body.reorderImageIds;
      const reorderToImageIds = reorderInput
        ? (reorderInput as string).split(',').map((s) => s.trim()).filter(Boolean)
        : undefined;

      const replaceTargetsRaw = body.replaceTargets;
      const replaceTargets = replaceTargetsRaw
        ? (replaceTargetsRaw as string).split(',').map((s) => s.trim()).filter(Boolean)
        : undefined;

      const replaceFilesList = uploaded?.replaceFiles ?? [];
      const replaceFiles =
        replaceTargets &&
        replaceTargets.length > 0 &&
        replaceFilesList.length >= replaceTargets.length
          ? replaceTargets.map((targetImageId, i) => ({
              targetImageId,
              file: {
                buffer: replaceFilesList[i].buffer,
                originalname: replaceFilesList[i].originalname,
              },
            }))
          : undefined;

      const appendFiles =
        uploaded?.files?.map((f) => ({
          buffer: f.buffer,
          originalname: f.originalname,
        })) ?? [];

      await this.editProductUC.execute({
        productId: id,
        actorId: req.user.id,
        patch: Object.keys(patch).length ? patch : undefined,
        deleteImageIds: deleteImageIds,
        reorderToImageIds,
        replaceFiles,
        appendFiles,
      });
      return res.redirect('/dashboard');
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
        if (
          e.message === 'INVALID_REORDER_LENGTH' ||
          e.message === 'INVALID_REORDER_ID'
        ) {
          throw new BadRequestException('Invalid reorder');
        }
      }
      throw e;
    }
  }
}
