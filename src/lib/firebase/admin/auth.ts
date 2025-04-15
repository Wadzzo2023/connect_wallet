/* eslint-disable */
import { verifyAppleToken } from "./apple-verify";
import { initAdmin } from "./config";

export async function getAdminUserInfo(email: string) {
  try {
    const admin = initAdmin();
    const userRecord = await admin.auth().getUserByEmail(email);

    return userRecord;
  } catch (e) {
    console.log(e);
  }
}

export async function verifyIdToken(token: string) {
  const admin = initAdmin();
  const decodedToken = await admin.auth().verifyIdToken(token);
  return decodedToken;
}

export async function appleTokenToUser(appleToken: string, email: string) {
  const appleUser = (await verifyAppleToken(appleToken)) as {
    sub: string;
    name: string;
  };

  const admin = initAdmin();
  const auth = admin.auth();

  try {
    // Try to get existing user first
    const firebaseUser = await auth.getUserByEmail(email);

    return firebaseUser;
  } catch (error: any) {
    if (error.code === "auth/user-not-found") {
      // Create new Firebase user if they don't exist
      const newUser = await auth.createUser({
        email: email,
        displayName: appleUser.name,
      });

      const user = await admin.auth().updateUser(newUser.uid, {
        providerToLink: {
          uid: appleUser.sub,
          providerId: "apple.com",
          email: email,
        },
      });
      return user;
    }
    console.log(error);
    throw error;
  }
}

export async function getEmailviaUID(uid: string) {
  try {
    const admin = initAdmin();
    const userRecord = await admin.auth().getUser(uid);

    if (userRecord.email) return userRecord.email;
    else {
      const data = userRecord.providerData[0];
      if (data) {
        return data.email;
      }
    }
  } catch (e) {
    console.log(e);
  }
}
