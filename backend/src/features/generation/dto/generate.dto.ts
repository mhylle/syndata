import { IsUUID, IsNumber, IsObject, IsOptional } from 'class-validator';

export class GenerateDto {
  @IsUUID()
  datasetId: string;

  @IsNumber()
  count: number;

  @IsOptional()
  @IsObject()
  rules?: any;

  @IsOptional()
  @IsObject()
  compositionConfig?: any;
}
