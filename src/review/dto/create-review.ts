import { IsInt, IsString, IsUUID, Max, MaxLength, Min, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateReview {
  @ApiProperty({ example: '9b2f1c3e-2a4d-4e8b-9f1a-6c7d8e9f0a1b', format: 'uuid' })
  @IsUUID()
  bookingId: string;

  @ApiProperty({ example: 5, minimum: 1, maximum: 5 })
  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  @ApiProperty({ example: 'Explica muy claro y es puntual.' })
  @IsString()
  @MinLength(3)
  @MaxLength(500)
  comment: string;
}
