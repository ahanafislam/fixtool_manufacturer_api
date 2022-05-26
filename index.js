const express = require('express');
const { MongoClient, ServerApiVersion, ObjectId, MongoRuntimeError, Admin } = require('mongodb');
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.qhpbi.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run() {
  try {
    await client.connect();
    const productsCollection = client.db("fixtool").collection("products");
    const reviewCollection = client.db("fixtool").collection("review");

    /*==========================
        Endpoints For Products
    ============================*/
    
    // Get All Products
    app.get('/products', async (req, res) => {
        const query = {};
        const cursor = productsCollection.find(query);
        const products = await cursor.toArray();
        res.send(products);
    });

    // Get Product Detail
    app.get('/products/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const productDetails = await productsCollection.findOne(query);
      res.send(productDetails);
    });

    /*==========================
        Endpoints For Review
    ============================*/
    
    // Get All Review
    app.get('/review', async (req, res) => {
      const query = {};
      const cursor = reviewCollection.find(query);
      const review = await cursor.toArray();
      res.send(review);
  });

  }
  finally {

  }
}

run().catch(console.dir);

app.get('/', (req, res) => {
  res.send('FixTool Manufacturer Ltd Api');
})

app.listen(port, () => {
  console.log(`FixTool Manufacturer Ltd listening on port ${port}`)
})