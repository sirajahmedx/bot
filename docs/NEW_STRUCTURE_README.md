# GitHub Bot Project - Restructured

This project has been restructured to contain two completely separate GitHub automation bots in organized folders.

## 📁 New Project Structure

```
bot/
├── github/                    # Main GitHub bots folder
│   ├── follow/               # GitHub Auto-Follow Bot (Standalone)
│   │   ├── index.js         # Follow bot application
│   │   ├── package.json     # Follow bot dependencies
│   │   ├── run.sh           # Follow bot runner
│   │   ├── .env.user1-4     # Follow bot environment files
│   │   ├── logs/            # Follow bot logs
│   │   └── README.md        # Follow bot documentation
│   │
│   ├── unfollow/            # GitHub Auto-Unfollow Bot (Standalone)
│   │   ├── index.js         # Unfollow bot application
│   │   ├── package.json     # Unfollow bot dependencies
│   │   ├── run.sh           # Unfollow bot runner
│   │   ├── .env.user1-4     # Unfollow bot environment files
│   │   ├── logs/            # Unfollow bot logs
│   │   └── README.md        # Unfollow bot documentation
│   │
│   └── README.md            # GitHub bots overview
│
├── [legacy files]           # Original project files (can be archived)
└── README.md               # This file
```

## 🚀 How to Use the New Structure

### For Following Users

```bash
# Navigate to the follow bot
cd github/follow

# Install dependencies (first time only)
npm install

# Set up your environment file
cp .env.example .env.user1
echo "GITHUB_TOKEN=your_github_token_here" > .env.user1

# Run the follow bot
./run.sh user1 octocat followers
```

### For Unfollowing Users

```bash
# Navigate to the unfollow bot
cd github/unfollow

# Install dependencies (first time only)
npm install

# Set up your environment file
cp .env.example .env.user1
echo "GITHUB_TOKEN=your_github_token_here" > .env.user1

# Run the unfollow bot
./run.sh user1 octocat followers
```

## ✨ Key Benefits of New Structure

### 🔄 Complete Separation

- **Independent Projects**: Each bot has its own dependencies, configuration, and environment
- **No Conflicts**: Follow and unfollow bots don't interfere with each other
- **Separate Progress**: Each bot maintains its own progress files
- **Individual Logs**: Separate logging for each bot

### 📦 Standalone Operation

- **Self-Contained**: Each bot folder is a complete Node.js project
- **Individual Dependencies**: No shared node_modules conflicts
- **Separate Environments**: Different tokens and configurations per bot
- **Independent Maintenance**: Update or modify bots individually

### 🎯 Clear Organization

- **Purpose-Built**: Each bot is optimized for its specific task
- **Easy Navigation**: Clear folder structure for different functionalities
- **Dedicated Documentation**: Comprehensive README for each bot
- **Simplified Usage**: No confusion about which script to run

## 📋 Migration Steps from Old Structure

If you were using the old structure, here's how to migrate:

1. **Backup Your Data**:

   ```bash
   # Backup your environment files
   cp .env.user* /safe/backup/location/

   # Backup your progress files
   cp progress.user*.json /safe/backup/location/
   ```

2. **Set Up Follow Bot**:

   ```bash
   cd github/follow
   npm install

   # Copy your environment files
   cp /safe/backup/location/.env.user1 .
   cp /safe/backup/location/.env.user2 .
   # ... etc for user3, user4

   # Copy your progress files (rename appropriately)
   cp /safe/backup/location/progress.user1.json .
   # ... etc
   ```

3. **Set Up Unfollow Bot**:

   ```bash
   cd github/unfollow
   npm install

   # Copy your environment files
   cp /safe/backup/location/.env.user1 .
   cp /safe/backup/location/.env.user2 .
   # ... etc for user3, user4
   ```

## 🔧 Environment Setup

### Follow Bot Environment

Each user needs a separate environment file in `github/follow/`:

```bash
# github/follow/.env.user1
GITHUB_TOKEN=ghp_your_follow_bot_token_here

# github/follow/.env.user2
GITHUB_TOKEN=ghp_your_follow_bot_token_here
```

### Unfollow Bot Environment

Each user needs a separate environment file in `github/unfollow/`:

```bash
# github/unfollow/.env.user1
GITHUB_TOKEN=ghp_your_unfollow_bot_token_here

# github/unfollow/.env.user2
GITHUB_TOKEN=ghp_your_unfollow_bot_token_here
```

## 📊 Progress Tracking

### Follow Bot Progress

- Saved as: `github/follow/progress.user1.json`, etc.
- Tracks: Followed users, current page, session stats

### Unfollow Bot Progress

- Saved as: `github/unfollow/unfollow-progress.user1.json`, etc.
- Tracks: Unfollowed users, current page, session stats

## 🛠️ Development and Maintenance

### Installing Dependencies

```bash
# For follow bot
cd github/follow && npm install

# For unfollow bot
cd github/unfollow && npm install
```

### Updating Configuration

```bash
# Follow bot configuration
vim github/follow/config.json

# Unfollow bot configuration
vim github/unfollow/config.json
```

### Viewing Logs

```bash
# Follow bot logs
tail -f github/follow/logs/app.log

# Unfollow bot logs
tail -f github/unfollow/logs/app.log
```

## 📖 Documentation

- **Main Overview**: `github/README.md` - Overview of both bots
- **Follow Bot**: `github/follow/README.md` - Comprehensive follow bot guide
- **Unfollow Bot**: `github/unfollow/README.md` - Comprehensive unfollow bot guide

## ⚠️ Important Notes

1. **Separate Node Modules**: Each bot has its own `node_modules` folder
2. **Independent Configuration**: Each bot has its own `config.json`
3. **Separate Environment Files**: No shared environment variables
4. **Individual Progress Files**: No progress file conflicts
5. **Dedicated Logs**: Each bot logs to its own directory

## 🔄 Usage Examples

### Following Workflow

```bash
cd github/follow
./run.sh user1 octocat followers
./run.sh user2 torvalds following
```

### Unfollowing Workflow

```bash
cd github/unfollow
./run.sh user1 octocat followers
./run.sh user2 microsoft following
```

## 🚨 Legacy Files

The original project files remain in the root directory for reference:

- `index.js` - Original follow bot
- `github.js` - Original GitHub API file
- `config.js`, `logger.js`, `progress.js` - Original utilities
- `run.sh` - Original runner script
- `unfollow/` - Original unfollow subfolder

**You can safely archive or remove these once you've migrated to the new structure.**

## 🎯 Next Steps

1. Choose whether you want to use the follow bot, unfollow bot, or both
2. Navigate to the appropriate folder (`github/follow/` or `github/unfollow/`)
3. Follow the installation and setup instructions in that folder's README
4. Configure your environment files with your GitHub tokens
5. Run the bots using the provided scripts

## 📞 Support

For specific bot issues, refer to the individual README files:

- [Follow Bot Documentation](github/follow/README.md)
- [Unfollow Bot Documentation](github/unfollow/README.md)
- [GitHub Bots Overview](github/README.md)

---

**The new structure provides complete separation, easier maintenance, and clearer organization for your GitHub automation needs!**
