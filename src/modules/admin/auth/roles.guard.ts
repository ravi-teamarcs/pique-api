
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
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

    // const endpoint = await this.capabilityRepository.findOne({
    //   where: [{ name: roles[0] },
    //   { name: 'all' },]
    // });

    const endpoints = await this.capabilityRepository.find({
      where: roles.map(role => ({ name: role })).concat([{ name: 'all' }]),
    });

    if (!endpoints) {
      throw new ForbiddenException('You do not have access to this API and Endpoint.');
    }


    // const hasAccess = await this.RoleCapabilityRepository.findOne({
    //   where: {
    //     role: userRole.id.toString(),
    //     capability_id: endpoint.id,
    //   },
    // });

    // if (!hasAccess) {
    //   throw new ForbiddenException('You do not have access to this API.');
    // }

    const capabilities = await this.capabilityRepository.find({
      where: { name: In([...roles, 'all']) }, // Check for required roles or 'all'
    });

    if (!capabilities.length) {
      throw new ForbiddenException('You do not have access to this API and Endpoint.');
    }

    const capabilityIds = capabilities.map(capability => capability.id);

    // Check if the user has any of the required capabilities
    const hasAccess = await this.RoleCapabilityRepository.findOne({
      where: {
        role: userRole.id.toString(),
        capability_id: In(capabilityIds), // Use In() operator
      },
    });

    if (!hasAccess) {
      throw new ForbiddenException('You do not have access to this API.');
    }

    return true;
  }
}
