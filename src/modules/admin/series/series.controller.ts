import { Controller } from '@nestjs/common';
import { SeriesService } from './series.service';

@Controller('admin/series')
export class SeriesController {
  constructor(private readonly seriesService: SeriesService) {}
}
