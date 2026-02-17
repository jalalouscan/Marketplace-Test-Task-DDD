import { AuthGuard } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';

@Injectable()
export class DashboardJwtGuard extends AuthGuard('jwt-dashboard') {}
