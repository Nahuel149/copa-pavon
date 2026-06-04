import { promises as fs } from "fs";
import path from "path";
import {
  validateResultStore,
  type KnockoutPrediction,
  type ResultStore,
  type Submission,
  type SubmissionStore,
} from "./prode";

const dataDir = process.env.PRODE_DATA_DIR ?? path.join(process.cwd(), "data");
const storePath = path.join(dataDir, "submissions.json");
const resultsPath = path.join(dataDir, "results.json");

async function ensureStoreFile() {
  await fs.mkdir(dataDir, { recursive: true });
  try {
    await fs.access(storePath);
  } catch {
    await fs.writeFile(storePath, JSON.stringify({ submissions: [] }, null, 2), "utf8");
  }
}

export async function readSubmissionStore(): Promise<SubmissionStore> {
  await ensureStoreFile();
  const raw = await fs.readFile(storePath, "utf8");
  const parsed = JSON.parse(raw) as SubmissionStore;
  return {
    submissions: Array.isArray(parsed.submissions)
      ? parsed.submissions.map((submission) => ({
          ...submission,
          groupPredictions: Array.isArray(submission.groupPredictions) ? submission.groupPredictions : [],
          knockoutPredictions: Array.isArray(submission.knockoutPredictions) ? submission.knockoutPredictions : [],
        }))
      : [],
  };
}

export async function appendSubmission(submission: Submission) {
  const store = await readSubmissionStore();
  if (store.submissions.some((item) => item.normalizedName === submission.normalizedName)) {
    return { ok: false as const, reason: "duplicate-name" };
  }

  store.submissions.push(submission);
  const tempPath = `${storePath}.tmp`;
  await fs.writeFile(tempPath, JSON.stringify(store, null, 2), "utf8");
  await fs.rename(tempPath, storePath);
  return { ok: true as const };
}

export async function appendKnockoutPredictions(normalizedName: string, predictions: KnockoutPrediction[]) {
  const store = await readSubmissionStore();
  const submission = store.submissions.find((item) => item.normalizedName === normalizedName);
  if (!submission) {
    return { ok: false as const, reason: "missing-submission" };
  }

  const existingFixtureIds = new Set((submission.knockoutPredictions ?? []).map((prediction) => prediction.fixtureId));
  const duplicateFixture = predictions.find((prediction) => existingFixtureIds.has(prediction.fixtureId));
  if (duplicateFixture) {
    return { ok: false as const, reason: "duplicate-fixture" };
  }

  submission.knockoutPredictions = [...(submission.knockoutPredictions ?? []), ...predictions];
  const tempPath = `${storePath}.tmp`;
  await fs.writeFile(tempPath, JSON.stringify(store, null, 2), "utf8");
  await fs.rename(tempPath, storePath);
  return { ok: true as const };
}

async function ensureResultsFile() {
  await fs.mkdir(dataDir, { recursive: true });
  try {
    await fs.access(resultsPath);
  } catch {
    await fs.writeFile(
      resultsPath,
      JSON.stringify({ matchResults: [], groupResults: [], knockoutFixtures: [], knockoutResults: [] }, null, 2),
      "utf8",
    );
  }
}

export async function readResultStore(): Promise<ResultStore> {
  await ensureResultsFile();
  const raw = await fs.readFile(resultsPath, "utf8");
  return validateResultStore(JSON.parse(raw));
}

export async function writeResultStore(results: ResultStore) {
  await ensureResultsFile();
  const safeResults = validateResultStore(results);
  const tempPath = `${resultsPath}.tmp`;
  await fs.writeFile(tempPath, JSON.stringify(safeResults, null, 2), "utf8");
  await fs.rename(tempPath, resultsPath);
  return safeResults;
}
