import { IsEmail, IsString, MaxLength, MinLength } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class Login {
    
    @ApiProperty({ example: "ana@example.com", description: "User email", format: "email" })
    @IsString()
    @IsEmail()
    email:string;
    
    @ApiProperty({ example: "Secreta123", description: "User password", minLength: 8, maxLength: 16 })
    @IsString()
    @MinLength(8)
    @MaxLength(16)
    password:string;
    
}