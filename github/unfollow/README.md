# GitHub Auto-Unfollow Bot

A standalone Node.js CLI application that automates unfollowing GitHub users from a target user's followers or following list, with intelligent rate limiting, progress persistence, and human-like behavior patterns.

## ⚠️ Important Disclaimer

**Use at your own risk!** This tool interacts with GitHub's API to automatically unfollow users. Please be aware that:

- Automated unfollowing may violate GitHub's Terms of Service
- Excessive automation could result in account restrictions or suspension
- Always respect rate limits and use reasonable delays
- Consider the ethical implications of automated social interactions
- Only unfollow users you are currently following

## Features

- ✅ **Smart Unfollowing Strategy**: Intelligently selects users to unfollow
- ✅ **Human-like Behavior**: Random delays, pauses, and natural patterns
- ✅ **Progress Persistence**: Resume sessions from where you left off
- ✅ **Rate Limit Handling**: Comprehensive GitHub API rate limit management
- ✅ **Multi-User Support**: Supports up to 4 different user configurations
- ✅ **Detailed Logging**: Console and file logging with multiple levels
- ✅ **Graceful Shutdown**: Ctrl+C handling with progress saving
- ✅ **Duplicate Prevention**: Tracks already processed users
- ✅ **Error Recovery**: Retry logic with exponential backoff
- ✅ **Following Verification**: Only unfollows users you're actually following

## Prerequisites

- Node.js v18 or later
- GitHub Personal Access Token with `user:follow` scope

## Installation

1. **Navigate to the unfollow bot directory:**

   ```bash
   cd github/unfollow
   ```

2. **Install dependencies:**

   ```bash
   npm install
   ```

3. **Create environment files:**

   ```bash
   # Copy the example for each user you want to configure
   cp .env.example .env.user1
   cp .env.example .env.user2
   cp .env.example .env.user3
   cp .env.example .env.user4
   ```

4. **Add your GitHub Personal Access Tokens:**
   ```bash
   # Edit each .env file and add your token
   echo "GITHUB_TOKEN=ghp_your_actual_token_here" > .env.user1
   echo "GITHUB_TOKEN=ghp_your_other_token_here" > .env.user2
   # ... and so on for user3, user4
   ```

## Creating GitHub Personal Access Tokens

1. Go to GitHub Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Click "Generate new token (classic)"
3. Give it a descriptive name (e.g., "Unfollow Bot User1")
4. Select the `user:follow` scope
5. Set an appropriate expiration date
6. Copy the generated token to your `.env.userX` file

## Usage

### Using the Run Script (Recommended)

```bash
# Basic usage
./run.sh <user> <target_username> <mode>

# Examples
./run.sh user1 octocat followers
./run.sh user2 phntmzn following
./run.sh user3 github followers
./run.sh user4 torvalds following
```

### Alternative Run Script

```bash
# Using the detailed unfollow script
./unfollow-run.sh <user> <target_username> <mode>

# Examples
./unfollow-run.sh user1 octocat followers
./unfollow-run.sh user2 phntmzn following
```

### Direct Node.js Usage

```bash
# Basic usage
node index.js --username <target_username> --mode <mode> --user <user>

# Examples
node index.js --username octocat --mode followers --user user1
node index.js --username phntmzn --mode following --user user2
```

### Parameters

- **user**: User configuration to use (user1, user2, user3, user4)
- **target_username**: GitHub username whose followers/following you want to unfollow from
- **mode**: Either "followers" or "following"

### Command Line Options

- `--username, -u`: Target GitHub username (required)
- `--mode, -m`: Mode - either "followers" or "following" (required)
- `--user`: User configuration (user1, user2, user3, user4) (required)
- `--dry-run`: Run in dry-run mode (no actual unfollowing)
- `--verbose`: Enable verbose logging
- `--help, -h`: Show help information

## How It Works

The unfollow bot works by:

1. **Fetching Target Users**: Gets the followers/following list of the target user
2. **Following Verification**: Checks which users you're actually following
3. **Smart Selection**: Selects users to unfollow based on configuration
4. **Human-like Unfollowing**: Adds random delays and natural behavior
5. **Progress Tracking**: Saves progress to resume sessions later

**Important**: The bot only unfollows users that you are currently following. It will skip users you're not following.

## Configuration

The bot uses `config.json` for behavior customization:

```json
{
  "defaults": {
    "delays": {
      "min": 3000,
      "max": 8000,
      "onError": 30000,
      "betweenPages": 5000
    },
    "session": {
      "minUnfollows": 10,
      "maxUnfollows": 50,
      "maxDuration": 1800000
    },
    "rateLimit": {
      "maxRetries": 3,
      "backoffMultiplier": 2,
      "respectGitHubLimits": true,
      "bufferRequests": 100
    },
    "pagination": {
      "perPage": 100,
      "maxPages": 50
    },
    "filtering": {
      "skipBots": true,
      "skipOrganizations": true,
      "skipVerified": false,
      "minFollowers": 0,
      "maxFollowing": 10000
    },
    "behavior": {
      "randomizeOrder": true,
      "respectUserLimits": true,
      "pauseOnRateLimit": true,
      "enableProgressSaving": true
    }
  },
  "users": {
    "user1": {
      "session": {
        "minUnfollows": 15,
        "maxUnfollows": 35
      },
      "delays": {
        "min": 4000,
        "max": 9000
      }
    }
  }
}
```

## Project Structure

