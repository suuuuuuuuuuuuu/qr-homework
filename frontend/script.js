// Firebase Authentication setup
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged, getIdToken } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-auth.js";

const firebaseConfig = {
    apiKey: "AIzaSyAukAveK_q1hCnUHVfogob9zRPOMox6t5I",
    authDomain: "qr-homework.firebaseapp.com",
    projectId: "qr-homework",
    storageBucket: "qr-homework.firebasestorage.app",
    messagingSenderId: "389308985074",
    appId: "1:389308985074:web:fb5408b850ea75f712aa6b"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

const resultElement = document.getElementById('result');
const statusElement = document.getElementById('status');
const scannedResults = new Set(); // To store unique scanned results
const scannedListElement = document.createElement('ul'); // List to display scanned results
document.body.appendChild(scannedListElement);

const submittedListElement = document.getElementById('submitted-list');
const notSubmittedListElement = document.getElementById('not-submitted-list');
const historyListElement = document.getElementById('history-list');

// Example list of all students (replace with actual data if available)
const allStudents = [];

const backendUrl = 'https://qr-homework.onrender.com'; // Replace with your Render backend URL
// const backendUrl = 'http://localhost:3000'; // Replace with your Render backend URL

function updateSubmittedAndNotSubmittedLists() {
    console.log('Updating Submitted and Not Submitted lists');
    console.log('All Students:', allStudents);
    console.log('Scanned Results:', Array.from(scannedResults));

    submittedListElement.innerHTML = '';
    notSubmittedListElement.innerHTML = '';

    const submittedArray = Array.from(scannedResults);
    const notSubmittedArray = allStudents.filter(student => !scannedResults.has(student));

    console.log('Submitted Array:', submittedArray);
    console.log('Not Submitted Array:', notSubmittedArray);

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

// Enhanced getUserIdToken with detailed error handling
async function getUserIdToken() {
    try {
        const user = auth.currentUser;
        if (user) {
            return await getIdToken(user);
        } else {
            console.warn('No user is currently logged in');
            statusElement.textContent = 'Please log in to continue';
            return null;
        }
    } catch (error) {
        console.error('Error fetching user ID token:', error);
        statusElement.textContent = 'Error fetching user ID token. Please try logging in again.';
        return null;
    }
}

// Redirect to login if user is not authenticated
async function fetchWithUserId(url, options = {}) {
    const idToken = await getUserIdToken();
    if (!idToken) {
        console.error('User is not authenticated');
        statusElement.textContent = 'Redirecting to login...';
        setTimeout(() => {
            // Redirect to login page or show login form
            document.getElementById('login-screen').style.display = 'block';
            document.getElementById('main-screen').style.display = 'none';
        }, 2000);
        throw new Error('User is not authenticated');
    }

    const headers = {
        ...options.headers,
        'x-user-id': idToken
    };

    return fetch(url, { ...options, headers });
}

// Ensure API calls are only made when the user is authenticated
async function safeApiCall(apiFunction) {
    const idToken = await getUserIdToken();
    if (!idToken) {
        console.error('User is not authenticated. Aborting API call.');
        statusElement.textContent = 'Please log in to continue.';
        return null;
    }
    return apiFunction();
}

// Add detailed logging for API responses
async function fetchScannedResults() {
    return safeApiCall(async () => {
        try {
            const response = await fetchWithUserId(`${backendUrl}/submitted`);
            const data = await response.json();
            console.log('Scanned Results API Response:', data);
            scannedResults.clear(); // Clear the current set
            data.submittedIds.forEach(id => scannedResults.add(id)); // Add server data to the set
            updateScannedList(); // Update the displayed list
        } catch (error) {
            console.error('Error fetching scanned results:', error);
            statusElement.textContent = 'Error fetching scanned results';
        }
    });
}

// Fetch submission history from the server
async function fetchSubmissionHistory() {
    return safeApiCall(async () => {
        try {
            const response = await fetchWithUserId(`${backendUrl}/history`);
            const data = await response.json();
            historyListElement.innerHTML = ''; // Clear the current list
            data.history.forEach(entry => {
                const listItem = document.createElement('li');
                listItem.textContent = `ID: ${entry.id}, Timestamp: ${entry.timestamp}`;
                historyListElement.appendChild(listItem);
            });
        } catch (error) {
            console.error('Error fetching submission history:', error);
            statusElement.textContent = 'Error fetching submission history';
        }
    });
}

// Ensure updateSubmittedAndNotSubmittedLists is called after data fetch
async function fetchAndUpdateAllStudents() {
    return safeApiCall(async () => {
        try {
            const response = await fetchWithUserId(`${backendUrl}/students`);
            const data = await response.json();
            console.log('All Students API Response:', data);
            allStudents.length = 0; // Clear the current list
            allStudents.push(...data.students); // Update with new data
            updateScannedList(); // Refresh the displayed lists
            updateSubmittedAndNotSubmittedLists(); // Ensure Not Submitted list is updated
            console.log('Updated allStudents:', allStudents);
        } catch (error) {
            console.error('Error fetching all students:', error);
            statusElement.textContent = 'Error fetching all students';
        }
    });
}

async function onScanSuccess(decodedText, decodedResult) {
    if (!scannedResults.has(decodedText)) {
        scannedResults.add(decodedText); // Add new result to the set
        updateScannedList(); // Update the displayed list
    }

    // Display the scanned result
    resultElement.textContent = `Scanned result: ${decodedText}`;
    statusElement.textContent = 'QR code scanned and added to the list';
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
document.getElementById('reset-button').addEventListener('click', async () => {
    try {
        const response = await fetchWithUserId(`${backendUrl}/reset`, { method: 'POST' });
        const data = await response.json();
        console.log('Reset successful:', data);
        scannedResults.clear(); // Clear the local set
        updateScannedList(); // Update the displayed list
        statusElement.textContent = 'Submitted list has been reset.';
    } catch (error) {
        console.error('Error resetting submitted list:', error);
        statusElement.textContent = 'Error resetting submitted list.';
    }
});

// Update Submit All button to refresh history after submission
document.getElementById('submit-all-button').addEventListener('click', async () => {
    const ids = Array.from(scannedResults);
    if (ids.length === 0) {
        console.warn('No IDs to submit');
        statusElement.textContent = 'No IDs to submit';
        return;
    }

    try {
        const response = await fetchWithUserId(`${backendUrl}/bulk-submit`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ ids }),
        });

        const data = await response.json();
        console.log('Bulk submit successful:', data);
        statusElement.textContent = 'All IDs submitted successfully';
        scannedResults.clear(); // Clear the local set after successful submission
        updateScannedList(); // Update the displayed list
        fetchSubmissionHistory(); // Refresh the history after submission
    } catch (error) {
        console.error('Error during bulk submit:', error);
        statusElement.textContent = 'Error during bulk submit';
    }
});

