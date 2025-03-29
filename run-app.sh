#!/bin/bash

# Colors for better readability
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=================================${NC}"
echo -e "${BLUE}   Starting AI Tutoring App     ${NC}"
echo -e "${BLUE}=================================${NC}"

# Kill any existing Node.js processes
echo -e "${YELLOW}Stopping any existing Node.js processes...${NC}"
killall node 2>/dev/null || echo "No Node.js processes found"
sleep 1

# Set high memory limit for Node.js (8GB)
echo -e "${YELLOW}Setting high memory limit (8GB) for Node.js${NC}"
export NODE_OPTIONS='--max-old-space-size=8192'

# Start the development server
echo -e "${YELLOW}Starting Next.js on port 4200...${NC}"
npm run dev &
SERVER_PID=$!

# Wait for server to start
echo -e "${YELLOW}Waiting for server to initialize...${NC}"
sleep 5

# Check if server is responding
echo -e "${YELLOW}Testing server connection...${NC}"
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:4200/ || echo "failed")

if [ "$RESPONSE" == "200" ]; then
  echo -e "${GREEN}Server started successfully!${NC}"
  echo -e "${GREEN}Open your browser at: ${NC}http://localhost:4200"
  echo -e "${GREEN}Memory limit increased to 8GB to prevent restarts${NC}"
  
  # Keep process running until user terminates it
  echo -e "${YELLOW}Press Ctrl+C to stop the server${NC}"
  wait $SERVER_PID
else
  echo -e "${RED}Failed to connect to server.${NC}"
  echo -e "${YELLOW}Try running the following commands manually:${NC}"
  echo "cd $(pwd)"
  echo "export NODE_OPTIONS='--max-old-space-size=8192'"
  echo "npm run dev"
fi 