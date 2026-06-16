"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { signInWithGoogle, createAccount } from "@/lib/firebase/client";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const [showCreateAccount, setShowCreateAccount] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  if (!isOpen) return null;

  const handleGoogleSignIn = async () => {
    try {
      await signInWithGoogle();
      onClose();
    } catch (error: any) {
      console.error("Account creation failed:", error);

      if (error.code === "auth/email-already-in-use") {
        alert("This email already has an account. Please sign in instead.");
      } else {
        alert(error.message);
      }
    }
  };

  const handleCreateAccount = async () => {
    try {
      if (!email.trim()) {
        alert("Please enter an email");
        return;
      }

      if (password.length < 6) {
        alert("Password must be at least 6 characters");
        return;
      }

      if (password !== confirmPassword) {
        alert("Passwords do not match");
        return;
      }

      await createAccount(email, password);

      alert("Account created successfully!");
      onClose();
    } catch (error) {
      console.error("Account creation failed:", error);
      alert("Failed to create account");
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
      <div className="w-full max-w-md rounded-3xl bg-[#080815] border border-white/10 p-8 text-center">
        <h2 className="text-2xl font-bold text-white mb-3">
          Welcome to BallotIQ
        </h2>

        {!showCreateAccount ? (
          <>
            <p className="text-gray-400 mb-6">
              Sign in or create an account to save your progress and personalize
              your learning experience.
            </p>

            <div className="flex flex-col gap-3">
              <button
                onClick={handleGoogleSignIn}
                className="w-full py-3 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-500 transition"
              >
                Continue with Google
              </button>

              <button
                onClick={() => setShowCreateAccount(true)}
                className="w-full py-3 rounded-xl bg-white/5 text-white font-semibold hover:bg-white/10 transition"
              >
                Create Account
              </button>

              <button
                onClick={onClose}
                className="mt-2 text-sm text-gray-500 hover:text-gray-300"
              >
                Continue as Guest
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="text-gray-400 mb-6">Create your BallotIQ account</p>

            <div className="flex flex-col gap-3">
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-white outline-none"
              />

              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 pr-12 text-white outline-none"
                />

                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Confirm Password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 pr-12 text-white outline-none"
                />

                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                >
                  {showConfirmPassword ? (
                    <EyeOff size={18} />
                  ) : (
                    <Eye size={18} />
                  )}
                </button>
              </div>

              <button
                onClick={handleCreateAccount}
                className="w-full py-3 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-500 transition"
              >
                Create Account
              </button>

              <button
                onClick={() => setShowCreateAccount(false)}
                className="text-sm text-gray-400 hover:text-white"
              >
                Back
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
