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

// Middleware to check authentication
function authenticateUser(req, res, next) {
    const token = req.headers['x-user-id']; // JWT token from request header

    if (!token) {
        console.error('JWT token is missing');
        return res.status(401).json({ message: 'Authentication required' });
    }

    const userId = getUserIdFromToken(token);
    if (!userId) {
        console.error('Invalid JWT token');
        return res.status(401).json({ message: 'Invalid authentication token' });
    }

    req.userId = userId; // Attach userId to the request object
    next();
}

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

// Apply authentication middleware to all routes that require authentication
app.use('/submit', authenticateUser);
app.use('/bulk-submit', authenticateUser);
app.use('/reset', authenticateUser);
app.use('/history', authenticateUser);
app.use('/students', authenticateUser);

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

// Update /submitted endpoint to handle user-specific submission retrieval
app.get('/submitted', async (req, res) => {
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

    try {
        const submissionCollection = db.collection('users').doc(userId).collection('submissionHistory');
        const snapshot = await submissionCollection.get();
        const submittedIds = snapshot.docs.map(doc => doc.data().id);
        res.status(200).json({ submittedIds });
    } catch (error) {
        console.error('Error fetching submission history from Firestore:', error);
        res.status(500).json({ message: 'Failed to fetch submission history', error: error.message });
    }
});

// Update /reset endpoint to clear all data for a specific user
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

    console.log(`Resetting all data for user: ${userId}`);

    try {
        // Delete submission history
        const historyCollection = db.collection('users').doc(userId).collection('submissionHistory');
        const historySnapshot = await historyCollection.get();
        const batch = db.batch();

        historySnapshot.forEach(doc => {
            batch.delete(doc.ref);
        });

        // Delete students
        const studentsCollection = db.collection('users').doc(userId).collection('students');
        const studentsSnapshot = await studentsCollection.get();

        studentsSnapshot.forEach(doc => {
            batch.delete(doc.ref);
        });

        await batch.commit();
        res.status(200).json({ message: 'All data reset successfully for user' });
    } catch (error) {
        console.error('Error resetting user data:', error);
        res.status(500).json({ message: 'Failed to reset user data', error: error.message });
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

// Update /students endpoint to handle user-specific student retrieval
app.get('/students', async (req, res) => {
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

    try {
        const studentsCollection = db.collection('users').doc(userId).collection('students');
        const snapshot = await studentsCollection.get();
        const students = snapshot.docs.map(doc => doc.data().id);
        res.status(200).json({ students });
    } catch (error) {
        console.error('Error fetching students from Firestore:', error);
        res.status(500).json({ message: 'Failed to fetch students', error: error.message });
    }
});

// Update /students endpoint to handle user-specific student registration
app.post('/students', async (req, res) => {
    const { ids } = req.body;
    const token = req.headers['x-user-id']; // JWT token from request header

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ message: 'Invalid or missing student IDs' });
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

    try {
        const studentsCollection = db.collection('users').doc(userId).collection('students');
        const existingIds = new Set();
        const newIds = [];

        // Check for existing IDs in Firestore
        const snapshot = await studentsCollection.get();
        snapshot.forEach(doc => existingIds.add(doc.data().id));

        ids.forEach(id => {
            if (existingIds.has(id)) {
                console.log(`Student ID ${id} is already registered for user ${userId}.`);
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
        console.log(`Newly registered students for user ${userId}: ${newIds}`);

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
app.use(express.static(path.resolve(__dirname, '../frontend/build')));

// Fallback route to serve index.html for any unknown routes
app.use((req, res) => {
    res.sendFile(path.resolve(__dirname, '../frontend/index.html'));
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});