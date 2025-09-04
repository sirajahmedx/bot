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
  maxPerSession: [999999, 999999], // Very high limits to continue until end
  followPercentage: 1.0, // Unfollow 100% of users
  retryAttempts: 3,
  retryDelay: 1000,
  perPage: 100,

  // Human-like behavior patterns
  humanBehavior: {
    // Mini breaks every few actions (3-7 actions)
    miniBreakAfter: [3, 7],
    miniBreakDuration: [2000, 5000],
    miniBreakChance: 0.3,

    // Medium breaks every 15-25 actions
    mediumBreakAfter: [15, 25],
    mediumBreakDuration: [10000, 30000],
    mediumBreakChance: 0.4,

    // Long breaks every 40-60 actions
    longBreakAfter: [40, 60],
    longBreakDuration: [60000, 180000], // 1-3 minutes
    longBreakChance: 0.6,

    // Page breaks (between pages)
    pageBreakChance: 0.2,
    pageBreakDuration: [3000, 8000],

    // Random thinking pauses
    thinkingPauseChance: 0.15,
    thinkingPauseDuration: [1500, 4000],

    // Burst behavior (sometimes faster, sometimes slower)
    burstModeChance: 0.1,
    burstModeActions: [5, 10],
    burstModeDelayMultiplier: 0.5, // Faster during burst

    // Fatigue simulation (slower as session progresses)
    enableFatigue: true,
    fatigueStartsAfter: 100,
    fatigueDelayIncrease: 0.1, // 10% increase per 50 actions
  },
};

/**
 * Load and validate configuration
 * @param {string} user - User configuration (user1, user2, etc.)
 * @returns {Object} Configuration object
 */
