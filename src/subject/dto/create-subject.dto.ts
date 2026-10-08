import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateSubject {
  @ApiProperty({ example: 'Cálculo I', description: 'Subject name' })
  @IsString()
  @MinLength(2)
  name: string;

  @ApiProperty({ example: 'ICESI', description: 'University offering the subject' })
  @IsString()
  @MinLength(2)
  university: string;

  @ApiProperty({ example: '3', description: 'Semester of the subject' })
  @IsString()
  @MinLength(1)
  semester: string;
}
