import React from 'react';
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";

const LoginScreen = ({ onLogin }) => {
    const handleLogin = async (e) => {
        e.preventDefault();
        const email = e.target.email.value;
        const password = e.target.password.value;

        try {
            const auth = getAuth();
            await signInWithEmailAndPassword(auth, email, password);
            onLogin(email, password);
        } catch (error) {
            console.error("ログインエラー:", error.message);
            alert("ログインに失敗しました: " + error.message);
        }
    };

    return (
        <div id="login-screen">
            <h2>ログイン</h2>
            <form onSubmit={handleLogin}>
                <input type="email" name="email" placeholder="メールアドレス" required />
                <input type="password" name="password" placeholder="パスワード" required />
                <button type="submit">ログイン</button>
            </form>
        </div>
    );
};

export default LoginScreen;