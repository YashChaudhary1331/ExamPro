require('dotenv').config(); // Load environment variables
const express = require('express');
const path = require('path');
const fs = require('fs');
const { MongoClient } = require('mongodb');

// Import the main API router
const apiRoutes = require('./routes/api');

const app = express();
const port = 3000;
const mongoUrl = process.env.MONGO_URL;
// const mongoUrl = 'mongodb://localhost:27017';
const dbName = 'exampro';

async function connectToDbAndStartServer() {
    try {
        const client = new MongoClient(mongoUrl);
        await client.connect();
        const db = client.db(dbName);
        console.log('Successfully connected to MongoDB database.');

        app.locals.db = db;

        // --- Middleware Setup ---
        app.use(express.json({ limit: '10mb' }));
        app.use(express.urlencoded({ extended: true, limit: '10mb' }));
        
        // Static files
        app.use(express.static(__dirname));
        app.use('/snapshots', express.static(path.join(__dirname, 'snapshots')));
        app.use('/uploads', express.static(path.join(__dirname, 'uploads'))); // <-- ADD THIS LINE

        // --- API Routes ---
        app.use('/api', apiRoutes);

        // Ensure upload directories exist
        const snapshotsDir = path.join(__dirname, 'snapshots');
        const avatarsDir = path.join(__dirname, 'uploads', 'avatars'); // <-- ADD THIS LINE
        if (!fs.existsSync(snapshotsDir)) fs.mkdirSync(snapshotsDir, { recursive: true });
        if (!fs.existsSync(avatarsDir)) fs.mkdirSync(avatarsDir, { recursive: true }); // <-- ADD THIS LINE


        // --- Start Server ---
        app.listen(port, () => {
            console.log(`Server is running at http://localhost:${port}`);
        });

    } catch (err) {
        console.error('Failed to connect to MongoDB', err);
        process.exit(1);
    }
}

connectToDbAndStartServer();