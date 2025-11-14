import { IsEmail, IsString, MaxLength, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Match } from '../../../common/decorators/match.decorator';
import { IsStrongPassword } from '../../../common/decorators/is-strong-password.decorator';

export class RegisterDto {
  @ApiProperty({
    description: 'User email address',
    example: 'john.doe@example.com',
  })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  email: string;

  @ApiProperty({
    description: 'User password (min 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special char)',
    example: 'MySecureP@ss123',
    minLength: 8,
  })
  @IsStrongPassword()
  password: string;

  @ApiProperty({
    description: 'Password confirmation (must match password)',
    example: 'MySecureP@ss123',
  })
  @IsString()
  @Match('password', { message: 'Passwords do not match' })
  confirmPassword: string;

  @ApiPropertyOptional({
    description: 'User first name',
    example: 'John',
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  @MaxLength(50, { message: 'First name must not exceed 50 characters' })
  firstName?: string;

  @ApiPropertyOptional({
    description: 'User last name',
    example: 'Doe',
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  @MaxLength(50, { message: 'Last name must not exceed 50 characters' })
  lastName?: string;
}
