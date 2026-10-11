import { IsBoolean, IsInt, IsOptional, IsString, IsUUID, Min } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationDto } from '../../common/dto/pagination.dto.js';

export class FilterTutor extends PaginationDto {
  @ApiPropertyOptional({ example: '4fcfc5ab-7902-478f-b173-b8f1e751af12', description: 'Only tutors teaching this subject', format: 'uuid' })
  @IsOptional()
  @IsUUID()
  subjectId?: string;

  @ApiPropertyOptional({ example: 'ICESI', description: 'Filter by university (case-insensitive)' })
  @IsOptional()
  @IsString()
  university?: string;

  @ApiPropertyOptional({ example: 20000, description: 'Max hourly rate in COP', minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  maxRate?: number;

  @ApiPropertyOptional({ example: true, description: 'Only verified (true) or unverified (false) tutors' })
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  verified?: boolean;
}
