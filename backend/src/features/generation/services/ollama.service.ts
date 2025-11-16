import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Ollama } from 'ollama';

interface OllamaCallLog {
  requestId?: string;
  startTime: number;
  endTime: number;
  duration: number;
  model: string;
  status: 'success' | 'error' | 'retry';
}

@Injectable()
export class OllamaService {
  private readonly logger = new Logger(OllamaService.name);
  private readonly OLLAMA_URL = process.env.OLLAMA_URL || 'http://ollama:11434';
  private readonly OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3.3';
  private readonly MAX_RETRIES = 1;
  private lastCallLog: OllamaCallLog;
  private ollama: Ollama;

  constructor() {
    this.ollama = new Ollama({ host: this.OLLAMA_URL });
    this.logger.log(`Initialized Ollama service with URL: ${this.OLLAMA_URL}, Model: ${this.OLLAMA_MODEL}`);
  }

  async callModel(
    prompt: string,
    systemPrompt: string,
    temperature: number = 0.7,
    maxTokens: number = 2000,
    requestId?: string,
  ): Promise<string> {
    const startTime = Date.now();
    let attempt = 0;
    let lastError: Error | null = null;

    while (attempt <= this.MAX_RETRIES) {
      try {
        this.logger.log(`[${requestId}] Calling Ollama (attempt ${attempt + 1})`);

        const response = await this.ollama.chat({
          model: this.OLLAMA_MODEL,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: prompt },
          ],
          options: {
            temperature: temperature,
            num_predict: maxTokens,
          },
          stream: false,
        });

        const endTime = Date.now();
        const duration = endTime - startTime;

        // Extract response content
        const generatedText = response.message.content || '';

        // Log successful call
        this.lastCallLog = {
          requestId,
          startTime,
          endTime,
          duration,
          model: this.OLLAMA_MODEL,
          status: 'success',
        };

        this.logger.log(
          `[${requestId}] Ollama call successful (${duration}ms)`,
        );

        return generatedText;
      } catch (error) {
        lastError = error;
        attempt++;

        // Retry on certain errors
        if (attempt <= this.MAX_RETRIES) {
          this.logger.warn(
            `[${requestId}] Ollama call failed, retrying... (${error.message})`,
          );
          continue;
        }

        // Log failed call
        const duration = Date.now() - startTime;
        this.lastCallLog = {
          requestId,
          startTime,
          endTime: Date.now(),
          duration,
          model: this.OLLAMA_MODEL,
          status: 'error',
        };

        this.logger.error(
          `[${requestId}] Ollama call failed: ${error.message}`,
        );
      }
    }

    throw new HttpException(
      `Failed to call Ollama after ${this.MAX_RETRIES + 1} attempts: ${lastError?.message || 'Unknown error'}`,
      HttpStatus.SERVICE_UNAVAILABLE,
    );
  }

  getLastCallDuration(): number {
    return this.lastCallLog?.duration || 0;
  }

  getLastCallLog(): OllamaCallLog {
    return this.lastCallLog;
  }
}
