import { UpdateVenueDto } from '../../venue/dto/update-venue.dto';
import { UpdateUserDto } from './users.dto';
import { UpdateEntertainerDto } from '../../entertainer/dto/update-entertainer.dto';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateProfileDto {
  @ApiProperty({
    description: 'User Data you want to update',
    example: { name: 'ram', phoneNumber: 6230446543 },
  })
  userData: UpdateUserDto;

  @ApiProperty({
    description: 'Venue details  you want to update',
    example: {},
  })
  venueData?: UpdateVenueDto;

  @ApiProperty({
    description: 'Entertainers details  you want to update',
    example: {},
  })
  entertainerData?: UpdateEntertainerDto;
}
