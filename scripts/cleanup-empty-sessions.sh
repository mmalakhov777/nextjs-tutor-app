#!/bin/bash

# Delete Empty Sessions - Shell Wrapper
# This script provides an easy way to run the empty sessions cleanup

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo -e "${BLUE}🧹 Chat Sessions Cleanup Tool${NC}"
echo -e "${BLUE}================================${NC}"
echo ""

# Check if environment file exists
if [ ! -f "$PROJECT_ROOT/.env.local" ] && [ ! -f "$PROJECT_ROOT/.env" ]; then
    echo -e "${RED}❌ Error: No environment file found in project root${NC}"
    echo -e "${YELLOW}💡 Make sure you have a .env.local or .env file with CHAT_DATABASE_URL set${NC}"
    exit 1
fi

# Check if Node.js is available
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Error: Node.js is not installed or not in PATH${NC}"
    exit 1
fi

# Check if the script exists
if [ ! -f "$SCRIPT_DIR/delete-empty-sessions.js" ]; then
    echo -e "${RED}❌ Error: delete-empty-sessions.js not found${NC}"
    exit 1
fi

# Function to show help
show_help() {
    echo -e "${GREEN}Usage:${NC}"
    echo "  $0 [option]"
    echo ""
    echo -e "${GREEN}Options:${NC}"
    echo "  dry-run    Show what would be deleted (safe, default)"
    echo "  delete     Actually delete empty sessions (⚠️  PERMANENT)"
    echo "  help       Show this help message"
    echo ""
    echo -e "${GREEN}Examples:${NC}"
    echo "  $0                    # Safe dry run"
    echo "  $0 dry-run            # Safe dry run"
    echo "  $0 delete             # Actually delete sessions"
    echo ""
    echo -e "${YELLOW}⚠️  WARNING: 'delete' option permanently removes data!${NC}"
}

# Parse arguments
case "${1:-dry-run}" in
    "dry-run"|"")
        echo -e "${GREEN}🔍 Running in DRY RUN mode (safe)${NC}"
        echo -e "${BLUE}📋 This will show what would be deleted without actually deleting anything${NC}"
        echo ""
        cd "$PROJECT_ROOT"
        node "$SCRIPT_DIR/delete-empty-sessions.js" --dry-run
        ;;
    "delete")
        echo -e "${RED}⚠️  DANGER: Running in DELETE mode${NC}"
        echo -e "${RED}🗑️  This will PERMANENTLY delete empty chat sessions${NC}"
        echo ""
        
        # Ask for confirmation
        read -p "Are you sure you want to delete empty sessions? (type 'yes' to confirm): " confirmation
        if [ "$confirmation" != "yes" ]; then
            echo -e "${YELLOW}❌ Operation cancelled${NC}"
            exit 0
        fi
        
        echo -e "${RED}🗑️  Proceeding with deletion...${NC}"
        echo ""
        cd "$PROJECT_ROOT"
        node "$SCRIPT_DIR/delete-empty-sessions.js" --delete
        ;;
    "help"|"-h"|"--help")
        show_help
        ;;
    *)
        echo -e "${RED}❌ Error: Unknown option '$1'${NC}"
        echo ""
        show_help
        exit 1
        ;;
esac

echo ""
echo -e "${GREEN}✅ Script completed${NC}" 