const resultElement = document.getElementById('result');
const statusElement = document.getElementById('status');
const scannedResults = new Set(); // To store unique scanned results
const scannedListElement = document.createElement('ul'); // List to display scanned results
document.body.appendChild(scannedListElement);

const submittedListElement = document.getElementById('submitted-list');
const notSubmittedListElement = document.getElementById('not-submitted-list');
const historyListElement = document.getElementById('history-list');

// Example list of all students (replace with actual data if available)
const allStudents = ['001', '002', '003', '004', '005'];

const backendUrl = 'https://qr-homework.onrender.com'; // Replace with your Render backend URL
// const backendUrl = 'http://localhost:3000'; // Replace with your Render backend URL

function updateSubmittedAndNotSubmittedLists() {
    submittedListElement.innerHTML = '';
    notSubmittedListElement.innerHTML = '';

    const submittedArray = Array.from(scannedResults);
    const notSubmittedArray = allStudents.filter(student => !scannedResults.has(student));

    submittedArray.forEach(id => {
        const listItem = document.createElement('li');
        listItem.textContent = id;
        submittedListElement.appendChild(listItem);
    });

    notSubmittedArray.forEach(id => {
        const listItem = document.createElement('li');
        listItem.textContent = id;
        notSubmittedListElement.appendChild(listItem);
    });
}

function updateScannedList() {
    updateSubmittedAndNotSubmittedLists();
}

// Fetch scanned results from the server
function fetchScannedResults() {
    fetch(`${backendUrl}/submitted`)
        .then(response => response.json())
        .then(data => {
            scannedResults.clear(); // Clear the current set
            data.submittedIds.forEach(id => scannedResults.add(id)); // Add server data to the set
            updateScannedList(); // Update the displayed list
        })
        .catch(error => {
            console.error('Error fetching scanned results:', error);
            statusElement.textContent = 'Error fetching scanned results';
        });
}

// Fetch submission history from the server
function fetchSubmissionHistory() {
    fetch(`${backendUrl}/history`)
        .then(response => response.json())
        .then(data => {
            historyListElement.innerHTML = ''; // Clear the current list
            data.history.forEach(entry => {
                const listItem = document.createElement('li');
                listItem.textContent = `ID: ${entry.id}, Timestamp: ${entry.timestamp}`;
                historyListElement.appendChild(listItem);
            });
        })
        .catch(error => {
            console.error('Error fetching submission history:', error);
            statusElement.textContent = 'Error fetching submission history';
        });
}

// Call fetchScannedResults on page load
fetchScannedResults();

// Call fetchSubmissionHistory on page load
fetchSubmissionHistory();

function onScanSuccess(decodedText, decodedResult) {
    if (!scannedResults.has(decodedText)) {
        scannedResults.add(decodedText); // Add new result to the set
        updateScannedList(); // Update the displayed list
    }

    // Display the scanned result
    resultElement.textContent = `Scanned result: ${decodedText}`;

    // Send the scanned ID to the backend
    fetch(`${backendUrl}/submit`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id: decodedText }),
    })
        .then(response => response.json())
        .then(data => {
            statusElement.textContent = `Submitted: ${decodedText}`;
        })
        .catch(error => {
            console.error('Error submitting ID:', error);
            statusElement.textContent = 'Error submitting ID';
        });
}

function onScanFailure(error) {
    console.warn(`QR Code scan failed: ${error}`);
}

const html5QrCode = new Html5Qrcode("reader");
// Enhanced error logging for QR scanner
html5QrCode.start(
    { facingMode: "environment" },
    { fps: 10, qrbox: 250 },
    onScanSuccess,
    onScanFailure
).catch(err => {
    console.error('Error starting QR scanner:', err);
    resultElement.textContent = 'Error starting QR scanner. Please check your camera permissions.';
    statusElement.textContent = `Detailed error: ${err.message}`;
});

// Add event listener for the reset button
document.getElementById('reset-button').addEventListener('click', () => {
    fetch(`${backendUrl}/reset`, {
        method: 'POST',
    })
        .then(response => response.json())
        .then(data => {
            console.log('Reset successful:', data);
            scannedResults.clear(); // Clear the local set
            updateScannedList(); // Update the displayed list
            statusElement.textContent = 'Submitted list has been reset.';
        })
        .catch(error => {
            console.error('Error resetting submitted list:', error);
            statusElement.textContent = 'Error resetting submitted list.';
        });
});