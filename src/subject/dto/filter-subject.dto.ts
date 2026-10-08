import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationDto } from '../../common/dto/pagination.dto.js';

export class FilterSubject extends PaginationDto {
  @ApiPropertyOptional({ example: 'ICESI', description: 'Filter by university (case-insensitive)' })
  @IsOptional()
  @IsString()
  university?: string;

  @ApiPropertyOptional({ example: '3', description: 'Filter by semester (case-insensitive)' })
  @IsOptional()
  @IsString()
  semester?: string;

  @ApiPropertyOptional({ example: 'cálculo', description: 'Search by subject name (case-insensitive)' })
  @IsOptional()
  @IsString()
  search?: string;
}
