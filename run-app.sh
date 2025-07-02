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

# Increase memory limits - bump to 12GB
echo -e "${YELLOW}Setting higher memory limit (12GB) for Node.js${NC}"
export NODE_OPTIONS='--max-old-space-size=12288 --expose-gc'

# Create logs directory if it doesn't exist
mkdir -p logs

# Start the development server with error logging
echo -e "${YELLOW}Starting Next.js on port 4200 with verbose logging...${NC}"
npm run dev -- --port 4200 > logs/nextjs.log 2>&1 &
SERVER_PID=$!

# Wait for server to start
echo -e "${YELLOW}Waiting for server to initialize...${NC}"
sleep 6

# Check if server is responding
echo -e "${YELLOW}Testing server connection...${NC}"
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:4200/ || echo "failed")

if [ "$RESPONSE" == "200" ]; then
  echo -e "${GREEN}Server started successfully!${NC}"
  echo -e "${GREEN}Open your browser at: ${NC}http://localhost:4200"
  echo -e "${GREEN}Memory limit increased to 12GB to prevent restarts${NC}"
  echo -e "${YELLOW}Logs being written to: ${NC}logs/nextjs.log"
  
  # Tail the logs to show output in terminal
  echo -e "${YELLOW}Showing live log output... (Ctrl+C to stop viewing logs but keep server running)${NC}"
  tail -f logs/nextjs.log || true
  
  echo -e "${YELLOW}Server is still running in background. To stop it completely, run:${NC}"
  echo "killall node"
else
  echo -e "${RED}Failed to connect to server.${NC}"
  echo -e "${YELLOW}Checking logs for errors:${NC}"
  tail -n 20 logs/nextjs.log
  
  echo -e "${YELLOW}Try running the following commands manually:${NC}"
  echo "cd $(pwd)"
  echo "export NODE_OPTIONS='--max-old-space-size=12288 --expose-gc'"
  echo "npm run dev -- --port 4200"
  
  # Clean up
  kill $SERVER_PID 2>/dev/null
fi 