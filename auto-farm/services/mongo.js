const { MongoClient } = require('mongodb');
const { MONGO_URI, DB_NAME } = require('../config/constants');

let db;

async function connectToMongo() {
  const client = new MongoClient(MONGO_URI);
  await client.connect();
  db = client.db(DB_NAME);
  console.log('📦 MongoDB conectado');
}

function getDb() {
  if (!db) throw new Error('Banco de dados não conectado.');
  return db;
}

module.exports = { connectToMongo, getDb };
