import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Countries } from './entities/country.entity';
import { Repository } from 'typeorm';
import { Cities } from './entities/city.entity';
import { States } from './entities/state.entity';

@Injectable()
export class LocationService {
  constructor(
    @InjectRepository(Countries)
    private readonly countryRepository: Repository<Countries>,
    @InjectRepository(States)
    private readonly stateRepository: Repository<States>,
    @InjectRepository(Cities)
    private readonly cityRepository: Repository<Cities>,
  ) {}
  async findAllCountries() {
    try {
      const countries = await this.countryRepository.find({
        where: { status: 1 },
      });

      if (!countries) {
        throw new Error('Failed to fetch list of countries');
      }
      return {
        message: 'countries fetched successfully',
        count: countries.length,
        countries,
      };
    } catch (error) {
      throw new Error(error.message);
    }
  }

  async findAllStates(countryId: number = 101) {
    try {
      const states = await this.stateRepository.find({
        where: { country_id: countryId },
      });

      if (states.length === 0) {
        throw new Error('No states found for the provided country');
      }
      return {
        message: 'State fetched successfully',
        count: states.length,
        states,
      };
    } catch (error) {
      throw new Error(error.message);
    }
  }

  async findAllCities(stateId: number=38) {
    try {
      const cities = await this.cityRepository.find({
        where: { state_id: stateId },
      });

      if (cities.length === 0) {
        throw new Error('Failed to fetch list of Cities');
      }
      return {
        message: 'Cities fetched successfully',
        count: cities.length,
        cities,
      };
    } catch (error) {
      throw new Error(error.message);
    }
  }
}
