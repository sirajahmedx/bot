import { readFileSync, existsSync } from "fs";
import logger from "./logger.js";

/**
 * Configuration file path
 */
const CONFIG_FILE = "config.json";

/**
 * Default configuration
 */
const DEFAULT_CONFIG = {
  minDelay: 1000,
  maxDelay: 3000,
  skipChance: 0.05,
  longPauseChance: 0.05,
  longPauseMin: 5000,
  longPauseMax: 10000,
  sessionBreakAfter: 50,
  breakDuration: 30000,
  maxPerSession: [50, 80],
  followPercentage: 1.0,  // Unfollow 100% of users
  retryAttempts: 3,
  retryDelay: 1000,
  perPage: 100,
};

/**
 * Load and validate configuration
 * @returns {Object} Configuration object
 */
export function loadConfig() {
  try {
    if (!existsSync(CONFIG_FILE)) {
      logger.warn(`Config file ${CONFIG_FILE} not found, using defaults`);
      return DEFAULT_CONFIG;
    }

    const data = readFileSync(CONFIG_FILE, "utf8");
    const config = JSON.parse(data);

    // Merge with defaults to ensure all required fields exist
    const mergedConfig = { ...DEFAULT_CONFIG, ...config };

    // Validate configuration
    const validatedConfig = validateConfig(mergedConfig);

    logger.debug("Configuration loaded and validated successfully");
    return validatedConfig;
  } catch (error) {
    logger.error(`Failed to load config: ${error.message}`);
    logger.info("Using default configuration");
    return DEFAULT_CONFIG;
  }
}

/**
 * Validate configuration values
 * @param {Object} config - Configuration to validate
 * @returns {Object} Validated configuration
 */
function validateConfig(config) {
  const validated = { ...config };

  // Validate delays
  validated.minDelay = Math.max(
    500,
    parseInt(config.minDelay) || DEFAULT_CONFIG.minDelay
  );
  validated.maxDelay = Math.max(
    validated.minDelay,
    parseInt(config.maxDelay) || DEFAULT_CONFIG.maxDelay
  );

  // Validate probabilities (0-1)
  validated.skipChance = Math.max(
    0,
    Math.min(1, parseFloat(config.skipChance) || DEFAULT_CONFIG.skipChance)
  );
  validated.longPauseChance = Math.max(
    0,
    Math.min(
      1,
      parseFloat(config.longPauseChance) || DEFAULT_CONFIG.longPauseChance
    )
  );
  validated.followPercentage = Math.max(
    0.1,
    Math.min(
      1,
      parseFloat(config.followPercentage) || DEFAULT_CONFIG.followPercentage
    )
  );

  // Validate long pause durations
  validated.longPauseMin = Math.max(
    1000,
    parseInt(config.longPauseMin) || DEFAULT_CONFIG.longPauseMin
  );
  validated.longPauseMax = Math.max(
    validated.longPauseMin,
    parseInt(config.longPauseMax) || DEFAULT_CONFIG.longPauseMax
  );

  // Validate session settings
  validated.sessionBreakAfter = Math.max(
    10,
    parseInt(config.sessionBreakAfter) || DEFAULT_CONFIG.sessionBreakAfter
  );
  validated.breakDuration = Math.max(
    5000,
    parseInt(config.breakDuration) || DEFAULT_CONFIG.breakDuration
  );

  // Validate session limits
  if (Array.isArray(config.maxPerSession) && config.maxPerSession.length >= 2) {
    const [min, max] = config.maxPerSession;
    validated.maxPerSession = [
      Math.max(1, parseInt(min) || DEFAULT_CONFIG.maxPerSession[0]),
      Math.max(
        parseInt(min) || DEFAULT_CONFIG.maxPerSession[0],
        parseInt(max) || DEFAULT_CONFIG.maxPerSession[1]
      ),
    ];
  } else {
    validated.maxPerSession = DEFAULT_CONFIG.maxPerSession;
  }

  // Validate retry settings
  validated.retryAttempts = Math.max(
    1,
    Math.min(10, parseInt(config.retryAttempts) || DEFAULT_CONFIG.retryAttempts)
  );
  validated.retryDelay = Math.max(
    500,
    parseInt(config.retryDelay) || DEFAULT_CONFIG.retryDelay
  );

  // Validate pagination
  validated.perPage = Math.max(
    1,
    Math.min(100, parseInt(config.perPage) || DEFAULT_CONFIG.perPage)
  );

  // Log any corrections made
  const corrections = [];
  Object.keys(config).forEach((key) => {
    if (JSON.stringify(config[key]) !== JSON.stringify(validated[key])) {
      corrections.push(
        `${key}: ${JSON.stringify(config[key])} → ${JSON.stringify(
          validated[key]
        )}`
      );
    }
  });

  if (corrections.length > 0) {
    logger.warn(`Configuration corrections applied: ${corrections.join(", ")}`);
  }

  return validated;
}

