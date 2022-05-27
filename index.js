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
    const orderCollection = client.db("fixtool").collection("order");

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
        Endpoints For Order
    ============================*/
    // Create a new order
    app.post('/order', async (req, res) => {
      const order = req.body;
      
      // Update Product Product Quantity
      const filter = {_id: ObjectId(order.products_id)};
      const product = await productsCollection.findOne(filter);
      const options = {upsert: true};
      const newStock = parseInt(product.availableStock) - parseInt(order.order_quantity)
      const updateStock = {
        $set: {
          availableStock: newStock
        }
      }
      const productResult = await productsCollection.updateOne(filter, updateStock, options);

      const result = await orderCollection.insertOne(order);
      res.send(result);
    })

    // Get user order by there Email
    app.get('/my_order', async (req, res) => {
      const email = req.query.email;
      const query = {user_email: email};
      const cursor = orderCollection.find(query);
      const orders = await cursor.toArray();
      res.send(orders);
    });

    // For Delete order
    app.delete('/order/:id', async (req, res) => {
      const id = req.params.id;
      const orderFilter = {_id: ObjectId(id)};
      const order = await orderCollection.findOne(orderFilter);
      // Update Product Product Quantity
      const productFilter = {_id: ObjectId(order.products_id)};
      const product = await productsCollection.findOne(productFilter);
      const options = {upsert: true};
      const newStock = parseInt(product.availableStock) + parseInt(order.order_quantity)
      const updateStock = {
        $set: {
          availableStock: newStock
        }
      }
      const productResult = await productsCollection.updateOne(productFilter, updateStock, options);

      // Delate order
      const result = await orderCollection.deleteOne(orderFilter);
      res.send(result);
    })

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

    // Post Some Review
    app.post('/review', async (req, res) => {
      const review = req.body;
      const result = await reviewCollection.insertOne(review);
      res.send(result);
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