import { SetMetadata } from '@nestjs/common';

// export const Roles = (role: string) => SetMetadata('role', role);

export const Roles = (...roles: string[]) => SetMetadata('roles', roles);
