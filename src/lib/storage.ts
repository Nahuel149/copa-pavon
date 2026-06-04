import { promises as fs } from "fs";
import path from "path";
import { MongoClient, type Collection, type Db, type Document, type WithId } from "mongodb";
import {
  defaultClan,
  parseClan,
  validateResultStore,
  type KnockoutPrediction,
  type ResultStore,
  type Submission,
  type SubmissionStore,
} from "./prode";

const dataDir = process.env.PRODE_DATA_DIR ?? path.join(process.cwd(), "data");
const storePath = path.join(dataDir, "submissions.json");
const resultsPath = path.join(dataDir, "results.json");
const mongoUri = process.env.MONGODB_URI;
const mongoDbName = process.env.MONGODB_DB ?? "copa_kahl";
const submissionsCollectionName = process.env.MONGODB_SUBMISSIONS_COLLECTION ?? "submissions";
const resultsCollectionName = process.env.MONGODB_RESULTS_COLLECTION ?? "results";
const resultsDocumentId = "current";

type MongoSubmission = Submission & Document;
type MongoResultDocument = ResultStore & { _id: string };

let mongoClientPromise: Promise<MongoClient> | null = null;
let indexesReady = false;

function getMongoClient() {
  if (!mongoUri) return null;
  mongoClientPromise ??= new MongoClient(mongoUri).connect();
  return mongoClientPromise;
}

async function getMongoDb(): Promise<Db | null> {
  const clientPromise = getMongoClient();
  if (!clientPromise) return null;
  return (await clientPromise).db(mongoDbName);
}

async function getMongoCollections(): Promise<{
  submissions: Collection<MongoSubmission>;
  results: Collection<Document>;
} | null> {
  const db = await getMongoDb();
  if (!db) return null;
  const submissions = db.collection<MongoSubmission>(submissionsCollectionName);
  const results = db.collection<Document>(resultsCollectionName);
  if (!indexesReady) {
    await submissions.createIndex({ normalizedName: 1 }, { unique: true, name: "unique_normalized_name" });
    await submissions.createIndex({ clan: 1, createdAt: -1 }, { name: "clan_created_at" });
    indexesReady = true;
  }
  return { submissions, results };
}

function cleanSubmission(submission: WithId<MongoSubmission> | MongoSubmission): Submission {
  return {
    id: submission.id,
    name: submission.name,
    normalizedName: submission.normalizedName,
    clan: parseClan(submission.clan),
    createdAt: submission.createdAt,
    predictions: Array.isArray(submission.predictions) ? submission.predictions : [],
    groupPredictions: Array.isArray(submission.groupPredictions) ? submission.groupPredictions : [],
    knockoutPredictions: Array.isArray(submission.knockoutPredictions) ? submission.knockoutPredictions : [],
  };
}

async function ensureStoreFile() {
  await fs.mkdir(dataDir, { recursive: true });
  try {
    await fs.access(storePath);
  } catch {
    await fs.writeFile(storePath, JSON.stringify({ submissions: [] }, null, 2), "utf8");
  }
}

export async function readSubmissionStore(): Promise<SubmissionStore> {
  const collections = await getMongoCollections();
  if (collections) {
    const submissions = await collections.submissions.find({}).sort({ createdAt: -1 }).toArray();
    return { submissions: submissions.map(cleanSubmission) };
  }

  await ensureStoreFile();
  const raw = await fs.readFile(storePath, "utf8");
  const parsed = JSON.parse(raw) as SubmissionStore;
  return {
    submissions: Array.isArray(parsed.submissions)
      ? parsed.submissions.map((submission) => ({
          ...submission,
          clan: parseClan(submission.clan),
          groupPredictions: Array.isArray(submission.groupPredictions) ? submission.groupPredictions : [],
          knockoutPredictions: Array.isArray(submission.knockoutPredictions) ? submission.knockoutPredictions : [],
        }))
      : [],
  };
}

export async function appendSubmission(submission: Submission) {
  const collections = await getMongoCollections();
  if (collections) {
    try {
      await collections.submissions.insertOne({ ...submission, clan: submission.clan ?? defaultClan });
      return { ok: true as const };
    } catch (error) {
      if (error && typeof error === "object" && "code" in error && error.code === 11000) {
        return { ok: false as const, reason: "duplicate-name" };
      }
      throw error;
    }
  }

  const store = await readSubmissionStore();
  submission.clan = submission.clan ?? defaultClan;
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
  const collections = await getMongoCollections();
  if (collections) {
    const submission = await collections.submissions.findOne({ normalizedName });
    if (!submission) {
      return { ok: false as const, reason: "missing-submission" };
    }

    const existingFixtureIds = new Set((submission.knockoutPredictions ?? []).map((prediction) => prediction.fixtureId));
    const duplicateFixture = predictions.find((prediction) => existingFixtureIds.has(prediction.fixtureId));
    if (duplicateFixture) {
      return { ok: false as const, reason: "duplicate-fixture" };
    }

    await collections.submissions.updateOne(
      { normalizedName },
      { $push: { knockoutPredictions: { $each: predictions } } } as Document,
    );
    return { ok: true as const };
  }

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
  const collections = await getMongoCollections();
  if (collections) {
    const result = await collections.results.findOne({ _id: resultsDocumentId } as Document);
    if (!result) {
      return { matchResults: [], groupResults: [], knockoutFixtures: [], knockoutResults: [] };
    }
    return validateResultStore(result as unknown as MongoResultDocument);
  }

  await ensureResultsFile();
  const raw = await fs.readFile(resultsPath, "utf8");
  return validateResultStore(JSON.parse(raw));
}

export async function writeResultStore(results: ResultStore) {
  const collections = await getMongoCollections();
  if (collections) {
    const safeResults = validateResultStore(results);
    await collections.results.replaceOne(
      { _id: resultsDocumentId } as Document,
      { _id: resultsDocumentId, ...safeResults } as Document,
      { upsert: true },
    );
    return safeResults;
  }

  await ensureResultsFile();
  const safeResults = validateResultStore(results);
  const tempPath = `${resultsPath}.tmp`;
  await fs.writeFile(tempPath, JSON.stringify(safeResults, null, 2), "utf8");
  await fs.rename(tempPath, resultsPath);
  return safeResults;
}
