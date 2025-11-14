import { Test, TestingModule } from '@nestjs/testing';
import { OllamaService } from './ollama.service';
import { Logger } from '@nestjs/common';

// Mock the ollama package
jest.mock('ollama');

describe('OllamaService', () => {
  let service: OllamaService;
  let mockOllamaChat: jest.Mock;

  beforeEach(async () => {
    // Create mock for Ollama class
    const { Ollama } = require('ollama');
    mockOllamaChat = jest.fn();
    Ollama.mockImplementation(() => ({
      chat: mockOllamaChat,
    }));

    const module: TestingModule = await Test.createTestingModule({
      providers: [OllamaService],
    }).compile();

    service = module.get<OllamaService>(OllamaService);

    // Suppress logger output during tests
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should call Ollama API with correct parameters', async () => {
    const prompt = 'Generate a schema for customer records';
    const systemPrompt = 'You are a schema generation expert';
    const mockResponse = {
      message: {
        content: 'Generated schema...',
      },
    };

    mockOllamaChat.mockResolvedValue(mockResponse);

    const result = await service.callModel(prompt, systemPrompt, 0.7, 1000);

    expect(mockOllamaChat).toHaveBeenCalledWith({
      model: 'llama3.3',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt },
      ],
      options: {
        temperature: 0.7,
        num_predict: 1000,
      },
      stream: false,
    });
    expect(result).toBe('Generated schema...');
  });

  it('should retry on JSON parse error', async () => {
    const prompt = 'Test';
    const systemPrompt = 'System';

    // First call returns invalid JSON
    mockOllamaChat
      .mockRejectedValueOnce(new Error('JSON parse error'))
      .mockResolvedValueOnce({
        message: { content: '{"valid": "json"}' },
      });

    const result = await service.callModel(prompt, systemPrompt, 0.7, 1000);

    expect(mockOllamaChat).toHaveBeenCalledTimes(2);
    expect(result).toBe('{"valid": "json"}');
  });

  it('should handle connection timeout gracefully', async () => {
    const prompt = 'test';
    const systemPrompt = 'system';

    mockOllamaChat.mockRejectedValue(new Error('Network error'));

    await expect(
      service.callModel(prompt, systemPrompt, 0.7, 1000),
    ).rejects.toThrow('Failed to call Ollama');
  });

  it('should log call duration', async () => {
    const mockResponse = {
      message: { content: 'result' },
    };

    mockOllamaChat.mockResolvedValue(mockResponse);

    await service.callModel('test', 'system', 0.7, 1000);

    const duration = service.getLastCallDuration();
    expect(duration).toBeGreaterThanOrEqual(0);
  });

  it('should track requestId in logs', async () => {
    const logSpy = jest.spyOn(Logger.prototype, 'log');
    const mockResponse = {
      message: { content: 'result' },
    };

    mockOllamaChat.mockResolvedValue(mockResponse);

    const requestId = 'test-request-123';
    await service.callModel('test', 'system', 0.7, 1000, requestId);

    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining(`[${requestId}]`),
    );
  });

  it('should return call log with metadata', async () => {
    const mockResponse = {
      message: { content: 'result' },
    };

    mockOllamaChat.mockResolvedValue(mockResponse);

    const requestId = 'test-request-456';
    await service.callModel('test', 'system', 0.7, 1000, requestId);

    const log = service.getLastCallLog();
    expect(log).toBeDefined();
    expect(log.requestId).toBe(requestId);
    expect(log.model).toBe('llama3.3');
    expect(log.status).toBe('success');
    expect(log.duration).toBeGreaterThanOrEqual(0);
  });

  it('should handle empty response content', async () => {
    const mockResponse = {
      message: { content: '' },
    };

    mockOllamaChat.mockResolvedValue(mockResponse);

    const result = await service.callModel('test', 'system', 0.7, 1000);
    expect(result).toBe('');
  });

  it('should fail after max retries', async () => {
    mockOllamaChat.mockRejectedValue(new Error('Persistent error'));

    await expect(
      service.callModel('test', 'system', 0.7, 1000),
    ).rejects.toThrow('Failed to call Ollama after 2 attempts');
  });
});
