#!/usr/bin/env node

import { Command } from "commander";
import dotenv from "dotenv";
import process from "process";
import logger from "./logger.js";
import {
  loadConfig,
  generateSessionLimit,
  getRandomDelay,
  shouldSkipUser,
  calculateUsersToFollow,
  shuffleArray,
  displayConfig,
  checkHumanBreak,
  getHumanLikeDelay,
  getThinkingPause,
  formatBreakDuration,
} from "./config.js";
import {
  initializeProgress,
  addFollowedUser,
  updateCurrentPage,
  isUserFollowed,
  getSessionStats,
  saveProgress,
} from "./progress.js";
import {
  initializeGitHub,
  testAuthentication,
  fetchUsers,
  unfollowUser,
  validateUser,
  isFollowing,
  checkAPIStatus,
} from "./github.js";

/**
 * Main unfollow application class
 */
class GitHubAutoUnfollow {
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
   * @param {string} user - User number (user1, user2, etc.)
   */
  async initialize(username, mode, user) {
    try {
      // Load environment variables
      const envFile = `.env.${user}`;
      dotenv.config({ path: envFile });

      if (!process.env.GITHUB_TOKEN) {
        throw new Error(`GitHub token not found in ${envFile}`);
      }

      // Initialize GitHub API
      initializeGitHub(process.env.GITHUB_TOKEN);

      // Test authentication
      const authenticatedUser = await testAuthentication();

      // Load configuration
      this.config = await loadConfig(user);

      // Validate target user
      const targetUser = await validateUser(username, this.config);

      // Initialize progress tracking for unfollowing
      const progressFile = `unfollow-progress.${user}.json`;
      this.progress = await initializeProgress(
        username,
        mode,
        user,
        progressFile
      );

      logger.info("🚀 GitHub Auto-Unfollow Bot initialized successfully");
      logger.info(`👤 Authenticated as: ${authenticatedUser.login}`);
      logger.info(
        `🎯 Target user: ${targetUser.login} (${targetUser.name || "No name"})`
      );
      logger.info(`📋 Mode: Unfollowing ${mode}`);
      logger.info(`📁 Progress file: ${progressFile}`);

      // Display configuration
      displayConfig(this.config, username, mode);

      return { authenticatedUser, targetUser };
    } catch (error) {
      logger.error(`Initialization failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Start the unfollowing process
   * @param {string} username - Target username
   * @param {string} mode - Mode (followers/following)
   */
  async start(username, mode) {
    if (this.isRunning) {
      logger.warn("Bot is already running");
      return;
    }

    this.isRunning = true;
    this.shouldStop = false;

    try {
      logger.info("🎬 Starting unfollow session");

      // Display human behavior information
      if (this.config.humanBehavior) {
        logger.info("🤖 Human behavior simulation enabled:");
        logger.info("   • Intelligent breaks and pauses");
        logger.info("   • Thinking pauses before actions");
        logger.info("   • Fatigue simulation for longer sessions");
        logger.info("   • Burst mode for varied pacing");
      }

      // Check API status
      const apiStatus = await checkAPIStatus();
      if (apiStatus) {
        logger.info(
          `📊 API Status: ${apiStatus.remaining}/${apiStatus.limit} requests remaining`
        );
      }

      // Generate session limit (keeping variable for compatibility)
      const sessionLimit = generateSessionLimit(this.config);
      logger.info(`🎯 Session target: Continue until all users are processed`);

      let currentPage = this.progress.currentPage || 1;
      let totalUnfollowed = 0;
      let sessionUnfollowed = 0;
      let hasMorePages = true;

      while (hasMorePages && !this.shouldStop) {
        logger.info(`\n📄 Processing page ${currentPage}`);

        try {
          // Fetch users to potentially unfollow from
          const users = await fetchUsers(
            username,
            mode,
            currentPage,
            this.config.perPage,
            this.config
          );

          if (!users || users.length === 0) {
            logger.info("No more users found");
            hasMorePages = false;
            break;
          }

          // Shuffle users for more natural behavior
          const shuffledUsers = shuffleArray([...users]);
          logger.info(
            `👥 Found ${shuffledUsers.length} users on page ${currentPage}`
          );

          // Calculate how many users to unfollow from this page
          const baseUsersToProcess = calculateUsersToFollow(
            this.config,
            shuffledUsers.length
          );
          const usersToProcess = baseUsersToProcess;

          logger.info(`🔄 Will process ${usersToProcess} users from this page`);

          // Process users for unfollowing
          const processedUsers = shuffledUsers.slice(0, usersToProcess);

          for (const user of processedUsers) {
            if (this.shouldStop) break;

            try {
              // Check if we're currently following this user
              const isCurrentlyFollowing = await isFollowing(
                user.login,
                this.config
              );

              if (!isCurrentlyFollowing) {
                logger.info(`⏭️  Not following ${user.login}, skipping`);
                continue;
              }

              // Check if we should skip this user
              if (shouldSkipUser(this.config)) {
                logger.info(
                  `⏭️  Skipping ${user.login} (${user.type || "unknown type"})`
                );
                continue;
              }

              // Check if already processed this user
              if (isUserFollowed(this.progress, user.login)) {
                logger.info(`⏭️  Already processed ${user.login}, skipping`);
                continue;
              }

              // Add thinking pause before unfollowing (human-like hesitation)
              const thinkingPause = getThinkingPause(this.config);
              if (thinkingPause > 0) {
                logger.debug(
                  `🤔 Thinking pause: ${formatBreakDuration(thinkingPause)}`
                );
                await new Promise((resolve) =>
                  setTimeout(resolve, thinkingPause)
                );
              }

              // Unfollow the user
              logger.info(`🔄 Attempting to unfollow: ${user.login}`);
              const success = await unfollowUser(user.login, this.config);

              if (success) {
                // Record the unfollowed user
                this.progress = addFollowedUser(this.progress, user.login);
                sessionUnfollowed++;
                totalUnfollowed++;

                logger.info(
                  `✅ Successfully unfollowed ${user.login} (${sessionUnfollowed} total)`
                );

                // Save progress
                await saveProgress(this.progress);

                // Check for human-like breaks based on action count
                const miniBreak = checkHumanBreak(
                  this.config,
                  sessionUnfollowed,
                  "mini"
                );
                const mediumBreak = checkHumanBreak(
                  this.config,
                  sessionUnfollowed,
                  "medium"
                );
                const longBreak = checkHumanBreak(
                  this.config,
                  sessionUnfollowed,
                  "long"
                );

                if (longBreak.shouldBreak) {
                  logger.info(
                    `😴 Taking a long break: ${formatBreakDuration(
                      longBreak.duration
                    )} (human behavior)`
                  );
                  await new Promise((resolve) =>
                    setTimeout(resolve, longBreak.duration)
                  );
                } else if (mediumBreak.shouldBreak) {
                  logger.info(
                    `☕ Taking a medium break: ${formatBreakDuration(
                      mediumBreak.duration
                    )} (human behavior)`
                  );
                  await new Promise((resolve) =>
                    setTimeout(resolve, mediumBreak.duration)
                  );
                } else if (miniBreak.shouldBreak) {
                  logger.debug(
                    `⏸️  Mini break: ${formatBreakDuration(
                      miniBreak.duration
                    )} (human behavior)`
                  );
                  await new Promise((resolve) =>
                    setTimeout(resolve, miniBreak.duration)
                  );
                }

                // Enhanced human-like delay between unfollows
                const delay = getHumanLikeDelay(
                  this.config,
                  totalUnfollowed,
                  sessionUnfollowed
                );
                logger.debug(
                  `⏱️  Waiting ${formatBreakDuration(delay)} before next action`
                );
                await new Promise((resolve) => setTimeout(resolve, delay));
              } else {
                logger.warn(`❌ Failed to unfollow ${user.login}`);
              }
            } catch (error) {
              logger.error(
                `Error processing user ${user.login}: ${error.message}`
              );

              // If it's an authentication error, stop the session
              if (
                error.message &&
                (error.message.includes("Authentication failed") ||
                  error.message.includes("insufficient permissions"))
              ) {
                logger.error("Authentication error detected, stopping session");
                this.shouldStop = true;
                break;
              }
            }
          }

          // Update current page
          currentPage++;
          updateCurrentPage(currentPage, this.progress);
          await saveProgress(this.progress);

          // Page break (human-like pause between pages)
          const pageBreak = checkHumanBreak(this.config, 0, "page");
          if (pageBreak.shouldBreak) {
            logger.info(
              `📄 Page break: ${formatBreakDuration(
                pageBreak.duration
              )} (checking next page)`
            );
            await new Promise((resolve) =>
              setTimeout(resolve, pageBreak.duration)
            );
          }

          // If we processed fewer users than requested, we might be at the end
          if (shuffledUsers.length < this.config.perPage) {
            logger.info("Reached end of user list");
            hasMorePages = false;
          }
        } catch (error) {
          logger.error(
            `Error processing page ${currentPage}: ${error.message}`
          );

          // If it's a critical error, stop the session
          if (
            error.message &&
            (error.message.includes("Authentication failed") ||
              error.message.includes("Not Found") ||
              error.message.includes("insufficient permissions"))
          ) {
            logger.error("Critical error detected, stopping session");
            break;
          }

          // For other errors, try next page after a delay
          const delay = getRandomDelay(this.config) * 2; // Double delay on error
          logger.info(`⏱️  Waiting ${delay}ms before retrying`);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }

      // Session summary
      const sessionStats = getSessionStats(this.progress);
      logger.info("\n📊 Session Summary:");
      logger.info(`✅ Users unfollowed this session: ${sessionUnfollowed}`);
      logger.info(`📈 Total users unfollowed: ${sessionStats.totalFollowed}`);
      logger.info(`📄 Current page: ${currentPage}`);
      logger.info(
        `⏱️  Session duration: ${Math.round(
          (Date.now() - sessionStats.sessionStart) / 1000
        )}s`
      );

      if (this.shouldStop) {
        logger.info("🛑 Session stopped by user");
      } else {
        logger.info("✅ Session completed - no more users to process");
      }
    } catch (error) {
      logger.error(`Session failed: ${error.message}`);
      throw error;
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Stop the bot gracefully
   */
  stop() {
    if (this.isRunning) {
      logger.info("🛑 Stopping bot...");
      this.shouldStop = true;
    } else {
      logger.info("Bot is not running");
    }
  }

  /**
   * Get current status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      shouldStop: this.shouldStop,
      progress: this.progress ? getSessionStats(this.progress) : null,
    };
  }
}

/**
 * CLI setup and main execution
 */
async function main() {
  const program = new Command();

  program
    .name("github-auto-unfollow")
    .description("Automated GitHub unfollowing with intelligent rate limiting")
    .version("1.0.0")
    .requiredOption("-u, --username <username>", "Target GitHub username")
    .requiredOption(
      "-m, --mode <mode>",
      "Unfollow mode: followers or following"
    )
    .requiredOption(
      "--user <user>",
      "User configuration (user1, user2, user3, user4)"
    )
    .option("-d, --dry-run", "Run in dry-run mode (no actual unfollowing)")
    .option("--verbose", "Enable verbose logging")
    .parse();

  const options = program.opts();

  // Validate user parameter
  if (!["user1", "user2", "user3", "user4"].includes(options.user)) {
    logger.error("User must be one of: user1, user2, user3, user4");
    process.exit(1);
  }

  // Validate mode parameter
  if (!["followers", "following"].includes(options.mode)) {
    logger.error('Mode must be either "followers" or "following"');
    process.exit(1);
  }

  // Set log level
  if (options.verbose) {
    logger.level = "debug";
  }

  const bot = new GitHubAutoUnfollow();

  // Handle graceful shutdown
  process.on("SIGINT", () => {
    logger.info("\n🛑 Received SIGINT, shutting down gracefully...");
    bot.stop();
  });

  process.on("SIGTERM", () => {
    logger.info("\n🛑 Received SIGTERM, shutting down gracefully...");
    bot.stop();
  });

  try {
    // Initialize the bot
    await bot.initialize(options.username, options.mode, options.user);

    if (options.dryRun) {
      logger.info(
        "🧪 Running in dry-run mode - no actual unfollowing will occur"
      );
      // TODO: Implement dry-run mode
      return;
    }

    // Start the unfollowing process
    await bot.start(options.username, options.mode);

    logger.info("✅ Unfollowing session completed successfully");
    process.exit(0);
  } catch (error) {
    logger.error(`Fatal error: ${error.message}`);
    process.exit(1);
  }
}

// Execute main function if this script is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    logger.error(`Unhandled error: ${error.message}`);
    process.exit(1);
  });
}

export default GitHubAutoUnfollow;
