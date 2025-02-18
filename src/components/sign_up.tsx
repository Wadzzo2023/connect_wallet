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

function SignUP() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [confirmPass, setConfirmPass] = useState<string>();

  const sesssion = useSession();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        // User is signed in.
        setCurrentUser(user);
      } else {
        // No user is signed in.
        setCurrentUser(null);
      }
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    if (sesssion.status == "authenticated") {
      const user = sesssion.data.user;
      if (user.walletType == WalletType.emailPass) {
        // void (async () => await emailPassLogin(walletState))();
      }
    }
    // if (
    //   auth.currentUser &&
    //   auth.currentUser.emailVerified &&
    //   walletState.walletType !== WalletType.emailPass
    // ) {
    //   void (async () => await emailPassLogin(walletState))();
    // }
  }, [sesssion.status]);

  const formSchema = z.object({
    email: z.string().email(),
    password: z.string().min(8),
  });

  type Inputs = z.infer<typeof formSchema>;

  const [forgetPassword, setForgetPass] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
    getValues,
  } = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {},
  });

  const submitMutation = useMutation({
    mutationFn: (data: Inputs) => registerUser(data.email, data.password),
    onSuccess: async (res, variables) => {
      if (res) {
        // emailVerifiedMutation.mutate({ user: res });
        console.log(res);
      }
      // Invalidate and refetch
    },
    onError: (error: AuthError, variables) => {
      const errorCode = error.code;
      if (errorCode == AuthErrorCodes.USER_DELETED) {
        // user is not signed In
        // registerUser(variables.email, variables.password);
      } else if (errorCode == AuthErrorCodes.INVALID_PASSWORD) {
        // passowrd invalid
        toast.error("Invalid Credential");
        setForgetPass(true);
      } else {
        const errorMessage = error.message;
        toast.error(`${errorCode} ${errorMessage}`);
        console.log(error);
      }
    },
  });

  const emailVerifiedMutation = useMutation({
    mutationFn: ({ user }: { user: User }) => sendEmailVerification(user),
    onSuccess(data, variables, context) {
      toast.success("email sent");
    },
    onError(error: AuthError, variables, context) {
      const errorCode = error.code;
      const errorMessage = error.message;
      toast.error(errorMessage);
      console.log(error);
    },
  });

  const resetPasswordMutation = useMutation({
    mutationFn: ({ email }: { email: string }) => resetPassword(email),
    onSuccess(data, variables, context) {
      toast.success("email sent");
    },
    onError(error: AuthError, variables, context) {
      const errorCode = error.code;
      const errorMessage = error.message;
      toast.error(errorMessage);
      console.log(error);
    },
  });

  const onSubmit: SubmitHandler<Inputs> = (data) => {
    submitMutation.mutate(data);
  };

  async function registerUser(email: string, password: string) {
    if (password !== confirmPass) {
      alert("Password not matched");
      return;
    }
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      const user = cred.user;
      if (!user.emailVerified) {
        emailVerifiedMutation.mutate({ user: user });
      }
      console.log(user);
      return user;
    } catch (error: unknown) {
      const err = error as AuthError;
      if (err.code == AuthErrorCodes.EMAIL_EXISTS) {
        toast.error("Email already exists");
      } else {
        const errorMessage = err.message;
        toast.error(errorMessage);
        console.log(err);
      }
    }
  }

  function resetPassword(email: string) {
    return sendPasswordResetEmail(auth, email);
  }

  return (
    <form
      className="flex w-full flex-col gap-2 rounded-lg "
      onSubmit={handleSubmit(onSubmit)}
    >
      <label className="form-control w-full ">
        <input
          type="email"
          disabled={submitMutation.isLoading}
          required
          {...register("email", { required: true })}
          placeholder="Email"
          className="input input-bordered w-full "
        />
        {errors.email && (
          <div className="label">
            <span className="label-text-alt">{errors.email.message}</span>
          </div>
        )}
      </label>
      <label className="form-control w-full max-w-md">
        <input
          disabled={submitMutation.isLoading}
          required
          {...register("password")}
          type="password"
          placeholder="Password"
          className="input input-bordered w-full "
        />
        {(errors.password ?? forgetPassword) && (
          <div className="label">
            {errors.password && (
              <span className="label-text-alt">{errors.password.message}</span>
            )}
          </div>
        )}
      </label>

      <label className="form-control w-full max-w-md">
        <input
          disabled={submitMutation.isLoading}
          required
          onChange={(e) => setConfirmPass(e.target.value)}
          type="password"
          placeholder="Confirm Password"
          className="input input-bordered w-full "
        />
      </label>
      {emailVerifiedMutation.isSuccess && (
        <div className="label">
          <span className="label-text-alt">Email sent. verify email</span>
        </div>
      )}

      <Button disabled={submitMutation.isLoading} type="submit">
        {submitMutation.isLoading && (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        )}
        Sign up
      </Button>
    </form>
  );
}

export default SignUP;
