import { IsUUID, IsString, IsNumber, IsOptional, Min, Max, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

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
    description: 'Prompt template that instructs the LLM how to transform each source record into a target record. Use {{record}} to reference the full source record JSON.',
    example: 'Given this patient record, write a clinical summary that a clinician would see at the start of a consultation. Focus on key findings, current medications, and risk factors.',
  })
  @IsString()
  @MinLength(10)
  transformationPrompt: string;

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
