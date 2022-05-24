const express = require('express');
const { MongoClient, ServerApiVersion, MongoRuntimeError, Admin } = require('mongodb');
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('FixTool Manufacturer Ltd Api');
})

app.listen(port, () => {
  console.log(`FixTool Manufacturer Ltd listening on port ${port}`)
})