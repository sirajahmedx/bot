# GitHub Bot Project

A comprehensive GitHub automation toolkit containing two standalone bots for following and unfollowing users with intelligent rate limiting, progress persistence, and human-like behavior patterns.

## ⚠️ Important Disclaimer

**Use at your own risk!** These tools interact with GitHub's API to automatically follow/unfollow users. Please be aware that:

- Automated following/unfollowing may violate GitHub's Terms of Service
- Excessive automation could result in account restrictions or suspension
- Always respect rate limits and use reasonable delays
- Consider the ethical implications of automated social interactions

## 🏗️ Project Structure

```
bot/
├── github/                    # Main GitHub bots folder
│   ├── follow/               # GitHub Auto-Follow Bot (Standalone)
│   │   ├── index.js         # Follow bot application
│   │   ├── github.js        # GitHub API with follow functionality
│   │   ├── config.js        # Configuration management
│   │   ├── logger.js        # Logging utilities
│   │   ├── progress.js      # Progress tracking
│   │   ├── package.json     # Follow bot dependencies
│   │   ├── config.json      # Follow bot configuration
│   │   ├── run.sh           # Follow bot runner (executable)
│   │   ├── .env.example     # Environment template
│   │   ├── .gitignore       # Git ignore rules
│   │   ├── logs/            # Follow bot logs directory
│   │   └── README.md        # Follow bot documentation
│   │
│   └── unfollow/            # GitHub Auto-Unfollow Bot (Standalone)
│       ├── index.js         # Unfollow bot application
│       ├── github.js        # GitHub API with unfollow functionality
│       ├── config.js        # Configuration management
│       ├── logger.js        # Logging utilities
│       ├── progress.js      # Progress tracking
│       ├── package.json     # Unfollow bot dependencies
│       ├── config.json      # Unfollow-specific configuration
│       ├── run.sh           # Unfollow bot runner (executable)
│       ├── unfollow-run.sh  # Alternative runner (executable)
│       ├── .env.example     # Environment template
│       ├── .gitignore       # Git ignore rules
│       ├── logs/            # Unfollow bot logs directory
│       ├── SUMMARY.md       # Quick reference
│       └── README.md        # Unfollow bot documentation
│
└── README.md               # This file
```

## 🚀 Quick Start

### Prerequisites

- Node.js v18 or later
- GitHub Personal Access Token with `user:follow` scope

### 1. Choose Your Bot

**Follow Bot**: Grows your network by following users from target accounts

```bash
cd github/follow
```

**Unfollow Bot**: Manages your connections by unfollowing users

```bash
cd github/unfollow
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Up Environment

```bash
# Copy environment template
cp .env.example .env.user1

# Add your GitHub token
echo "GITHUB_TOKEN=ghp_your_github_token_here" > .env.user1
```

### 4. Run the Bot

```bash
# Follow users from octocat's followers
./run.sh user1 octocat followers

