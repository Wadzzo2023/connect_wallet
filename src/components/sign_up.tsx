import {
  AuthError,
  AuthErrorCodes,
  User,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendEmailVerification,
  sendPasswordResetEmail,
} from "firebase/auth";
import { useEffect, useState } from "react";

import { useMutation } from "@tanstack/react-query";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useSession } from "next-auth/react";
import { SubmitHandler, useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { z } from "zod";
import { WalletType } from "../lib/enums";
import { auth } from "../lib/firebase/firebase-auth";
import { Button } from "../shadcn/ui/button";
import { Input } from "~/components/shadcn/ui/input";
const formSchema = z
  .object({
    email: z.string().email("Please enter a valid email"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(8, "Password must be at least 8 characters"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  })

type FormInputs = z.infer<typeof formSchema>

interface SignUpFormProps {
  onSuccess?: () => void
}

export default function SignUpForm({ onSuccess }: SignUpFormProps) {
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [emailSent, setEmailSent] = useState(false)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user)
    })
    return unsubscribe
  }, [])

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<FormInputs>({
    resolver: zodResolver(formSchema),
  })

  const registerMutation = useMutation({
    mutationFn: async (data: FormInputs) => {
      const cred = await createUserWithEmailAndPassword(auth, data.email, data.password)
      const user = cred.user
      if (!user.emailVerified) {
        await sendEmailVerification(user)
      }
      return user
    },
    onSuccess: (user) => {
      toast.success("Account created! Please check your email to verify.")
      setEmailSent(true)
      reset()
      // Optionally navigate back to login after successful signup
      setTimeout(() => {
        onSuccess?.()
      }, 2000)
    },
    onError: (error: AuthError) => {
      if (error.code === AuthErrorCodes.EMAIL_EXISTS) {
        toast.error("An account with this email already exists")
      } else {
        toast.error(error.message)
      }
    },
  })

  const onSubmit: SubmitHandler<FormInputs> = (data) => {
    registerMutation.mutate(data)
  }

  return (
    <form className="flex w-full flex-col gap-3" onSubmit={handleSubmit(onSubmit)}>
      <div className="space-y-1">
        <Input
          type="email"
          disabled={registerMutation.isLoading}
          required
          {...register("email")}
          placeholder="Email"
          className="w-full"
        />
        {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
      </div>

      <div className="space-y-1">
        <Input
          type="password"
          disabled={registerMutation.isLoading}
          required
          {...register("password")}
          placeholder="Password"
          className="w-full"
        />
        {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
      </div>

      <div className="space-y-1">
        <Input
          type="password"
          disabled={registerMutation.isLoading}
          required
          {...register("confirmPassword")}
          placeholder="Confirm Password"
          className="w-full"
        />
        {errors.confirmPassword && <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>}
      </div>

      {emailSent && <p className="text-sm text-green-600">Verification email sent! Please check your inbox.</p>}

      <Button disabled={registerMutation.isLoading} type="submit" className="w-full">
        {registerMutation.isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Create Account
      </Button>
    </form>
  )
}