import React, { useEffect, useRef } from "react";
import { Html5Qrcode } from "html5-qrcode";

const CameraScreen = ({ onScanSuccess, onStopCamera }) => {
    const qrCodeReaderRef = useRef(null);

    useEffect(() => {
        const initializeQrCodeScanner = () => {
            if (!qrCodeReaderRef.current) {
                const html5QrCode = new Html5Qrcode("reader");
                qrCodeReaderRef.current = html5QrCode;

                html5QrCode
                    .start(
                        { facingMode: "environment" },
                        { fps: 10, qrbox: 250 },
                        onScanSuccess,
                        (error) => {
                            console.warn("QR Code scan error:", error);
                        }
                    )
                    .catch((err) => {
                        console.error("Error starting QR Code scanner:", err);
                    });
            }
        };

        // Ensure the reader element exists before initializing
        const readerElement = document.getElementById("reader");
        if (readerElement) {
            initializeQrCodeScanner();
        } else {
            console.error("Element with id='reader' not found in DOM");
        }

        return () => {
            if (qrCodeReaderRef.current && qrCodeReaderRef.current._isScanning) {
                qrCodeReaderRef.current.stop().catch((err) => {
                    console.error("Error stopping QR Code scanner:", err);
                });
            }
        };
    }, [onScanSuccess]);

    return (
        <div style={{ width: "100vw", height: "100vh", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", backgroundColor: "#000" }}>
            <h2 style={{ color: "#fff" }}>QRコードスキャン</h2>
            <div id="reader" style={{ width: "90%", height: "70%" }}></div>
            <button onClick={onStopCamera} style={{ marginTop: "20px", padding: "10px 20px", fontSize: "16px" }}>カメラ停止</button>
        </div>
    );
};

export default CameraScreen;