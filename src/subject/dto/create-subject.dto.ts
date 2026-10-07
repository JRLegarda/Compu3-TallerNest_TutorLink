import { IsString, MinLength } from 'class-validator';

export class CreateSubject {
  @IsString()
  @MinLength(2)
  name: string;

  @IsString()
  @MinLength(2)
  university: string;

  @IsString()
  @MinLength(1)
  semester: string;
}
