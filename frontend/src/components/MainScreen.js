import React, { useEffect, useRef, useState } from "react";
import { getAuth, signOut, getIdToken } from "firebase/auth";
import { Html5Qrcode } from "html5-qrcode";
import { auth } from "../App";
import CameraScreen from "./CameraScreen";

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
    const [scannedResults, setScannedResults] = useState(new Set());
    const [statusMessage, setStatusMessage] = useState("");
    const [scanResult, setScanResult] = useState("");
    const [allStudents, setAllStudents] = useState([]);
    const [isCameraActive, setIsCameraActive] = useState(false);
    const qrCodeReaderRef = useRef(null);

    const fetchAllStudents = async () => {
        try {
            const response = await fetchWithUserId(`${backendUrl}/students`);
            console.log("Response status:", response.status);
            console.log("Response headers:", response.headers);
            const text = await response.text();
            console.log("Raw response text:", text);

            const data = JSON.parse(text);
            console.log("Parsed response data:", data);

            setAllStudents(data.students);
        } catch (error) {
            console.error("Error fetching all students:", error);
            setStatusMessage("Error fetching all students");
        }
    };

    useEffect(() => {
        fetchAllStudents();
    }, []);

    const handleLogout = async () => {
        try {
            const auth = getAuth();
            await signOut(auth);
            onLogout();
        } catch (error) {
            console.error("ログアウトエラー:", error.message);
            alert("ログアウトに失敗しました: " + error.message);
        }
    };

    const handleReset = () => {
        setScannedResults(new Set());
        setScanResult("");
        setStatusMessage("リセットしました。");
    };

    const handleStartCamera = () => {
        setIsCameraActive(true);
    };

    const handleStopCamera = () => {
        setIsCameraActive(false);
    };

    const onScanSuccess = (decodedText) => {
        setScannedResults((prev) => new Set(prev).add(decodedText));
    };

    return (
        <div id="main-screen">
            <button onClick={handleLogout}>ログアウト</button>
            {!isCameraActive ? (
                <div>
                    <button onClick={handleReset}>リセット</button>
                    <button onClick={handleStartCamera}>カメラ起動</button>
                    <h2>学生リスト</h2>
                    {/* <div id="reader" style={{ width: "300px", height: "300px" }}></div> */}
                    <ul id="student-list">
                        {allStudents.sort((a, b) => parseInt(a, 10) - parseInt(b, 10)).map((student) => (
                            <li
                                key={student}
                                className={scannedResults.has(student) ? "submitted" : "not-submitted"}
                            >
                                {student}
                            </li>
                        ))}
                    </ul>
                </div>
            ) : (
                <CameraScreen onScanSuccess={onScanSuccess} onStopCamera={handleStopCamera} />
            )}

        </div>

    );
};

export default MainScreen;