# Unfollow users from octocat's followers (unfollow bot only)
./run.sh user1 octocat followers
```

## 🔧 Creating GitHub Personal Access Tokens

1. Go to GitHub Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Click "Generate new token (classic)"
3. Give it a descriptive name (e.g., "Follow Bot User1")
4. Select the `user:follow` scope
5. Set an appropriate expiration date
6. Copy the generated token to your `.env.userX` file

## ✨ Key Features

### 🔄 Complete Separation

- **Independent Projects**: Each bot has its own dependencies, configuration, and environment
- **No Conflicts**: Follow and unfollow bots don't interfere with each other
- **Separate Progress**: Each bot maintains its own progress files
- **Individual Logs**: Separate logging for each bot

### 🛡️ Safety Features

- **Rate Limit Respect**: Stops when < 100 requests remaining
- **Human-like Delays**: Random timing between actions (3-8 seconds)
- **Progress Persistence**: Resume sessions from where you left off
- **Graceful Shutdown**: Ctrl+C handling with progress saving
- **Error Recovery**: Retry logic with exponential backoff
- **Token Validation**: Verifies GitHub tokens before starting
- **User Verification**: Confirms target users exist

### 🎯 Smart Behavior

- **Intelligent Selection**: Follows/unfollows 60% of users per page, randomly selected
- **Duplicate Prevention**: Tracks already processed users
- **Following Verification**: (Unfollow bot) Only unfollows users you're actually following
- **Session Limits**: Configurable min/max actions per session
- **Randomized Order**: Shuffles user lists for natural behavior

### 📊 Progress Tracking

#### Follow Bot Progress

- **Files**: `progress.user1.json`, `progress.user2.json`, etc.
- **Location**: `github/follow/`
- **Tracks**: Followed users, current page, session statistics

#### Unfollow Bot Progress

- **Files**: `unfollow-progress.user1.json`, `unfollow-progress.user2.json`, etc.
- **Location**: `github/unfollow/`
- **Tracks**: Unfollowed users, current page, session statistics

## 🔧 Configuration

Both bots use `config.json` files for behavior customization:

### Common Settings

```json
{
  "defaults": {
    "delays": {
      "min": 3000,           # Minimum delay between actions (ms)
      "max": 8000,           # Maximum delay between actions (ms)
      "onError": 30000,      # Delay after errors (ms)
      "betweenPages": 5000   # Delay between pages (ms)
    },
    "session": {
      "minFollows": 10,      # Minimum actions per session
      "maxFollows": 50,      # Maximum actions per session
      "maxDuration": 1800000 # Maximum session duration (ms)
    },
    "rateLimit": {
      "maxRetries": 3,              # Maximum retry attempts
      "backoffMultiplier": 2,       # Exponential backoff multiplier
      "respectGitHubLimits": true,  # Respect GitHub rate limits
      "bufferRequests": 100         # Stop when this many requests remain
    },
    "pagination": {
      "perPage": 100,        # Users per page
      "maxPages": 50         # Maximum pages to process
    },
    "behavior": {
      "randomizeOrder": true,        # Randomize user order
      "respectUserLimits": true,     # Respect per-user limits
      "pauseOnRateLimit": true,      # Pause when rate limited
      "enableProgressSaving": true   # Save progress automatically
    }
  }
}
```

### Per-User Overrides

```json
{
  "users": {
    "user1": {
      "session": {
        "minFollows": 15,
        "maxFollows": 35
      },
      "delays": {
        "min": 4000,
        "max": 9000
      }
    }
  }
}
```

## 📖 Usage Examples

### Follow Bot Examples

```bash
# Basic following
cd github/follow
./run.sh user1 octocat followers

# Follow from a specific user's following list
./run.sh user2 github following

# Multiple users with different configurations
./run.sh user3 torvalds followers
./run.sh user4 defunkt following
```

### Unfollow Bot Examples

```bash
# Basic unfollowing
cd github/unfollow
./run.sh user1 octocat followers

# Unfollow from a specific user's following list
./run.sh user2 github following

# Alternative runner script
./unfollow-run.sh user3 torvalds followers
```

### Direct Node.js Usage

```bash
# Follow bot with options
cd github/follow
node index.js --username octocat --mode followers --user user1 --dry-run

# Unfollow bot with options
cd github/unfollow
node index.js --username octocat --mode followers --user user1 --verbose
```

### Command Line Options

- `--username, -u`: Target GitHub username (required)
- `--mode, -m`: Mode - either "followers" or "following" (required)
- `--user`: User configuration (user1, user2, user3, user4) (required)
- `--dry-run`: Run in dry-run mode (no actual following/unfollowing)
- `--verbose`: Enable verbose logging
- `--help, -h`: Show help information

## 🔍 Monitoring and Logs

### Log Files

Each bot maintains separate log files in their `logs/` directory:

- `app.log`: General application logs
- `error.log`: Error messages and stack traces
- `exceptions.log`: Uncaught exceptions
- `rejections.log`: Unhandled promise rejections

### Real-time Monitoring

```bash
# Follow bot logs
tail -f github/follow/logs/app.log

# Unfollow bot logs
tail -f github/unfollow/logs/app.log

