#!/bin/bash
set -e

echo "🏠 Roommate Signaling Server Installer"
echo "======================================"
echo ""

# Default installation directory
INSTALL_DIR="${INSTALL_DIR:-/mnt/App/stacks/roommate-signaling}"

echo "📁 Installation directory: $INSTALL_DIR"
echo ""

# Create installation directory
echo "Creating installation directory..."
mkdir -p "$INSTALL_DIR"
cd "$INSTALL_DIR"

# Download docker-compose.yml
echo "Downloading configuration..."
curl -fsSL https://raw.githubusercontent.com/Pey-K/Roommate/main/deploy/docker-compose.yml -o docker-compose.yml

echo ""
echo "✅ Configuration downloaded successfully!"
echo ""

# Pull and start
echo "Pulling Docker image (this may take a few minutes)..."
docker-compose pull

echo ""
echo "Starting signaling server..."
docker-compose up -d

echo ""
echo "🎉 Installation complete!"
echo ""
echo "Your signaling server is now running at ws://localhost:9001"
echo "Data will be stored at: /mnt/App/apps/signal"
echo ""
echo "Useful commands:"
echo "  View logs:    docker-compose logs -f signaling-server"
echo "  Stop server:  docker-compose down"
echo "  Restart:      docker-compose restart"
echo "  Update:       docker-compose pull && docker-compose up -d"
echo ""
echo "Installation directory: $INSTALL_DIR"
