import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Role } from '@prisma/client';

@Injectable()
export class ShopOwnerGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('User is not authenticated');
    }

    // Platform Admin has global oversight
    if (user.role === Role.ADMIN) {
      return true;
    }

    // Check path parameter shopId or query param
    const targetShopId = request.params?.shopId || request.params?.id || request.body?.shopId;
    if (targetShopId && user.shopId && targetShopId !== user.shopId) {
      throw new ForbiddenException('Unauthorized: You cannot access or modify another shop’s data');
    }

    return true;
  }
}
