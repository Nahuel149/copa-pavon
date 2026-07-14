import { promises as fs } from "fs";
import path from "path";
import { MongoClient, type Collection, type Db, type Document, type WithId } from "mongodb";
import {
  defaultClan,
  parseClan,
  validateResultStore,
  type AppSettings,
  type KnockoutPrediction,
  type ResultStore,
  type Submission,
  type SubmissionStore,
} from "./prode";
import {
  emptyTablaCommentReactions,
  normalizeTablaCommentReactions,
  type TablaCommentReactions,
  type TablaReactionEmoji,
} from "./comment-reactions";

const dataDir = process.env.PRODE_DATA_DIR ?? path.join(process.cwd(), "data");
const storePath = path.join(dataDir, "submissions.json");
const resultsPath = path.join(dataDir, "results.json");
const settingsPath = path.join(dataDir, "settings.json");
const auditPath = path.join(dataDir, "audit-log.json");
const commentsPath = path.join(dataDir, "comments.json");
const mongoUri = process.env.MONGODB_URI;
const mongoDbName = process.env.MONGODB_DB ?? "copa_kahl";
const submissionsCollectionName = process.env.MONGODB_SUBMISSIONS_COLLECTION ?? "submissions";
const resultsCollectionName = process.env.MONGODB_RESULTS_COLLECTION ?? "results";
const settingsCollectionName = process.env.MONGODB_SETTINGS_COLLECTION ?? "settings";
const auditCollectionName = process.env.MONGODB_AUDIT_COLLECTION ?? "auditLog";
const commentsCollectionName = process.env.MONGODB_COMMENTS_COLLECTION ?? "comments";
const resultsDocumentId = "current";
const settingsDocumentId = "current";

const defaultSettings: AppSettings = {
  submissionsOpen: false,
};

type MongoSubmission = Submission & Document;
type MongoResultDocument = ResultStore & { _id: string };
type MongoSettingsDocument = AppSettings & { _id: string };

export type AuditEvent = {
  id: string;
  type: string;
  actor: string;
  message: string;
  createdAt: string;
  meta?: Record<string, unknown>;
};

export type TablaComment = {
  id: string;
  name: string;
  comment: string;
  createdAt: string;
  reactions: TablaCommentReactions;
};

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
  settings: Collection<Document>;
  audit: Collection<Document>;
  comments: Collection<Document>;
} | null> {
  const db = await getMongoDb();
  if (!db) return null;
  const submissions = db.collection<MongoSubmission>(submissionsCollectionName);
  const results = db.collection<Document>(resultsCollectionName);
  const settings = db.collection<Document>(settingsCollectionName);
  const audit = db.collection<Document>(auditCollectionName);
  const comments = db.collection<Document>(commentsCollectionName);
  if (!indexesReady) {
    await submissions.createIndex({ normalizedName: 1 }, { unique: true, name: "unique_normalized_name" });
    await submissions.createIndex({ clan: 1, createdAt: -1 }, { name: "clan_created_at" });
    indexesReady = true;
  }
  return { submissions, results, settings, audit, comments };
}

function cleanSettings(settings: Partial<AppSettings> | null | undefined): AppSettings {
  return {
    submissionsOpen: settings?.submissionsOpen === true,
    updatedAt: typeof settings?.updatedAt === "string" ? settings.updatedAt : undefined,
  };
}

function cleanSubmission(submission: WithId<MongoSubmission> | MongoSubmission): Submission {
  return {
    id: submission.id,
    name: submission.name,
    normalizedName: submission.normalizedName,
    clan: parseClan(submission.clan),
    pinHash: typeof submission.pinHash === "string" ? submission.pinHash : undefined,
    createdAt: submission.createdAt,
    updatedAt: typeof submission.updatedAt === "string" ? submission.updatedAt : undefined,
    predictions: Array.isArray(submission.predictions) ? submission.predictions : [],
    groupPredictions: Array.isArray(submission.groupPredictions) ? submission.groupPredictions : [],
    knockoutPredictions: Array.isArray(submission.knockoutPredictions) ? submission.knockoutPredictions : [],
  };
}

