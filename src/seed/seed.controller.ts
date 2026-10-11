import { Controller, Get, Query, UnauthorizedException } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiQuery, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { SeedService } from './seed.service.js';

@ApiTags('Seed')
@Controller('seed')
export class SeedController {
  constructor(private readonly seedService: SeedService) {}

  @Get()
  @ApiOperation({ summary: 'Run the seed', description: 'Deletes booking, tutor_profile, subject and user (in that order) and loads the admin, subjects, 2 tutors and 2 students. Protect with the SEED_KEY query param' })
  @ApiQuery({ name: 'key', description: 'Must match the SEED_KEY env variable', example: 'mi-clave-seed' })
  @ApiOkResponse({ description: 'SEED EXECUTED' })
  @ApiUnauthorizedResponse({ description: 'Invalid seed key' })
  run(@Query('key') key?: string) {
    if (!process.env.SEED_KEY || key !== process.env.SEED_KEY) {
      throw new UnauthorizedException('Invalid seed key');
    }
    return this.seedService.runSeed();
  }
}
