#!/usr/bin/env node

import { Command } from 'commander';
import dotenv from 'dotenv';
import process from 'process';
import logger from './logger.js';
import { loadConfig, generateSessionLimit, getRandomDelay, shouldSkipUser, calculateUsersToFollow, shuffleArray, displayConfig } from './config.js';
import { initializeProgress, addFollowedUser, updateCurrentPage, isUserFollowed, getSessionStats, saveProgress } from './progress.js';
import { initializeGitHub, testAuthentication, fetchUsers, followUser, validateUser, isFollowing, checkAPIStatus } from './github.js';

// Load environment variables
dotenv.config();

/**
 * Main application class
 */
class GitHubAutoFollow {
  constructor() {
    this.config = null;
    this.progress = null;
    this.isRunning = false;
    this.shouldStop = false;
  }

  /**
   * Initialize the application
   * @param {string} username - Target username
   * @param {string} mode - Mode (followers/following)
   */
  async initialize(username, mode) {
    try {
      // Load configuration
      this.config = loadConfig();
      displayConfig(this.config);

      // Initialize GitHub API
      const token = process.env.GITHUB_TOKEN;
      if (!token) {
        throw new Error('GITHUB_TOKEN environment variable is required. Please check your .env file.');
      }

      initializeGitHub(token);

      // Test authentication
      const authenticatedUser = await testAuthentication();
      logger.info(`Authenticated successfully as: ${authenticatedUser.login}`);

      // Validate target user
      const targetUser = await validateUser(username, this.config);
      logger.info(`Target user: ${targetUser.login} (${targetUser.followers} followers, ${targetUser.following} following)`);

      // Check API status
      const apiStatus = await checkAPIStatus();
      if (apiStatus) {
        logger.info(`API Rate Limit: ${apiStatus.remaining}/${apiStatus.limit} remaining, resets at ${apiStatus.reset.toLocaleTimeString()}`);
      }

      // Initialize or load progress
      const sessionLimit = generateSessionLimit(this.config);
      this.progress = initializeProgress(username, mode, sessionLimit);

      logger.logSessionStart(username, mode, this.progress.sessionLimit);

      return true;
    } catch (error) {
      logger.error(`Initialization failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Process a single page of users
   * @param {Array} users - Users from the current page
   * @returns {Promise<Object>} Processing results
   */
  async processPage(users) {
    if (users.length === 0) {
      logger.info('No users found on this page');
      return { followed: 0, skipped: 0, errors: 0 };
    }

    // Filter out already followed users
    const newUsers = users.filter(user => !isUserFollowed(this.progress, user.login));
    if (newUsers.length === 0) {
      logger.info('All users on this page have already been followed');
      return { followed: 0, skipped: users.length, errors: 0 };
    }

    // Calculate how many users to follow (60% strategy)
    const usersToFollow = calculateUsersToFollow(this.config, newUsers.length);
    
    // Randomly shuffle and select users to follow
    const shuffledUsers = shuffleArray(newUsers);
    const selectedUsers = shuffledUsers.slice(0, usersToFollow);

    logger.info(`Page ${this.progress.currentPage}: Following ${selectedUsers.length} out of ${newUsers.length} new users (${Math.round(selectedUsers.length/newUsers.length*100)}%)`);

    let followed = 0;
    let skipped = 0;
    let errors = 0;

    for (let i = 0; i < selectedUsers.length && !this.shouldStop; i++) {
      const user = selectedUsers[i];
      
      // Check if we've reached session limit
      if (this.progress.totalFollowed >= this.progress.sessionLimit) {
        logger.info('Session limit reached');
        break;
      }

      try {
        // Random skip chance
        if (shouldSkipUser(this.config)) {
          logger.logSkip(user.login, 'random');
          skipped++;
          continue;
        }

        // Check if already following (additional safety check)
        const alreadyFollowing = await isFollowing(user.login, this.config);
        if (alreadyFollowing) {
          logger.logSkip(user.login, 'already following');
          skipped++;
          continue;
        }

        // Follow the user
        const success = await followUser(user.login, this.config);
        if (success) {
          this.progress = addFollowedUser(this.progress, user.login);
          followed++;
          
          logger.logFollow(
            user.login,
            this.progress.totalFollowed,
            this.progress.sessionLimit,
            i + 1,
            selectedUsers.length,
            this.progress.currentPage
          );

          // Session break check
          if (this.progress.totalFollowed % this.config.sessionBreakAfter === 0) {
            logger.logPause(this.config.breakDuration, 'session break');
            await this.sleep(this.config.breakDuration);
          }

          // Random delay between follows
          const delay = getRandomDelay(this.config);
          if (delay > this.config.maxDelay) {
            logger.logPause(delay, 'extended pause');
          }
          await this.sleep(delay);
        } else {
          errors++;
        }
      } catch (error) {
        logger.error(`Error processing user ${user.login}: ${error.message}`);
        errors++;
        
        // If authentication error, stop the session
        if (error.message.includes('Authentication failed') || error.message.includes('insufficient permissions')) {
          logger.error('Authentication error detected, stopping session');
          this.shouldStop = true;
          break;
        }
      }
    }

    return { followed, skipped, errors };
  }

  /**
   * Run the auto-follow automation
   * @param {string} username - Target username
   * @param {string} mode - Mode (followers/following)
   */
  async run(username, mode) {
    try {
      this.isRunning = true;
      this.shouldStop = false;

      const stats = getSessionStats(this.progress);
      if (stats.isComplete) {
        logger.info('Session already complete');
        return;
      }

      let currentPage = this.progress.currentPage;
      let pagesProcessed = 0;
      let totalFollowed = 0;
      let hasMorePages = true;

      while (hasMorePages && !this.shouldStop && this.progress.totalFollowed < this.progress.sessionLimit) {
        try {
          logger.info(`\n📄 Processing page ${currentPage}...`);

          // Fetch users for current page
          const users = await fetchUsers(username, mode, currentPage, this.config.perPage, this.config);
          
          if (users.length === 0) {
            logger.info('No more users available, ending session');
            hasMorePages = false;
            break;
          }

          // Process the page
          const pageResults = await this.processPage(users);
          totalFollowed += pageResults.followed;
          pagesProcessed++;

          logger.logPageComplete(currentPage, pageResults.followed, users.length);

          // Update progress
          currentPage++;
          this.progress = updateCurrentPage(this.progress, currentPage);

          // Small delay between pages
          if (hasMorePages && this.progress.totalFollowed < this.progress.sessionLimit) {
            await this.sleep(2000);
          }

          // Check if we have fewer users than expected (likely last page)
          if (users.length < this.config.perPage) {
            logger.info('Reached last page of users');
            hasMorePages = false;
          }

        } catch (error) {
          logger.error(`Error processing page ${currentPage}: ${error.message}`);
          
          // If it's a critical error, stop
          if (error.message.includes('Authentication failed') || 
              error.message.includes('not found') ||
              error.message.includes('insufficient permissions')) {
            this.shouldStop = true;
            break;
          }
          
          // Otherwise, try next page after a delay
          await this.sleep(5000);
          currentPage++;
          this.progress = updateCurrentPage(this.progress, currentPage);
        }
      }

      // Final save
      saveProgress(this.progress);

      // Log session completion
      logger.logSessionComplete(this.progress.totalFollowed, pagesProcessed);
      
      const finalStats = getSessionStats(this.progress);
      logger.info(`Session statistics:`);
      logger.info(`  Users followed: ${finalStats.followed}/${finalStats.limit}`);
      logger.info(`  Pages processed: ${pagesProcessed}`);
      logger.info(`  Duration: ${Math.round(finalStats.duration / 60)} minutes`);
      logger.info(`  Status: ${finalStats.isComplete ? 'Complete' : 'Incomplete'}`);

    } catch (error) {
      logger.error(`Session failed: ${error.message}`);
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Stop the automation gracefully
   */
  stop() {
    if (this.isRunning) {
      logger.info('Stopping automation gracefully...');
      this.shouldStop = true;
    }
  }

  /**
   * Sleep for specified duration
   * @param {number} ms - Milliseconds to sleep
   */
  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Main function
 */
async function main() {
  const program = new Command();

  program
    .name('github-auto-follow')
    .description('Automated GitHub following tool with intelligent rate limiting')
    .version('1.0.0')
    .requiredOption('-u, --username <username>', 'Target GitHub username')
    .requiredOption('-m, --mode <mode>', 'Mode: followers or following')
    .action(async (options) => {
      // Validate mode
      if (!['followers', 'following'].includes(options.mode)) {
        logger.error('Mode must be either "followers" or "following"');
        process.exit(1);
      }

      const app = new GitHubAutoFollow();

      // Handle graceful shutdown
      process.on('SIGINT', () => {
        logger.info('\n🛑 Received interrupt signal (Ctrl+C)');
        app.stop();
      });

      process.on('SIGTERM', () => {
        logger.info('\n🛑 Received termination signal');
        app.stop();
      });

      // Handle unhandled promise rejections
      process.on('unhandledRejection', (reason, promise) => {
        logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
        app.stop();
      });

      try {
        logger.info(`🚀 GitHub Auto-Follow Bot Starting...`);
        logger.info(`Target: ${options.username}/${options.mode}`);
        
        const initialized = await app.initialize(options.username, options.mode);
        if (!initialized) {
          process.exit(1);
        }

        await app.run(options.username, options.mode);
        
        logger.info('🎉 Session completed successfully!');
      } catch (error) {
        logger.error(`Application error: ${error.message}`);
        process.exit(1);
      }
    });

  // Parse command line arguments
  program.parse();
}

// Handle unhandled errors at the top level
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

// Run the application
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}
