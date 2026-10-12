import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../../database/prisma.service';

export interface JwtPayload {
  sub: string;
  phone?: string;
  email?: string;
  role: string;
  shopId?: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'super-secret-jwt-key-replace-in-production-for-gebeya-boot',
    });
  }

  async validate(payload: JwtPayload) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: {
        ownedShop: true,
        staffShop: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found or session invalid');
    }

    const shopId = user.ownedShop?.id || user.staffShop?.id || payload.shopId;

    return {
      id: user.id,
      phone: user.phone,
      email: user.email,
      role: user.role,
      shopId,
      name: user.name,
    };
  }
}
