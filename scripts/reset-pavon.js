const { MongoClient } = require("mongodb");
const fs = require("fs");
const path = require("path");

const uri = process.env.MONGODB_URI || "mongodb+srv://renderfinatech_db_user:w4SrWEacidJzZjFv@cluster0.tmfthle.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";
const dbName = process.env.MONGODB_DB || "copa_kahl";

async function main() {
  console.log("Conectando a MongoDB...");
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db(dbName);
    const subResult = await db.collection("submissions").deleteMany({});
    console.log(`MongoDB: Eliminadas ${subResult.deletedCount} inscripciones/pronósticos.`);
    const resResult = await db.collection("results").deleteMany({});
    console.log(`MongoDB: Eliminados ${resResult.deletedCount} resultados.`);
  } catch (err) {
    console.error("Error en MongoDB:", err);
  } finally {
    await client.close();
  }

  const dataDir = path.join(__dirname, "../data");
  fs.mkdirSync(dataDir, { recursive: true });
  fs.writeFileSync(path.join(dataDir, "submissions.json"), JSON.stringify({ submissions: [] }, null, 2), "utf8");
  fs.writeFileSync(path.join(dataDir, "results.json"), JSON.stringify({ matchResults: [], groupResults: [], knockoutFixtures: [], knockoutResults: [] }, null, 2), "utf8");
  console.log("Archivos JSON locales reiniciados a 0.");
}

main();
