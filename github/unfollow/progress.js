import { readFileSync, writeFileSync, existsSync } from "fs";
import logger from "./logger.js";

/**
 * Default progress file path
 */
let PROGRESS_FILE = "progress.json";

/**
 * Set custom progress file path
 * @param {string} filename - Custom filename
 */
export function setProgressFile(filename) {
  PROGRESS_FILE = filename;
}

/**
 * Default progress structure
 */
const DEFAULT_PROGRESS = {
  targetUsername: "",
  mode: "",
  followedUsers: [],
  currentPage: 1,
  totalFollowed: 0,
  sessionLimit: 0,
  startTime: null,
  lastSaveTime: null,
};

/**
 * Load progress from file
 * @returns {Object} Progress object
 */
export function loadProgress() {
  try {
    if (!existsSync(PROGRESS_FILE)) {
      logger.debug("No progress file found, starting fresh");
      return { ...DEFAULT_PROGRESS };
    }

    const data = readFileSync(PROGRESS_FILE, "utf8");
    const progress = JSON.parse(data);

    // Validate progress structure
    const validatedProgress = {
      ...DEFAULT_PROGRESS,
      ...progress,
      followedUsers: Array.isArray(progress.followedUsers)
        ? progress.followedUsers
        : [],
      currentPage:
        typeof progress.currentPage === "number" ? progress.currentPage : 1,
      totalFollowed:
        typeof progress.totalFollowed === "number" ? progress.totalFollowed : 0,
      sessionLimit:
        typeof progress.sessionLimit === "number" ? progress.sessionLimit : 0,
    };

    logger.debug(
      `Progress loaded: ${validatedProgress.totalFollowed} users followed, page ${validatedProgress.currentPage}`
    );
    return validatedProgress;
  } catch (error) {
    logger.warn(`Failed to load progress file: ${error.message}`);
    logger.debug("Starting with fresh progress");
    return { ...DEFAULT_PROGRESS };
  }
}

/**
 * Save progress to file
 * @param {Object} progress - Progress object to save
 */
export function saveProgress(progress) {
  try {
    const progressToSave = {
      ...progress,
      lastSaveTime: new Date().toISOString(),
    };

    writeFileSync(PROGRESS_FILE, JSON.stringify(progressToSave, null, 2));
    logger.debug(
      `Progress saved: ${progress.totalFollowed} users followed, page ${progress.currentPage}`
    );
  } catch (error) {
    logger.error(`Failed to save progress: ${error.message}`);
  }
}

/**
 * Initialize progress for a new session
 * @param {string} targetUsername - Target GitHub username
 * @param {string} mode - Mode (followers/following)
 * @param {number} sessionLimit - Session follow limit
 * @param {string} progressFile - Custom progress file name
 * @returns {Object} Initialized progress object
 */
export function initializeProgress(
  targetUsername,
  mode,
  sessionLimit,
  progressFile = "progress.json"
) {
  setProgressFile(progressFile);
  const existingProgress = loadProgress();

  // Check if this is a continuation of the same session
  const isSameSession =
    existingProgress.targetUsername === targetUsername &&
    existingProgress.mode === mode &&
    existingProgress.totalFollowed < existingProgress.sessionLimit;

  if (isSameSession) {
    logger.info(
      `Resuming previous session: ${existingProgress.totalFollowed}/${existingProgress.sessionLimit} follows completed`
    );
    return existingProgress;
  }

  // Start new session
  const newProgress = {
    ...DEFAULT_PROGRESS,
    targetUsername,
    mode,
    sessionLimit,
    startTime: new Date().toISOString(),
  };

  logger.info(`Starting new session for ${targetUsername}/${mode}`);
  saveProgress(newProgress);
  return newProgress;
}

/**
 * Add a followed user to progress
 * @param {Object} progress - Current progress object
 * @param {string} username - Username that was followed
 * @returns {Object} Updated progress object
 */
export function addFollowedUser(progress, username) {
  // Ensure followedUsers is always an array
  const followedUsers = Array.isArray(progress.followedUsers)
    ? progress.followedUsers
    : [];

  const updatedProgress = {
    ...progress,
    followedUsers: [...followedUsers, username],
    totalFollowed: progress.totalFollowed + 1,
  };

  // Save progress every 10 follows or immediately if close to session limit
  const shouldSave =
    updatedProgress.totalFollowed % 10 === 0 ||
    updatedProgress.totalFollowed >= updatedProgress.sessionLimit - 5;

  if (shouldSave) {
    saveProgress(updatedProgress);
  }

  return updatedProgress;
}

/**
 * Update current page in progress
 * @param {Object} progress - Current progress object
 * @param {number} page - New page number
 * @returns {Object} Updated progress object
 */
export function updateCurrentPage(progress, page) {
  const updatedProgress = {
    ...progress,
    currentPage: page,
  };

  saveProgress(updatedProgress);
  return updatedProgress;
}

/**
 * Check if user was already followed
 * @param {Object} progress - Current progress object
 * @param {string} username - Username to check
 * @returns {boolean} True if user was already followed
 */
export function isUserFollowed(progress, username) {
  // Ensure followedUsers exists and is an array
  if (!progress || !Array.isArray(progress.followedUsers)) {
    return false;
  }
  return progress.followedUsers.includes(username);
}

/**
 * Get session statistics
 * @param {Object} progress - Current progress object
 * @returns {Object} Session statistics
 */
export function getSessionStats(progress) {
  const startTime = progress.startTime
    ? new Date(progress.startTime)
    : new Date();
  const currentTime = new Date();
  const duration = currentTime - startTime;

  return {
    followed: progress.totalFollowed,
    limit: progress.sessionLimit,
    remaining: progress.sessionLimit - progress.totalFollowed,
    currentPage: progress.currentPage,
    duration: Math.round(duration / 1000), // seconds
    isComplete: progress.totalFollowed >= progress.sessionLimit,
  };
}

/**
 * Clear progress (start completely fresh)
 */
export function clearProgress() {
  try {
    if (existsSync(PROGRESS_FILE)) {
      writeFileSync(PROGRESS_FILE, JSON.stringify(DEFAULT_PROGRESS, null, 2));
      logger.info("Progress cleared");
    }
  } catch (error) {
    logger.error(`Failed to clear progress: ${error.message}`);
  }
}

/**
 * Get progress file path
 * @returns {string} Progress file path
 */
export function getProgressFilePath() {
  return PROGRESS_FILE;
}
