import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateAdminUserDto } from './dto/CreateAdminUserDto';
import { LoginDto } from './dto/loginDto';
import * as bcrypt from 'bcryptjs';
import { AdminUser } from './entities/AdminUser.entity';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role } from './entities/role.entity';
import { NotificationService } from 'src/modules/notification/notification.service';
@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(AdminUser)
    private readonly adminUserRepository: Repository<AdminUser>,

    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
    private jwtService: JwtService,
    private notificationService: NotificationService,
  ) {}

  async createAdminUser(
    createAdminUserDto: CreateAdminUserDto,
  ): Promise<AdminUser> {
    const { password } = createAdminUserDto;

    // Hash the password before saving
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create the admin user record
    const adminUser = this.adminUserRepository.create({
      ...createAdminUserDto,
      password: hashedPassword,
    });

    // Save to database
    await this.adminUserRepository.save(adminUser);

    return adminUser;
  }

  async adminlogin(adminlogin: LoginDto): Promise<any> {
    const { email, password, fcmToken } = adminlogin;

    // Find the user by email
    const user = await this.adminUserRepository.findOne({ where: { email } });
    if (!user) {
      throw new BadRequestException('Invalid email or password');
    }
    // Compare provided password with stored hashed password
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      throw new BadRequestException('Invalid email or password');
    }

    const userrole = await this.roleRepository.findOne({
      where: { id: Number(user.role) },
    });

    this.notificationService.storeAdminFcmToken(user.id, fcmToken);

    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const role = userrole.role_name;

    const token = this.jwtService.sign(payload);

    return { access_token: token, user, role };
  }
}