# Error monitoring
tail -f github/*/logs/error.log
```

### Progress Monitoring

```bash
# Check follow progress
cat github/follow/progress.user1.json

# Check unfollow progress
cat github/unfollow/unfollow-progress.user1.json
```

## 🛠️ Development and Maintenance

### Installing Dependencies

```bash
# For both bots
cd github/follow && npm install
cd ../unfollow && npm install
```

### Updating Configuration

```bash
# Follow bot configuration
vim github/follow/config.json

# Unfollow bot configuration
vim github/unfollow/config.json
```

### Testing with Dry Run

```bash
# Test follow bot
cd github/follow
node index.js --username octocat --mode followers --user user1 --dry-run

# Test unfollow bot
cd github/unfollow
node index.js --username octocat --mode followers --user user1 --dry-run
```

## 🚨 Troubleshooting

### Common Issues

1. **Rate Limit Errors**

   - Solution: The bots automatically handle rate limits, just wait for the cooldown

2. **Invalid Token Error**

   - Solution: Check your `.env.userX` file has a valid GitHub token with `user:follow` scope

3. **Target User Not Found**

   - Solution: Verify the target username exists and is public

4. **Permission Denied**
   - Solution: Ensure your token has the correct scopes and the account has permission

### Debug Mode

```bash
# Run with verbose logging
node index.js --username octocat --mode followers --user user1 --verbose

# Check logs for detailed information
tail -f logs/app.log
```

## 📊 Statistics and Analytics

### Session Statistics

Both bots track comprehensive statistics:

- Total users processed
- Successful follows/unfollows
- Errors encountered
- Rate limit hits
- Session duration
- Average delay between actions

### Progress Files

Progress files contain:

```json
{
  "startTime": "2025-09-03T10:00:00.000Z",
  "lastUpdate": "2025-09-03T10:30:00.000Z",
  "currentPage": 3,
  "processedUsers": ["user1", "user2", "user3"],
  "followedUsers": ["user1", "user3"],
  "stats": {
    "totalProcessed": 150,
    "totalFollowed": 90,
    "errors": 2,
    "rateLimitHits": 1,
    "sessionDuration": 1800000
  }
}
```

## ⚡ Performance Tips

1. **Optimal Session Timing**

   - Run during GitHub's off-peak hours for better rate limits
   - Spread sessions across different times of day

2. **Token Management**

   - Use different tokens for different users to increase rate limits
   - Monitor token usage and expiration dates

3. **Target Selection**

   - Choose targets with active, engaged followers
   - Avoid targets with mostly bot followers

4. **Session Configuration**
   - Start with smaller sessions (10-20 actions) and gradually increase
   - Monitor for any account restrictions

## 🔒 Security and Privacy

### Environment Files

- Never commit `.env.user*` files to version control
- Use strong, unique tokens for each user configuration
- Regularly rotate your GitHub tokens

### Progress Files

- Progress files are automatically excluded from git
- Contains usernames of processed accounts
- Backup important progress files before major changes

### Rate Limiting

- Bots automatically respect GitHub's rate limits
- Built-in buffer to prevent hitting limits
- Exponential backoff on errors

## 🤝 Best Practices

1. **Start Small**: Begin with dry-run mode and small sessions
2. **Monitor Activity**: Keep an eye on your GitHub activity and followers
3. **Respect Limits**: Don't try to bypass rate limits or safety features
4. **Be Selective**: Choose targets carefully for better engagement
5. **Regular Maintenance**: Update tokens and review configurations periodically

## 📚 Additional Resources

### Bot-Specific Documentation

- **Follow Bot**: See `github/follow/README.md` for detailed follow bot documentation
- **Unfollow Bot**: See `github/unfollow/README.md` for detailed unfollow bot documentation
- **Quick Reference**: See `github/unfollow/SUMMARY.md` for unfollow bot summary

### API Documentation

- [GitHub REST API Documentation](https://docs.github.com/en/rest)
- [GitHub Authentication](https://docs.github.com/en/authentication)
- [GitHub Rate Limiting](https://docs.github.com/en/rest/overview/resources-in-the-rest-api#rate-limiting)

## ⚠️ Important Notes

1. **Completely Separate**: Each bot is now independent with its own dependencies
2. **No Shared State**: Progress and environment files are separate per bot
3. **Individual Dependencies**: Run `npm install` in each bot folder
4. **Test First**: Always test with dry-run mode before live usage
5. **Backup Data**: Keep backups of important progress files

## 🎉 Conclusion

This GitHub bot project provides two powerful, independent automation tools for managing your GitHub network. Each bot is designed with safety, reliability, and user experience in mind.

**Key Benefits:**

- 🔄 Efficient network growth (Follow Bot)
- 🧹 Smart connection management (Unfollow Bot)
- 🛡️ Built-in safety features
- 📊 Comprehensive progress tracking
- 🎯 Human-like behavior patterns
- 🔧 Highly configurable

**Happy automating! 🚀**

---

_Remember: Use these tools responsibly and in accordance with GitHub's Terms of Service. Always prioritize quality connections over quantity._
