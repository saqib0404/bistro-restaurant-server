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
        res.status(401).send({ message: "unathorized access" })
    }
    const token = req.headers.authorization.split(' ')[1]
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
        if (err) {
            res.status(401).send({ message: "unathorized access" })
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

        // verify admin
        const verifyAdmin = async (req, res, next) => {
            const email = req.decoded.user.email
            const query = { email: email }
            const user = await userCollection.findOne(query)
            const isAdmin = user?.role === "admin"
            if (!isAdmin) {
                return res.status(403).send({ message: "forbiden access" })
            }
            next()
        }

        //  User Collection
        app.get("/users", verifyToken, verifyAdmin, async (req, res) => {
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

        //Admin Related
        app.patch('/users/admin/:id', verifyToken, verifyAdmin, async (req, res) => {
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

        app.get("/users/admin/:email", verifyToken, async (req, res) => {
            const email = req.params.email
            // console.log(req.decoded.user.email);
            if (email !== req.decoded.user.email) {
                return res.status(403).send({ message: "forbiden access" })
            }
            const query = { email: email }
            const user = await userCollection.findOne(query)
            let admin = false
            if (user) {
                admin = user?.role === "admin"
            }
            res.send(admin)
        })

        app.delete('/users/:id', verifyToken, verifyAdmin, async (req, res) => {
            const id = req.params.id
            const query = { _id: new ObjectId(id) }
            const result = await userCollection.deleteOne(query)
            res.send(result)
        })

        // Cart Collection
        app.get("/carts",  async (req, res) => {
            const email = req.query.email
            const query = { user: email }
            const result = await cartCollection.find(query).toArray();
            res.send(result)
        })

        app.post('/carts',verifyToken, async (req, res) => {
            const item = req.body
            const result = await cartCollection.insertOne(item)
            res.send(result)
        })

        app.delete('/carts/:id',verifyToken, async (req, res) => {
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