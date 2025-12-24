import { Injectable } from '@nestjs/common';
// Changes
@Injectable()
export class AppService {
  getHello(): string {
    return 'Hello World!';
  }
}
