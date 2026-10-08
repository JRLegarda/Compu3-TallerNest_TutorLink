import { IsEnum, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationDto } from '../../common/dto/pagination.dto.js';
import { BookingStatus } from '../enums/booking-status.enum.js';

export class FilterBooking extends PaginationDto {
  @ApiPropertyOptional({ example: BookingStatus.PENDING, description: 'Filter by status', enum: BookingStatus })
  @IsOptional()
  @IsEnum(BookingStatus)
  status?: BookingStatus;
}
