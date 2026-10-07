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
import { SubjectService } from './subject.service.js';
import { CreateSubject } from './dto/create-subject.dto.js';
import { UpdateSubject } from './dto/update-subject.dto.js';
import { FilterSubject } from './dto/filter-subject.dto.js';
import { Auth } from '../user/decorators/auth.decorator.js';
import { UserRole } from '../user/enums/user-role.enum.js';

@Controller('subject')
export class SubjectController {
  constructor(private readonly subjectService: SubjectService) {}

  @Post()
  @Auth(UserRole.ADMIN)
  create(@Body() createSubject: CreateSubject) {
    return this.subjectService.create(createSubject);
  }

  @Get()
  @Auth()
  findAll(@Query() filterSubject: FilterSubject) {
    return this.subjectService.findAll(filterSubject);
  }

  @Get(':id')
  @Auth()
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.subjectService.findOne(id);
  }

  @Patch(':id')
  @Auth(UserRole.ADMIN)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateSubject: UpdateSubject,
  ) {
    return this.subjectService.update(id, updateSubject);
  }

  @Delete(':id')
  @Auth(UserRole.ADMIN)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.subjectService.remove(id);
  }
}
