#!/bin/bash

# GitHub Auto-Unfollow Bot Runner
# Usage: ./run.sh <user> <target_username> <mode>
# Example: ./run.sh user1 phntmzn followers

if [ $# -ne 3 ]; then
    echo "Usage: ./run.sh <user> <target_username> <mode>"
    echo "Users: user1, user2, user3, user4"
    echo "Modes: followers, following"
    echo ""
    echo "Examples:"
    echo "  ./run.sh user1 phntmzn followers"
    echo "  ./run.sh user2 octocat following"
    exit 1
fi

USER=$1
TARGET=$2
MODE=$3

# Validate user
if [[ ! "$USER" =~ ^user[1-4]$ ]]; then
    echo "Error: User must be user1, user2, user3, or user4"
    exit 1
fi

# Validate mode
if [[ "$MODE" != "followers" && "$MODE" != "following" ]]; then
    echo "Error: Mode must be 'followers' or 'following'"
    exit 1
fi

# Check if env file exists
ENV_FILE=".env.$USER"
if [ ! -f "$ENV_FILE" ]; then
    echo "Error: $ENV_FILE not found. Please create it with your GitHub token."
    exit 1
fi

# Check if token is set
if grep -q "your_user.*_token_here" "$ENV_FILE"; then
    echo "Error: Please update your GitHub token in $ENV_FILE"
    exit 1
fi

echo "🚀 Starting GitHub Auto-Unfollow Bot"
echo "👤 User: $USER"
echo "🎯 Target: $TARGET"
echo "📋 Mode: $MODE"
echo "📁 Env file: $ENV_FILE"
echo "📁 Progress file: unfollow-progress.$USER.json"
echo ""

# Run the unfollow bot
node index.js --username "$TARGET" --mode "$MODE" --user "$USER"
