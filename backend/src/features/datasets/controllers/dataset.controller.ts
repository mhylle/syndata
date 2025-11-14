// backend/src/features/datasets/controllers/dataset.controller.ts
import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { DatasetService } from '../services/dataset.service';
import { CreateDatasetDto, CreateElementDto } from '../dto';

@ApiTags('Datasets')
@Controller('projects/:projectId/datasets')
export class DatasetController {
  constructor(private readonly datasetService: DatasetService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new dataset' })
  create(@Param('projectId') projectId: string, @Body() createDatasetDto: CreateDatasetDto) {
    return this.datasetService.create(projectId, createDatasetDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get datasets for a project' })
  findByProject(@Param('projectId') projectId: string) {
    return this.datasetService.findByProject(projectId);
  }

  @Get(':datasetId')
  @ApiOperation({ summary: 'Get a specific dataset' })
  findOne(@Param('datasetId') datasetId: string) {
    return this.datasetService.findOne(datasetId);
  }

  @Post(':datasetId/elements')
  @ApiOperation({ summary: 'Add element to dataset' })
  addElement(@Param('datasetId') datasetId: string, @Body() createElementDto: CreateElementDto) {
    return this.datasetService.addElement(datasetId, createElementDto);
  }

  @Get(':datasetId/elements')
  @ApiOperation({ summary: 'Get elements for a dataset' })
  getElements(@Param('datasetId') datasetId: string) {
    return this.datasetService.getElements(datasetId);
  }

  @Get(':datasetId/elements/:elementId')
  @ApiOperation({ summary: 'Get a specific element' })
  getElement(@Param('elementId') elementId: string) {
    return this.datasetService.getElement(elementId);
  }
}
