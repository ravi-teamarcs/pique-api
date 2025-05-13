import { Injectable, InternalServerErrorException } from '@nestjs/common';
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

      return {
        message: 'countries fetched successfully',
        count: countries.length,
        countries,
        status: true,
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
        status: true,
      };
    } catch (error) {
      throw new Error(error.message);
    }
  }

  async findAllCities(stateId: number = 38) {
    try {
      const cities = await this.cityRepository.find({
        where: { state_id: stateId },
      });

      return {
        message: 'Cities fetched successfully',
        count: cities.length,
        cities,
        status: true,
      };
    } catch (error) {
      throw new Error(error.message);
    }
  }

  // location.service.ts
  async searchCityAndState(query: string) {
    try {
      const likeQuery = `%${query.toLowerCase()}%`; // Convert query to lowercase for case-insensitivity

      const [cities, states] = await Promise.all([
        this.cityRepository
          .createQueryBuilder('city')
          .where('LOWER(city.name) LIKE :query', { query: likeQuery }) // Use LOWER() for case-insensitive search
          .select(['city.id', 'city.name'])
          .limit(5)
          .getMany(),

        this.stateRepository
          .createQueryBuilder('state')
          .where('LOWER(state.name) LIKE :query', { query: likeQuery }) // Same here for states
          .select(['state.id', 'state.name'])
          .limit(5)
          .getMany(),
      ]);

      const cityResults = cities.map((city) => ({
        id: city.id,
        name: city.name,
        type: 'city',
      }));

      const stateResults = states.map((state) => ({
        id: state.id,
        name: state.name,
        type: 'state',
      }));

      return {
        message: 'Location fetched Successfully',
        data: [...cityResults, ...stateResults],
        status: true,
      };
    } catch (error) {
      throw new InternalServerErrorException(error.message);
    }
  }
}
