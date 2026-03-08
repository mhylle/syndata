import { IsUUID, IsString, IsNumber, IsOptional, IsArray, Min, Max, ValidateNested } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class FieldMappingDto {
  @ApiProperty({ description: 'Target field name in the destination dataset' })
  @IsString()
  targetField: string;

  @ApiProperty({
    description: 'Mapping mode: "map" copies from source field, "llm" generates via LLM',
    enum: ['map', 'llm'],
  })
  @IsString()
  mode: 'map' | 'llm';

  @ApiPropertyOptional({ description: 'Source field name (required when mode is "map")' })
  @IsOptional()
  @IsString()
  sourceField?: string;

  @ApiPropertyOptional({ description: 'LLM prompt for this field (required when mode is "llm")' })
  @IsOptional()
  @IsString()
  prompt?: string;

  @ApiPropertyOptional({
    description: 'Source fields to include as context for LLM generation. If omitted, entire source record is sent.',
    example: ['patient_name', 'age', 'diagnosis'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  sourceContextFields?: string[];
}

export class GenerateFromDatasetDto {
  @ApiProperty({
    description: 'Source dataset ID to derive records from',
    example: 'ecc5a98c-1a95-41ff-b8c1-6c169d4d8522',
  })
  @IsUUID()
  sourceDatasetId: string;

  @ApiPropertyOptional({
    description: 'Source job ID — if omitted, uses all records from source dataset',
  })
  @IsOptional()
  @IsUUID()
  sourceJobId?: string;

  @ApiProperty({
    description: 'Field-level mappings: map source fields or generate via LLM per target field',
    type: [FieldMappingDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FieldMappingDto)
  fieldMappings: FieldMappingDto[];

  @ApiPropertyOptional({
    description: 'Global context prompt prepended to all LLM field prompts',
    example: 'You are generating clinical summaries for hospital patients.',
  })
  @IsOptional()
  @IsString()
  globalPrompt?: string;

  @ApiPropertyOptional({
    description: 'Max number of source records to process. If omitted, processes all source records.',
    minimum: 1,
    maximum: 10000,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(10000)
  count?: number;
}
