
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useNotifications } from "@/context/NotificationContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UserRole } from "@/types";
import { Activity } from "lucide-react";
import { toast } from "sonner";
//
export default function Register() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const { notifyAdminOfRegistration } = useNotifications();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState<UserRole>("student");
   const [adminCode, setAdminCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name || !email || !password || !confirmPassword) {
      toast.error("Please fill in all fields");
      return;
    }

    if (role === "admin" && adminCode !== "ADMIN2024") {
  toast.error("Invalid admin code");
  return;
}
    
    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    const strongPassword = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{12,}$/;
    if (!strongPassword.test(password)) {
      toast.error("Use 12+ chars with upper, lower, number, and special character");
      return;
    }

    setIsLoading(true);

    try {
      // Call backend API for registration
      const result = await register(email, name, password, role);
      
      // Notify admin about new registration
      notifyAdminOfRegistration(name, "");
      
      toast.success(result.message || "Registration successful. Please verify your email.");
      
      // Redirect to OTP verification
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
          <h1 className="text-2xl font-bold text-foreground mb-2 text-center">
            Create Account
          </h1>
          <p className="text-center text-muted-foreground mb-6">
            Register to join Activity Hub Manager
          </p>

          <form onSubmit={handleRegister} className="space-y-4">
            {/* Role Selection - redirect to AdminRegister for admin */}
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">
                Register As
              </label>
              <div className="grid grid-cols-2 gap-3">
                {(["student", "admin"] as const).map((userRole) => (
                  <button
                    key={userRole}
                    type="button"
                    onClick={() => {
                      setRole(userRole); 
                      }}
                    className={`px-4 py-2 rounded-lg border-2 font-medium capitalize transition-all ${
                      role === userRole
                        ? "border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400"
                        : "border-border bg-background text-foreground hover:border-border/80"
                    }`}
                  >
                    {userRole === "admin" ? "Admin (with code)" : "Student"}
                  </button>
                ))}
              </div>
            </div>
            
              {role === "admin" && (
  <div>
    <label className="text-sm font-medium mb-2 block">
      Admin Secret Code
    </label>
    <Input
      type="password"
      placeholder="Enter admin code"
      value={adminCode}
      onChange={(e) => setAdminCode(e.target.value)}
      className="h-10"
    />
  </div>
)}
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
                placeholder="your@email.com"
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
              {isLoading ? "Creating Account..." : "Create Account"}
            </Button>
          </form>

          {/* Footer */}
          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link
                to="/login"
                className="text-blue-600 hover:text-blue-700 dark:text-blue-400 font-medium"
              >
                Sign in here
              </Link>
            </p>
          </div>

          {/* Info Box */}
          <div className="mt-6 pt-6 border-t border-border">
            <div className="bg-muted/50 rounded-lg p-3 text-xs">
              <p className="text-foreground font-medium">Student Account</p>
              <p className="text-muted-foreground">
                Verify your email to activate your account
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
