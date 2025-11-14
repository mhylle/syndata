import { Module } from '@nestjs/common';
import { WinstonModule } from 'nest-winston';
import { ConfigService } from '@nestjs/config';
import * as winston from 'winston';

@Module({
  imports: [
    WinstonModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const environment = configService.get<string>('environment');
        const logLevel = configService.get<string>('logging.level');
        const enableConsole = configService.get<boolean>(
          'logging.enableConsole',
        );
        const enableFile = configService.get<boolean>('logging.enableFile');
        const filePath = configService.get<string>('logging.filePath');

        const transports: winston.transport[] = [];

        // Console transport - always enabled in development
        if (enableConsole) {
          transports.push(
            new winston.transports.Console({
              format: winston.format.combine(
                winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
                winston.format.ms(),
                winston.format.printf((info) => {
                  // Extract basic Winston fields
                  const {
                    timestamp,
                    level,
                    message,
                    context,
                    stack,
                    ...metadata
                  } = info;

                  // Use colors for levels
                  const colors: { [key: string]: string } = {
                    error: '\x1b[31m', // red
                    warn: '\x1b[33m', // yellow
                    info: '\x1b[32m', // green
                    debug: '\x1b[36m', // cyan
                    verbose: '\x1b[35m', // magenta
                  };
                  const reset = '\x1b[0m';
                  const levelColor = colors[level] || reset;

                  // Build log message
                  let log = `${timestamp} [${context || 'Application'}] ${levelColor}${level}${reset}: ${message}`;

                  // Filter out Winston symbol keys and empty metadata
                  const cleanMeta: any = {};
                  for (const [key, value] of Object.entries(metadata)) {
                    if (
                      typeof key === 'string' &&
                      !key.startsWith('Symbol') &&
                      value !== undefined
                    ) {
                      cleanMeta[key] = value;
                    }
                  }

                  // Add metadata if present
                  if (Object.keys(cleanMeta).length > 0) {
                    log += `\n${JSON.stringify(cleanMeta, null, 2)}`;
                  }

                  // Add stack trace if present
                  if (stack) {
                    log += `\n${stack}`;
                  }

                  return log;
                }),
              ),
            }),
          );
        }

        // File transport - optional
        if (enableFile && filePath) {
          transports.push(
            new winston.transports.File({
              filename: filePath,
              format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.json(),
              ),
            }),
          );

          // Separate error log file
          transports.push(
            new winston.transports.File({
              filename:
                filePath?.replace('.log', '-error.log') || 'logs/error.log',
              level: 'error',
              format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.json(),
              ),
            }),
          );
        }

        return {
          level: logLevel,
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.errors({ stack: true }),
            winston.format.json(),
          ),
          transports,
          exitOnError: false,
        };
      },
    }),
  ],
  exports: [WinstonModule],
})
export class LoggerModule {}
