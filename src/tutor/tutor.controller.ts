import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Put, Query } from '@nestjs/common';
import { ApiBadRequestResponse, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { TutorService } from './tutor.service.js';
import { CreateTutorProfile } from './dto/create-tutor-profile.js';
import { FilterTutor } from './dto/filter-tutor.dto.js';
import { TutorProfile } from './entities/tutor-profile.entity.js';
import { Auth } from '../user/decorators/auth.decorator.js';
import { GetUser } from '../user/decorators/get-user.decorator.js';
import { UserRole } from '../user/enums/user-role.enum.js';
import { User } from '../user/entities/user.entity.js';

@ApiTags('Tutors')
@Controller('tutor')
export class TutorController {
  constructor(private readonly tutorService: TutorService) {}

  @Put('me')
  @Auth(UserRole.TUTOR)
  @ApiOperation({ summary: 'Create or replace my tutor profile', description: 'Requires the tutor role (granted by an admin). Creates the profile or replaces it if it already exists' })
  @ApiOkResponse({ description: 'Tutor profile saved', type: TutorProfile })
  @ApiBadRequestResponse({ description: 'Invalid profile data' })
  @ApiNotFoundResponse({ description: 'One or more subjects do not exist' })
  upsertMe(@GetUser() user: User, @Body() dto: CreateTutorProfile) {
    return this.tutorService.upsertMyProfile(user, dto);
  }

  @Get()
  @Auth()
  @ApiOperation({ summary: 'List tutors', description: 'Filters by subject, university, max rate and verified, plus pagination' })
  @ApiOkResponse({ description: 'Tutors list', type: [TutorProfile] })
  @ApiBadRequestResponse({ description: 'Invalid filter params' })
  findAll(@Query() filter: FilterTutor) {
    return this.tutorService.findAll(filter);
  }

  @Get(':id')
  @Auth()
  @ApiOperation({ summary: 'Find a tutor', description: 'Search by tutor profile id (UUID)' })
  @ApiParam({ name: 'id', description: 'Tutor profile id (UUID)', format: 'uuid' })
  @ApiOkResponse({ description: 'Tutor found', type: TutorProfile })
  @ApiNotFoundResponse({ description: 'Tutor not found' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.tutorService.findOne(id);
  }

  @Patch(':id/verify')
  @Auth(UserRole.ADMIN)
  @ApiOperation({ summary: 'Verify a tutor', description: 'Requires the admin role. Marks the profile as verified' })
  @ApiParam({ name: 'id', description: 'Tutor profile id (UUID)', format: 'uuid' })
  @ApiOkResponse({ description: 'Tutor was verified', type: TutorProfile })
  @ApiNotFoundResponse({ description: 'Tutor not found' })
  verify(@Param('id', ParseUUIDPipe) id: string) {
    return this.tutorService.verify(id);
  }
}
