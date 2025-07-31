require('dotenv').config();
const express = require('express');
const path = require('path');
const fs = require('fs');
const { MongoClient } = require('mongodb');
const cookieParser = require('cookie-parser');

const apiRoutes = require('./routes/api');

const app = express();
const port = process.env.PORT || 3000;
const mongoUrl = process.env.MONGO_URL;
const dbName = 'exampro';

async function connectToDbAndStartServer() {
    try {
        // CORRECTED: Added tlsAllowInvalidCertificates option for Render compatibility
        const client = new MongoClient(mongoUrl, { 
            tls: true, 
            tlsAllowInvalidCertificates: true 
        });
        
        await client.connect();
        const db = client.db(dbName);
        console.log('Successfully connected to MongoDB database.');

        app.locals.db = db;

        // --- Middleware Setup ---
        app.use(cookieParser());
        app.use(express.json({ limit: '10mb' }));
        app.use(express.urlencoded({ extended: true, limit: '10mb' }));
        
        // Static files
        app.use(express.static(path.join(__dirname)));
        app.use('/snapshots', express.static(path.join(__dirname, 'snapshots')));
        app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

        // --- API Routes ---
        app.use('/api', apiRoutes);
        
        app.get('/', (req, res) => {
            res.sendFile(path.join(__dirname, 'index.html'));
        });

        // Ensure directories exist
        const snapshotsDir = path.join(__dirname, 'snapshots');
        const avatarsDir = path.join(__dirname, 'uploads', 'avatars');
        if (!fs.existsSync(snapshotsDir)) fs.mkdirSync(snapshotsDir, { recursive: true });
        if (!fs.existsSync(avatarsDir)) fs.mkdirSync(avatarsDir, { recursive: true });

        // --- Start Server ---
        app.listen(port, () => {
            console.log(`Server is running on port ${port}`);
        });

    } catch (err) {
        console.error('Failed to connect to MongoDB', err);
        process.exit(1);
    }
}

connectToDbAndStartServer();