import React, { useEffect, useRef, useState } from "react";
import { getAuth, signOut, getIdToken } from "firebase/auth";
import { Html5Qrcode } from "html5-qrcode";
import { auth } from "../App";

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

    useEffect(() => {
        if (!qrCodeReaderRef.current) {
            const html5QrCode = new Html5Qrcode("reader");
            qrCodeReaderRef.current = html5QrCode;

            html5QrCode
                .start(
                    { facingMode: "environment" },
                    { fps: 10, qrbox: 250 },
                    (decodedText) => {
                        if (!scannedResults.has(decodedText)) {
                            setScannedResults((prev) => new Set(prev).add(decodedText));
                            setScanResult(decodedText);
                            setStatusMessage("QRコードをスキャンしました。");
                        }
                    },
                    (error) => {
                        console.warn("QRコードスキャンエラー:", error);
                    }
                )
                .catch((err) => {
                    console.error("QRコードリーダーの起動エラー:", err);
                    setStatusMessage("QRコードリーダーの起動に失敗しました。");
                });
        }

        return () => {
            if (qrCodeReaderRef.current && qrCodeReaderRef.current._isScanning) {
                qrCodeReaderRef.current.stop().catch((err) => {
                    console.warn("QRコードリーダーの停止エラー:", err);
                });
            }
        };
    }, [scannedResults]);

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

    return (
        <div id="main-screen">
            <h2>学生リスト</h2>
            <button onClick={handleLogout}>ログアウト</button>
            <div id="reader" style={{ width: "300px", height: "300px" }}></div>
            <p id="result">スキャン結果: {scanResult}</p>
            <p id="status">ステータス: {statusMessage}</p>
            <button onClick={handleReset}>リセット</button>

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
    );
};

export default MainScreen;