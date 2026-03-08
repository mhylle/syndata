import { IsString, IsNumber, IsOptional, IsObject, Min, Max, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class GenerateSchemaDto {
  @IsString()
  description: string;

  @IsOptional()
  @IsString()
  businessContext?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(1000000)
  targetRecordCount?: number;

  @IsOptional()
  @IsString()
  domainExpertise?: string;
}

export class AnswerDto {
  @IsString()
  questionId: string;

  @IsString()
  answer: string;
}

export class RefineSchemaDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AnswerDto)
  answers: AnswerDto[];
}

export class CreateDatasetFromSchemaDto {
  @IsString()
  name: string;

  @IsObject()
  schema: any;

  @IsOptional()
  @IsString()
  description?: string;
}
