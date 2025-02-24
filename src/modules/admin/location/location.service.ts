import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Countries } from './Entitiy/country.entity';
import { Repository } from 'typeorm';
import { Cities } from './Entitiy/city.entity';
import { States } from './Entitiy/state.entity';

@Injectable()
export class LocationService {
  constructor(
    @InjectRepository(Countries)
    private readonly countryRepository: Repository<Countries>,
    @InjectRepository(States)
    private readonly stateRepository: Repository<States>,
    @InjectRepository(Cities)
    private readonly cityRepository: Repository<Cities>,
  ) { }
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
  async CountriesSearch(search: string) {
    try {
      const query = this.countryRepository.createQueryBuilder('country').andWhere('LOWER(country.name) LIKE LOWER(:search)', { search: `%${search}%` });


      const countries = await query.getMany();



      return {
        message: 'Countries fetched successfully',
        count: countries.length,
        countries,
      };
    } catch (error) {
      throw new Error(error.message);
    }
  }
  async allowCountry(id: number) {
    try {
      const country = await this.countryRepository.findOne({ where: { id } });

      if (!country) {
        throw new NotFoundException(`Country with ID ${id} not found`);
      }

      if (country.status === 0) {
        country.status = 1;
      } else {
        country.status = 0;
      }
      await this.countryRepository.save(country);

      return {
        message: 'Country is now allowed',
        country,
      };
    } catch (error) {
      throw new Error(error.message);
    }
  }

  async findAllowedCountries() {
    try {
      const countries = await this.countryRepository.find({
        where: { status: 1 },
      });

      return {
        message: 'Allowed countries fetched successfully',
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

  async findAllCities(stateId: number = 38) {
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
