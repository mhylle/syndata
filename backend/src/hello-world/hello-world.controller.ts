import { Controller, Get, Post, Body } from '@nestjs/common';
import { IsString, IsNotEmpty, MaxLength } from 'class-validator';
import { ApiTags, ApiOperation, ApiResponse, ApiProperty } from '@nestjs/swagger';
import { HelloWorldService } from './hello-world.service';
import { HelloWorld } from '../shared/entities';

class CreateHelloWorldDto {
  @ApiProperty({
    description: 'Text content for the hello world message',
    example: 'Hello, this is a test message!',
    maxLength: 500,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  text: string;
}

@ApiTags('Hello World')
@Controller('hello-world')
export class HelloWorldController {
  constructor(private readonly helloWorldService: HelloWorldService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new hello world message' })
  @ApiResponse({
    status: 201,
    description: 'Message created successfully',
    type: HelloWorld,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - validation failed',
  })
  create(
    @Body() createHelloWorldDto: CreateHelloWorldDto,
  ): Promise<HelloWorld> {
    return this.helloWorldService.create(createHelloWorldDto.text);
  }

  @Get()
  @ApiOperation({ summary: 'Get all hello world messages' })
  @ApiResponse({
    status: 200,
    description: 'List of all messages',
    type: [HelloWorld],
  })
  findAll(): Promise<HelloWorld[]> {
    return this.helloWorldService.findAll();
  }
}
