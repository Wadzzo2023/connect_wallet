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

import { SubmitHandler, useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { AuthCredentialType } from "~/types/auth";
import { WalletType } from "../lib/enums";
import { auth } from "../lib/firebase/firebase-auth";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { signIn } from "next-auth/react";
import { Button } from "../shadcn/ui/button";
import { Loader2 } from "lucide-react";

enum Tab {
  LOGIN,
  SIGNUP,
}

function LoginPage() {
  const [activeTab, setActiveTab] = useState<Tab>(Tab.LOGIN);
  const [loggedUser, setUser] = useState<User>();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUser(user);
        toast.success("logged in");
      } else {
        setUser(undefined);
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // useEffect(() => {
  //   if (
  //     auth.currentUser &&
  //     auth.currentUser.emailVerified &&
  //     walletState.walletType !== WalletType.emailPass
  //   ) {
  //     void (async () => await emailPassLogin(walletState))();
  //   }
  // }, [loggedUser]);

  const signOutMutation = useMutation({
    mutationFn: () => auth.signOut(),
    onSuccess: () => {
      verifyEmailMutation.reset();
      toast.success("logged out");
    },
    onError: () => toast.error("Error happended"),
  });

  const verifyEmailMutation = useMutation({
    mutationFn: (user: User) => sendEmailVerification(user),
    onSuccess: () => toast.success("verifycation email send sucessfully"),
  });

  useEffect(() => {
    if (!z.string().email().safeParse(loggedUser?.email).success) {
      auth.signOut().catch((error) => {
        console.error("Error signing out", error);
      });
    }
  }, [loggedUser]);

  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-2">
      {loggedUser ? (
        <div className="max-w-md">
          <p className="text-xl font-bold">Email: {loggedUser.email}</p>

          {loggedUser && !loggedUser.emailVerified && (
            <div>
              <p className="text-xl">
                To get wallet account, you have to verify your email.
              </p>
              {verifyEmailMutation.isSuccess && (
                <>
                  <p className="text-xl">Check your email to verify account</p>
                </>
              )}

              <button
                className="btn btn-secondary mb-3 mt-6 w-full"
                disabled={verifyEmailMutation.isSuccess}
                onClick={() => verifyEmailMutation.mutate(loggedUser)}
              >
                {verifyEmailMutation.isLoading && (
                  <span className="loading loading-spinner"></span>
                )}
                Verify Email
              </button>
            </div>
          )}
          <button
            className="btn btn-secondary w-full"
            onClick={() => signOutMutation.mutate()}
          >
            {signOutMutation.isLoading && (
              <span className="loading loading-spinner"></span>
            )}
            Logout
          </button>
        </div>
      ) : (
        <div className="w-full max-w-md">
          <LoginForm tab={activeTab} />
        </div>
      )}
    </div>
  );
}

interface IFrom {
  tab: Tab;
}

const formSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

type Inputs = z.infer<typeof formSchema>;
function LoginForm({ tab }: IFrom) {
  const [forgetPassword, setForgetPass] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
    control,
    trigger,
    watch,
    reset,
    setError,
    clearErrors,
    getValues,
  } = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {},
  });

  const submitMutation = useMutation({
    mutationFn: (data: Inputs) => loginUser(data.email, data.password),
    onSuccess: (res, variables) => {
      if (res?.ok) {
        toast.success("User successfully logged in");
        resetPasswordMutation.reset();
      }
      if (res?.error) {
        const error = res.error;
        if (error.includes(AuthErrorCodes.USER_DELETED)) {
          registerUser(variables.email, variables.password);
        } else if (error.includes(AuthErrorCodes.INVALID_PASSWORD)) {
          toast.error("Invalidate Credential");
          setForgetPass(true);
        } else toast.error(res.error);
      }
      // Invalidate and refetch
    },
    onError: (error: AuthError, variables) => {
      const errorCode = error.code;
      if (errorCode == AuthErrorCodes.USER_DELETED) {
        // user is not signed In
        registerUser(variables.email, variables.password);
      } else if (errorCode == AuthErrorCodes.INVALID_PASSWORD) {
        // passowrd invalid
        toast.error("Invalidate Credential");
        setForgetPass(true);
      } else {
        const errorMessage = error.message;
        toast.error(`${errorCode} ${errorMessage}`);
        console.log(error);
      }
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

  return (
    <form
      className="flex w-full flex-col gap-2 rounded-lg "
      onSubmit={handleSubmit(onSubmit)}
    >
      <label className="form-control w-full ">
        <input
          type="email"
          required
          {...register("email", { required: true })}
          placeholder="Enter Email"
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
          required
          {...register("password")}
          type="password"
          placeholder="Enter password"
          className="input input-bordered w-full "
        />
        {(errors.password ?? forgetPassword) && (
          <div className="label">
            {errors.password && (
              <span className="label-text-alt">{errors.password.message}</span>
            )}
            {forgetPassword && (
              <span className="label-text-alt hover:text-base-300">
                <a
                  className="btn btn-link btn-sm"
                  onClick={() =>
                    resetPasswordMutation.mutate({ email: getValues("email") })
                  }
                >
                  {resetPasswordMutation.isLoading && (
                    <span className="loading loading-spinner"></span>
                  )}
                  Forget Passowrd?
                </a>
              </span>
            )}
          </div>
        )}
      </label>
      {resetPasswordMutation.isSuccess && (
        <p>Check you email to reset password</p>
      )}
      <Button type="submit">
        {submitMutation.isLoading && (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        )}
        LOGIN
        {/* <input  type="submit" /> */}
      </Button>
    </form>
  );
}

export default LoginPage;

function registerUser(email: string, password: string) {
  createUserWithEmailAndPassword(auth, email, password)
    .then((userCredential) => {
      // Signed up
      const user = userCredential.user;
      toast.success("A new account is created");
      console.log(userCredential);
      // send verification email
    })
    .catch((error: AuthError) => {
      const errorCode = error.code;
      const errorMessage = error.message;
      toast.error(errorMessage);
      console.log(error);
      // ..
    });
}

async function loginUser(email: string, password: string) {
  await auth.signOut();
  return await signIn("credentials", {
    redirect: false,
    password,
    email,
    walletType: WalletType.emailPass,
  } as AuthCredentialType);
  // return signInWithEmailAndPassword(auth, email, password);
}

function resetPassword(email: string) {
  return sendPasswordResetEmail(auth, email);
}
