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

const MainScreen = ({ onLogout }) => {
    const [isCameraActive, setIsCameraActive] = useState(false);
    const [scannedResults, setScannedResults] = useState(new Set());
    const [allStudents, setAllStudents] = useState([]);

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

    const handleStartCamera = () => {
        setIsCameraActive(true);
    };

    const handleStopCamera = () => {
        setIsCameraActive(false);
    };

    const handleReset = () => {
        setScannedResults(new Set());
    };

    const onScanSuccess = (decodedText) => {
        setScannedResults((prev) => new Set(prev).add(decodedText));
    };

    const handleSubmitAll = async () => {
        const ids = Array.from(scannedResults);
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
            setScannedResults(new Set()); // Clear the local set after successful submission
        } catch (error) {
            console.error('Error during bulk submit:', error);
            alert('送信中にエラーが発生しました');
        }
    };

    return (
        <div id="main-screen">
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "20px" }}>
                <Button variant="contained" color="primary" onClick={handleReset} style={{ margin: "10px" }}>
                    リセット
                </Button>
                <Button variant="contained" color="secondary" onClick={handleStartCamera} style={{ margin: "10px" }}>
                    カメラ起動
                </Button>
                <Button variant="contained" color="success" onClick={handleSubmitAll} style={{ margin: "10px" }}>
                    送信
                </Button>
                <Button variant="contained" color="error" onClick={onLogout} style={{ margin: "10px" }}>
                    ログアウト
                </Button>
            </div>
            <h2>学生リスト</h2>
            <TableContainer component={Paper}>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>学生ID</TableCell>
                            <TableCell align="center">スキャン済み</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {allStudents.sort((a, b) => parseInt(a, 10) - parseInt(b, 10)).map((student, index) => (
                            <TableRow key={index}>
                                <TableCell>{student}</TableCell>
                                <TableCell align="center">
                                    {scannedResults.has(student) ? "✔️" : "❌"}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>

            <Modal open={isCameraActive} onClose={handleStopCamera}>
                <Box style={{ width: "100vw", height: "100vh", display: "flex", justifyContent: "center", alignItems: "center", backgroundColor: "rgba(0, 0, 0, 0.8)" }}>
                    <CameraScreen onScanSuccess={onScanSuccess} onStopCamera={handleStopCamera} />
                </Box>
            </Modal>
        </div>
    );
};

export default MainScreen;