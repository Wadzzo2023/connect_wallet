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
import axios from "axios";
import { Loader2 } from "lucide-react";
import { signIn, useSession } from "next-auth/react";
import { SubmitHandler, useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { z } from "zod";
import { AuthCredentialType } from "~/types/auth";
import { WalletType } from "../lib/enums";
import { auth } from "../lib/firebase/firebase-auth";
import { Button } from "../shadcn/ui/button";
import { handleFireBaseAuthError } from "./firebase-error";
import { Input } from "~/components/shadcn/ui/input";
import { useDialogStore } from "../state/connect_wallet_dialog";

const formSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
})

type FormInputs = z.infer<typeof formSchema>

export default function LoginForm() {
  const { setIsOpen } = useDialogStore()
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [verifyEmail, setVerifyEmail] = useState(false)
  const session = useSession()

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
  } = useForm<FormInputs>({
    resolver: zodResolver(formSchema),
    defaultValues: {},
  })

  const loginMutation = useMutation({
    mutationFn: (data: FormInputs) => loginUser(data.email, data.password),
    onSuccess: async (res, variables) => {
      setIsOpen(false)

      if (res?.ok) {
        toast.success("Successfully logged in")
      }

      if (res?.error) {
        handleFireBaseAuthError({
          error: res.error,
          email: variables.email,
          password: variables.password,
          setVerifyEmail,
        })
      }
    },
    onError: (error: AuthError) => {
      const errorCode = error.code
      if (errorCode === AuthErrorCodes.INVALID_PASSWORD) {
        toast.error("Invalid credentials")
      } else {
        toast.error(error.message)
      }
    },
  })

  async function loginUser(email: string, password: string) {
    await auth.signOut()

    return await signIn("credentials", {
      redirect: false,
      password,
      email,
      walletType: WalletType.emailPass,
    } as AuthCredentialType)
  }

  const onSubmit: SubmitHandler<FormInputs> = (data) => {
    loginMutation.mutate(data)
  }

  return (
    <form className="flex w-full flex-col gap-3" onSubmit={handleSubmit(onSubmit)}>
      <div className="space-y-1">
        <Input
          type="email"
          disabled={loginMutation.isLoading}
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
          disabled={loginMutation.isLoading}
          required
          {...register("password")}
          placeholder="Password"
          className="w-full"
        />
        {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
      </div>

      {verifyEmail && <p className="text-sm text-amber-600">Check your email to verify your account.</p>}

      <Button disabled={loginMutation.isLoading} type="submit" className="w-full">
        {loginMutation.isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Sign In
      </Button>
    </form>
  )
}