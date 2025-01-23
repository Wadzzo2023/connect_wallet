

import { AuthErrorCodes, createUserWithEmailAndPassword, sendEmailVerification } from "firebase/auth";
import toast from "react-hot-toast";
import { auth } from "../lib/firebase/firebase-auth";
import { set } from "date-fns";

type errorType = {
    error: string;
    email?: string;
    password?: string;
    setVerifyEmail?: (value: boolean) => void;
    setForgetPass?: (value: boolean) => void;
}


export const handleFireBaseAuthError = async ({
    error,
    email,
    password,
    setVerifyEmail,
    setForgetPass
}: errorType) => {
    if (error.includes(AuthErrorCodes.ADMIN_ONLY_OPERATION))
        return toast("Admin-only operation.", { ...commonToastStyles });
    else if (error.includes(AuthErrorCodes.ARGUMENT_ERROR))
        return toast("Invalid arguments provided.", { ...commonToastStyles });
    else if (error.includes(AuthErrorCodes.APP_NOT_AUTHORIZED))
        return toast("The app is not authorized.", { ...commonToastStyles });
    else if (error.includes(AuthErrorCodes.APP_NOT_INSTALLED))
        return toast("The app is not installed.", { ...commonToastStyles });
    else if (error.includes(AuthErrorCodes.CAPTCHA_CHECK_FAILED))
        return toast("Captcha check failed.", { ...commonToastStyles });
    else if (error.includes(AuthErrorCodes.CODE_EXPIRED))
        return toast("The code has expired.", { ...commonToastStyles });
    else if (error.includes(AuthErrorCodes.CORDOVA_NOT_READY))
        return toast("Cordova is not ready.", { ...commonToastStyles });
    else if (error.includes(AuthErrorCodes.CORS_UNSUPPORTED))
        return toast("CORS is unsupported on this device.", { ...commonToastStyles });
    else if (error.includes(AuthErrorCodes.CREDENTIAL_ALREADY_IN_USE))
        return toast("This credential is already in use.", { ...commonToastStyles });
    else if (error.includes(AuthErrorCodes.CREDENTIAL_MISMATCH))
        return toast("Custom token mismatch.", { ...commonToastStyles });
    else if (error.includes(AuthErrorCodes.CREDENTIAL_TOO_OLD_LOGIN_AGAIN))
        return toast("Credential is too old. Please log in again.", { ...commonToastStyles });
    else if (error.includes(AuthErrorCodes.DEPENDENT_SDK_INIT_BEFORE_AUTH))
        return toast("Dependent SDK initialized before auth.", { ...commonToastStyles });
    else if (error.includes(AuthErrorCodes.DYNAMIC_LINK_NOT_ACTIVATED))
        return toast("Dynamic link is not activated.", { ...commonToastStyles });
    else if (error.includes(AuthErrorCodes.EMAIL_CHANGE_NEEDS_VERIFICATION))
        return toast("Email change needs verification.", { ...commonToastStyles });
    else if (error.includes(AuthErrorCodes.EMAIL_EXISTS))
        return toast("Email already in use.", { ...commonToastStyles });
    else if (error.includes(AuthErrorCodes.EMULATOR_CONFIG_FAILED))
        return toast("Emulator configuration failed.", { ...commonToastStyles });
    else if (error.includes(AuthErrorCodes.EXPIRED_OOB_CODE))
        return toast("The action code has expired.", { ...commonToastStyles });
    else if (error.includes(AuthErrorCodes.EXPIRED_POPUP_REQUEST))
        return toast("Popup request expired.", { ...commonToastStyles });
    else if (error.includes(AuthErrorCodes.INTERNAL_ERROR))
        return toast("An internal error occurred.", { ...commonToastStyles });
    else if (error.includes(AuthErrorCodes.INVALID_API_KEY))
        return toast("Invalid API key.", { ...commonToastStyles });
    else if (error.includes(AuthErrorCodes.INVALID_APP_CREDENTIAL))
        return toast("Invalid app credential.", { ...commonToastStyles });
    else if (error.includes(AuthErrorCodes.INVALID_APP_ID))
        return toast("Invalid app ID.", { ...commonToastStyles });
    else if (error.includes(AuthErrorCodes.INVALID_AUTH))
        return toast("Invalid user token.", { ...commonToastStyles });
    else if (error.includes(AuthErrorCodes.INVALID_AUTH_EVENT))
        return toast("Invalid authentication event.", { ...commonToastStyles });
    else if (error.includes(AuthErrorCodes.INVALID_CERT_HASH))
        return toast("Invalid certificate hash.", { ...commonToastStyles });
    else if (error.includes(AuthErrorCodes.INVALID_CODE))
        return toast("Invalid verification code.", { ...commonToastStyles });
    else if (error.includes(AuthErrorCodes.INVALID_CONTINUE_URI))
        return toast("Invalid continue URI.", { ...commonToastStyles });
    else if (error.includes(AuthErrorCodes.INVALID_CORDOVA_CONFIGURATION))
        return toast("Invalid Cordova configuration.", { ...commonToastStyles });
    else if (error.includes(AuthErrorCodes.INVALID_CUSTOM_TOKEN))
        return toast("Invalid custom token.", { ...commonToastStyles });
    else if (error.includes(AuthErrorCodes.INVALID_DYNAMIC_LINK_DOMAIN))
        return toast("Invalid dynamic link domain.", { ...commonToastStyles });
    else if (error.includes(AuthErrorCodes.INVALID_EMAIL))
        return toast("Invalid email.", { ...commonToastStyles });
    else if (error.includes(AuthErrorCodes.INVALID_EMULATOR_SCHEME))
        return toast("Invalid emulator scheme.", { ...commonToastStyles });
    else if (error.includes(AuthErrorCodes.INVALID_IDP_RESPONSE))
        return toast("Invalid credential from IDP.", { ...commonToastStyles });
    else if (error.includes(AuthErrorCodes.INVALID_LOGIN_CREDENTIALS))
        return toast("Invalid login credentials.", { ...commonToastStyles });
    else if (error.includes(AuthErrorCodes.INVALID_MESSAGE_PAYLOAD))
        return toast("Invalid message payload.", { ...commonToastStyles });
    else if (error.includes(AuthErrorCodes.INVALID_MFA_SESSION))
        return toast("Invalid multi-factor session.", { ...commonToastStyles });
    else if (error.includes(AuthErrorCodes.INVALID_OAUTH_CLIENT_ID))
        return toast("Invalid OAuth client ID.", { ...commonToastStyles });
    else if (error.includes(AuthErrorCodes.INVALID_OAUTH_PROVIDER))
        return toast("Invalid OAuth provider.", { ...commonToastStyles });
    else if (error.includes(AuthErrorCodes.INVALID_OOB_CODE))
        return toast("Invalid action code.", { ...commonToastStyles });
    else if (error.includes(AuthErrorCodes.INVALID_ORIGIN))
        return toast("Unauthorized domain.", { ...commonToastStyles });
    else if (error.includes(AuthErrorCodes.INVALID_PASSWORD)) {
        setForgetPass?.(true);
        toast("Wrong password. Please try again.", { ...commonToastStyles });
        return;
    }
    else if (error.includes(AuthErrorCodes.INVALID_PERSISTENCE))
        return toast("Invalid persistence type.", { ...commonToastStyles });
    else if (error.includes(AuthErrorCodes.INVALID_PHONE_NUMBER))
        return toast("Invalid phone number.", { ...commonToastStyles });
    else if (error.includes(AuthErrorCodes.INVALID_PROVIDER_ID))
        return toast("Invalid provider ID.", { ...commonToastStyles });
    else if (error.includes(AuthErrorCodes.INVALID_RECIPIENT_EMAIL))
        return toast("Invalid recipient email.", { ...commonToastStyles });
    else if (error.includes(AuthErrorCodes.INVALID_SENDER))
        return toast("Invalid sender.", { ...commonToastStyles });
    else if (error.includes(AuthErrorCodes.INVALID_SESSION_INFO))
        return toast("Invalid session information.", { ...commonToastStyles });
    else if (error.includes(AuthErrorCodes.INVALID_TENANT_ID))
        return toast("Invalid tenant ID.", { ...commonToastStyles });
    else if (error.includes(AuthErrorCodes.MFA_INFO_NOT_FOUND))
        return toast("Multi-factor info not found.", { ...commonToastStyles });
    else if (error.includes(AuthErrorCodes.MFA_REQUIRED))
        return toast("Multi-factor authentication required.", { ...commonToastStyles });
    else if (error.includes(AuthErrorCodes.MISSING_ANDROID_PACKAGE_NAME))
        return toast("Missing Android package name.", { ...commonToastStyles });
    else if (error.includes(AuthErrorCodes.MISSING_APP_CREDENTIAL))
        return toast("Missing app credential.", { ...commonToastStyles });
    else if (error.includes(AuthErrorCodes.MISSING_AUTH_DOMAIN))
        return toast("Missing auth domain configuration.", { ...commonToastStyles });
    else if (error.includes(AuthErrorCodes.MISSING_CODE))
        return toast("Missing verification code.", { ...commonToastStyles });
    else if (error.includes(AuthErrorCodes.MISSING_CONTINUE_URI))
        return toast("Missing continue URI.", { ...commonToastStyles });
    else if (error.includes(AuthErrorCodes.MISSING_IFRAME_START))
        return toast("Missing iframe start.", { ...commonToastStyles });
    else if (error.includes(AuthErrorCodes.MISSING_IOS_BUNDLE_ID))
        return toast("Missing iOS bundle ID.", { ...commonToastStyles });
    else if (error.includes(AuthErrorCodes.MISSING_OR_INVALID_NONCE))
        return toast("Missing or invalid nonce.", { ...commonToastStyles });
    else if (error.includes(AuthErrorCodes.MISSING_MFA_INFO))
        return toast("Missing multi-factor info.", { ...commonToastStyles });
    else if (error.includes(AuthErrorCodes.MISSING_MFA_SESSION))
        return toast("Missing multi-factor session.", { ...commonToastStyles });
    else if (error.includes(AuthErrorCodes.MISSING_PHONE_NUMBER))
        return toast("Missing phone number.", { ...commonToastStyles });
    else if (error.includes(AuthErrorCodes.MISSING_SESSION_INFO))
        return toast("Missing session information.", { ...commonToastStyles });
    else if (error.includes(AuthErrorCodes.MODULE_DESTROYED))
        return toast("The app module has been destroyed.", { ...commonToastStyles });
    else if (error.includes(AuthErrorCodes.NEED_CONFIRMATION))
        return toast("Account exists with a different credential.", { ...commonToastStyles });
    else if (error.includes(AuthErrorCodes.NETWORK_REQUEST_FAILED))
        return toast("Network request failed.", { ...commonToastStyles });
    else if (error.includes(AuthErrorCodes.NULL_USER))
        return toast("No user is logged in.", { ...commonToastStyles });
    else if (error.includes(AuthErrorCodes.NO_AUTH_EVENT))
        return toast("No authentication event found.", { ...commonToastStyles });
    else if (error.includes(AuthErrorCodes.NO_SUCH_PROVIDER))
        return toast("No such provider exists.", { ...commonToastStyles });
    else if (error.includes(AuthErrorCodes.OPERATION_NOT_ALLOWED))
        return toast("Operation is not allowed.", { ...commonToastStyles });
    else if (error.includes(AuthErrorCodes.OPERATION_NOT_SUPPORTED))
        return toast("Operation is not supported in this environment.", { ...commonToastStyles });
    else if (error.includes(AuthErrorCodes.POPUP_BLOCKED))
        return toast("Popup was blocked.", { ...commonToastStyles });
    else if (error.includes(AuthErrorCodes.POPUP_CLOSED_BY_USER))
        return toast("Popup closed by the user.", { ...commonToastStyles });
    else if (error.includes(AuthErrorCodes.PROVIDER_ALREADY_LINKED))
        return toast("Provider is already linked.", { ...commonToastStyles });

    else if (error.includes(AuthErrorCodes.QUOTA_EXCEEDED))
        return toast("Quota exceeded. Please try again later.", { ...commonToastStyles });

    else if (error.includes(AuthErrorCodes.REDIRECT_CANCELLED_BY_USER))
        return toast("Redirect was cancelled by the user.", { ...commonToastStyles });

    else if (error.includes(AuthErrorCodes.REDIRECT_OPERATION_PENDING))
        return toast("A redirect operation is already pending.", { ...commonToastStyles });

    else if (error.includes(AuthErrorCodes.REJECTED_CREDENTIAL))
        return toast("The credential was rejected.", { ...commonToastStyles });

    else if (error.includes(AuthErrorCodes.SECOND_FACTOR_ALREADY_ENROLLED))
        return toast("Second factor already enrolled.", { ...commonToastStyles });

    else if (error.includes(AuthErrorCodes.SECOND_FACTOR_LIMIT_EXCEEDED))
        return toast("Maximum second factor count exceeded.", { ...commonToastStyles });

    else if (error.includes(AuthErrorCodes.TENANT_ID_MISMATCH))
        return toast("Tenant ID mismatch.", { ...commonToastStyles });

    else if (error.includes(AuthErrorCodes.TIMEOUT))
        return toast("The operation timed out. Please try again.", { ...commonToastStyles });

    else if (error.includes(AuthErrorCodes.TOKEN_EXPIRED))
        return toast("Your session token has expired. Please log in again.", { ...commonToastStyles });

    else if (error.includes(AuthErrorCodes.TOO_MANY_ATTEMPTS_TRY_LATER))
        return toast("Too many attempts. Please try again later.", { ...commonToastStyles });

    else if (error.includes(AuthErrorCodes.UNAUTHORIZED_DOMAIN))
        return toast("This domain is not authorized.", { ...commonToastStyles });

    else if (error.includes(AuthErrorCodes.UNSUPPORTED_FIRST_FACTOR))
        return toast("Unsupported first factor.", { ...commonToastStyles });

    else if (error.includes(AuthErrorCodes.UNSUPPORTED_PERSISTENCE))
        return toast("Unsupported persistence type.", { ...commonToastStyles });

    else if (error.includes(AuthErrorCodes.UNSUPPORTED_TENANT_OPERATION))
        return toast("Unsupported tenant operation.", { ...commonToastStyles });

    else if (error.includes(AuthErrorCodes.UNVERIFIED_EMAIL)) {
        setVerifyEmail?.(true);
        toast("Email is not verified. Check your email.", { ...commonToastStyles });
        return;
    }

    else if (error.includes(AuthErrorCodes.USER_CANCELLED))
        return toast("The user has cancelled the operation.", { ...commonToastStyles });

    else if (error.includes(AuthErrorCodes.USER_DELETED))
        return toast("User not found. Please signup first.", { ...commonToastStyles });

    else if (error.includes(AuthErrorCodes.USER_DISABLED))
        return toast("The user account has been disabled.", { ...commonToastStyles });

    else if (error.includes(AuthErrorCodes.USER_MISMATCH))
        return toast("User credentials do not match.", { ...commonToastStyles });

    else if (error.includes(AuthErrorCodes.USER_SIGNED_OUT))
        return toast("The user has been signed out.", { ...commonToastStyles });

    else if (error.includes(AuthErrorCodes.WEAK_PASSWORD))
        return toast("The password is too weak.", { ...commonToastStyles });

    else if (error.includes(AuthErrorCodes.WEB_STORAGE_UNSUPPORTED))
        return toast("Web storage is not supported on this browser.", { ...commonToastStyles });

    else if (error.includes(AuthErrorCodes.ALREADY_INITIALIZED))
        return toast("The app has already been initialized.", { ...commonToastStyles });

    else if (error.includes(AuthErrorCodes.RECAPTCHA_NOT_ENABLED))
        return toast("ReCAPTCHA is not enabled.", { ...commonToastStyles });

    else if (error.includes(AuthErrorCodes.MISSING_RECAPTCHA_TOKEN))
        return toast("ReCAPTCHA token is missing.", { ...commonToastStyles });

    else if (error.includes(AuthErrorCodes.INVALID_RECAPTCHA_TOKEN))
        return toast("Invalid ReCAPTCHA token.", { ...commonToastStyles });

    else if (error.includes(AuthErrorCodes.INVALID_RECAPTCHA_ACTION))
        return toast("Invalid ReCAPTCHA action.", { ...commonToastStyles });

    else if (error.includes(AuthErrorCodes.MISSING_CLIENT_TYPE))
        return toast("Client type is missing.", { ...commonToastStyles });

    else if (error.includes(AuthErrorCodes.MISSING_RECAPTCHA_VERSION))
        return toast("ReCAPTCHA version is missing.", { ...commonToastStyles });

    else if (error.includes(AuthErrorCodes.INVALID_RECAPTCHA_VERSION))
        return toast("Invalid ReCAPTCHA version.", { ...commonToastStyles });

    else if (error.includes(AuthErrorCodes.INVALID_REQ_TYPE))
        return toast("Invalid request type.", { ...commonToastStyles });

    else if (error.includes(AuthErrorCodes.TOO_MANY_ATTEMPTS_TRY_LATER))
        return toast("Too many attempts. Please try again later.", { ...commonToastStyles });

    else
        return toast("Unknown error. Please contact support.", { ...commonToastStyles });

};
const commonToastStyles = {
    duration: 3000,
    icon: "❌",
};