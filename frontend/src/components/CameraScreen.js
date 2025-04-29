import React, { useEffect, useRef } from "react";
import { Html5Qrcode } from "html5-qrcode";

const CameraScreen = ({ onScanSuccess, onStopCamera }) => {
    const qrCodeReaderRef = useRef(null);

    useEffect(() => {
        const initializeQrCodeScanner = () => {
            if (!qrCodeReaderRef.current) {
                const html5QrCode = new Html5Qrcode("reader");
                qrCodeReaderRef.current = html5QrCode;
                const width = window.innerWidth
                const height = window.innerHeight
                const aspectRatio = width / height
                const reverseAspectRatio = height / width

                const mobileAspectRatio = reverseAspectRatio > 1.5
                    ? reverseAspectRatio + (reverseAspectRatio * 12 / 100)
                    : reverseAspectRatio
                html5QrCode
                    .start(
                        { facingMode: "environment" },
                        {
                            fps: 10,
                            qrbox: 250,
                            videoConstraints: {
                                facingMode: 'environment',
                                aspectRatio: width < 600
                                    ? mobileAspectRatio
                                    : aspectRatio,
                            },
                        },
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
        if (!readerElement) {
            console.error("Element with id='reader' not found in DOM. Aborting QR Code scanner initialization.");
            return;
        }

        initializeQrCodeScanner();

        return () => {
            if (qrCodeReaderRef.current && qrCodeReaderRef.current._isScanning) {
                qrCodeReaderRef.current.stop().catch((err) => {
                    console.error("Error stopping QR Code scanner:", err);
                });
            }
        };
    }, [onScanSuccess]);

    return (
        <div style={{
            width: "100vw",
            height: "100vh",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            backgroundColor: "black",
            position: "fixed",
            top: 0,
            left: 0,
            zIndex: 1000
        }}>
            {/* QRコードスキャンのカメラビューをここに配置 */}
            <div id="reader" style={{ width: "100%", height: "100%" }}></div>
            <button onClick={onStopCamera} style={{ position: "absolute", top: "10px", right: "10px", zIndex: 1001, backgroundColor: "white", border: "none", padding: "10px", borderRadius: "5px" }}>閉じる</button>
        </div>
    );
};

export default CameraScreen;