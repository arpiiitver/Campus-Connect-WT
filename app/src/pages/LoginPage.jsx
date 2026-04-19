import { useState } from "react";
import { motion } from "framer-motion";
import {
  Eye,
  EyeOff,
  BookOpen,
  ShoppingBag,
  MessageCircle,
  Shield,
} from "lucide-react";
import { apiLogin, apiSignup, setToken } from "@/lib/api";
import { toast } from "sonner";

export default function LoginPage({ onLogin }) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const validateEmail = (email) => {
    return email.toLowerCase().endsWith("@vit.edu");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (!validateEmail(email)) {
        toast.error("Only @vit.edu email addresses are allowed");
        return;
      }

      let data;
      if (isSignUp) {
        if (!username.trim()) {
          toast.error("Username is required");
          return;
        }
        data = await apiSignup(username.trim(), email.toLowerCase(), password);
        toast.success("Account created! Welcome to VIT Market 🎉");
      } else {
        data = await apiLogin(email.toLowerCase(), password);
        toast.success("Welcome back!");
      }

      // Store token and login
      setToken(data.token);
      onLogin(data.user);
    } catch (error) {
      toast.error(error.message || "Authentication failed");
    } finally {
      setIsLoading(false);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Left Side - Hero */}
      <motion.div
        className="lg:w-1/2 bg-[hsl(var(--neo-yellow))] p-8 lg:p-16 hidden lg:flex flex-col justify-center"
        initial={{ x: -100, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <div className="max-w-md mx-auto lg:mx-0">
          <motion.div
            className="flex items-center gap-3 mb-8"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring" }}
          >
            <div className="w-16 h-16 bg-black flex items-center justify-center">
              <ShoppingBag className="w-8 h-8 text-[hsl(var(--neo-yellow))]" />
            </div>
            <h1 className="text-4xl font-bold">VIT Market</h1>
          </motion.div>

          <motion.h2
            className="text-3xl lg:text-5xl font-bold mb-6 leading-tight"
            variants={itemVariants}
            initial="hidden"
            animate="visible"
          >
            Buy, Sell & Rent
            <br />
            <span className="bg-black text-white px-2">Campus Essentials</span>
          </motion.h2>

          <motion.p
            className="text-lg mb-8 font-medium"
            variants={itemVariants}
            initial="hidden"
            animate="visible"
            transition={{ delay: 0.1 }}
          >
            The exclusive marketplace for VIT students. Find notes, electronics,
            gear, and more.
          </motion.p>

          <motion.div
            className="grid grid-cols-2 gap-4"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            <motion.div
              className="neo-card bg-white"
              variants={itemVariants}
              whileHover={{ scale: 1.05 }}
            >
              <BookOpen className="w-8 h-8 mb-2" />
              <p className="font-bold">Notes & Books</p>
            </motion.div>
            <motion.div
              className="neo-card bg-[hsl(var(--neo-pink))] text-white"
              variants={itemVariants}
              whileHover={{ scale: 1.05 }}
            >
              <MessageCircle className="w-8 h-8 mb-2" />
              <p className="font-bold">Chat & Negotiate</p>
            </motion.div>
            <motion.div
              className="neo-card bg-[hsl(var(--neo-blue))] text-white"
              variants={itemVariants}
              whileHover={{ scale: 1.05 }}
            >
              <Shield className="w-8 h-8 mb-2" />
              <p className="font-bold">Safe Meetups</p>
            </motion.div>
            <motion.div
              className="neo-card bg-[hsl(var(--neo-green))] text-white"
              variants={itemVariants}
              whileHover={{ scale: 1.05 }}
            >
              <ShoppingBag className="w-8 h-8 mb-2" />
              <p className="font-bold">Easy Trading</p>
            </motion.div>
          </motion.div>
        </div>
      </motion.div>

      {/* Right Side - Auth Form */}
      <motion.div
        className="lg:w-1/2 bg-[hsl(60,100%,97%)] p-8 lg:p-16 flex flex-col justify-center"
        initial={{ x: 100, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <div className="max-w-md mx-auto w-full">
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <h2 className="text-3xl font-bold mb-2">
              {isSignUp ? "Create Account" : "Welcome Back"}
            </h2>
            <p className="text-gray-600 mb-8">
              {isSignUp
                ? "Sign up with your @vit.edu email"
                : "Sign in to access the marketplace"}
            </p>

            <form onSubmit={handleSubmit} className="space-y-6">
              {isSignUp && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                >
                  <label className="block font-bold mb-2">Username</label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="neo-input w-full"
                    placeholder="Enter your username"
                    required={isSignUp}
                    minLength={3}
                    maxLength={30}
                  />
                </motion.div>
              )}

              <div>
                <label className="block font-bold mb-2">Email</label>
                <div className="relative">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="neo-input w-full pr-24"
                    placeholder="your.email@vit.edu"
                    required
                  />

                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium text-gray-500">
                    @vit.edu
                  </span>
                </div>
                {!validateEmail(email) && email.length > 0 && (
                  <motion.p
                    className="text-red-500 text-sm mt-2 font-medium"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    Email must end with @vit.edu
                  </motion.p>
                )}
              </div>

              <div>
                <label className="block font-bold mb-2">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="neo-input w-full pr-12"
                    placeholder="Enter your password"
                    required
                    minLength={6}
                  />

                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2"
                  >
                    {showPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>

              <motion.button
                type="submit"
                className="neo-button neo-button-primary w-full text-lg"
                disabled={isLoading}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <motion.span
                      animate={{ rotate: 360 }}
                      transition={{
                        duration: 1,
                        repeat: Infinity,
                        ease: "linear",
                      }}
                      className="w-5 h-5 border-2 border-black border-t-transparent rounded-full"
                    />

                    {isSignUp ? "Creating Account..." : "Signing In..."}
                  </span>
                ) : isSignUp ? (
                  "Create Account"
                ) : (
                  "Sign In"
                )}
              </motion.button>
            </form>

            <div className="mt-8 text-center">
              <p className="text-gray-600">
                {isSignUp
                  ? "Already have an account?"
                  : "Don't have an account?"}
                <button
                  onClick={() => {
                    setIsSignUp(!isSignUp);
                    setEmail("");
                    setPassword("");
                    setUsername("");
                  }}
                  className="ml-2 font-bold underline hover:no-underline"
                >
                  {isSignUp ? "Sign In" : "Sign Up"}
                </button>
              </p>
            </div>

            <div className="mt-8 p-4 bg-[hsl(var(--neo-yellow))] border-4 border-black">
              <p className="font-bold text-sm flex items-center gap-2">
                <Shield className="w-5 h-5" />
                VIT Students Only
              </p>
              <p className="text-sm mt-1">
                This marketplace is exclusively for VIT students with valid
                @vit.edu email addresses.
              </p>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
