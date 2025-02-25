import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Venue } from '../venue/entities/venue.entity';
import { In, Like, Not, Repository } from 'typeorm';

import { Capability } from './adminuser/entities/capability.entity';
import { RoleCapability } from './auth/entities/role-capabilities.entity';

import { Role } from './auth/entities/role.entity';

import { UpdateStatusDto } from './users/Dto/update-status.dto';
import { UpdateUserDto } from './users/Dto/update-user.dto';


@Injectable()
export class AdminService {

  getHello(): string {
    return 'Hello Admin!';
  }
}
