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

const verifyJWT = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).send({ status: 401, message: 'UnAuthorized' });
  }
  const token = authHeader.split(' ')[1];
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
    if (err) {
      return res.status(403).send({ status: 403, message: 'Forbidden Access' });
    }
    req.decoded = decoded;
    next();
  });
}

async function run() {
  try {
    await client.connect();
    const productsCollection = client.db("fixtool").collection("products");
    const reviewCollection = client.db("fixtool").collection("review");
    const orderCollection = client.db("fixtool").collection("order");
    const usersCollection = client.db("fixtool").collection("users");

    // Check admin access
    const verifyAdmin = async (req, res, next) => {
      const requester = req.decoded.email;
      const requesterAccount = await usersCollection.findOne({ email: requester });
      if (requesterAccount.role === 'admin') {
        next();
      }
      else {
        res.status(403).send({ message: 'forbidden' });
      }
    }

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

    // Add product endpoint
    app.post('/products', verifyJWT, verifyAdmin, async (req, res) => {
      const product = req.body;
      const result = await productsCollection.insertOne(product);
      res.send(result);
    })

    // Delate all product endpoint
    app.delete('/products/:id', verifyJWT, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const filter = {_id: ObjectId(id)};
      const result = await productsCollection.deleteOne(filter);
      res.send(result);
    })

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
    app.get('/my_order', verifyJWT, async (req, res) => {
      const decodedEmail = req.decoded.email;
      const email = req.query.email;
      if(email === decodedEmail) {
        const query = {user_email: email};
        const cursor = orderCollection.find(query);
        const orders = await cursor.toArray();
        return res.send(orders);
      }
      else {
        return res.status(403).send({status: 403, message: 'forbidden access' });
      }
    });

    // Get All order
    app.get('/order', verifyJWT, verifyAdmin, async (req, res) => {
      const query = {};
      const cursor = orderCollection.find(query);
      const orders = await cursor.toArray();
      res.send(orders);
    });

    // For Delete order
    app.delete('/order/:id', verifyJWT, async (req, res) => {
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

    // Make A normal user to admin
    app.put('/order/status/:id', verifyJWT, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const filter = {_id: ObjectId(id)};
      const options = {upsert: true};
      const updateDoc = {
        $set: {status: 'approved'}
      };
      const result = await orderCollection.updateOne(filter, updateDoc, options);
      return res.send(result);
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

    /*=====================================
        Endpoints For All Types of user
    ======================================*/

    // Upsert user and genarate token
    app.put('/user/:email', async (req, res) => {
      const email = req.params.email;
      const user = req.body;
      const filter = {email: email};
      const options = {upsert: true};
      const updateDoc = {
        $set: user,
      }
      const result = await usersCollection.updateOne(filter, updateDoc, options);
      const token = jwt.sign({ email: email }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1d' })
      res.send({ result, token });
    });

    // Get Single user
    app.get('/user/profile/:email', async (req, res) => {
      const email = req.params.email;
      const query = {email:email};
      const cursor = usersCollection.find(query);
      const user = await cursor.toArray();
      res.send(user);
    });

    // Get All user
    app.get('/user', verifyJWT, verifyAdmin, async (req, res) => {
      const query = {};
      const cursor = usersCollection.find(query);
      const users = await cursor.toArray();
      res.send(users);
    });

    // Update user information
    app.put('/user/update/:email', verifyJWT, async (req, res) => {
      const decodedEmail = req.decoded.email;
      const email = req.params.email;

      if(decodedEmail === email) {
        const user = req.body;
        const filter = {email: email};
        const options = {upsert: true};
        const updateDoc = {
          $set: user,
        }
        const result = await usersCollection.updateOne(filter, updateDoc, options);
        return res.send(result);
      }
      else {
        return res.status(403).send({status: 403, message: 'forbidden access' });
      }
    });

    /*=====================================
        Endpoints For Admins
    ======================================*/
    // Send true if the user is admin
    app.get('/admin/:email', async(req, res) => {
      const email = req.params.email;
      const user = await usersCollection.findOne({email: email});
      const isAdmin = user.role === 'admin';
      res.send({admin: isAdmin})
    })

    // Make A normal user to admin
    app.put('/user/admin/:email', verifyJWT, verifyAdmin, async (req, res) => {
      const email = req.params.email;
      const filter = {email: email};
      const options = {upsert: true};
      const updateDoc = {
        $set: {role: 'admin'}
      };
      const result = await usersCollection.updateOne(filter, updateDoc, options);
      return res.send(result);
    })
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