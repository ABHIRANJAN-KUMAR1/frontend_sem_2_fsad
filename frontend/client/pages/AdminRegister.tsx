import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Activity, Shield } from "lucide-react";
import { toast } from "sonner";

// Secret code for admin registration (in production, use environment variable)
const ADMIN_SECRET_CODE = "ADMIN2024";

export default function AdminRegister() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [secretCode, setSecretCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name || !email || !password || !confirmPassword || !secretCode) {
      toast.error("Please fill in all fields");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    // Verify secret code
    if (secretCode !== ADMIN_SECRET_CODE) {
      toast.error("Invalid admin secret code");
      return;
    }

    setIsLoading(true);

    try {
  const result = await register(email, name, password, "ADMIN");

  toast.success(result.message || `Welcome Admin, ${name}! Please verify your email.`);

  navigate(`/email-verify?email=${encodeURIComponent(email.toLowerCase().trim())}`);

} catch (error: any) {
  toast.error(error.message || "Registration failed. Please try again.");
} finally {
  setIsLoading(false);
}
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
              <Activity className="w-6 h-6 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-xl text-foreground">Activity Hub Manager</span>
              <span className="text-xs text-muted-foreground">Activity Management</span>
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl shadow-sm p-8">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Shield className="w-6 h-6 text-purple-600" />
            <h1 className="text-2xl font-bold text-foreground text-center">
              Admin Registration
            </h1>
          </div>
          <p className="text-center text-muted-foreground mb-6">
            Create an admin account
          </p>

          <form onSubmit={handleRegister} className="space-y-4">
            {/* Warning Box */}
            <div className="bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 rounded-lg p-3 mb-4">
              <p className="text-sm text-purple-800 dark:text-purple-200">
                <strong>Admin Access</strong> - You need a secret code to register as admin.
              </p>
            </div>

            {/* Secret Code Input */}
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">
                Admin Secret Code
              </label>
              <Input
                type="password"
                placeholder="Enter secret code"
                value={secretCode}
                onChange={(e) => setSecretCode(e.target.value)}
                className="h-10"
              />
            </div>

            {/* Full Name Input */}
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">
                Full Name
              </label>
              <Input
                type="text"
                placeholder="John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-10"
              />
            </div>

            {/* Email Input */}
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">
                Email Address
              </label>
              <Input
                type="email"
                placeholder="admin@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-10"
              />
            </div>

            {/* Password Input */}
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">
                Password
              </label>
              <Input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-10"
              />
            </div>

            {/* Confirm Password Input */}
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">
                Confirm Password
              </label>
              <Input
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="h-10"
              />
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-10 mt-6"
            >
              {isLoading ? "Creating Admin Account..." : "Register as Admin"}
            </Button>
          </form>

          {/* Footer */}
          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              Are you a student?{" "}
              <Link
                to="/register"
                className="text-blue-600 hover:text-blue-700 dark:text-blue-400 font-medium"
              >
                Register here
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