export function loadConfig(user = null) {
  try {
    if (!existsSync(CONFIG_FILE)) {
      logger.warn(`Config file ${CONFIG_FILE} not found, using defaults`);
      return DEFAULT_CONFIG;
    }

    const data = readFileSync(CONFIG_FILE, "utf8");
    const configFile = JSON.parse(data);

    let config;

    // Check if it's the new format with defaults and users sections
    if (configFile.defaults && configFile.users) {
      // Start with default configuration
      config = { ...DEFAULT_CONFIG };

      // Apply defaults from the configuration file
      if (configFile.defaults.delays) {
        config.minDelay = configFile.defaults.delays.min || config.minDelay;
        config.maxDelay = configFile.defaults.delays.max || config.maxDelay;
      }

      if (configFile.defaults.session) {
        // For unfollow bot, we want to continue until the end, so set very high limits
        config.maxPerSession = [
          configFile.defaults.session.minUnfollows || 999999,
          configFile.defaults.session.maxUnfollows || 999999,
        ];
      }

      if (configFile.defaults.pagination) {
        config.perPage =
          configFile.defaults.pagination.perPage || config.perPage;
      }

      if (configFile.defaults.behavior) {
        config.followPercentage = 1.0; // Always unfollow 100% for unfollow bot
      }

      // Apply human behavior settings from configuration file
      if (configFile.defaults.humanBehavior) {
        config.humanBehavior = {
          ...config.humanBehavior,
          ...configFile.defaults.humanBehavior,
        };
      }

      // Apply user-specific overrides if user is specified
      if (user && configFile.users && configFile.users[user]) {
        const userConfig = configFile.users[user];

        if (userConfig.delays) {
          config.minDelay = userConfig.delays.min || config.minDelay;
          config.maxDelay = userConfig.delays.max || config.maxDelay;
        }

        if (userConfig.session) {
          // For unfollow bot, we want to continue until the end
          config.maxPerSession = [
            userConfig.session.minUnfollows || 999999,
            userConfig.session.maxUnfollows || 999999,
          ];
        }

        // Apply user-specific human behavior overrides
        if (userConfig.humanBehavior) {
          config.humanBehavior = {
            ...config.humanBehavior,
            ...userConfig.humanBehavior,
          };
        }
      }
    } else {
      // Old format - merge directly with defaults
      config = { ...DEFAULT_CONFIG, ...configFile };
    }

    // Validate configuration
    const validatedConfig = validateConfig(config);

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
export function displayConfig(config, username, mode) {
  logger.info("Current configuration:");
  logger.info(
    `  Unfollow percentage: ${(config.followPercentage * 100).toFixed(1)}%`
  );
  logger.info(`  Delay range: ${config.minDelay}-${config.maxDelay}ms`);
  logger.info(`  Skip chance: ${(config.skipChance * 100).toFixed(1)}%`);
  logger.info(
    `  Long pause chance: ${(config.longPauseChance * 100).toFixed(1)}%`
  );
  logger.info(`  Session mode: Continue until all users are processed`);
  logger.info(`  Break after: ${config.sessionBreakAfter} unfollows`);
  logger.info(`  Break duration: ${config.breakDuration / 1000}s`);
  logger.info(`  Target: ${username}'s ${mode}`);

  // Display human behavior settings if enabled
  if (config.humanBehavior) {
    logger.info(`  Human behavior: Enabled with intelligent breaks and pauses`);
  }
}

/**
 * Get a random value between min and max from an array
 * @param {Array} range - [min, max] range
 * @returns {number} Random value between min and max
 */
function getRandomInRange(range) {
  const [min, max] = range;
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Check if it's time for a human-like break
 * @param {Object} config - Configuration object
 * @param {number} actionCount - Number of actions performed
 * @param {string} breakType - Type of break ('mini', 'medium', 'long')
 * @returns {Object} Break information {shouldBreak: boolean, duration: number}
 */
export function checkHumanBreak(config, actionCount, breakType = "mini") {
  if (!config.humanBehavior) {
    return { shouldBreak: false, duration: 0 };
  }

  const behavior = config.humanBehavior;
  let shouldBreak = false;
  let duration = 0;

  switch (breakType) {
    case "mini":
      const miniRange = getRandomInRange(behavior.miniBreakAfter);
      if (
        actionCount % miniRange === 0 &&
        Math.random() < behavior.miniBreakChance
      ) {
        shouldBreak = true;
        duration = getRandomInRange(behavior.miniBreakDuration);
      }
      break;

    case "medium":
      const mediumRange = getRandomInRange(behavior.mediumBreakAfter);
      if (
        actionCount % mediumRange === 0 &&
        Math.random() < behavior.mediumBreakChance
      ) {
        shouldBreak = true;
        duration = getRandomInRange(behavior.mediumBreakDuration);
      }
      break;

    case "long":
      const longRange = getRandomInRange(behavior.longBreakAfter);
      if (
        actionCount % longRange === 0 &&
        Math.random() < behavior.longBreakChance
      ) {
        shouldBreak = true;
        duration = getRandomInRange(behavior.longBreakDuration);
      }
      break;

    case "page":
      if (Math.random() < behavior.pageBreakChance) {
        shouldBreak = true;
        duration = getRandomInRange(behavior.pageBreakDuration);
      }
      break;

    case "thinking":
      if (Math.random() < behavior.thinkingPauseChance) {
        shouldBreak = true;
        duration = getRandomInRange(behavior.thinkingPauseDuration);
      }
      break;
  }

  return { shouldBreak, duration };
}

/**
 * Calculate enhanced delay with human behavior patterns
 * @param {Object} config - Configuration object
 * @param {number} totalUnfollowed - Total number of users unfollowed
 * @param {number} sessionUnfollowed - Number of users unfollowed in current session
 * @returns {number} Delay in milliseconds
 */
export function getHumanLikeDelay(
  config,
  totalUnfollowed = 0,
  sessionUnfollowed = 0
) {
  let baseDelay = getRandomDelay(config, totalUnfollowed);

  if (!config.humanBehavior) {
    return baseDelay;
  }

  const behavior = config.humanBehavior;

  // Apply fatigue simulation
  if (behavior.enableFatigue && totalUnfollowed > behavior.fatigueStartsAfter) {
    const fatigueMultiplier =
      1 +
      Math.floor((totalUnfollowed - behavior.fatigueStartsAfter) / 50) *
        behavior.fatigueDelayIncrease;
    baseDelay *= fatigueMultiplier;
  }

  // Apply burst mode (sometimes faster)
  if (Math.random() < behavior.burstModeChance) {
    const burstActions = getRandomInRange(behavior.burstModeActions);
    if (sessionUnfollowed % burstActions < burstActions / 2) {
      baseDelay *= behavior.burstModeDelayMultiplier;
      logger.debug(`🏃 Burst mode active - faster pace`);
    }
  }

  return Math.floor(baseDelay);
}

/**
 * Get a thinking pause (brief hesitation before action)
 * @param {Object} config - Configuration object
 * @returns {number} Thinking pause duration in milliseconds
 */
export function getThinkingPause(config) {
  const breakInfo = checkHumanBreak(config, 0, "thinking");
  return breakInfo.shouldBreak ? breakInfo.duration : 0;
}

/**
 * Format break duration for human-readable display
 * @param {number} duration - Duration in milliseconds
 * @returns {string} Formatted duration string
 */
export function formatBreakDuration(duration) {
  if (duration < 1000) {
    return `${duration}ms`;
  } else if (duration < 60000) {
    return `${(duration / 1000).toFixed(1)}s`;
  } else {
    return `${(duration / 60000).toFixed(1)}m`;
  }
}
