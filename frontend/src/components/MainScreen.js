import React, { useEffect, useRef, useState } from "react";
import { getAuth, signOut, getIdToken } from "firebase/auth";
import { Html5Qrcode } from "html5-qrcode";
import { auth } from "../App";
import CameraScreen from "./CameraScreen";
import { Button, List, ListItem, ListItemText, Modal, Box, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper } from "@mui/material";

const backendUrl = process.env.REACT_APP_BACKEND_URL;

async function fetchWithUserId(url, options = {}) {
    const user = auth.currentUser;
    if (!user) {
        console.error("User is not authenticated");
        throw new Error("User is not authenticated");
    }

    const idToken = await getIdToken(user);
    const headers = {
        ...options.headers,
        "x-user-id": idToken,
    };

    console.log("Fetching URL:", url);
    console.log("Request headers:", headers);
    console.log("Request options:", options);
    console.log("Request method:", options.method || "GET");
    console.log("Request body:", options.body || null);

    return fetch(url, { ...options, headers });
}

const StudentTable = ({ allStudents, historyScannedResults, localScannedResults, selectedDate }) => {
    return (
        <TableContainer component={Paper}>
            <Table size="small">
                <TableHead>
                    <TableRow>
                        <TableCell style={{ padding: "３px" }}>ID</TableCell>
                        <TableCell align="center" style={{ padding: "3px" }}>スキャン済み</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {allStudents.sort((a, b) => parseInt(a, 10) - parseInt(b, 10)).map((student, index) => (
                        <TableRow key={index}>
                            <TableCell style={{ padding: "3px" }}>{student}</TableCell>
                            <TableCell align="center" style={{ padding: "3px" }}>
                                {historyScannedResults.has(student) ? "✔️" : (selectedDate === new Date().toISOString().split('T')[0] && localScannedResults.has(student)) ? "🟡" : "❌"}
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </TableContainer>
    );
};

const MainScreen = ({ onLogout }) => {
    const [isCameraActive, setIsCameraActive] = useState(false);
    const [localScannedResults, setLocalScannedResults] = useState(new Set());
    const [historyScannedResults, setHistoryScannedResults] = useState(new Set());
    const [allStudents, setAllStudents] = useState([]);
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

    useEffect(() => {
        const fetchAllStudents = async () => {
            try {
                const response = await fetchWithUserId(`${process.env.REACT_APP_BACKEND_URL}/students`);
                const data = await response.json();
                setAllStudents(data.students || []);
            } catch (error) {
                console.error("Error fetching all students:", error);
            }
        };

        fetchAllStudents();
    }, []);

    const fetchScannedHistory = async (date) => {
        try {
            const response = await fetchWithUserId(`${process.env.REACT_APP_BACKEND_URL}/history?date=${date}`);
            const data = await response.json();
            setHistoryScannedResults(new Set(data.scannedIds || []));
        } catch (error) {
            console.error("Error fetching scanned history:", error);
        }
    };

    useEffect(() => {
        fetchScannedHistory(selectedDate);
    }, [selectedDate]);

    const handleStartCamera = () => {
        setIsCameraActive(true);
    };

    const handleStopCamera = () => {
        setIsCameraActive(false);
    };

    const handleReset = () => {
        setLocalScannedResults(new Set());
    };

    const onScanSuccess = (decodedText) => {
        setLocalScannedResults((prev) => new Set(prev).add(decodedText));
    };

    const handleSubmitAll = async () => {
        const ids = Array.from(localScannedResults);
        if (ids.length === 0) {
            console.warn('No IDs to submit');
            alert('送信するIDがありません');
            return;
        }

        try {
            const response = await fetchWithUserId(`${process.env.REACT_APP_BACKEND_URL}/bulk-submit`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ ids }),
            });

            const data = await response.json();
            console.log('Bulk submit successful:', data);
            alert('全てのIDが正常に送信されました');

            // Refresh history scanned results after submission
            fetchScannedHistory(selectedDate);

            // Clear local scanned results after submission
            setLocalScannedResults(new Set());
        } catch (error) {
            console.error('Error during bulk submit:', error);
            alert('送信中にエラーが発生しました');
        }
    };

    const handleDateChange = (event) => {
        setSelectedDate(event.target.value);
        fetchScannedHistory(event.target.value);
    };

    const handlePreviousDay = () => {
        const previousDate = new Date(selectedDate);
        previousDate.setDate(previousDate.getDate() - 1);
        const formattedDate = previousDate.toISOString().split('T')[0];
        setSelectedDate(formattedDate);
        fetchScannedHistory(formattedDate);
    };

    const handleNextDay = () => {
        const nextDate = new Date(selectedDate);
        nextDate.setDate(nextDate.getDate() + 1);
        const formattedDate = nextDate.toISOString().split('T')[0];
        setSelectedDate(formattedDate);
        fetchScannedHistory(formattedDate);
    };

    return (
        <div id="main-screen">
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px", gap: "5px" }}>
                <Button variant="contained" color="primary" onClick={handleReset} style={{ padding: "5px 10px", fontSize: "12px" }}>
                    スキャンリセット
                </Button>
                <Button variant="contained" color="secondary" onClick={handleStartCamera} style={{ padding: "5px 10px", fontSize: "12px" }}>
                    カメラ起動
                </Button>
                <Button
                    variant="contained"
                    color="success"
                    onClick={handleSubmitAll}
                    style={{ padding: "5px 10px", fontSize: "12px" }}
                    disabled={selectedDate !== new Date().toISOString().split('T')[0]}
                >
                    登録
                </Button>
                <Button variant="contained" color="error" onClick={onLogout} style={{ padding: "5px 10px", fontSize: "12px" }}>
                    ログアウト
                </Button>
            </div>
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", marginBottom: "20px" }}>
                <Button variant="outlined" onClick={handlePreviousDay} style={{ margin: "0 10px" }}>
                    &lt;
                </Button>
                <span style={{ fontSize: "18px", fontWeight: "bold" }}>{selectedDate}</span>
                <Button variant="outlined" onClick={handleNextDay} style={{ margin: "0 10px" }}>
                    &gt;
                </Button>
            </div>
            <div style={{ textAlign: "center", fontSize: "12px", color: "gray", marginBottom: "10px" }}>
                <p>✔️: 登録済み 🟡: スキャン済み（未送信）  ❌: 未スキャン</p>
            </div>
            <StudentTable
                allStudents={allStudents}
                historyScannedResults={historyScannedResults}
                localScannedResults={localScannedResults}
                selectedDate={selectedDate}
            />
            <Modal open={isCameraActive} onClose={handleStopCamera}>
                <Box style={{ width: "100vw", height: "100vh", display: "flex", justifyContent: "center", alignItems: "center", backgroundColor: "rgba(0, 0, 0, 0.8)" }}>
                    <CameraScreen onScanSuccess={onScanSuccess} onStopCamera={handleStopCamera} />
                </Box>
            </Modal>
        </div>
    );
};

export default MainScreen;