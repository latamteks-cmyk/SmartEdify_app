import { Injectable } from '@nestjs/common';

@Injectable()
export class RpService {
  getRpName(): string {
    return 'SmartEdify';
  }

  getRpId(): string {
    // This should be the domain of your application
    return 'localhost';
  }

  getExpectedOrigin(): string {
    // This should be the origin of your application
    return 'http://localhost:3000';
  }
}
