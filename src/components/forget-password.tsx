"use client"

import { useState, useEffect } from "react"
import { useMutation } from "@tanstack/react-query"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2, Mail, CheckCircle } from "lucide-react"
import { type SubmitHandler, useForm } from "react-hook-form"
import toast from "react-hot-toast"
import { z } from "zod"
import { type AuthError, sendPasswordResetEmail } from "firebase/auth"

import { Button } from "~/components/shadcn/ui/button"
import { Input } from "~/components/shadcn/ui/input"
import { auth } from "../lib/firebase/firebase-auth";
import { useResetPasswordStore } from "../store/reset-password-store"

const formSchema = z.object({
    email: z.string().email("Please enter a valid email"),
})

type FormInputs = z.infer<typeof formSchema>

const COOLDOWN_SECONDS = 30

export default function ForgotPasswordForm() {
    const [emailSent, setEmailSent] = useState(false)
    const { startCooldown, cooldownRemaining, updateCooldownRemaining } = useResetPasswordStore()

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<FormInputs>({
        resolver: zodResolver(formSchema),
    })

    useEffect(() => {
        updateCooldownRemaining()

        const timer = setInterval(() => {
            updateCooldownRemaining()
        }, 1000)

        return () => clearInterval(timer)
    }, [updateCooldownRemaining])

    const resetMutation = useMutation({
        mutationFn: ({ email }: { email: string }) => sendPasswordResetEmail(auth, email),
        onSuccess: () => {
            toast.success("Password reset email sent!")
            startCooldown(30)
        },
        onError: (error: AuthError) => {
            toast.error(error.message)
        },
    })

    const onSubmit: SubmitHandler<FormInputs> = (data) => {
        if (cooldownRemaining > 0) return
        resetMutation.mutate({ email: data.email })
    }

    const isDisabled = resetMutation.isLoading || cooldownRemaining > 0

    return (
        <form className="flex w-full flex-col gap-4" onSubmit={handleSubmit(onSubmit)}>
            <div className="text-center mb-2">
                <Mail className="mx-auto h-12 w-12 text-muted-foreground mb-2" />
                <h3 className="text-lg font-semibold">Reset your password</h3>
                <p className="text-sm text-muted-foreground">
                    Enter your email address and we&apos;ll send you a link to reset your password.
                </p>
            </div>

            <div className="space-y-1">
                <Input
                    type="email"
                    disabled={resetMutation.isLoading}
                    required
                    {...register("email")}
                    placeholder="Enter your email"
                    className="w-full"
                />
                {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
            </div>

            {emailSent && (
                <div className="flex items-center gap-2 rounded-md bg-green-50 dark:bg-green-950 p-3 text-sm text-green-700 dark:text-green-300">
                    <CheckCircle className="h-4 w-4 flex-shrink-0" />
                    <span>Check your email for the password reset link.</span>
                </div>
            )}

            <Button disabled={isDisabled} type="submit" className="w-full">
                {resetMutation.isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {cooldownRemaining > 0 ? `Wait ${cooldownRemaining}s to resend` : "Send Reset Link"}
            </Button>

            {cooldownRemaining > 0 && (
                <p className="text-center text-xs text-muted-foreground">
                    You can request another reset email in {cooldownRemaining} seconds.
                </p>
            )}
        </form>
    )
}