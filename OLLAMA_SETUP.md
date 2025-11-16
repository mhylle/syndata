# Ollama Configuration Guide

## Overview

The Ollama integration is now fully configurable to support different environments:
- **Work (H100 GPU)**: High-performance model on dedicated server
- **Home/Local**: Lighter model on local Ollama instance

## Configuration

### Environment Variables

Add these to your `backend/.env` file:

```env
OLLAMA_URL=<ollama-server-url>
OLLAMA_MODEL=<model-name>
```

### Environment-Specific Settings

#### Work Setup (H100 GPU)
```env
OLLAMA_URL=http://ollama:11434
OLLAMA_MODEL=llama3.3
```

#### Local Development (Home)
```env
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=llama3.1:8b
```

## Available Local Models

Check your available models:
```bash
curl http://localhost:11434/api/tags
```

Current models on your system:
- **llama3.1:8b** (Recommended) - 8B params, Q4_K_M quantization
- **qwen3:30b** - 30.5B params, Q4_K_M quantization
- **deepseek-r1:32b** - 32.8B params, Q4_K_M quantization
- **gpt-oss:20b** - 20.9B params, MXFP4 quantization
- **EmbeddingGemma:latest** - 307M params, BF16 (embedding model)
- **dengcao/Qwen3-Embedding-8B:Q4_K_M** - 7.6B params, Q4_K_M (embedding model)

## Quick Start

### 1. Copy Environment Template
```bash
cd backend
cp .env.example .env
```

### 2. Edit Configuration
Edit `backend/.env` and set:
```env
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=llama3.1:8b
```

### 3. Start Backend
```bash
npm run start:dev
```

You should see in the logs:
```
[OllamaService] Initialized Ollama service with URL: http://localhost:11434, Model: llama3.1:8b
```

## Switching Between Environments

### Method 1: Edit .env File
Simply change the values in `backend/.env`:
```bash
# Switch to work setup
OLLAMA_URL=http://ollama:11434
OLLAMA_MODEL=llama3.3

# Switch to local setup
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=llama3.1:8b
```

### Method 2: Environment Variables
Override at runtime:
```bash
OLLAMA_URL=http://localhost:11434 OLLAMA_MODEL=llama3.1:8b npm run start:dev
```

### Method 3: Docker Compose
For Docker deployments, set in `.env` at project root or use environment variables:
```bash
export OLLAMA_URL=http://ollama:11434
export OLLAMA_MODEL=llama3.3
docker compose up -d backend
```

## Testing Different Models

You can test different models without changing files:

```bash
# Test with qwen3:30b
OLLAMA_MODEL=qwen3:30b npm run start:dev

# Test with deepseek-r1:32b
OLLAMA_MODEL=deepseek-r1:32b npm run start:dev
```

## Verification

Check that the correct configuration is loaded by looking at the startup logs:
```
[NestApplication] Nest application successfully started
[OllamaService] Initialized Ollama service with URL: <your-url>, Model: <your-model>
```

## Troubleshooting

### Ollama Not Running
```bash
# Check if Ollama is running
curl http://localhost:11434/api/tags

# Start Ollama (if using local installation)
ollama serve
```

### Model Not Found
```bash
# Pull the model
ollama pull llama3.1:8b

# Or use a different model you already have
# Check available models:
ollama list
```

### Connection Issues
- For **local development**: Ensure Ollama is running on localhost:11434
- For **Docker**: Ensure the Ollama service is accessible from the backend container
- Check firewall settings if using remote Ollama server

## Default Values

If environment variables are not set, the service falls back to:
- **URL**: `http://ollama:11434`
- **Model**: `llama3.3`

These defaults are suitable for production Docker deployments with an Ollama service container.
