import { useState } from "react";
import { useNavigate, Link, useLocation, Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Activity } from "lucide-react";
import { toast } from "sonner";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isAuthenticated, user, loading } = useAuth();

const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
 // const [loginRole, setLoginRole] = useState<"student" | "admin">("student");
  const [isLoading, setIsLoading] = useState(false);

  const rawFromPath = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname;
  const fromPath = rawFromPath && !["/login", "/register", "/admin-register"].includes(rawFromPath)
    ? rawFromPath
    : "/dashboard";

if (!loading && isAuthenticated && user) {
  if (user.role === "admin") {
    return <Navigate to="/admin-dashboard" replace />;
  }
  return <Navigate to="/dashboard" replace />;
}


  // Captcha
  const generateCaptcha = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let result = "";
    for (let i = 0; i < 5; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  const [captchaCode, setCaptchaCode] = useState(generateCaptcha());
  const [captchaInput, setCaptchaInput] = useState("");
  const [captchaError, setCaptchaError] = useState(false);

  const refreshCaptcha = () => {
    setCaptchaCode(generateCaptcha());
    setCaptchaInput("");
    setCaptchaError(false);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      toast.error("Please fill in all fields");
      return;
    }

    // Captcha validation
    if (captchaInput.toUpperCase() !== captchaCode) {
      setCaptchaError(true);
      refreshCaptcha();
      toast.error("Incorrect captcha. Please try again.");
      return;
    }

    setIsLoading(true);

   try {
  const user = await login(email, password);

  console.log("LOGIN USER:", user);

  toast.success(`Welcome back, ${user.name}!`);

  

} catch (error) {
  toast.error("Invalid email or password. Please try again.");
} finally {
  setIsLoading(false);
}
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 p-4">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
              <Activity className="w-6 h-6 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-xl text-foreground">
                Activity Hub Manager
              </span>
              <span className="text-xs text-muted-foreground">
                Organizing and Managing Student Extracurricular Activities
              </span>
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl shadow-sm p-8">
          <h1 className="text-2xl font-bold text-foreground mb-2 text-center">
            Welcome Back
          </h1>
          <p className="text-center text-muted-foreground mb-6">
            Sign in to your account
          </p>

          <form onSubmit={handleLogin} className="space-y-4">


    

            {/* Email */}
            <div>

              <label className="text-sm font-medium text-foreground mb-2 block">
                Email Address
              </label>
              <Input
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-10"
              />
            </div>

            {/* Password */}
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

            {/* Captcha */}
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">
                Security Check
              </label>
              <div className="flex items-center gap-2">
                <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-4 py-2 rounded-lg font-mono text-xl font-bold flex-1 text-center text-white tracking-wider">
                  {captchaCode}
                </div>
                <button
                  type="button"
                  onClick={refreshCaptcha}
                  className="text-xs text-blue-600 hover:text-blue-700 underline"
                >
                  Refresh
                </button>
              </div>

              <Input
                type="text"
                placeholder="Enter the code above"
                value={captchaInput}
                onChange={(e) => {
                  setCaptchaInput(e.target.value);
                  setCaptchaError(false);
                }}
                className={`h-10 mt-2 ${captchaError ? "border-red-500" : ""}`}
              />

              {captchaError && (
                <p className="text-xs text-red-500 mt-1">
                  Incorrect captcha code. Try again.
                </p>
              )}
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-10 mt-6"
            >
              {isLoading ? "Signing in..." : "Sign In"}
            </Button>

            <div className="text-center mt-4">
              <Link
                to="/password-reset"
                className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 font-medium"
              >
                Forgot Password?
              </Link>
            </div>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
Don't have an account?{" "}
              <Link
                to="/register"
                className="text-blue-600 hover:text-blue-700 dark:text-blue-400 font-medium"
              >
                Student Register
              </Link>{" "}
              |{" "}
              <Link
                to="/admin-register"
                className="text-purple-600 hover:text-purple-700 dark:text-purple-400 font-medium"
              >
                Admin Register
              </Link>

            </p>
          </div>

          <div className="mt-6 pt-6 border-t border-border">
            <p className="text-xs text-muted-foreground mb-2">
              Demo Credentials:
            </p>
            <div className="bg-muted/50 rounded-lg p-3 space-y-1 text-xs font-mono">
              <p className="text-foreground">
                Admin: admin@example.com / admin123
              </p>
              <p className="text-muted-foreground">
                (Or register as a new student)
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
