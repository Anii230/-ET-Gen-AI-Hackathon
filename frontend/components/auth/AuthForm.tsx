"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Eye, EyeOff, Mail, Lock, User, AlertCircle, Globe } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type AuthMode = "login" | "signup";

interface FieldError {
  email?: string;
  password?: string;
  name?: string;
}

function validate(
  mode: AuthMode,
  values: { email: string; password: string; name: string }
): FieldError {
  const errors: FieldError = {};
  if (!values.email) errors.email = "Email is required";
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email))
    errors.email = "Enter a valid email address";
  if (!values.password) errors.password = "Password is required";
  else if (values.password.length < 8)
    errors.password = "Password must be at least 8 characters";
  if (mode === "signup" && !values.name) errors.name = "Name is required";
  return errors;
}

function InputField({
  id,
  label,
  type,
  value,
  onChange,
  placeholder,
  error,
  icon: Icon,
  rightElement,
}: {
  id: string;
  label: string;
  type: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  error?: string;
  icon: React.ElementType;
  rightElement?: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-sm font-medium text-foreground">
        {label}
      </label>
      <div className="relative" suppressHydrationWarning>
        <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          id={id}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          suppressHydrationWarning
          className={`w-full pl-10 ${rightElement ? "pr-10" : "pr-4"} py-3 rounded-xl border text-sm bg-background placeholder:text-muted-foreground/60 focus-visible:ring-2 focus-visible:ring-primary focus:outline-none transition-all duration-200 ${
            error
              ? "border-destructive focus-visible:ring-destructive/50"
              : "border-border focus:border-primary/50"
          }`}
          aria-describedby={error ? `${id}-error` : undefined}
          aria-invalid={!!error}
        />
        {rightElement && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">{rightElement}</div>
        )}
      </div>
      <AnimatePresence mode="wait">
        {error && (
          <motion.p
            id={`${id}-error`}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.15 }}
            role="alert"
            className="flex items-center gap-1.5 text-xs text-destructive overflow-hidden"
          >
            <AlertCircle className="w-3 h-3 flex-shrink-0" />
            {error}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

export function AuthForm() {
  const [mode, setMode] = useState<AuthMode>("login");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<FieldError>({});
  const [authError, setAuthError] = useState<string | null>(null);
  const [values, setValues] = useState({ email: "", password: "", name: "" });
  const shouldReduceMotion = useReducedMotion();
  const router = useRouter();

  const setValue = (key: keyof typeof values) => (v: string) => {
    setValues((prev) => ({ ...prev, [key]: v }));
    setAuthError(null);
    if (errors[key as keyof FieldError]) {
      setErrors((prev) => ({ ...prev, [key]: undefined }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const fieldErrors = validate(mode, values);
    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors);
      return;
    }
    setLoading(true);
    setAuthError(null);
    const supabase = createClient();

    if (mode === "login") {
      const { error } = await supabase.auth.signInWithPassword({
        email: values.email,
        password: values.password,
      });
      if (error) {
        setAuthError(error.message);
        setLoading(false);
        return;
      }
      localStorage.removeItem("et_ai_onboarded");
      localStorage.removeItem("et_ai_bookmarks");
    } else {
      const { error } = await supabase.auth.signUp({
        email: values.email,
        password: values.password,
        options: { data: { full_name: values.name } },
      });
      if (error) {
        setAuthError(error.message);
        setLoading(false);
        return;
      }
      localStorage.removeItem("et_ai_onboarded");
      localStorage.removeItem("et_ai_bookmarks");
    }

    router.push("/home");
    router.refresh();
  };

  const switchMode = (newMode: AuthMode) => {
    if (newMode === mode) return;
    setMode(newMode);
    setErrors({});
    setValues({ email: "", password: "", name: "" });
  };

  const itemInitial = shouldReduceMotion ? {} : { opacity: 0, y: 10 };
  const itemAnimate = shouldReduceMotion ? {} : { opacity: 1, y: 0 };
  const itemTransition = { duration: 0.3 };

  return (
    <div className="flex-1 flex flex-col justify-center py-12 px-6 sm:px-10 lg:px-14">
      <div className="max-w-sm w-full mx-auto">
        {/* Mode toggle */}
        <div className="flex items-center bg-muted rounded-xl p-1 mb-8">
          {(["login", "signup"] as AuthMode[]).map((m) => (
            <button
              key={m}
              onClick={() => switchMode(m)}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer capitalize ${
                mode === m
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {m === "login" ? "Sign In" : "Sign Up"}
            </button>
          ))}
        </div>

        {/* Heading */}
        <div className="mb-8">
          <h1 className="font-heading font-bold text-2xl text-foreground tracking-tight mb-1">
            {mode === "login" ? "Welcome back" : "Create your account"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {mode === "login"
              ? "Sign in to your personalised news feed"
              : "Start your AI-powered news journey"}
          </p>
        </div>

        <AnimatePresence mode="wait">
          <motion.form
            key={mode}
            initial={shouldReduceMotion ? {} : { opacity: 0 }}
            animate={shouldReduceMotion ? {} : { opacity: 1 }}
            exit={shouldReduceMotion ? {} : { opacity: 0 }}
            transition={{ duration: 0.2 }}
            onSubmit={handleSubmit}
            noValidate
            className="space-y-4"
          >
            {/* Name field — signup only */}
            <AnimatePresence>
              {mode === "signup" && (
                <motion.div
                  initial={itemInitial}
                  animate={itemAnimate}
                  exit={shouldReduceMotion ? {} : { opacity: 0, height: 0 }}
                  transition={itemTransition}
                >
                  <InputField
                    id="name"
                    label="Full name"
                    type="text"
                    value={values.name}
                    onChange={setValue("name")}
                    placeholder="Priya Sharma"
                    error={errors.name}
                    icon={User}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            <motion.div initial={itemInitial} animate={itemAnimate} transition={itemTransition}>
              <InputField
                id="email"
                label="Email address"
                type="email"
                value={values.email}
                onChange={setValue("email")}
                placeholder="you@company.com"
                error={errors.email}
                icon={Mail}
              />
            </motion.div>

            <motion.div initial={itemInitial} animate={itemAnimate} transition={{ ...itemTransition, delay: 0.07 }}>
              <InputField
                id="password"
                label="Password"
                type={showPassword ? "text" : "password"}
                value={values.password}
                onChange={setValue("password")}
                placeholder="At least 8 characters"
                error={errors.password}
                icon={Lock}
                rightElement={
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-muted-foreground hover:text-foreground transition-colors duration-200 cursor-pointer"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                }
              />
            </motion.div>

            {mode === "login" && (
              <motion.div
                initial={itemInitial}
                animate={itemAnimate}
                transition={{ ...itemTransition, delay: 0.1 }}
                className="flex justify-end"
              >
                <a
                  href="#"
                  className="text-xs text-primary hover:underline cursor-pointer focus-visible:ring-2 focus-visible:ring-primary rounded"
                >
                  Forgot password?
                </a>
              </motion.div>
            )}

            {/* Auth error banner */}
            <AnimatePresence mode="wait">
              {authError && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.2 }}
                  role="alert"
                  className="flex items-start gap-2.5 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
                >
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>{authError}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Submit */}
            <motion.div
              initial={itemInitial}
              animate={itemAnimate}
              transition={{ ...itemTransition, delay: 0.14 }}
            >
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary mt-2"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                    {mode === "login" ? "Signing in..." : "Creating account..."}
                  </span>
                ) : mode === "login" ? (
                  "Sign In"
                ) : (
                  "Create Account"
                )}
              </button>
            </motion.div>

            {/* Divider */}
            <motion.div
              initial={itemInitial}
              animate={itemAnimate}
              transition={{ ...itemTransition, delay: 0.18 }}
              className="relative flex items-center gap-3 py-1"
            >
              <div className="flex-1 h-px bg-border" />
              <span className="text-xs text-muted-foreground">or</span>
              <div className="flex-1 h-px bg-border" />
            </motion.div>

            {/* Google OAuth */}
            <motion.div
              initial={itemInitial}
              animate={itemAnimate}
              transition={{ ...itemTransition, delay: 0.21 }}
            >
              <button
                type="button"
                className="w-full flex items-center justify-center gap-2.5 py-3 rounded-xl border border-border text-sm font-medium text-foreground hover:bg-accent transition-all duration-200 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary"
              >
                <Globe className="w-4 h-4" />
                Continue with Google
              </button>
            </motion.div>
          </motion.form>
        </AnimatePresence>

        {/* Switch mode link */}
        <p className="mt-8 text-center text-xs text-muted-foreground">
          {mode === "login" ? "Don't have an account? " : "Already have an account? "}
          <button
            onClick={() => switchMode(mode === "login" ? "signup" : "login")}
            className="text-primary font-medium hover:underline cursor-pointer"
          >
            {mode === "login" ? "Sign up free" : "Sign in"}
          </button>
        </p>
      </div>
    </div>
  );
}
