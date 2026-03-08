import { IsEnum, IsOptional, IsArray, IsBoolean, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ExportDto {
  @ApiProperty({ enum: ['json', 'csv'], description: 'Export format' })
  @IsEnum(['json', 'csv'])
  format: 'json' | 'csv';

  @ApiProperty({ description: 'Job IDs to export records from', required: false })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  jobIds?: string[];

  @ApiProperty({ description: 'Include annotations in export', required: false, default: false })
  @IsOptional()
  @IsBoolean()
  includeAnnotations?: boolean;

  @ApiProperty({ description: 'Specific fields to include (omit for all)', required: false })
  @IsOptional()
  @IsArray()
  fields?: string[];
}
