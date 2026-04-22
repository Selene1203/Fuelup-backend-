"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ShieldCheck, Eye, EyeOff, User } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

export default function AdminLoginPage() {
  const router = useRouter();
  const { login } = useAuth();

  const [submitting, setSubmitting] = useState(false);
  const [showCode, setShowCode] = useState(false);
  
  const [formData, setFormData] = useState({
    firstName: "",
    surname: "",
    secretCode: "",
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.firstName.trim()) {
      newErrors.firstName = "First name is required";
    }

    if (!formData.surname.trim()) {
      newErrors.surname = "Surname is required";
    }

    if (!formData.secretCode.trim()) {
      newErrors.secretCode = "Secret code is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setSubmitting(true);

    try {
      const response = await api<{ token: string }>("/api/auth/admin-login", {
        method: "POST",
        body: JSON.stringify({ 
          secret_code: formData.secretCode,
          first_name: formData.firstName,
          surname: formData.surname,
        }),
      });

      login(response.token, true);
      toast.success(`Welcome back, ${formData.firstName}!`);
      router.push("/admin");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Admin login failed. Please check your credentials.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-8 bg-background">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 rounded-full bg-[#FF6B00]/10">
              <ShieldCheck className="h-8 w-8 text-[#FF6B00]" />
            </div>
          </div>
          <CardTitle className="text-2xl">Station Admin Login</CardTitle>
          <CardDescription className="text-muted-foreground">
            Enter your details and secret code to access the admin dashboard
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <div className="relative">
                  <Input
                    id="firstName"
                    type="text"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    placeholder="John"
                    className={errors.firstName ? "border-destructive" : ""}
                  />
                </div>
                {errors.firstName && (
                  <p className="text-xs text-destructive">{errors.firstName}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="surname">Surname</Label>
                <div className="relative">
                  <Input
                    id="surname"
                    type="text"
                    value={formData.surname}
                    onChange={(e) => setFormData({ ...formData, surname: e.target.value })}
                    placeholder="Doe"
                    className={errors.surname ? "border-destructive" : ""}
                  />
                </div>
                {errors.surname && (
                  <p className="text-xs text-destructive">{errors.surname}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="secret_code">Secret Code</Label>
              <div className="relative">
                <Input
                  id="secret_code"
                  type={showCode ? "text" : "password"}
                  value={formData.secretCode}
                  onChange={(e) => setFormData({ ...formData, secretCode: e.target.value })}
                  placeholder="Enter your station secret code"
                  className={errors.secretCode ? "border-destructive" : ""}
                />
                <button
                  type="button"
                  onClick={() => setShowCode(!showCode)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showCode ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {errors.secretCode && (
                <p className="text-xs text-destructive">{errors.secretCode}</p>
              )}
              <p className="text-xs text-muted-foreground">
                The secret code was provided when your station was registered
              </p>
            </div>

            <Button
              type="submit"
              className="w-full bg-[#FF6B00] hover:bg-[#FF6B00]/90 text-white"
              disabled={submitting}
            >
              {submitting ? <Spinner className="mr-2" /> : <User className="h-4 w-4 mr-2" />}
              {submitting ? "Logging in..." : "Login as Admin"}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm">
            <span className="text-muted-foreground">Not an admin? </span>
            <Link href="/login" className="text-[#FF6B00] hover:underline">
              User Login
            </Link>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
