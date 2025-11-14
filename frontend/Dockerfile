FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Expose port
EXPOSE 4200

# Default command (can be overridden in docker-compose)
CMD ["npm", "start", "--", "--host", "0.0.0.0"]