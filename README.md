# GitHub Auto-Follow Bot

A Node.js CLI application that automates following GitHub users from a target user's followers or following list, with intelligent rate limiting, progress persistence, and human-like behavior patterns.

## ⚠️ Important Disclaimer

**Use at your own risk!** This tool interacts with GitHub's API to automatically follow users. Please be aware that:

- Automated following may violate GitHub's Terms of Service
- Excessive automation could result in account restrictions or suspension
- Always respect rate limits and use reasonable delays
- Consider the ethical implications of automated social interactions

## Features

- ✅ Fetch followers/following lists via GitHub REST API
- ✅ Smart following strategy (60% of users per page, randomly selected)
- ✅ Human-like behavior with random delays and pauses
- ✅ Progress persistence across sessions
- ✅ Comprehensive rate limit handling
- ✅ Detailed logging to console and file
- ✅ Graceful interruption handling (Ctrl+C)
- ✅ Configurable settings via JSON
- ✅ Duplicate user tracking

## Prerequisites

- Node.js v18 or later
- GitHub Personal Access Token with `user:follow` scope

## Installation

1. Clone or download this repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file from the example:
   ```bash
   cp .env.example .env
   ```

4. Add your GitHub Personal Access Token to `.env`:
   ```
   GITHUB_TOKEN=your_personal_access_token_here
   ```

## Creating a GitHub Personal Access Token

1. Go to GitHub Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Click "Generate new token (classic)"
3. Select the `user:follow` scope
4. Copy the generated token to your `.env` file

## Usage

Basic usage:
```bash
node index.js --username <target_username> --mode <followers|following>
```

Examples:
```bash
# Follow users from octocat's followers
node index.js --username octocat --mode followers

# Follow users from octocat's following list
node index.js --username octocat --mode following
```

### Command Line Options

- `--username, -u`: Target GitHub username (required)
- `--mode, -m`: Mode - either "followers" or "following" (required)
- `--help, -h`: Show help information

## Configuration

The application uses `config.json` for customization:

```json
{
  "minDelay": 1000,           // Minimum delay between follows (ms)
  "maxDelay": 3000,           // Maximum delay between follows (ms)
  "skipChance": 0.05,         // Probability to skip a user (5%)
  "longPauseChance": 0.05,    // Probability for extended pause (5%)
  "longPauseMin": 5000,       // Minimum extended pause (ms)
  "longPauseMax": 10000,      // Maximum extended pause (ms)
  "sessionBreakAfter": 50,    // Take break after N follows
  "breakDuration": 30000,     // Break duration (ms)
  "maxPerSession": [50, 80],  // Random session limit range
  "followPercentage": 0.6,    // Follow 60% of users per page
  "retryAttempts": 3,         // Max retry attempts for failed requests
  "retryDelay": 1000          // Base retry delay (ms, exponential backoff)
}
```

## Project Structure

```
github-auto-follow/
├── index.js          # CLI entry point
├── github.js         # GitHub API interactions
├── config.js         # Configuration management
├── logger.js         # Logging setup
├── progress.js       # Progress persistence
├── config.json       # Configuration file
├── .env.example      # Environment template
├── .gitignore        # Git ignore rules
├── package.json      # NPM package configuration
└── README.md         # This file
```

## How It Works

1. **Initialization**: Loads configuration, sets up logging, and checks authentication
2. **User Fetching**: Retrieves followers/following lists via GitHub API with pagination
3. **Smart Selection**: Randomly selects 60% of users from each page
4. **Human-like Following**: Implements random delays, occasional long pauses, and skip behavior
5. **Progress Tracking**: Saves state to `progress.json` for session resumption
6. **Rate Limit Respect**: Monitors API limits and pauses when necessary
7. **Graceful Shutdown**: Handles interruptions and saves progress

## Files Generated

- `progress.json`: Stores session progress (followed users, current page, etc.)
- `logs/app.log`: Detailed application logs with timestamps
- `logs/error.log`: Error-specific logs

## Rate Limiting

The application automatically handles GitHub's rate limits:
- Monitors remaining API calls via response headers
- Pauses execution when limits are reached
- Resumes automatically after reset time
- Uses efficient pagination (100 users per request)

## Error Handling

Comprehensive error handling for:
- Invalid usernames (404 errors)
- Authentication issues (401/403 errors)
- Network connectivity problems
- Rate limit exceeded (429 errors)
- API service unavailability

Failed requests are retried up to 3 times with exponential backoff.

## Stopping the Application

- Press `Ctrl+C` to gracefully stop the application
- Progress will be saved automatically
- Resume by running the same command again

## Logs

- **Console**: Real-time progress updates
- **File**: Detailed logs saved to `logs/app.log`
- **Errors**: Separate error log at `logs/error.log`

## Best Practices

1. **Start Small**: Test with a small target user first
2. **Monitor Logs**: Keep an eye on the console and log files
3. **Respect Limits**: Don't run multiple instances simultaneously
4. **Regular Breaks**: The application includes automatic breaks, don't disable them
5. **Stay Updated**: Keep dependencies updated for security

## Troubleshooting

### Authentication Errors
- Verify your GitHub token has the `user:follow` scope
- Check that the token is correctly set in `.env`
- Ensure the token hasn't expired

### Rate Limit Issues
- The application handles this automatically
- If you hit limits frequently, consider reducing `maxPerSession`

### Network Errors
- Check your internet connection
- GitHub API might be temporarily unavailable

### Permission Errors
- Ensure you have write permissions in the application directory
- Check that `logs/` directory can be created

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

If you encounter issues:
1. Check the logs in `logs/app.log`
2. Verify your configuration in `config.json`
3. Ensure your GitHub token is valid and has proper permissions
4. Check GitHub's API status if you suspect service issues

Remember to use this tool responsibly and in accordance with GitHub's Terms of Service.
