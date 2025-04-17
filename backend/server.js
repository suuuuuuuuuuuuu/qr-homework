const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const cors = require('cors');
const path = require('path');
const admin = require('firebase-admin');
const jwt = require('jsonwebtoken');
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

// Save a new student to Firestore
async function saveStudent(id) {
    try {
        await db.collection('students').add({ id });
        console.log(`Student ${id} saved to Firestore`);
    } catch (error) {
        console.error('Error saving student:', error);
    }
}

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

// Helper function to decode JWT and extract user ID
function getUserIdFromToken(token) {
    try {
        const decoded = jwt.decode(token); // Decode the JWT without verifying
        return decoded.sub; // Extract the 'sub' field as the user ID
    } catch (error) {
        console.error('Error decoding JWT:', error);
        return null;
    }
}

// Update /submit endpoint to decode user ID from JWT
app.post('/submit', async (req, res) => {
    const { id } = req.body;
    const token = req.headers['x-user-id']; // JWT token from request header

    if (!id || !token) {
        console.error('ID or JWT token is missing');
        return res.status(400).json({ message: 'ID and JWT token are required' });
    }

    const userId = getUserIdFromToken(token);
    if (!userId) {
        console.error('Invalid JWT token');
        return res.status(400).json({ message: 'Invalid JWT token' });
    }

    console.log(`Received ID: ${id} from User: ${userId}`);

    try {
        const userCollection = historyCollection.doc(userId).collection('submissionHistory');
        await userCollection.add({
            id,
            timestamp: new Date().toISOString()
        });
        res.status(200).json({ message: 'ID submitted successfully' });
    } catch (error) {
        console.error('Error saving to Firestore:', error);
        res.status(500).json({ message: 'Failed to submit ID', error: error.message });
    }
});

// Add /bulk-submit endpoint for batch submission
app.post('/bulk-submit', async (req, res) => {
    const { ids } = req.body;
    const token = req.headers['x-user-id']; // JWT token from request header

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
        console.error('No IDs provided for bulk submission');
        return res.status(400).json({ message: 'No IDs provided for bulk submission' });
    }

    if (!token) {
        console.error('JWT token is missing');
        return res.status(400).json({ message: 'JWT token is required' });
    }

    const userId = getUserIdFromToken(token);
    if (!userId) {
        console.error('Invalid JWT token');
        return res.status(400).json({ message: 'Invalid JWT token' });
    }

    console.log(`Bulk submitting IDs for user: ${userId}`);

    try {
        const userCollection = historyCollection.doc(userId).collection('submissionHistory');
        const batch = db.batch();

        ids.forEach(id => {
            const docRef = userCollection.doc(); // Generate a new document reference
            batch.set(docRef, {
                id,
                timestamp: new Date().toISOString()
            });
        });

        await batch.commit();
        res.status(200).json({ message: 'Bulk submission successful' });
    } catch (error) {
        console.error('Error during bulk submission:', error);
        res.status(500).json({ message: 'Failed to submit IDs', error: error.message });
    }
});

// Endpoint to get all submitted IDs
app.get('/submitted', (req, res) => {
    console.log('Fetching submitted IDs');
    res.status(200).json({ submittedIds });
});

// Update /reset endpoint to clear Firestore collection for the specific user
app.post('/reset', async (req, res) => {
    const token = req.headers['x-user-id']; // JWT token from request header

    if (!token) {
        console.error('JWT token is missing');
        return res.status(400).json({ message: 'JWT token is required' });
    }

    const userId = getUserIdFromToken(token);
    if (!userId) {
        console.error('Invalid JWT token');
        return res.status(400).json({ message: 'Invalid JWT token' });
    }

    console.log(`Resetting history for user: ${userId}`);

    try {
        const userCollection = historyCollection.doc(userId).collection('submissionHistory');
        const snapshot = await userCollection.get();
        const batch = db.batch();

        snapshot.forEach(doc => {
            batch.delete(doc.ref);
        });

        await batch.commit();
        res.status(200).json({ message: 'User history reset successfully' });
    } catch (error) {
        console.error('Error resetting user history:', error);
        res.status(500).json({ message: 'Failed to reset user history', error: error.message });
    }
});

// Update /history endpoint to decode user ID from JWT
app.get('/history', async (req, res) => {
    const token = req.headers['x-user-id']; // JWT token from request header

    if (!token) {
        console.error('JWT token is missing in the request');
        return res.status(400).json({ message: 'JWT token is required' });
    }

    const userId = getUserIdFromToken(token);
    if (!userId) {
        console.error('Invalid JWT token');
        return res.status(400).json({ message: 'Invalid JWT token' });
    }

    console.log(`Fetching history for user: ${userId}`);

    try {
        const userCollection = historyCollection.doc(userId).collection('submissionHistory');
        const snapshot = await userCollection.get();
        const history = snapshot.docs.map(doc => {
            console.log(`Fetched document: ${doc.id}, data:`, doc.data());
            return doc.data();
        });
        res.status(200).json({ history });
    } catch (error) {
        console.error('Error fetching from Firestore:', error);
        res.status(500).json({ message: 'Failed to fetch history', error: error.message });
    }
});

// Endpoint to get all students
app.get('/students', async (req, res) => {
    try {
        const snapshot = await db.collection('students').get();
        const students = snapshot.docs.map(doc => doc.data().id);
        res.status(200).json({ students });
    } catch (error) {
        console.error('Error fetching students from Firestore:', error);
        res.status(500).json({ message: 'Failed to fetch students', error: error.message });
    }
});

// Update /students endpoint to handle duplicate IDs
app.post('/students', async (req, res) => {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ message: 'Invalid or missing student IDs' });
    }

    try {
        const studentsCollection = db.collection('students');
        const existingIds = new Set();
        const newIds = [];

        // Check for existing IDs in Firestore
        const snapshot = await studentsCollection.get();
        snapshot.forEach(doc => existingIds.add(doc.data().id));

        ids.forEach(id => {
            if (existingIds.has(id)) {
                console.log(`Student ID ${id} is already registered.`);
            } else {
                newIds.push(id);
            }
        });

        // Add new IDs to Firestore
        const batch = db.batch();
        newIds.forEach(id => {
            const docRef = studentsCollection.doc(); // Generate a new document reference
            batch.set(docRef, { id });
        });

        await batch.commit();
        console.log(`Newly registered students: ${newIds}`);

        res.status(200).json({
            message: 'Students processed successfully',
            registered: newIds,
            alreadyRegistered: ids.filter(id => existingIds.has(id))
        });
    } catch (error) {
        console.error('Error during student registration:', error);
        res.status(500).json({ message: 'Failed to process students', error: error.message });
    }
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