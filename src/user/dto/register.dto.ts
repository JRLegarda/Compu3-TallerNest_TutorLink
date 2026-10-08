import { IsEmail, IsString, MaxLength, MinLength } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class Register {

    @ApiProperty({ example: "ana@example.com", description: "User email (must be unique)", format: "email" })
    @IsString()
    @IsEmail()
    email:string;

    @ApiProperty({ example: "Secreta123", description: "Password (8 to 16 characters)", minLength: 8, maxLength: 16 })
    @IsString()
    @MinLength(8)
    @MaxLength(16)
    password:string;

    @ApiProperty({ example: "Ana Pérez", description: "User's full name" })
    @IsString()
    fullName:string;
}