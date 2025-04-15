const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

const historyFilePath = './submission-history.json';

// Ensure history file is initialized
if (!fs.existsSync(historyFilePath)) {
    fs.writeFileSync(historyFilePath, JSON.stringify([], null, 2));
}

// Load history from file
function loadHistory() {
    if (fs.existsSync(historyFilePath)) {
        const data = fs.readFileSync(historyFilePath, 'utf-8');
        try {
            return JSON.parse(data || '[]'); // Handle empty file as an empty array
        } catch (error) {
            console.error('Error parsing history file:', error);
            return [];
        }
    }
    return [];
}

// Save history to file
function saveHistory(history) {
    fs.writeFileSync(historyFilePath, JSON.stringify(history, null, 2));
}

// Initialize history
let submissionHistory = loadHistory();

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
app.post('/submit', (req, res) => {
    const { id } = req.body;
    console.log(`Received ID: ${id}`);
    if (!id) {
        return res.status(400).json({ message: 'ID is required' });
    }

    if (!submittedIds.includes(id)) {
        submittedIds.push(id);
        submissionHistory.push({ id, timestamp: new Date().toISOString() });
        saveHistory(submissionHistory);
    }

    res.status(200).json({ message: 'ID submitted successfully', submittedIds });
});

// Endpoint to get all submitted IDs
app.get('/submitted', (req, res) => {
    console.log('Fetching submitted IDs');
    res.status(200).json({ submittedIds });
});

// Endpoint to reset submitted IDs
app.post('/reset', (req, res) => {
    console.log('Resetting submitted IDs');
    submittedIds = [];
    res.status(200).json({ message: 'Submitted IDs reset successfully' });
});

// Add endpoint to fetch submission history
app.get('/history', (req, res) => {
    res.status(200).json({ history: submissionHistory });
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});