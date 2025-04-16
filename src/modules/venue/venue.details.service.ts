import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { VenueDetails } from './entities/venue.details.entity';
import { Repository } from 'typeorm';
import { ContactDto } from './dto/add-contact-person.dto';

@Injectable()
export class VenueDetailService {
  constructor(
    @InjectRepository(VenueDetails)
    private readonly detailsRepository: Repository<VenueDetails>,
  ) {}

  async registerContact(payload: ContactDto, userId: number) {
    const { venueId, contactPerson } = payload;

    const alreadyRegistered = await this.detailsRepository.findOne({
      where: { venue_id: venueId },
    });

    if (alreadyRegistered) {
      await this.detailsRepository.update(
        { venue_id: venueId },
        { contactPerson: contactPerson },
      );
      return { message: 'Details updated successfully', status: true };
    }
    try {
      const contactDetails = this.detailsRepository.create({
        venue_id: venueId,
        user_id: userId,
        contactPerson,
      });

      await this.detailsRepository.save(contactDetails);
      return { message: 'Details Stored successfully', status: true };
    } catch (error) {
      throw new InternalServerErrorException({ message: error.message });
    }
  }

  async getContactDetails(id: number, userId: number) {
    const contactDetails = await this.detailsRepository.findOne({
      where: { venue_id: id, user_id: userId },
      select: ['id', 'contactPerson', 'venue_id'],
    });

    if (!contactDetails) {
      return {
        message: 'Contact Details returned Successfully',
        status: true,
        data: null,
      };
    }

    return {
      message: 'Contact Details returned Successfully',
      status: true,
      data: contactDetails,
    };
  }
}
