import { UpdateUserDto } from './users.dto';

export class UpdateProfileDto {
  userData: UpdateUserDto;
  venueData?: {};
  entertainerData?: {};
}
