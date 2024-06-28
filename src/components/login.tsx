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
import { signIn, useSession } from "next-auth/react";
import { Button } from "../shadcn/ui/button";
import { Loader2 } from "lucide-react";
import { USER_ACOUNT_URL, USER_ACOUNT_XDR_URL } from "../lib/stellar/constant";
import axios from "axios";
import { getPublicKeyAPISchema } from "../lib/stellar/wallet_clients/type";
import { submitActiveAcountXdr } from "../lib/stellar/wallet_clients/utils";
import { submitSignedXDRToServer4UserPubnet } from "../lib/stellar/trx/payment_fb_g";

function LoginPage() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);

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
    onSuccess: async (res, variables) => {
      if (res?.ok) {
        toast.success("User successfully logged in");
        resetPasswordMutation.reset();

        const res = await toast.promise(
          axios.get(USER_ACOUNT_XDR_URL, {
            params: {
              email: sesssion.data?.user.email,
            },
          }),
          {
            loading: "Getting public key...",
            success: "Received public key",
            error: "Unable to get public key",
          },
        );

        const xdr = res.data.xdr as string;
        if (xdr) {
          console.log(xdr, "xdr");
          const res = await toast.promise(
            submitSignedXDRToServer4UserPubnet(xdr),
            {
              loading: "Activating account...",
              success: "Request completed successfully",
              error: "While activating account error happened, Try again later",
            },
          );

          if (res) {
            toast.success("Account activated");
          } else {
            toast.error("Account activation failed");
          }
        }
      } else {
        console.log("current user dont here", currentUser);
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
  async function registerUser(email: string, password: string) {
    createUserWithEmailAndPassword(auth, email, password)
      .then((userCredential) => {
        // Signed up
        const user = userCredential.user;
        toast.success("Account created successfully! Now you can login.");
        setCurrentUser(user);
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
          disabled={submitMutation.isLoading}
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
      <Button disabled={submitMutation.isLoading} type="submit">
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
