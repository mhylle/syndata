import { IsString, IsObject } from 'class-validator';

export class CreateElementDto {
  @IsString()
  name: string;

  @IsString()
  type: string;

  @IsObject()
  definition: any;
}
