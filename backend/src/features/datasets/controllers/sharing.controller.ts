import { Controller, Get, Post, Delete, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { SharingService } from '../services/sharing.service';

@ApiTags('Sharing')
@Controller('shared')
export class SharingController {
  constructor(private readonly sharingService: SharingService) {}

  @Post()
  @ApiOperation({ summary: 'Share a dataset or element' })
  share(
    @Body() body: {
      resourceType: 'dataset' | 'element';
      resourceId: string;
      sourceProjectId: string;
      visibility?: 'private' | 'public';
    },
  ) {
    return this.sharingService.shareResource(
      body.resourceType,
      body.resourceId,
      body.sourceProjectId,
      body.visibility,
    );
  }

  @Get()
  @ApiOperation({ summary: 'List shared resources' })
  list(
    @Query('type') type?: 'dataset' | 'element',
    @Query('projectId') projectId?: string,
  ) {
    return this.sharingService.listSharedResources(type, projectId);
  }

  @Post(':id/import')
  @ApiOperation({ summary: 'Import a shared resource into a project' })
  importResource(
    @Param('id') sharedResourceId: string,
    @Body() body: { targetProjectId?: string; targetDatasetId?: string },
  ) {
    if (body.targetDatasetId) {
      return this.sharingService.importSharedElement(sharedResourceId, body.targetDatasetId);
    }
    return this.sharingService.importSharedDataset(sharedResourceId, body.targetProjectId!);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Unshare a resource' })
  unshare(@Param('id') sharedResourceId: string) {
    return this.sharingService.unshare(sharedResourceId);
  }
}