/**
 * Generate random session limit based on config
 * @param {Object} config - Configuration object
 * @returns {number} Random session limit
 */
export function generateSessionLimit(config) {
  const [min, max] = config.maxPerSession;
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Calculate random delay based on config with progressive increase
 * @param {Object} config - Configuration object
 * @param {number} totalFollowed - Total number of users followed so far
 * @returns {number} Delay in milliseconds
 */
export function getRandomDelay(config, totalFollowed = 0) {
  const baseDelay =
    Math.random() * (config.maxDelay - config.minDelay) + config.minDelay;

  // Progressive delay increase: add 100ms for every 50 users followed
  const progressiveDelay = Math.floor(totalFollowed / 50) * 100;

  // Check for long pause
  if (Math.random() < config.longPauseChance) {
    const longPause =
      Math.random() * (config.longPauseMax - config.longPauseMin) +
      config.longPauseMin;
    return baseDelay + longPause + progressiveDelay;
  }

  return baseDelay + progressiveDelay;
}

/**
 * Check if user should be skipped based on config
 * @param {Object} config - Configuration object
 * @returns {boolean} True if user should be skipped
 */
export function shouldSkipUser(config) {
  return Math.random() < config.skipChance;
}

/**
 * Calculate how many users to follow from a page
 * @param {Object} config - Configuration object
 * @param {number} totalUsers - Total users on the page
 * @returns {number} Number of users to follow
 */
export function calculateUsersToFollow(config, totalUsers) {
  return Math.floor(totalUsers * config.followPercentage);
}

/**
 * Shuffle array using Fisher-Yates algorithm
 * @param {Array} array - Array to shuffle
 * @returns {Array} Shuffled array (new copy)
 */
export function shuffleArray(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Calculate exponential backoff delay
 * @param {Object} config - Configuration object
 * @param {number} attempt - Attempt number (0-based)
 * @returns {number} Delay in milliseconds
 */
export function getRetryDelay(config, attempt) {
  return config.retryDelay * Math.pow(2, attempt);
}

/**
 * Get config file path
 * @returns {string} Config file path
 */
export function getConfigFilePath() {
  return CONFIG_FILE;
}

/**
 * Display current configuration
 * @param {Object} config - Configuration object
 */
export function displayConfig(config) {
  logger.info("Current configuration:");
  logger.info(
    `  Follow percentage: ${(config.followPercentage * 100).toFixed(1)}%`
  );
  logger.info(`  Delay range: ${config.minDelay}-${config.maxDelay}ms`);
  logger.info(`  Skip chance: ${(config.skipChance * 100).toFixed(1)}%`);
  logger.info(
    `  Long pause chance: ${(config.longPauseChance * 100).toFixed(1)}%`
  );
  logger.info(
    `  Session limit: ${config.maxPerSession[0]}-${config.maxPerSession[1]} users`
  );
  logger.info(`  Break after: ${config.sessionBreakAfter} follows`);
  logger.info(`  Break duration: ${config.breakDuration / 1000}s`);
}
