import { Type } from 'class-transformer';
import { IsOptional, IsPositive, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class PaginationDto {
  @ApiPropertyOptional({ example: 10, description: 'Max number of records to return', minimum: 1 })
  @IsOptional()
  @IsPositive()
  @Type(() => Number)
  limit?: number;

  @ApiPropertyOptional({ example: 0, description: 'Number of records to skip', minimum: 0 })
  @IsOptional()
  @Min(0)
  @Type(() => Number)
  skip?: number;
}
