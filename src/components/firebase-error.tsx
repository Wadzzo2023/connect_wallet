import { AuthErrorCodes } from "firebase/auth";
import toast from "react-hot-toast";

const AuthErrorMessages = {
    ARGUMENT_ERROR: "An invalid argument was provided. Please check your input and try again. Error Code: WZAR002",
    CAPTCHA_CHECK_FAILED: "The CAPTCHA verification failed. Please try again. Error Code: WZAR005",
    CODE_EXPIRED: "The verification code has expired. Please request a new one. Error Code: WZAR006",
    CREDENTIAL_ALREADY_IN_USE: "This credential is already associated with another account. Error Code: WZAR009",
    CREDENTIAL_MISMATCH: "The provided credentials do not match. Please check and try again. Error Code: WZAR010",
    CREDENTIAL_TOO_OLD_LOGIN_AGAIN: "Your session has expired. Please log in again. Error Code: WZAR011",
    EMAIL_CHANGE_NEEDS_VERIFICATION: "Your email change requires verification. Please check your inbox. Error Code: WZAR014",
    EMAIL_EXISTS: "This email is already in use. Please use a different email. Error Code: WZAR015",
    EXPIRED_OOB_CODE: "The out-of-band code has expired. Please request a new one. Error Code: WZAR017",
    EXPIRED_POPUP_REQUEST: "The popup request was cancelled or expired. Please try again. Error Code: WZAR018",
    INVALID_CODE: "The verification code is invalid. Please check and try again. Error Code: WZAR025",
    INVALID_EMAIL: "The email address is invalid. Please check and try again. Error Code: WZAR030",
    INVALID_LOGIN_CREDENTIALS: "The login credentials are invalid. Please check and try again. Error Code: WZAR033",
    INVALID_PASSWORD: "The password is incorrect. Please check and try again. Error Code: WZAR040",
    INVALID_PHONE_NUMBER: "The phone number is invalid. Please check and try again. Error Code: WZAR042",
    MISSING_PHONE_NUMBER: "Please enter your phone number to continue. Error Code: WZAR060",
    NEED_CONFIRMATION: "This account already exists with different credentials. Please confirm your login method. Error Code: WZAR062",
    NETWORK_REQUEST_FAILED: "The network request failed. Please check your connection and try again. Error Code: WZAR063",
    NULL_USER: "No user is currently signed in. Error Code: WZAR064",
    POPUP_BLOCKED: "The popup was blocked. Please allow popups and try again. Error Code: WZAR069",
    POPUP_CLOSED_BY_USER: "The popup was closed by the user. Error Code: WZAR070",
    PROVIDER_ALREADY_LINKED: "This provider is already linked to your account. Error Code: WZAR071",
    QUOTA_EXCEEDED: "The quota for this operation has been exceeded. Error Code: WZAR072",
    REDIRECT_CANCELLED_BY_USER: "The redirect was cancelled by the user. Error Code: WZAR073",
    TIMEOUT: "The operation timed out. Please try again. Error Code: WZAR079",
    TOKEN_EXPIRED: "Your session has expired. Please log in again. Error Code: WZAR080",
    TOO_MANY_ATTEMPTS_TRY_LATER: "Too many attempts. Please try again later. Error Code: WZAR081",
    UNVERIFIED_EMAIL: "Your email is not verified. Please verify your email to continue. Error Code: WZAR086",
    USER_CANCELLED: "The operation was cancelled by the user. Error Code: WZAR087",
    USER_DELETED: "The user account was not found. Error Code: WZAR088",
    USER_DISABLED: "Your account has been disabled. Please contact support. Error Code: WZAR089",
    USER_MISMATCH: "The user does not match. Error Code: WZAR090",
    USER_SIGNED_OUT: "You have been signed out. Please log in again. Error Code: WZAR091",
    WEAK_PASSWORD: "The password is too weak. Please choose a stronger password. Error Code: WZAR092",

    // Software/Backend Errors
    ADMIN_ONLY_OPERATION: "An error has occurred. Please contact an admin or write an email to support@wadzzo.com with the following error code. Error Code: WZAR001",
    APP_NOT_AUTHORIZED: "An error has occurred. Please contact an admin or write an email to support@wadzzo.com with the following error code. Error Code: WZAR003",
    APP_NOT_INSTALLED: "An error has occurred. Please contact an admin or write an email to support@wadzzo.com with the following error code. Error Code: WZAR004",
    CORDOVA_NOT_READY: "An error has occurred. Please contact an admin or write an email to support@wadzzo.com with the following error code. Error Code: WZAR007",
    CORS_UNSUPPORTED: "An error has occurred. Please contact an admin or write an email to support@wadzzo.com with the following error code. Error Code: WZAR008",
    DEPENDENT_SDK_INIT_BEFORE_AUTH: "An error has occurred. Please contact an admin or write an email to support@wadzzo.com with the following error code. Error Code: WZAR012",
    DYNAMIC_LINK_NOT_ACTIVATED: "An error has occurred. Please contact an admin or write an email to support@wadzzo.com with the following error code. Error Code: WZAR013",
    EMULATOR_CONFIG_FAILED: "An error has occurred. Please contact an admin or write an email to support@wadzzo.com with the following error code. Error Code: WZAR016",
    INTERNAL_ERROR: "An error has occurred. Please contact an admin or write an email to support@wadzzo.com with the following error code. Error Code: WZAR103",
    INVALID_API_KEY: "An error has occurred. Please contact an admin or write an email to support@wadzzo.com with the following error code. Error Code: WZAR019",
    INVALID_APP_CREDENTIAL: "An error has occurred. Please contact an admin or write an email to support@wadzzo.com with the following error code. Error Code: WZAR020",
    INVALID_APP_ID: "An error has occurred. Please contact an admin or write an email to support@wadzzo.com with the following error code. Error Code: WZAR021",
    INVALID_AUTH: "An error has occurred. Please contact an admin or write an email to support@wadzzo.com with the following error code. Error Code: WZAR022",
    INVALID_AUTH_EVENT: "An error has occurred. Please contact an admin or write an email to support@wadzzo.com with the following error code. Error Code: WZAR023",
    INVALID_CERT_HASH: "An error has occurred. Please contact an admin or write an email to support@wadzzo.com with the following error code. Error Code: WZAR024",
    INVALID_CONTINUE_URI: "An error has occurred. Please contact an admin or write an email to support@wadzzo.com with the following error code. Error Code: WZAR026",
    INVALID_CORDOVA_CONFIGURATION: "An error has occurred. Please contact an admin or write an email to support@wadzzo.com with the following error code. Error Code: WZAR027",
    INVALID_CUSTOM_TOKEN: "An error has occurred. Please contact an admin or write an email to support@wadzzo.com with the following error code. Error Code: WZAR028",
    INVALID_DYNAMIC_LINK_DOMAIN: "An error has occurred. Please contact an admin or write an email to support@wadzzo.com with the following error code. Error Code: WZAR029",
    INVALID_EMULATOR_SCHEME: "An error has occurred. Please contact an admin or write an email to support@wadzzo.com with the following error code. Error Code: WZAR031",
    INVALID_IDP_RESPONSE: "An error has occurred. Please contact an admin or write an email to support@wadzzo.com with the following error code. Error Code: WZAR032",
    INVALID_MESSAGE_PAYLOAD: "An error has occurred. Please contact an admin or write an email to support@wadzzo.com with the following error code. Error Code: WZAR034",
    INVALID_MFA_SESSION: "An error has occurred. Please contact an admin or write an email to support@wadzzo.com with the following error code. Error Code: WZAR035",
    INVALID_OAUTH_CLIENT_ID: "An error has occurred. Please contact an admin or write an email to support@wadzzo.com with the following error code. Error Code: WZAR036",
    INVALID_OAUTH_PROVIDER: "An error has occurred. Please contact an admin or write an email to support@wadzzo.com with the following error code. Error Code: WZAR037",
    INVALID_OOB_CODE: "An error has occurred. Please contact an admin or write an email to support@wadzzo.com with the following error code. Error Code: WZAR038",
    INVALID_ORIGIN: "An error has occurred. Please contact an admin or write an email to support@wadzzo.com with the following error code. Error Code: WZAR039",
    INVALID_PERSISTENCE: "An error has occurred. Please contact an admin or write an email to support@wadzzo.com with the following error code. Error Code: WZAR041",
    INVALID_PROVIDER_ID: "An error has occurred. Please contact an admin or write an email to support@wadzzo.com with the following error code. Error Code: WZAR043",
    INVALID_RECIPIENT_EMAIL: "An error has occurred. Please contact an admin or write an email to support@wadzzo.com with the following error code. Error Code: WZAR044",
    INVALID_SENDER: "An error has occurred. Please contact an admin or write an email to support@wadzzo.com with the following error code. Error Code: WZAR045",
    INVALID_SESSION_INFO: "An error has occurred. Please contact an admin or write an email to support@wadzzo.com with the following error code. Error Code: WZAR046",
    INVALID_TENANT_ID: "An error has occurred. Please contact an admin or write an email to support@wadzzo.com with the following error code. Error Code: WZAR047",
    MFA_INFO_NOT_FOUND: "An error has occurred. Please contact an admin or write an email to support@wadzzo.com with the following error code. Error Code: WZAR048",
    MFA_REQUIRED: "An error has occurred. Please contact an admin or write an email to support@wadzzo.com with the following error code. Error Code: WZAR049",
    MISSING_ANDROID_PACKAGE_NAME: "An error has occurred. Please contact an admin or write an email to support@wadzzo.com with the following error code. Error Code: WZAR050",
    MISSING_APP_CREDENTIAL: "An error has occurred. Please contact an admin or write an email to support@wadzzo.com with the following error code. Error Code: WZAR051",
    MISSING_AUTH_DOMAIN: "An error has occurred. Please contact an admin or write an email to support@wadzzo.com with the following error code. Error Code: WZAR052",
    MISSING_CODE: "An error has occurred. Please contact an admin or write an email to support@wadzzo.com with the following error code. Error Code: WZAR053",
    MISSING_CONTINUE_URI: "An error has occurred. Please contact an admin or write an email to support@wadzzo.com with the following error code. Error Code: WZAR054",
    MISSING_IFRAME_START: "An error has occurred. Please contact an admin or write an email to support@wadzzo.com with the following error code. Error Code: WZAR055",
    MISSING_IOS_BUNDLE_ID: "An error has occurred. Please contact an admin or write an email to support@wadzzo.com with the following error code. Error Code: WZAR056",
    MISSING_OR_INVALID_NONCE: "An error has occurred. Please contact an admin or write an email to support@wadzzo.com with the following error code. Error Code: WZAR057",
    MISSING_MFA_INFO: "An error has occurred. Please contact an admin or write an email to support@wadzzo.com with the following error code. Error Code: WZAR058",
    MISSING_MFA_SESSION: "An error has occurred. Please contact an admin or write an email to support@wadzzo.com with the following error code. Error Code: WZAR059",
    MISSING_SESSION_INFO: "An error has occurred. Please contact an admin or write an email to support@wadzzo.com with the following error code. Error Code: WZAR061",
    NO_AUTH_EVENT: "An error has occurred. Please contact an admin or write an email to support@wadzzo.com with the following error code. Error Code: WZAR065",
    NO_SUCH_PROVIDER: "An error has occurred. Please contact an admin or write an email to support@wadzzo.com with the following error code. Error Code: WZAR066",
    OPERATION_NOT_ALLOWED: "An error has occurred. Please contact an admin or write an email to support@wadzzo.com with the following error code. Error Code: WZAR067",
    OPERATION_NOT_SUPPORTED: "An error has occurred. Please contact an admin or write an email to support@wadzzo.com with the following error code. Error Code: WZAR068",
    REDIRECT_OPERATION_PENDING: "An error has occurred. Please contact an admin or write an email to support@wadzzo.com with the following error code. Error Code: WZAR074",
    REJECTED_CREDENTIAL: "An error has occurred. Please contact an admin or write an email to support@wadzzo.com with the following error code. Error Code: WZAR075",
    SECOND_FACTOR_ALREADY_ENROLLED: "An error has occurred. Please contact an admin or write an email to support@wadzzo.com with the following error code. Error Code: WZAR076",
    SECOND_FACTOR_LIMIT_EXCEEDED: "An error has occurred. Please contact an admin or write an email to support@wadzzo.com with the following error code. Error Code: WZAR077",
    TENANT_ID_MISMATCH: "An error has occurred. Please contact an admin or write an email to support@wadzzo.com with the following error code. Error Code: WZAR078",
    UNAUTHORIZED_DOMAIN: "An error has occurred. Please contact an admin or write an email to support@wadzzo.com with the following error code. Error Code: WZAR082",
    UNSUPPORTED_FIRST_FACTOR: "An error has occurred. Please contact an admin or write an email to support@wadzzo.com with the following error code. Error Code: WZAR083",
    UNSUPPORTED_PERSISTENCE: "An error has occurred. Please contact an admin or write an email to support@wadzzo.com with the following error code. Error Code: WZAR084",
    UNSUPPORTED_TENANT_OPERATION: "An error has occurred. Please contact an admin or write an email to support@wadzzo.com with the following error code. Error Code: WZAR085",
    WEB_STORAGE_UNSUPPORTED: "An error has occurred. Please contact an admin or write an email to support@wadzzo.com with the following error code. Error Code: WZAR093",
    ALREADY_INITIALIZED: "An error has occurred. Please contact an admin or write an email to support@wadzzo.com with the following error code. Error Code: WZAR094",
    RECAPTCHA_NOT_ENABLED: "An error has occurred. Please contact an admin or write an email to support@wadzzo.com with the following error code. Error Code: WZAR095",
    MISSING_RECAPTCHA_TOKEN: "An error has occurred. Please contact an admin or write an email to support@wadzzo.com with the following error code. Error Code: WZAR096",
    INVALID_RECAPTCHA_TOKEN: "An error has occurred. Please contact an admin or write an email to support@wadzzo.com with the following error code. Error Code: WZAR097",
    INVALID_RECAPTCHA_ACTION: "An error has occurred. Please contact an admin or write an email to support@wadzzo.com with the following error code. Error Code: WZAR098",
    MISSING_CLIENT_TYPE: "An error has occurred. Please contact an admin or write an email to support@wadzzo.com with the following error code. Error Code: WZAR099",
    MISSING_RECAPTCHA_VERSION: "An error has occurred. Please contact an admin or write an email to support@wadzzo.com with the following error code. Error Code: WZAR100",
    INVALID_RECAPTCHA_VERSION: "An error has occurred. Please contact an admin or write an email to support@wadzzo.com with the following error code. Error Code: WZAR101",
    INVALID_REQ_TYPE: "An error has occurred. Please contact an admin or write an email to support@wadzzo.com with the following error code. Error Code: WZAR102"

};

type errorType = {
    error: string;
    email?: string;
    password?: string;
    setVerifyEmail?: (value: boolean) => void;
    setForgetPass?: (value: boolean) => void;
};

export const handleFireBaseAuthError = async ({ error, email, password, setVerifyEmail, setForgetPass }: errorType) => {


    const errorKey = Object.entries(AuthErrorCodes).find(([key, value]) =>
        error.includes(value)
    )?.[0];


    if (errorKey) {
        const errorMessage = AuthErrorMessages[errorKey as keyof typeof AuthErrorMessages];
        console.error(errorKey, errorMessage);
        if (errorKey === "INVALID_PASSWORD") {
            setForgetPass?.(true);
        } else if (errorKey === "UNVERIFIED_EMAIL") {
            setVerifyEmail?.(true);
        }
        return toast(errorMessage, { ...commonToastStyles });
    }
    return toast("Unknown error. Please contact support.", { ...commonToastStyles });
};

const commonToastStyles = {
    duration: 3000,
    icon: "❌",
};
