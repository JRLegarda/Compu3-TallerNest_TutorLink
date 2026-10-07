import { IsOptional, IsString } from 'class-validator';
import { PaginationDto } from '../../common/dto/pagination.dto.js';

export class FilterSubject extends PaginationDto {
  @IsOptional()
  @IsString()
  university?: string;

  @IsOptional()
  @IsString()
  semester?: string;

  @IsOptional()
  @IsString()
  search?: string;
}
