#!/bin/bash

echo "🎨 Black to #232323 Color Replacement Script"
echo "============================================"
echo ""

# Check if Node.js is available
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Run the replacement script
echo "🚀 Running color replacement..."
node scripts/change-black-to-232323.js

echo ""
echo "🎉 Script completed! Check the output above for details."
echo ""
echo "💡 Tips:"
echo "   - Review the changes before committing"
echo "   - Test your application to ensure everything works correctly"
echo "   - You can run 'git diff' to see all the changes made" 