export function publicSubmission(submission: Submission): Omit<Submission, "pinHash"> {
  const { pinHash: _pinHash, ...safeSubmission } = submission;
  return safeSubmission;
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
          pinHash: typeof submission.pinHash === "string" ? submission.pinHash : undefined,
          updatedAt: typeof submission.updatedAt === "string" ? submission.updatedAt : undefined,
          groupPredictions: Array.isArray(submission.groupPredictions) ? submission.groupPredictions : [],
          knockoutPredictions: Array.isArray(submission.knockoutPredictions) ? submission.knockoutPredictions : [],
        }))
      : [],
  };
}

export async function writeSubmissionStore(store: SubmissionStore) {
  const submissions = store.submissions.map((submission) => ({
    ...submission,
    clan: parseClan(submission.clan),
    predictions: Array.isArray(submission.predictions) ? submission.predictions : [],
    groupPredictions: Array.isArray(submission.groupPredictions) ? submission.groupPredictions : [],
    knockoutPredictions: Array.isArray(submission.knockoutPredictions) ? submission.knockoutPredictions : [],
  }));
  const normalizedNames = submissions.map((submission) => submission.normalizedName);
  if (new Set(normalizedNames).size !== normalizedNames.length) {
    throw new Error("El backup contiene participantes duplicados.");
  }

  const collections = await getMongoCollections();
  if (collections) {
    await collections.submissions.deleteMany({});
    if (submissions.length > 0) await collections.submissions.insertMany(submissions);
    return { submissions };
  }

  await ensureStoreFile();
  const tempPath = `${storePath}.tmp`;
  await fs.writeFile(tempPath, JSON.stringify({ submissions }, null, 2), "utf8");
  await fs.rename(tempPath, storePath);
  return { submissions };
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

    const nextPredictions = [
      ...(submission.knockoutPredictions ?? []).filter(
        (prediction) => !predictions.some((nextPrediction) => nextPrediction.fixtureId === prediction.fixtureId),
      ),
      ...predictions,
    ];

    await collections.submissions.updateOne(
      { normalizedName },
      { $set: { knockoutPredictions: nextPredictions, updatedAt: new Date().toISOString() } } as Document,
    );
    return { ok: true as const };
  }

  const store = await readSubmissionStore();
  const submission = store.submissions.find((item) => item.normalizedName === normalizedName);
  if (!submission) {
    return { ok: false as const, reason: "missing-submission" };
  }

  submission.knockoutPredictions = [
    ...(submission.knockoutPredictions ?? []).filter(
      (prediction) => !predictions.some((nextPrediction) => nextPrediction.fixtureId === prediction.fixtureId),
    ),
    ...predictions,
  ];
  submission.updatedAt = new Date().toISOString();
  const tempPath = `${storePath}.tmp`;
  await fs.writeFile(tempPath, JSON.stringify(store, null, 2), "utf8");
  await fs.rename(tempPath, storePath);
  return { ok: true as const };
}

export async function findSubmissionByNormalizedName(normalizedName: string) {
  const collections = await getMongoCollections();
  if (collections) {
    const submission = await collections.submissions.findOne({ normalizedName });
    return submission ? cleanSubmission(submission) : null;
  }

  const store = await readSubmissionStore();
  return store.submissions.find((submission) => submission.normalizedName === normalizedName) ?? null;
}

export async function updateSubmissionPredictions(submission: Submission) {
  const updates = {
    name: submission.name,
    clan: parseClan(submission.clan),
    predictions: submission.predictions,
    groupPredictions: submission.groupPredictions,
    updatedAt: new Date().toISOString(),
  };
  const collections = await getMongoCollections();
  if (collections) {
    await collections.submissions.updateOne({ normalizedName: submission.normalizedName }, { $set: updates });
    return { ok: true as const, updatedAt: updates.updatedAt };
  }

  const store = await readSubmissionStore();
  const index = store.submissions.findIndex((item) => item.normalizedName === submission.normalizedName);
  if (index === -1) return { ok: false as const, reason: "missing-submission" };
  store.submissions[index] = { ...store.submissions[index], ...updates };
  const tempPath = `${storePath}.tmp`;
  await fs.writeFile(tempPath, JSON.stringify(store, null, 2), "utf8");
  await fs.rename(tempPath, storePath);
  return { ok: true as const, updatedAt: updates.updatedAt };
}

