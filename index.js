require('dotenv').config()
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express();
const PORT = process.env.PORT || 8000

// middlewares
app.use(express.json());
app.use(cors())



const uri = `mongodb+srv://${process.env.BISTRO_USERNAME}:${process.env.BISTRO_PASS}@cluster0.tlbypdj.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

// middlewares
const verifyToken = (req, res, next) => {
    if (!req.headers.authorization) {
        res.status(401).send({ message: "forbiden access" })
    }
    const token = req.headers.authorization.split(' ')[1]
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
        if (err) {
            res.status(401).send({ message: "forbiden access" })
        } else {
            req.decoded = decoded
            next()
        }
    });
}

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();
        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");

        // collections
        const cartCollection = client.db("bistro_restaurant").collection("cartCollection")
        const userCollection = client.db("bistro_restaurant").collection("userCollection")

        // jwt
        app.post('/jwt', (req, res) => {
            const user = req.body
            const token = jwt.sign({ user }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' });
            res.send({ token })
        })

        //  User Collection
        app.get("/users", verifyToken, async (req, res) => {
            const result = await userCollection.find().toArray();
            res.send(result)
        })

        app.post('/users', async (req, res) => {
            const user = req.body
            const query = { email: user.email }
            const isUserPresent = await userCollection.findOne(query)
            if (isUserPresent) {
                return res.send({ message: "User already present" })
            }
            const result = await userCollection.insertOne(user)
            res.send(result)
        })

        // make admin
        app.patch('/users/admin/:id', async (req, res) => {
            const id = req.params.id
            const query = { _id: new ObjectId(id) }
            const updateDocument = {
                $set: {
                    role: "admin",
                },
            };
            const result = await userCollection.updateOne(query, updateDocument)
            res.send(result)
        })

        app.delete('/users/:id', async (req, res) => {
            const id = req.params.id
            const query = { _id: new ObjectId(id) }
            const result = await userCollection.deleteOne(query)
            res.send(result)
        })

        // Cart Collection
        app.get("/carts", async (req, res) => {
            const email = req.query.email
            const query = { user: email }
            const result = await cartCollection.find(query).toArray();
            res.send(result)
        })

        app.post('/carts', async (req, res) => {
            const item = req.body
            const result = await cartCollection.insertOne(item)
            res.send(result)
        })

        app.delete('/carts/:id', async (req, res) => {
            const id = req.params.id
            const query = { _id: new ObjectId(id) }
            const result = await cartCollection.deleteOne(query)
            res.send(result)
        })

    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);


app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});