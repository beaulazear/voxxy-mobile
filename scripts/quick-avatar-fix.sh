#!/bin/bash

echo "🚀 Quick Avatar Fix for Production Crash"
echo "========================================"
echo ""
echo "This script provides immediate fixes for the avatar crash issue."
echo ""

# Check if sips is available (macOS built-in)
if command -v sips &> /dev/null; then
    echo "✅ Found sips (macOS image tool)"
    echo ""
    echo "Creating backup of original avatars..."
    
    # Create backup directory
    mkdir -p assets/avatars-backup
    
    # Copy originals
    cp assets/Avatar*.jpg assets/avatars-backup/ 2>/dev/null
    cp assets/Weird*.jpg assets/avatars-backup/ 2>/dev/null
    
    echo "Optimizing avatar images..."
    
    # Resize and compress avatars using sips
    for file in assets/Avatar*.jpg assets/Weird*.jpg; do
        if [ -f "$file" ]; then
            # Resize to 200x200 and reduce quality
            sips -Z 200 --setProperty formatOptions 70 "$file" &> /dev/null
            echo "  ✓ Optimized $(basename "$file")"
        fi
    done
    
    echo ""
    echo "✅ Avatar optimization complete!"
    echo ""
    echo "New sizes:"
    ls -lh assets/Avatar*.jpg assets/Weird*.jpg | awk '{print "  " $9 ": " $5}'
    
else
    echo "❌ sips not found. Please run on macOS or install image optimization tools."
    echo ""
    echo "Alternative: Install ImageOptim from https://imageoptim.com"
fi

echo ""
echo "📱 Next Steps:"
echo "1. Test the app locally: npm run start:dev"
echo "2. Build for TestFlight: npm run build:ios"
echo "3. The optimized avatar modal component is already in place"
echo ""
echo "💡 The app now uses:"
echo "  - Lazy loading for avatars"
echo "  - Optimized FlatList rendering"
echo "  - Error boundaries for failed image loads"