// Update Register Student button to refresh allStudents after registration
document.getElementById('register-student-button').addEventListener('click', async () => {
    const studentIdInput = document.getElementById('student-id');
    const studentId = studentIdInput.value.trim();

    if (!studentId) {
        console.error('Student ID is required');
        statusElement.textContent = 'Student ID is required';
        return;
    }

    try {
        const response = await fetchWithUserId(`${backendUrl}/students`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ id: studentId })
        });

        const data = await response.json();
        console.log('Student registered successfully:', data);
        statusElement.textContent = `Student ${studentId} registered successfully`;
        studentIdInput.value = ''; // Clear the input field
        await fetchAndUpdateAllStudents(); // Refresh allStudents after registration
    } catch (error) {
        console.error('Error registering student:', error);
        statusElement.textContent = 'Error registering student';
    }
});

// Update Bulk Register button to include userId in the request
document.getElementById('bulk-register-button').addEventListener('click', async () => {
    const studentCountInput = document.getElementById('student-count');
    const studentCount = parseInt(studentCountInput.value.trim(), 10);

    if (isNaN(studentCount) || studentCount <= 0) {
        console.error('Invalid number of students');
        statusElement.textContent = 'Please enter a valid number of students';
        return;
    }

    try {
        // Generate sequential student IDs from 1 to N
        const newStudentIds = Array.from({ length: studentCount }, (_, i) => (i + 1).toString());

        // Send the new student IDs to the server
        const response = await fetchWithUserId(`${backendUrl}/students`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ ids: newStudentIds })
        });

        const data = await response.json();
        console.log('Bulk registration successful:', data);
        statusElement.textContent = 'Bulk registration successful';
        studentCountInput.value = ''; // Clear the input field
        await fetchAndUpdateAllStudents(); // Refresh allStudents after registration
    } catch (error) {
        console.error('Error during bulk registration:', error);
        statusElement.textContent = 'Error during bulk registration';
    }
});

// DOM elements for Firebase Authentication
const loginForm = document.getElementById('login-form');
const userInfo = document.getElementById('user-info');
const userEmail = document.getElementById('user-email');
const loginButton = document.getElementById('login-button');
const signupButton = document.getElementById('signup-button');
const logoutButton = document.getElementById('logout-button');

// Ensure login button hides login screen and shows main screen on success
loginButton.addEventListener('click', () => {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    signInWithEmailAndPassword(auth, email, password)
        .then((userCredential) => {
            console.log('Logged in:', userCredential.user);
            document.getElementById('login-screen').style.display = 'none';
            document.getElementById('main-screen').style.display = 'block';
        })
        .catch((error) => {
            console.error('Login error:', error);
            statusElement.textContent = 'Login failed. Please check your credentials and try again.';
        });
});

// Sign Up
signupButton.addEventListener('click', () => {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    createUserWithEmailAndPassword(auth, email, password)
        .then((userCredential) => {
            console.log('User created:', userCredential.user);
        })
        .catch((error) => {
            console.error('Sign up error:', error);
        });
});

// Logout
logoutButton.addEventListener('click', () => {
    signOut(auth)
        .then(() => {
            console.log('Logged out');
        })
        .catch((error) => {
            console.error('Logout error:', error);
        });
});

// Ensure proper initialization of login and main screens
window.addEventListener('DOMContentLoaded', () => {
    const loginScreen = document.getElementById('login-screen');
    const mainScreen = document.getElementById('main-screen');

    // Monitor authentication state
    onAuthStateChanged(auth, (user) => {
        if (user) {
            console.log('User is logged in:', user);
            loginScreen.style.display = 'none';
            mainScreen.style.display = 'block';
            userEmail.textContent = `Logged in as: ${user.email}`;

            // Fetch data only when the user is authenticated
            fetchScannedResults();
            fetchSubmissionHistory();
            fetchAndUpdateAllStudents();
        } else {
            console.log('No user is logged in');
            loginScreen.style.display = 'block';
            mainScreen.style.display = 'none';

            // Clear lists if the user logs out
            scannedResults.clear();
            updateScannedList();
            historyListElement.innerHTML = '';
        }
    });

    // Trigger data fetching immediately if already logged in
    if (auth.currentUser) {
        console.log('User is already logged in:', auth.currentUser);
        loginScreen.style.display = 'none';
        mainScreen.style.display = 'block';
        userEmail.textContent = `Logged in as: ${auth.currentUser.email}`;

        // Fetch data immediately
        fetchScannedResults();
        fetchSubmissionHistory();
        fetchAndUpdateAllStudents();
    }
});