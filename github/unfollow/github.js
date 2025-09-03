import { Octokit } from "@octokit/rest";
import logger from "./logger.js";
import { getRetryDelay, loadConfig } from "./config.js";

/**
 * Configuration object
 */
const config = loadConfig();

/**
 * GitHub API client
 */
let octokit = null;

/**
 * Rate limit information
 */
let rateLimitInfo = {
  remaining: 5000,
  reset: new Date(),
  limit: 5000,
};

/**
 * Initialize GitHub API client
 * @param {string} token - GitHub personal access token
 */
export function initializeGitHub(token) {
  if (!token) {
    throw new Error("GitHub token is required");
  }

  octokit = new Octokit({
    auth: token,
    userAgent: "github-auto-follow-bot/1.0.0",
  });

  logger.debug("GitHub API client initialized");
}

/**
 * Test GitHub authentication
 * @returns {Promise<Object>} Authenticated user information
 */
export async function testAuthentication() {
  if (!octokit) {
    throw new Error("GitHub client not initialized");
  }

  try {
    const { data: user } = await octokit.rest.users.getAuthenticated();
    logger.info(`Authenticated as: ${user.login} (${user.name || "No name"})`);
    return user;
  } catch (error) {
    logger.error(`Authentication failed: ${error.message}`);
    throw new Error(`GitHub authentication failed: ${error.message}`);
  }
}

/**
 * Update rate limit information from response headers
 * @param {Object} headers - Response headers
 */
function updateRateLimitInfo(headers) {
  if (headers["x-ratelimit-remaining"]) {
    rateLimitInfo.remaining = parseInt(headers["x-ratelimit-remaining"]);
  }
  if (headers["x-ratelimit-reset"]) {
    rateLimitInfo.reset = new Date(
      parseInt(headers["x-ratelimit-reset"]) * 1000
    );
  }
  if (headers["x-ratelimit-limit"]) {
    rateLimitInfo.limit = parseInt(headers["x-ratelimit-limit"]);
  }

  logger.logRateLimit(rateLimitInfo.remaining, rateLimitInfo.reset);
}

/**
 * Check if we're approaching rate limits
 * @returns {Promise<void>}
 */
async function checkRateLimit() {
  if (rateLimitInfo.remaining <= 10) {
    const waitTime = rateLimitInfo.reset.getTime() - Date.now();
    if (waitTime > 0) {
      logger.warn(
        `Rate limit nearly exhausted (${
          rateLimitInfo.remaining
        } remaining). Waiting until ${rateLimitInfo.reset.toLocaleTimeString()}`
      );
      await new Promise((resolve) => setTimeout(resolve, waitTime + 1000)); // Add 1 second buffer

      // Refresh rate limit info
      try {
        const { headers } = await octokit.rest.rateLimit.get();
        updateRateLimitInfo(headers);
      } catch (error) {
        logger.warn(`Failed to refresh rate limit info: ${error.message}`);
      }
    }
  }
}

/**
 * Execute API request with retry logic
 * @param {Function} apiCall - Function that makes the API call
 * @param {Object} config - Configuration object
 * @param {string} operation - Description of the operation for logging
 * @returns {Promise<Object>} API response
 */