export async function updateSubmissionPinHash(normalizedName: string, pinHash: string) {
  const updatedAt = new Date().toISOString();
  const collections = await getMongoCollections();
  if (collections) {
    const result = await collections.submissions.updateOne({ normalizedName }, { $set: { pinHash, updatedAt } });
    if (result.matchedCount === 0) return null;
    const updatedSubmission = await collections.submissions.findOne({ normalizedName });
    return updatedSubmission ? cleanSubmission(updatedSubmission) : null;
  }

  const store = await readSubmissionStore();
  const index = store.submissions.findIndex((submission) => submission.normalizedName === normalizedName);
  if (index === -1) return null;
  store.submissions[index] = { ...store.submissions[index], pinHash, updatedAt };
  const tempPath = `${storePath}.tmp`;
  await fs.writeFile(tempPath, JSON.stringify(store, null, 2), "utf8");
  await fs.rename(tempPath, storePath);
  return store.submissions[index];
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

async function ensureSettingsFile() {
  await fs.mkdir(dataDir, { recursive: true });
  try {
    await fs.access(settingsPath);
  } catch {
    await fs.writeFile(settingsPath, JSON.stringify(defaultSettings, null, 2), "utf8");
  }
}

export async function readAppSettings(): Promise<AppSettings> {
  const collections = await getMongoCollections();
  if (collections) {
    const settings = await collections.settings.findOne({ _id: settingsDocumentId } as Document);
    return cleanSettings(settings as unknown as MongoSettingsDocument | null);
  }

  await ensureSettingsFile();
  const raw = await fs.readFile(settingsPath, "utf8");
  return cleanSettings(JSON.parse(raw) as Partial<AppSettings>);
}

export async function writeAppSettings(settings: AppSettings) {
  const nextSettings = cleanSettings({ ...settings, updatedAt: new Date().toISOString() });
  const collections = await getMongoCollections();
  if (collections) {
    await collections.settings.replaceOne(
      { _id: settingsDocumentId } as Document,
      { _id: settingsDocumentId, ...nextSettings } as Document,
      { upsert: true },
    );
    return nextSettings;
  }

  await ensureSettingsFile();
  const tempPath = `${settingsPath}.tmp`;
  await fs.writeFile(tempPath, JSON.stringify(nextSettings, null, 2), "utf8");
  await fs.rename(tempPath, settingsPath);
  return nextSettings;
}

async function ensureAuditFile() {
  await fs.mkdir(dataDir, { recursive: true });
  try {
    await fs.access(auditPath);
  } catch {
    await fs.writeFile(auditPath, JSON.stringify({ events: [] }, null, 2), "utf8");
  }
}

export async function appendAuditEvent(event: Omit<AuditEvent, "id" | "createdAt">) {
  const entry: AuditEvent = {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    createdAt: new Date().toISOString(),
    ...event,
  };
  const collections = await getMongoCollections();
  if (collections) {
    await collections.audit.insertOne(entry as Document);
    return entry;
  }

  await ensureAuditFile();
  const raw = await fs.readFile(auditPath, "utf8");
  const store = JSON.parse(raw) as { events?: AuditEvent[] };
  const events = Array.isArray(store.events) ? store.events : [];
  events.unshift(entry);
  await fs.writeFile(auditPath, JSON.stringify({ events: events.slice(0, 300) }, null, 2), "utf8");
  return entry;
}

export async function readAuditEvents(limit = 80) {
  const collections = await getMongoCollections();
  if (collections) {
    const events = await collections.audit.find({}).sort({ createdAt: -1 }).limit(limit).toArray();
    return events.map((event) => ({
      id: String(event.id ?? event._id),
      type: String(event.type ?? "event"),
      actor: String(event.actor ?? "admin"),
      message: String(event.message ?? ""),
      createdAt: String(event.createdAt ?? new Date().toISOString()),
      meta: event.meta && typeof event.meta === "object" ? (event.meta as Record<string, unknown>) : undefined,
    }));
  }

  await ensureAuditFile();
  const raw = await fs.readFile(auditPath, "utf8");
  const store = JSON.parse(raw) as { events?: AuditEvent[] };
  return (Array.isArray(store.events) ? store.events : []).slice(0, limit);
}

async function ensureCommentsFile() {
  await fs.mkdir(dataDir, { recursive: true });
  try {
    await fs.access(commentsPath);
  } catch {
    await fs.writeFile(commentsPath, JSON.stringify({ comments: [] }, null, 2), "utf8");
  }
}

function cleanComment(comment: Document | TablaComment): TablaComment {
  return {
    id: String(comment.id ?? ("_id" in comment ? comment._id : `${Date.now()}`)),
    name: String(comment.name ?? "").trim().replace(/\s+/g, " ").slice(0, 40),
    comment: String(comment.comment ?? "").trim().replace(/\s+/g, " ").slice(0, 240),
    createdAt: typeof comment.createdAt === "string" ? comment.createdAt : new Date().toISOString(),
    reactions: normalizeTablaCommentReactions(comment.reactions),
  };
}

export async function readTablaComments(limit?: number) {
  const collections = await getMongoCollections();
  if (collections) {
    const query = collections.comments.find({}).sort({ createdAt: -1 });
    const comments = typeof limit === "number" ? await query.limit(limit).toArray() : await query.toArray();
    return comments.map(cleanComment).filter((comment) => comment.name && comment.comment);
  }

  await ensureCommentsFile();
  const raw = await fs.readFile(commentsPath, "utf8");
  const store = JSON.parse(raw) as { comments?: TablaComment[] };
  const comments = (Array.isArray(store.comments) ? store.comments : []).map(cleanComment).filter((comment) => comment.name && comment.comment);
  return typeof limit === "number" ? comments.slice(0, limit) : comments;
}

export async function appendTablaComment(input: { name: string; comment: string }) {
  const entry: TablaComment = {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    name: input.name.trim().replace(/\s+/g, " ").slice(0, 40),
    comment: input.comment.trim().replace(/\s+/g, " ").slice(0, 240),
    createdAt: new Date().toISOString(),
    reactions: emptyTablaCommentReactions(),
  };
  const collections = await getMongoCollections();
  if (collections) {
    await collections.comments.insertOne(entry as Document);
    return entry;
  }

  await ensureCommentsFile();
  const raw = await fs.readFile(commentsPath, "utf8");
  const store = JSON.parse(raw) as { comments?: TablaComment[] };
  const comments = Array.isArray(store.comments) ? store.comments : [];
  comments.unshift(entry);
  await fs.writeFile(commentsPath, JSON.stringify({ comments }, null, 2), "utf8");
  return entry;
}

export async function addTablaCommentReaction(commentId: string, reaction: TablaReactionEmoji) {
  const collections = await getMongoCollections();
  if (collections) {
    const comment = await collections.comments.findOneAndUpdate(
      { id: commentId },
      { $inc: { [`reactions.${reaction}`]: 1 } } as Document,
      { returnDocument: "after" },
    );
    return comment ? cleanComment(comment) : null;
  }

  await ensureCommentsFile();
  const raw = await fs.readFile(commentsPath, "utf8");
  const store = JSON.parse(raw) as { comments?: TablaComment[] };
  const comments = Array.isArray(store.comments) ? store.comments.map(cleanComment) : [];
  const index = comments.findIndex((comment) => comment.id === commentId);
  if (index === -1) return null;

  const comment = comments[index];
  const reactions = { ...comment.reactions, [reaction]: comment.reactions[reaction] + 1 };
  const updated = { ...comment, reactions };
  comments[index] = updated;
  await fs.writeFile(commentsPath, JSON.stringify({ comments }, null, 2), "utf8");
  return updated;
}

export async function writeTablaComments(comments: TablaComment[]) {
  const safeComments = comments.map((comment) => cleanComment(comment)).filter((comment) => comment.name && comment.comment);
  const collections = await getMongoCollections();
  if (collections) {
    await collections.comments.deleteMany({});
    if (safeComments.length > 0) await collections.comments.insertMany(safeComments as Document[]);
    return safeComments;
  }

  await ensureCommentsFile();
  const tempPath = `${commentsPath}.tmp`;
  await fs.writeFile(tempPath, JSON.stringify({ comments: safeComments }, null, 2), "utf8");
  await fs.rename(tempPath, commentsPath);
  return safeComments;
}
