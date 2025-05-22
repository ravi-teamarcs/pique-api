import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class GeocodingService {
  constructor(private readonly configService: ConfigService) {}
  private readonly apiKey = this.configService.get<string>(
    'GOOGLE_GEOCODE_API_KEY',
  );
  private readonly endpoint =
    'https://maps.googleapis.com/maps/api/geocode/json';

  /**
   * Geocode a free-form address into latitude & longitude.
   */
  async geocodeAddress(address: string): Promise<{ lat: number; lng: number }> {
    try {
      const response = await axios.get(this.endpoint, {
        params: {
          address,
          key: this.apiKey,
        },
      });

      const data = response.data;
      if (data.status !== 'OK' || !data.results.length) {
        return { lat: null, lng: null };
      }

      const location = data.results[0].geometry.location;
      return { lat: location.lat, lng: location.lng };
    } catch (error) {
      return { lat: null, lng: null };
    }
  }

  /**
   * (Optional) Reverse‐geocode coords into an address.
   */
  async reverseGeocode(
    lat: number,
    lng: number,
  ): Promise<{
    formattedAddress: string;
    city?: string;
    state?: string;
    postalCode?: string;
  }> {
    try {
      const response = await axios.get(
        this.endpoint.replace('/geocode/', '/geocode/json'),
        {
          params: {
            latlng: `${lat},${lng}`,
            key: this.apiKey,
          },
        },
      );

      const data = response.data;
      if (data.status !== 'OK' || !data.results.length) {
        throw new Error(`No results: ${data.status}`);
      }

      const result = data.results[0];
      const components = result.address_components;

      const getComp = (type: string) =>
        components.find((c) => c.types.includes(type))?.long_name;

      return {
        formattedAddress: result.formatted_address,
        city: getComp('locality') || getComp('sublocality'),
        state: getComp('administrative_area_level_1'),
        postalCode: getComp('postal_code'),
      };
    } catch {
      throw new InternalServerErrorException('Failed to reverse geocode');
    }
  }
}