async function executeWithRetry(apiCall, config, operation) {
  let lastError = null;

  for (let attempt = 0; attempt < config.retryAttempts; attempt++) {
    try {
      await checkRateLimit();

      const response = await apiCall();
      updateRateLimitInfo(response.headers);

      return response;
    } catch (error) {
      lastError = error;

      // Don't retry on authentication or not found errors
      if (
        error.status === 401 ||
        error.status === 403 ||
        error.status === 404
      ) {
        throw error;
      }

      // For rate limit errors, wait and try again
      if (error.status === 429) {
        logger.warn(`Rate limit exceeded during ${operation}, waiting...`);
        const resetTime = error.response?.headers["x-ratelimit-reset"];
        if (resetTime) {
          const waitTime = parseInt(resetTime) * 1000 - Date.now() + 1000; // Add 1 second buffer
          if (waitTime > 0) {
            await new Promise((resolve) => setTimeout(resolve, waitTime));
          }
        } else {
          // Fallback to exponential backoff
          const delay = getRetryDelay(config, attempt);
          logger.warn(`Waiting ${delay}ms before retry`);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
        continue;
      }

      // For other errors, use exponential backoff
      if (attempt < config.retryAttempts - 1) {
        const delay = getRetryDelay(config, attempt);
        logger.warn(
          `${operation} failed (attempt ${attempt + 1}/${
            config.retryAttempts
          }): ${error.message}. Retrying in ${delay}ms`
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}

/**
 * Fetch users (followers or following) for a given username
 * @param {string} username - Target username
 * @param {string} mode - 'followers' or 'following'
 * @param {number} page - Page number (1-based)
 * @param {number} perPage - Users per page
 * @param {Object} config - Configuration object
 * @returns {Promise<Array>} Array of user objects
 */
export async function fetchUsers(username, mode, page, perPage, userConfig) {
  if (!octokit) {
    throw new Error("GitHub client not initialized");
  }

  const operation = `fetching ${mode} for ${username} (page ${page})`;

  try {
    const response = await executeWithRetry(
      () => {
        if (mode === "followers") {
          return octokit.rest.users.listFollowersForUser({
            username,
            page,
            per_page: perPage,
          });
        } else {
          return octokit.rest.users.listFollowingForUser({
            username,
            page,
            per_page: perPage,
          });
        }
      },
      userConfig,
      operation
    );

    const users = response.data.map((user) => ({
      login: user.login,
      id: user.id,
      avatar_url: user.avatar_url,
      html_url: user.html_url,
    }));

    logger.debug(
      `Fetched ${users.length} users from ${username}/${mode} (page ${page})`
    );
    return users;
  } catch (error) {
    if (error.status === 404) {
      throw new Error(
        `User '${username}' not found or their ${mode} list is private`
      );
    }
    if (error.status === 401 || error.status === 403) {
      throw new Error(
        `Authentication failed or insufficient permissions: ${error.message}`
      );
    }

    logger.error(`Failed to fetch ${mode} for ${username}: ${error.message}`);
    throw new Error(`Failed to fetch users: ${error.message}`);
  }
}

/**
 * Follow a user
 * @param {string} username - Username to follow
 * @param {Object} config - Configuration object
 * @returns {Promise<boolean>} True if successfully followed
 */
export async function followUser(username, config) {
  if (!octokit) {
    throw new Error("GitHub client not initialized");
  }

  const operation = `following user ${username}`;

  try {
    await executeWithRetry(
      () => octokit.rest.users.follow({ username }),
      config,
      operation
    );

    logger.debug(`Successfully followed ${username}`);
    return true;
  } catch (error) {
    if (error.status === 404) {
      logger.warn(`User ${username} not found, skipping`);
      return false;
    }
    if (error.status === 401 || error.status === 403) {
      throw new Error(
        `Authentication failed or insufficient permissions to follow users: ${error.message}`
      );
    }

    logger.error(`Failed to follow ${username}: ${error.message}`);
    return false;
  }
}

/**
 * Unfollow a user
 * @param {string} username - Username to unfollow
 * @param {Object} config - Configuration object
 * @returns {Promise<boolean>} True if successfully unfollowed
 */
export async function unfollowUser(username, config) {
  if (!octokit) {
    throw new Error("GitHub client not initialized");
  }

  const operation = `unfollowing user ${username}`;

  try {
    await executeWithRetry(
      () => octokit.rest.users.unfollow({ username }),
      config,
      operation
    );

    logger.debug(`Successfully unfollowed ${username}`);
    return true;
  } catch (error) {
    if (error.status === 404) {
      logger.warn(`User ${username} not found, skipping`);
      return false;
    }
    if (error.status === 401 || error.status === 403) {
      throw new Error(
        `Authentication failed or insufficient permissions to unfollow users: ${error.message}`
      );
    }

    logger.error(`Failed to unfollow ${username}: ${error.message}`);
    return false;
  }
}

/**
 * Check if already following a user
 * @param {string} username - Username to check
 * @param {Object} config - Configuration object
 * @returns {Promise<boolean>} True if already following
 */
/**
 * Check if currently authenticated user is following a specific user
 * @param {string} username - Username to check if following
 * @param {Object} config - Configuration object
 * @returns {Promise<boolean>} True if already following
 */
export async function isFollowing(username, config) {
  if (!octokit) {
    throw new Error("GitHub client not initialized");
  }

  const operation = `checking if following ${username}`;

  try {
    await executeWithRetry(
      () =>
        octokit.rest.users.checkPersonIsFollowedByAuthenticated({
          username: username, // The user you want to check if you're following
        }),
      config,
      operation
    );

    return true;
  } catch (error) {
    if (error.status === 404) {
      return false; // Not following
    }
    if (error.status === 401 || error.status === 403) {
      throw new Error(
        `Authentication failed or insufficient permissions: ${error.message}`
      );
    }

    logger.warn(
      `Failed to check following status for ${username}: ${error.message}`
    );
    return false; // Assume not following on error
  }
}

/**
 * Get current rate limit status
 * @returns {Object} Rate limit information
 */
export function getRateLimitInfo() {
  return { ...rateLimitInfo };
}

/**
 * Validate if a username exists and is accessible
 * @param {string} username - Username to validate
 * @param {Object} config - Configuration object
 * @returns {Promise<Object>} User information
 */
export async function validateUser(username, config) {
  if (!octokit) {
    throw new Error("GitHub client not initialized");
  }

  const operation = `validating user ${username}`;

  try {
    const response = await executeWithRetry(
      () => octokit.rest.users.getByUsername({ username }),
      config,
      operation
    );

    const user = response.data;
    logger.debug(
      `User ${username} validated: ${user.name || "No name"} (${
        user.public_repos
      } repos, ${user.followers} followers)`
    );

    return {
      login: user.login,
      name: user.name,
      public_repos: user.public_repos,
      followers: user.followers,
      following: user.following,
    };
  } catch (error) {
    if (error.status === 404) {
      throw new Error(`User '${username}' not found`);
    }
    if (error.status === 401 || error.status === 403) {
      throw new Error(
        `Authentication failed or insufficient permissions: ${error.message}`
      );
    }

    throw new Error(`Failed to validate user: ${error.message}`);
  }
}

/**
 * Check GitHub API status
 * @returns {Promise<Object>} API status information
 */
export async function checkAPIStatus() {
  if (!octokit) {
    throw new Error("GitHub client not initialized");
  }

  try {
    const response = await octokit.rest.rateLimit.get();
    const rateLimit = response.data.rate;

    updateRateLimitInfo(response.headers);

    return {
      limit: rateLimit.limit,
      remaining: rateLimit.remaining,
      reset: new Date(rateLimit.reset * 1000),
      used: rateLimit.used,
    };
  } catch (error) {
    logger.warn(`Failed to check API status: ${error.message}`);
    return null;
  }
}
