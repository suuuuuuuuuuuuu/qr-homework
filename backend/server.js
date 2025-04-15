const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const cors = require('cors');
const path = require('path');
const admin = require('firebase-admin');
require('dotenv').config();

// Load Firebase key from environment variable
const serviceAccount = JSON.parse(process.env.FIREBASE_KEY);

// Initialize Firebase Admin SDK
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const historyCollection = db.collection('submissionHistory');

const app = express();
const PORT = process.env.PORT || 3000;

// Load history from Firestore
async function loadHistory() {
    const snapshot = await historyCollection.get();
    const history = [];
    snapshot.forEach(doc => history.push(doc.data()));
    return history;
}

// Save history to Firestore
async function saveHistory(id) {
    console.log(`Saving to Firestore: ID = ${id}`);
    await historyCollection.add({
        id,
        timestamp: new Date().toISOString()
    });
    console.log(`Successfully saved to Firestore: ID = ${id}`);
}

// Initialize history
let submissionHistory = [];
(async () => {
    submissionHistory = await loadHistory();
})();

// Middleware
app.use(bodyParser.json());
app.use(cors());

// Add logging for incoming requests
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

// In-memory storage for submitted IDs
let submittedIds = [];

// Endpoint to submit QR code data
app.post('/submit', async (req, res) => {
    const { id } = req.body;
    console.log(`Received ID: ${id}`);
    if (!id) {
        return res.status(400).json({ message: 'ID is required' });
    }

    if (!submittedIds.includes(id)) {
        submittedIds.push(id);
        await saveHistory(id);
        submissionHistory.push({ id, timestamp: new Date().toISOString() });
    }

    res.status(200).json({ message: 'ID submitted successfully', submittedIds });
});

// Endpoint to get all submitted IDs
app.get('/submitted', (req, res) => {
    console.log('Fetching submitted IDs');
    res.status(200).json({ submittedIds });
});

// Update /reset endpoint to clear Firestore collection
app.post('/reset', async (req, res) => {
    console.log('Resetting submitted IDs');
    submittedIds = [];

    // Clear Firestore collection
    const snapshot = await historyCollection.get();
    const batch = db.batch();
    snapshot.forEach(doc => batch.delete(doc.ref));
    await batch.commit();

    res.status(200).json({ message: 'Submitted IDs reset successfully' });
});

// Add endpoint to fetch submission history
app.get('/history', (req, res) => {
    res.status(200).json({ history: submissionHistory });
});

// Serve static files from the frontend directory
app.use(express.static(path.resolve(__dirname, '../frontend')));

// Fallback route to serve index.html for any unknown routes
app.use((req, res) => {
    res.sendFile(path.resolve(__dirname, '../frontend/index.html'));
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});