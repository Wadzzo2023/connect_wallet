import clsx from "clsx";
import React, { useEffect, useState } from "react";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  AuthErrorCodes,
  AuthError,
  onAuthStateChanged,
  User,
} from "firebase/auth";

import { useMutation } from "@tanstack/react-query";

import toast from "react-hot-toast";
import { auth } from "~/lib/firebase/firebase-auth";
import { SubmitHandler, useForm } from "react-hook-form";
import { emailPassLogin } from "../lib/stellar/wallet_clients/email_pass";
import { useConnectWalletStateStore } from "../state/connect_wallet_state";
import { WalletType } from "../lib/enums";

enum Tab {
  LOGIN,
  SIGNUP,
}

function LoginPage() {
  const [activeTab, setActiveTab] = useState<Tab>(Tab.LOGIN);
  const walletState = useConnectWalletStateStore();
  const [loggedUser, setUser] = useState<User>();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        // User is signed in, see docs for a list of available properties
        // https://firebase.google.com/docs/reference/js/firebase.User

        // const uid = user.uid;
        // ...
        setUser(user);
        toast.success("logged in");
      } else {
        // User is signed out
        // ...
        setUser(undefined);
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (
      auth.currentUser &&
      auth.currentUser.emailVerified &&
      walletState.walletType !== WalletType.emailPass
    ) {
      void (async () => await emailPassLogin(walletState))();
    }
  }, [loggedUser]);

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
        <div className="w-full max-w-md px-4">
          <LoginForm tab={activeTab} />
        </div>
      )}
    </div>
  );
}

interface IFrom {
  tab: Tab;
}

type Inputs = {
  email: string;
  password: string;
};
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
  } = useForm<Inputs>({
    defaultValues: {},
  });

  const submitMutation = useMutation({
    mutationFn: (data: Inputs) => loginUser(data.email, data.password),
    onSuccess: (userCredential) => {
      const user = userCredential.user;
      toast.success("User successfully logged in");
      console.log(userCredential);
      resetPasswordMutation.reset();
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
      className="flex w-full flex-col gap-2 "
      onSubmit={handleSubmit(onSubmit)}
    >
      <label className="form-control w-full ">
        <input
          type="email"
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
          required
          {...register("password", {
            required: true,
            minLength: {
              value: 6,
              message: "Password length should be minimum 6",
            },
          })}
          type="password"
          placeholder="Enter you password"
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
      <button className="btn btn-secondary" type="submit">
        {submitMutation.isLoading && (
          <span className="loading loading-spinner"></span>
        )}
        Submit
        {/* <input  type="submit" /> */}
      </button>
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

function loginUser(email: string, password: string) {
  return signInWithEmailAndPassword(auth, email, password);
}

function resetPassword(email: string) {
  return sendPasswordResetEmail(auth, email);
}