```
github/unfollow/
├── index.js              # Main application entry point
├── github.js             # GitHub API interactions
├── config.js             # Configuration management
├── logger.js             # Logging setup
├── progress.js           # Progress persistence
├── config.json           # Configuration file
├── package.json          # NPM dependencies
├── run.sh                # Main runner script
├── unfollow-run.sh       # Alternative runner script
├── .env.example          # Environment template
├── .env.user1            # User 1 environment (create this)
├── .env.user2            # User 2 environment (create this)
├── .env.user3            # User 3 environment (create this)
├── .env.user4            # User 4 environment (create this)
├── .gitignore            # Git ignore rules
├── logs/                 # Generated log files
│   ├── app.log
│   ├── error.log
│   ├── exceptions.log
│   └── rejections.log
├── unfollow-progress.user1.json    # Generated progress files
├── unfollow-progress.user2.json
├── unfollow-progress.user3.json
├── unfollow-progress.user4.json
└── README.md             # This file
```

## Files Generated

- `unfollow-progress.user1.json` to `unfollow-progress.user4.json`: Store session progress per user
- `logs/app.log`: Detailed application logs with timestamps
- `logs/error.log`: Error-specific logs
- `logs/exceptions.log`: Unhandled exceptions
- `logs/rejections.log`: Unhandled promise rejections

## Rate Limiting

The application automatically handles GitHub's rate limits:

- Monitors remaining API calls via response headers
- Pauses execution when limits are reached (< 100 requests remaining)
- Resumes automatically after reset time
- Uses efficient pagination (100 users per request)
- Implements intelligent backoff strategies

## Error Handling

Comprehensive error handling for:

- Invalid usernames (404 errors)
- Authentication issues (401/403 errors)
- Network connectivity problems
- Rate limit exceeded (429 errors)
- API service unavailability
- Token permission issues
- Users not found or not being followed

Failed requests are retried up to 3 times with exponential backoff.

## Safety Features

- **Following Verification**: Only unfollows users you're actually following
- **Rate Limit Buffer**: Stops when < 100 API calls remaining
- **Progress Persistence**: Never lose progress on interruption
- **Human-like Delays**: Random delays between 3-8 seconds
- **Smart Filtering**: Skip bots, organizations, and suspicious accounts
- **Session Limits**: Configurable daily/session limits
- **Graceful Shutdown**: Ctrl+C handling with state saving

## Stopping the Application

Press `Ctrl+C` at any time to gracefully stop the bot. It will:

1. Stop processing new users
2. Save current progress
3. Display session statistics
4. Exit cleanly

## Troubleshooting

### Common Issues

1. **"GitHub token not found"**

   - Ensure your `.env.userX` file exists and contains a valid token
   - Check that the token has the `user:follow` scope

2. **"Authentication failed"**

   - Verify your token is correct and hasn't expired
   - Check that the token has sufficient permissions

3. **"Rate limit exceeded"**

   - The bot will automatically wait for the rate limit to reset
   - Consider reducing session limits in config.json

4. **"User not found"**

   - Verify the target username is correct
   - Ensure the target user's profile is public

5. **"Not following user"**

   - This is normal - the bot only unfollows users you're actually following
   - The bot will skip users you're not following

6. **Permission errors on run scripts**
   - Make the scripts executable: `chmod +x run.sh unfollow-run.sh`

### Debug Mode

Enable verbose logging for troubleshooting:

```bash
node index.js --username octocat --mode followers --user user1 --verbose
```

## Environment Variables

Each user requires a separate environment file:

**`.env.user1`**:

```bash
GITHUB_TOKEN=ghp_your_token_for_user1_here
```

**`.env.user2`**:

```bash
GITHUB_TOKEN=ghp_your_token_for_user2_here
```

And so on for user3 and user4.

## Multiple Users

The bot supports up to 4 different user configurations, allowing you to:

- Use different GitHub accounts
- Have different behavior patterns per user
- Run concurrent sessions (not recommended due to rate limits)
- Maintain separate progress tracking

## Security Best Practices

1. **Never commit `.env.*` files** to version control
2. **Use tokens with minimal required permissions** (`user:follow` only)
3. **Regularly rotate your GitHub tokens**
4. **Monitor your account for unusual activity**
5. **Respect GitHub's Terms of Service**
6. **Use reasonable delays and limits**

## Examples

### Basic Unfollowing

```bash
# Unfollow users from octocat's followers using user1 config
./run.sh user1 octocat followers

# Unfollow users from torvalds' following list using user2 config
./run.sh user2 torvalds following
```

### Multiple Sessions

```bash
# Run different users on different targets (in separate terminals)
./run.sh user1 octocat followers
./run.sh user2 github following
./run.sh user3 microsoft followers
./run.sh user4 google following
```

### Dry Run Mode

```bash
# Test without actually unfollowing anyone
node index.js --username octocat --mode followers --user user1 --dry-run
```

## Difference from Follow Bot

This unfollow bot is specifically designed for unfollowing and has these key differences:

1. **Following Verification**: Checks if you're following users before attempting to unfollow
2. **Separate Progress**: Uses `unfollow-progress.userX.json` files
3. **Conservative Approach**: More cautious with delays and limits
4. **Targeted Operation**: Only processes users you're actually following

## Support

This is a standalone unfollow bot. For issues:

1. Check the logs in the `logs/` directory
2. Verify your configuration and environment files
3. Ensure your GitHub token has the correct permissions
4. Test with verbose logging enabled

Remember to use this tool responsibly and in compliance with GitHub's Terms of Service.

## Important Notes

- **This bot only unfollows users you are currently following**
- **It will automatically skip users you're not following**
- **Progress is saved separately from the follow bot**
- **Each user (user1-user4) has independent configuration and progress**
- **Always test with dry-run mode first**
