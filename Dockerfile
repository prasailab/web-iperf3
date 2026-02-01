FROM node:20-bullseye-slim

# Install iperf3 and ping
RUN apt-get update && apt-get install -y \
    iperf3 \
    iputils-ping \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy backend requirements and install
COPY backend/package.json backend/package-lock.json ./backend/
WORKDIR /app/backend
RUN npm install

# Copy frontend requirements and install
WORKDIR /app
COPY frontend/package.json frontend/package-lock.json ./frontend/
WORKDIR /app/frontend
RUN npm install

# Copy source code
WORKDIR /app
COPY backend ./backend
COPY frontend ./frontend

# Build frontend
WORKDIR /app/frontend
RUN npm run build

# Setup backend to serve frontend (we will configure this in backend code)
# For now, just compile backend
WORKDIR /app/backend
RUN npx tsc

# Expose port
EXPOSE 3000

# Start command
CMD ["npm", "start"]
