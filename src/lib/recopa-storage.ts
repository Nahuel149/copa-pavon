import { promises as fs } from "fs";
import path from "path";
import { MongoClient, type Collection, type Document } from "mongodb";
import {
  canonicalRecopaParticipant,
  recopaParticipants,
  type RecopaParticipantId,
  type RecopaScorePrediction,
  type RecopaStore,
} from "./recopa";
import { createPinHash, verifyPin } from "./pin";
import { normalizeName } from "./prode";
import { findSubmissionByNormalizedName } from "./storage";

const dataDir = process.env.PRODE_DATA_DIR ?? path.join(process.cwd(), "data");
const recopaFilePath = path.join(dataDir, "recopa.json");
const mongoUri = process.env.MONGODB_URI;
const mongoDbName = process.env.MONGODB_DB ?? "copa_kahl";
const recopaCollectionName = process.env.MONGODB_RECOPA_COLLECTION ?? "recopa";
const recopaDocumentId = "current";

let mongoClientPromise: Promise<MongoClient> | null = null;

function getMongoClient() {
  if (!mongoUri) return null;
  mongoClientPromise ??= new MongoClient(mongoUri).connect();
  return mongoClientPromise;
}

async function getMongoCollection(): Promise<Collection<Document> | null> {
  const clientPromise = getMongoClient();
  if (!clientPromise) return null;
  const db = (await clientPromise).db(mongoDbName);
  return db.collection<Document>(recopaCollectionName);
}

const defaultStore: RecopaStore = {
  submissions: [],
  results: [],
};

async function ensureRecopaFile() {
  await fs.mkdir(dataDir, { recursive: true });
  try {
    await fs.access(recopaFilePath);
  } catch {
    await fs.writeFile(recopaFilePath, JSON.stringify(defaultStore, null, 2), "utf8");
  }
}

export async function readRecopaStore(): Promise<RecopaStore> {
  const collection = await getMongoCollection();
  if (collection) {
    const doc = await collection.findOne({ _id: recopaDocumentId } as Document);
    if (!doc) return defaultStore;
    return {
      submissions: Array.isArray(doc.submissions) ? doc.submissions : [],
      results: Array.isArray(doc.results) ? doc.results : [],
    };
  }

  await ensureRecopaFile();
  try {
    const raw = await fs.readFile(recopaFilePath, "utf8");
    const parsed = JSON.parse(raw) as Partial<RecopaStore>;
    return {
      submissions: Array.isArray(parsed.submissions) ? parsed.submissions : [],
      results: Array.isArray(parsed.results) ? parsed.results : [],
    };
  } catch {
    return defaultStore;
  }
}

export async function writeRecopaStore(store: RecopaStore): Promise<RecopaStore> {
  const collection = await getMongoCollection();
  if (collection) {
    await collection.replaceOne(
      { _id: recopaDocumentId } as Document,
      { _id: recopaDocumentId, submissions: store.submissions, results: store.results } as Document,
      { upsert: true },
    );
    return store;
  }

  await ensureRecopaFile();
  const tempPath = `${recopaFilePath}.tmp`;
  await fs.writeFile(tempPath, JSON.stringify(store, null, 2), "utf8");
  await fs.rename(tempPath, recopaFilePath);
  return store;
}
export async function saveRecopaPredictions(
  participantInput: string,
  predictions: RecopaScorePrediction[],
  pin?: string,
): Promise<{ ok: true; submission: RecopaStore["submissions"][number] } | { ok: false; error: string }> {
  const participantId = canonicalRecopaParticipant(participantInput);
  if (!participantId) {
    return {
      ok: false,
      error: "La Recopa Fiss Kahl es exclusiva para Gonza el + Fachero. y Javier.",
    };
  }

  const store = await readRecopaStore();
  const existingIndex = store.submissions.findIndex((s) => s.participant === participantId);
  const existingSubmission = existingIndex !== -1 ? store.submissions[existingIndex] : null;

  // Search main prode store for participant's registered PIN hash
  const participantDef = recopaParticipants.find((p) => p.id === participantId);
  let mainPinHash: string | undefined = undefined;

  if (participantDef) {
    for (const alias of participantDef.aliases) {
      const mainSub = await findSubmissionByNormalizedName(normalizeName(alias));
      if (mainSub?.pinHash) {
        mainPinHash = mainSub.pinHash;
        break;
      }
    }
  }

  const activePinHash = existingSubmission?.pinHash ?? mainPinHash;

  if (activePinHash) {
    if (!pin || !pin.trim()) {
      return { ok: false, error: "Tu usuario tiene un PIN guardado. Ingresá tu PIN para guardar el pronóstico." };
    }
    if (!verifyPin(pin, activePinHash)) {
      return { ok: false, error: "El PIN es incorrecto. Usá el mismo PIN con el que accedés a la página de pronósticos." };
    }
  }

  let pinHash = activePinHash;
  if (pin && !pinHash) {
    if (!/^\d{4,10}$/.test(pin.trim())) {
      return { ok: false, error: "El PIN tiene que tener entre 4 y 10 números." };
    }
    pinHash = createPinHash(pin.trim());
  }

  const nextSubmission = {
    participant: participantId,
    ...(pinHash ? { pinHash } : {}),
    updatedAt: new Date().toISOString(),
    predictions,
  };

  if (existingIndex !== -1) {
    store.submissions[existingIndex] = nextSubmission;
  } else {
    store.submissions.push(nextSubmission);
  }

  await writeRecopaStore(store);
  return { ok: true, submission: nextSubmission };
}

export async function saveRecopaResults(
  results: RecopaStore["results"],
): Promise<{ ok: true; results: RecopaStore["results"] } | { ok: false; error: string }> {
  const store = await readRecopaStore();
  store.results = results;
  await writeRecopaStore(store);
  return { ok: true, results };
}
