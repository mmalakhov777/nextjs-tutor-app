#!/bin/bash

# Run Next.js development server with increased memory limits
NODE_OPTIONS="--max-old-space-size=4096" npm run dev 