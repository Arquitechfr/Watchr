import { MongoMemoryServer } from "mongodb-memory-server";
import { connectDatabase, disconnectDatabase } from "../src/lib/database.js";

let mongod: MongoMemoryServer;

export async function setup() {
  mongod = await MongoMemoryServer.create();
  await connectDatabase(mongod.getUri());
}

export async function teardown() {
  await disconnectDatabase();
  if (mongod) {
    await mongod.stop();
  }
}
