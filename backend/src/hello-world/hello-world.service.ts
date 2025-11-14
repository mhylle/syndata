import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HelloWorld } from '../shared/entities';

@Injectable()
export class HelloWorldService {
  constructor(
    @InjectRepository(HelloWorld)
    private helloWorldRepository: Repository<HelloWorld>,
  ) {}

  async create(text: string): Promise<HelloWorld> {
    const helloWorld = this.helloWorldRepository.create({ text });
    return this.helloWorldRepository.save(helloWorld);
  }

  async findAll(): Promise<HelloWorld[]> {
    return this.helloWorldRepository.find({
      order: { createdAt: 'DESC' },
    });
  }
}
