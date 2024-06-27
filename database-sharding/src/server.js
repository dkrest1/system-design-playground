const express = require('express');
const { Pool } = require('pg');
const {v4: uuiv4} = require("uuid")
const crypto = require("crypto")

// Load environment variables from .env file
require('dotenv').config();

const app = express();

app.use(express.json());

const pool1 = new Pool({
  user: process.env.DB1_USER,
  host: process.env.DB1_HOST,
  database: process.env.DB1_DATABASE,
  password: process.env.DB1_PASSWORD,
  port: process.env.DB1_PORT,
});

const pool2 = new Pool({
  user: process.env.DB2_USER,
  host: process.env.DB2_HOST,
  database: process.env.DB2_DATABASE,
  password: process.env.DB2_PASSWORD,
  port: process.env.DB2_PORT,
});

// create table if it does not exist
async function createTable(pool) {
  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY,
      name VARCHAR(255),
      age INT,
      sex VARCHAR(10)
    );
  `;
  try {
    const client = await pool.connect();
    await client.query(createTableQuery);
    console.log('Table created successfully');
    client.release();
  } catch (err) {
    console.error('Error creating table:', err);
  }
}

// Create tables on application startup
async function initialize() {
  try {
    await createTable(pool1);
    await createTable(pool2);
  } catch (err) {
    console.error('Initialization error:', err);
    process.exit(1); // Exit the process on error
  }
}

// intialize database
initialize();

// number of shards
const numberOfShards = 2

// function to determine which pool to use based on userId
function getShard(userId) {
  // const hash = crypto.createHash('sha256').update(userId).digest('hex')
  // console.log(hash, "hash")
  // const result =  parseInt(hash, 16) % numberOfShards
  // console.log(result, "result")
  // return result === 0 ? pool1 : pool2

  const hash = userId.charCodeAt(userId.length - 1);
  const result = hash % numberOfShards
  return result === 0 ? pool1 : pool2;
}


app.post('/users', async (req, res) => {
  const { name, age, sex } = req.body;
  // generate a unique userId
  const userId = uuiv4()
  const pool = getShard(userId)
  try {
    const result = await pool.query('INSERT INTO users (id, name, age, sex) VALUES ($1, $2, $3, $4) RETURNING *', [userId, name, age, sex]);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// get all users
app.get('/users', async (req, res) => {
  try {
    const result1 = await pool1.query('SELECT * FROM users');
    const result2 = await pool2.query('SELECT * FROM users');
    const users = [...result1.rows, ...result2.rows];
    res.status(200).json(users);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

//  get a single user
app.get('/users/:userId', async (req, res) => {
  const { userId } = req.params;
  // get the shard to use
  const pool = getShard(userId);

  try {
    const result = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
    res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});