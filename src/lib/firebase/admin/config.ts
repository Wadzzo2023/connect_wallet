import admin from "firebase-admin";

import { firebaseConfig } from "../firebase-auth";

interface FirebaseAdminAppParams {
  projectId: string;
  clientEmail: string;
  storageBucket: string;
  privateKey: string;
}

function formatPrivateKey(key: string) {
  return key.replace(/\\n/g, "\n");
}

export function createFirebaseAdminApp(params: FirebaseAdminAppParams) {
  const privateKey = formatPrivateKey(params.privateKey);

  if (admin.apps.length > 0) {
    return admin.app();
  }

  const cert = admin.credential.cert({
    projectId: params.projectId,
    clientEmail: params.clientEmail,
    privateKey,
  });

  return admin.initializeApp({
    credential: cert,
    projectId: params.projectId,
    storageBucket: params.storageBucket,
  });
}

export function initAdmin() {
  const params = {
    projectId: firebaseConfig.projectId,
    storageBucket: firebaseConfig.storageBucket,
    privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY!,
    clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL!,
  };

  return createFirebaseAdminApp(params);
}
