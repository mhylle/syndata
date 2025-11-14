import { IsString, IsObject } from 'class-validator';

export class CreateDatasetDto {
  @IsString()
  name: string;

  @IsObject()
  schema: any;
}
