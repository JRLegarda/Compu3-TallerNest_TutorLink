import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBadRequestResponse, ApiConflictResponse, ApiCreatedResponse, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { SubjectService } from './subject.service.js';
import { CreateSubject } from './dto/create-subject.dto.js';
import { UpdateSubject } from './dto/update-subject.dto.js';
import { FilterSubject } from './dto/filter-subject.dto.js';
import { Subject } from './entities/subject.entity.js';
import { Auth } from '../user/decorators/auth.decorator.js';
import { UserRole } from '../user/enums/user-role.enum.js';

@ApiTags('Subjects')
@Controller('subject')
export class SubjectController {
  constructor(private readonly subjectService: SubjectService) {}

  @Post()
  @Auth(UserRole.ADMIN)
  @ApiOperation({ summary: 'Create a subject', description: 'Requires the admin role. The same name cannot repeat in the same university and semester' })
  @ApiCreatedResponse({ description: 'Subject was created', type: Subject })
  @ApiBadRequestResponse({ description: 'Invalid request body' })
  @ApiConflictResponse({ description: 'Subject already exists for that university and semester' })
  create(@Body() createSubject: CreateSubject) {
    return this.subjectService.create(createSubject);
  }

  @Get()
  @Auth()
  @ApiOperation({ summary: 'List subjects', description: 'Supports filters by university, semester and search, plus pagination' })
  @ApiOkResponse({ description: 'Subjects list', type: [Subject] })
  @ApiBadRequestResponse({ description: 'Invalid filter params' })
  findAll(@Query() filterSubject: FilterSubject) {
    return this.subjectService.findAll(filterSubject);
  }

  @Get(':id')
  @Auth()
  @ApiOperation({ summary: 'Find a subject', description: 'Search by id (UUID)' })
  @ApiParam({ name: 'id', description: 'Subject id (UUID)', format: 'uuid' })
  @ApiOkResponse({ description: 'Subject found', type: Subject })
  @ApiNotFoundResponse({ description: 'Subject not found' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.subjectService.findOne(id);
  }

  @Patch(':id')
  @Auth(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update a subject', description: 'Requires the admin role' })
  @ApiParam({ name: 'id', description: 'Subject id (UUID)', format: 'uuid' })
  @ApiOkResponse({ description: 'Subject was updated', type: Subject })
  @ApiBadRequestResponse({ description: 'Invalid request body' })
  @ApiNotFoundResponse({ description: 'Subject not found' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateSubject: UpdateSubject,
  ) {
    return this.subjectService.update(id, updateSubject);
  }

  @Delete(':id')
  @Auth(UserRole.ADMIN)
  @ApiOperation({ summary: 'Delete a subject', description: 'Requires the admin role' })
  @ApiParam({ name: 'id', description: 'Subject id (UUID)', format: 'uuid' })
  @ApiOkResponse({ description: 'Subject was deleted', type: Subject })
  @ApiNotFoundResponse({ description: 'Subject not found' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.subjectService.remove(id);
  }
}
