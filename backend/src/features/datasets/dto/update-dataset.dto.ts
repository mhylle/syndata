import { IsString, IsObject, IsOptional } from 'class-validator';

export class UpdateDatasetDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsObject()
  @IsOptional()
  schemaDefinition?: any;
}
