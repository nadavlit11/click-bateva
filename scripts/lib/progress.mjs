/**
 * Resume-state management for the enrichment pipeline.
 *
 * Tracks completed/failed POIs so interrupted runs can pick up where they left off.
 * State is persisted to a JSON file in scripts/output/.
 */

import { readFileSync, writeFileSync, existsSync } from "fs";

const STATE_PATH = new URL("../output/enrichment-progress.json", import.meta.url).pathname;

const EMPTY_STATE = {
  startedAt: null,
  completedIds: [],
  failed: {},
  totalPois: 0,
};

export function loadProgress() {
  if (!existsSync(STATE_PATH)) return { ...EMPTY_STATE };
  try {
    return JSON.parse(readFileSync(STATE_PATH, "utf8"));
  } catch {
    return { ...EMPTY_STATE };
  }
}

export function saveProgress(state) {
  writeFileSync(STATE_PATH, JSON.stringify(state, null, 2));
}

export function markCompleted(state, poiId) {
  if (!state.completedIds.includes(poiId)) {
    state.completedIds.push(poiId);
  }
  delete state.failed[poiId];
  saveProgress(state);
}

export function markFailed(state, poiId, reason) {
  state.failed[poiId] = reason;
  saveProgress(state);
}

export function isAlreadyProcessed(state, poiId) {
  return state.completedIds.includes(poiId) || poiId in state.failed;
}
