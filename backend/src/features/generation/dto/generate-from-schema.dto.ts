import { IsUUID, IsNumber, IsOptional, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class GenerateFromSchemaDto {
  @ApiProperty({
    description: 'Number of records to generate',
    example: 100,
    minimum: 1,
    maximum: 10000,
  })
  @IsNumber()
  @Min(1)
  @Max(10000)
  count: number;

  @ApiPropertyOptional({
    description: 'Minimum confidence threshold for components (0-1)',
    example: 0.7,
    minimum: 0,
    maximum: 1,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  minComponentConfidence?: number;

  @ApiPropertyOptional({
    description: 'Minimum confidence threshold for generation rules (0-1)',
    example: 0.6,
    minimum: 0,
    maximum: 1,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  minRuleConfidence?: number;

  @ApiPropertyOptional({
    description: 'Minimum confidence threshold for fields (0-1)',
    example: 0.5,
    minimum: 0,
    maximum: 1,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  minFieldConfidence?: number;
}
