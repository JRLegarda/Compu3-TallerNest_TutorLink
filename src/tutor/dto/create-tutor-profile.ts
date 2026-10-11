import { ArrayNotEmpty, ArrayUnique, IsArray, IsInt, IsString, IsUUID, Min, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateTutorProfile {
  @ApiProperty({ example: 'Estudiante de ingeniería con 3 semestres dando tutorías de cálculo.', description: 'Tutor bio', minLength: 10 })
  @IsString()
  @MinLength(10)
  bio: string;

  @ApiProperty({ example: 15000, description: 'Hourly rate in COP', minimum: 1 })
  @IsInt()
  @Min(1)
  hourlyRate: number;

  @ApiProperty({ example: 'Monitor de Cálculo I (2025), promedio 4.5.', description: 'Academic history shown to students', minLength: 10 })
  @IsString()
  @MinLength(10)
  academicHistory: string;

  @ApiProperty({ example: 'ICESI', description: 'Tutor university' })
  @IsString()
  @MinLength(2)
  university: string;

  @ApiProperty({ example: ['4fcfc5ab-7902-478f-b173-b8f1e751af12'], description: 'Subjects the tutor teaches (ids)', type: [String], format: 'uuid' })
  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @IsUUID('4', { each: true })
  subjectIds: string[];
}
