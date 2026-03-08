import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { TemplateService } from '../services/template.service';

@ApiTags('Templates')
@Controller('templates')
export class TemplateController {
  constructor(private readonly templateService: TemplateService) {}

  @Get()
  @ApiOperation({ summary: 'List all available schema templates' })
  @ApiResponse({ status: 200, description: 'List of template summaries' })
  listTemplates() {
    return this.templateService.listTemplates();
  }

  @Get(':templateId')
  @ApiOperation({ summary: 'Get full template details' })
  @ApiResponse({ status: 200, description: 'Template details with schema and rules' })
  @ApiResponse({ status: 404, description: 'Template not found' })
  @ApiParam({ name: 'templateId', description: 'Template ID' })
  getTemplate(@Param('templateId') templateId: string) {
    return this.templateService.getTemplate(templateId);
  }
}
