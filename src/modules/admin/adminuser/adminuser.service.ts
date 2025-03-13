import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { RoleCapability } from '../auth/entities/role-capabilities.entity';
import { Repository } from 'typeorm';
import { Role } from './entities/role.entity';
import { Capability } from './entities/capability.entity';
import { CreateAdminUserDto } from './dto/createAdminUserDto';
import { AdminUser } from './entities/AdminUser.entity';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class AdminuserService {
  constructor(
    @InjectRepository(RoleCapability)
    private readonly RoleCapabilityRepository: Repository<RoleCapability>,
    @InjectRepository(Role)
    private roleRepository: Repository<Role>,
    @InjectRepository(Capability)
    private readonly capabilityRepository: Repository<Capability>,
    @InjectRepository(AdminUser)
    private readonly adminUserRepository: Repository<AdminUser>,
  ) {}
  async getRoles() {
    const roles = await this.roleRepository.find();

    return roles;
  }

  async createrole(role: string, user: string, permissions: number[]) {
    let existingRole = await this.roleRepository.findOne({
      where: { role_name: role },
    });

    if (!existingRole) {
      existingRole = this.roleRepository.create({ role_name: role });
      await this.roleRepository.save(existingRole);
    }

    const entries = permissions.map((capability_id) => ({
      role: existingRole.id.toString(),
      user,
      capability_id,
    }));

    await this.RoleCapabilityRepository.save(entries);

    return existingRole; // Return the role object (optional)
  }

  async getAllCapabilities(): Promise<Capability[]> {
    const capabilities = await this.capabilityRepository.find();

    return capabilities;
  }

  async create(createAdminUserDto: CreateAdminUserDto): Promise<AdminUser> {
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(
      createAdminUserDto.password,
      saltRounds,
    );

    const adminUser = this.adminUserRepository.create({
      ...createAdminUserDto,
      password: hashedPassword, // Store the hashed password
    });

    return await this.adminUserRepository.save(adminUser);
  }
}
