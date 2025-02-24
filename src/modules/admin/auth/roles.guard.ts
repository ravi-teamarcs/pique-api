
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
import { RoleCapability } from './entities/role-capabilities.entity';
import { Capability } from './entities/capability.entity';


@Injectable()
export class RolesGuardAdmin implements CanActivate {
  constructor(
    private reflector: Reflector,
    @InjectRepository(Role) private roleRepository: Repository<Role>,
    @InjectRepository(RoleCapability)
    private RoleCapabilityRepository: Repository<RoleCapability>,
    @InjectRepository(Capability)
    private capabilityRepository: Repository<Capability>,
  ) { }

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

    const userRole = await this.roleRepository.findOne({
      where: { id: user.role },
    });

    if (!userRole) {
      throw new ForbiddenException(`Role "${user.role}" not found.`);
    }

    const endpoint = await this.capabilityRepository.findOne({
      where: [{ name: roles[0] },
      { name: 'all' },]
    });
    if (!endpoint) {
      throw new ForbiddenException('You do not have access to this API and Endpoint.');
    }


    const hasAccess = await this.RoleCapabilityRepository.findOne({
      where: {
        role: userRole.id.toString(),
        capability_id: endpoint.id,
      },
    });

    if (!hasAccess) {
      throw new ForbiddenException('You do not have access to this API.');
    }

    return true;
  }
}
