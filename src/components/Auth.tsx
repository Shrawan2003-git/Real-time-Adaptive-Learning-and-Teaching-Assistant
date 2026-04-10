import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { auth } from '../services/firebase';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile, sendPasswordResetEmail, sendEmailVerification } from 'firebase/auth';
import { Button } from './Button';
import { ArrowLeft, Mail, Lock, User, AlertCircle, GraduationCap, Users } from 'lucide-react';

export const Auth: React.FC = () => {
    const [searchParams] = useSearchParams();
    const mode = searchParams.get('mode') || 'student'; // 'teacher' or 'student'
    const navigate = useNavigate();

    const [isLogin, setIsLogin] = useState(true);
    const [isForgotPassword, setIsForgotPassword] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [error, setError] = useState('');
    const [successMsg, setSuccessMsg] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');
        setSuccessMsg('');

        try {
            if (isForgotPassword) {
                if (!email) throw new Error("Please enter your email address.");
                await sendPasswordResetEmail(auth, email);
                setSuccessMsg("Password reset email sent! Please check your inbox (and spam folder).");
                setIsLoading(false);
                return;
            }

            if (isLogin) {
                const userCredential = await signInWithEmailAndPassword(auth, email, password);
                
                // Save user role locally for quick access
                localStorage.setItem('vta_user_mode', mode);

                if (mode === 'teacher') {
                    navigate('/teacher');
                } else {
                    navigate('/student');
                }
            } else {
                const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                await updateProfile(userCredential.user, { displayName: name });
                
                try {
                    // Send verification email without custom actionCodeSettings
                    // (avoids auth/unauthorized-continue-uri on localhost / unregistered domains)
                    await sendEmailVerification(userCredential.user);
                    
                    // Sign out so the user must verify before logging in
                    await auth.signOut();
                    
                    setSuccessMsg(`✅ Account created! A verification email has been sent to ${email}. Please check your inbox and Spam folder, then sign in.`);
                    setIsLogin(true); // Switch to login view
                    setPassword(''); // Clear password
                } catch (emailErr: any) {
                    console.error("Failed to send verification email:", emailErr);
                    await auth.signOut();
                    if (emailErr.code === 'auth/too-many-requests') {
                        setError("Account created, but we hit a rate limit. Please wait a few minutes, then sign in.");
                    } else {
                        setError(`Account was created but the verification email failed: ${emailErr.message}`);
                    }
                    setIsLogin(true);
                }
            }
        } catch (err: any) {
            console.error(err);
            let errMsg = err.message || "Authentication failed.";
            if (err.code === 'auth/email-already-in-use') errMsg = "This email is already registered.";
            if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password') errMsg = "Invalid email or password.";
            if (err.code === 'auth/weak-password') errMsg = "Password should be at least 6 characters.";
            if (err.code === 'auth/user-not-found') errMsg = "No account found with this email.";
            setError(errMsg);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-md">
                <button
                    onClick={() => navigate('/')}
                    className="flex items-center gap-2 text-gray-500 hover:text-gray-800 mb-6 transition-colors"
                >
                    <ArrowLeft className="w-4 h-4" /> Back to Role Selection
                </button>

                <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
                    <div className={`p-8 text-white ${mode === 'teacher' ? 'bg-indigo-600' : 'bg-blue-600'}`}>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
                                {mode === 'teacher' ? <Users className="w-5 h-5 text-white" /> : <GraduationCap className="w-5 h-5 text-white" />}
                            </div>
                            <h2 className="text-2xl font-bold capitalize">{mode} Login</h2>
                        </div>
                        <p className="text-white/80 text-sm">
                            {isForgotPassword
                                ? "Enter your email to receive a password reset link."
                                : isLogin ? "Welcome back! Please enter your details." : "Create an account to get started."}
                        </p>
                    </div>

                    <div className="p-8">
                        <form onSubmit={handleSubmit} className="space-y-5">
                            {!isLogin && !isForgotPassword && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            required
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                            placeholder="Jane Doe"
                                        />
                                        <User className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                                    </div>
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                                <div className="relative">
                                    <input
                                        type="email"
                                        required
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                        placeholder="you@example.com"
                                    />
                                    <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                                </div>
                            </div>

                            {!isForgotPassword && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                                    <div className="relative">
                                        <input
                                            type="password"
                                            required
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                            placeholder="••••••••"
                                        />
                                        <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                                    </div>
                                    {isLogin && (
                                        <div className="flex justify-end mt-1">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setIsForgotPassword(true);
                                                    setError('');
                                                    setSuccessMsg('');
                                                }}
                                                className="text-xs text-indigo-600 hover:text-indigo-800 transition-colors font-medium"
                                            >
                                                Forgot Password?
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}

                            {successMsg && (
                                <div className="p-3 bg-green-50 text-green-700 rounded-lg text-sm border border-green-200">
                                    <p>{successMsg}</p>
                                </div>
                            )}

                            {error && (
                                <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm flex items-center gap-2">
                                    <AlertCircle className="w-4 h-4 shrink-0" />
                                    <p>{error}</p>
                                </div>
                            )}

                            <Button
                                type="submit"
                                isLoading={isLoading}
                                className={`w-full py-3 text-sm font-bold ${mode === 'teacher' ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-blue-600 hover:bg-blue-700'}`}
                            >
                                {isForgotPassword ? 'Send Reset Link' : isLogin ? 'Sign In' : 'Create Account'}
                            </Button>
                        </form>

                        <div className="mt-6 text-center text-sm">
                            <span className="text-gray-500">
                                {isForgotPassword
                                    ? "Remember your password? "
                                    : isLogin ? "Don't have an account? " : "Already have an account? "}
                            </span>
                            <button
                                onClick={() => {
                                    if (isForgotPassword) {
                                        setIsForgotPassword(false);
                                        setIsLogin(true);
                                    } else {
                                        setIsLogin(!isLogin);
                                    }
                                    setError('');
                                    setSuccessMsg('');
                                }}
                                className="font-bold text-indigo-600 hover:text-indigo-800 transition-colors"
                            >
                                {isForgotPassword ? 'Back to Sign In' : isLogin ? 'Sign Up' : 'Sign In'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
