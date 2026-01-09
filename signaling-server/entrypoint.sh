#!/bin/sh
set -e

# Default PUID and PGID
PUID=${PUID:-1000}
PGID=${PGID:-1000}

# Create group if it doesn't exist
if ! getent group roommate >/dev/null 2>&1; then
    groupadd -g "$PGID" roommate
fi

# Create user if it doesn't exist
if ! id -u roommate >/dev/null 2>&1; then
    useradd -u "$PUID" -g "$PGID" -m -s /bin/sh roommate
fi

# Create config directory
mkdir -p /config

# Change ownership of config directory
chown -R "$PUID":"$PGID" /config

# Switch to the roommate user and run the signaling server
exec su-exec roommate:roommate /app/signaling-server
