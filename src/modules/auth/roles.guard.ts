import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role } from './entities/role.entity';
import { Access } from './entities/access.entity';
import { EndPoints } from './entities/endpoint.entity';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    @InjectRepository(Role) private roleRepository: Repository<Role>,
    @InjectRepository(Access)
    private accessRepository: Repository<Access>,
    @InjectRepository(EndPoints)
    private endpointRepository: Repository<EndPoints>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const roles = this.reflector.get<string[]>('roles', context.getHandler());
    if (!roles) {
      throw new ForbiddenException('role is missing.');
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.role) {
      throw new ForbiddenException('User role is missing.');
    }
    // Inactive account don not have access
    if (user.status === 'inactive' || user.status === 'pending') {
      throw new ForbiddenException({
        message: 'Your do not have  access to this resource.',
        status: false,
      });
    }

    const userRole = await this.roleRepository.findOne({
      where: { name: user.role },
    });

    if (!userRole) {
      throw new ForbiddenException(`Role "${user.role}" not found.`);
    }

    const endpoint = await this.endpointRepository.findOne({
      where: { endpoint: roles[0] },
    });

    const hasAccess = await this.accessRepository.findOne({
      where: {
        roleId: userRole.id,
        endpointId: endpoint.id,
      },
    });

    if (!hasAccess) {
      throw new ForbiddenException('You do not have access to this API.');
    }

    return true;
  }
}
