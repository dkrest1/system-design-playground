const express = require('express');
const { Pool } = require('pg');

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

// Function to create table if it does not exist
async function createTable(pool) {
  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS my_table (
      id SERIAL PRIMARY KEY,
      data TEXT
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

initialize();

app.post('/data', async (req, res) => {
  const { id, data } = req.body;
  const pool = id <= 4 ? pool1 : pool2;
  try {
    const result = await pool.query('INSERT INTO my_table (id, data) VALUES ($1, $2) RETURNING *', [id, data]);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.get('/data/:id', async (req, res) => {
  const { id } = req.params;
  const pool = id <= 4 ? pool1 : pool2;
  try {
    const result = await pool.query('SELECT * FROM my_table WHERE id = $1', [id]);
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