import admin from "firebase-admin"

import service_account   from './service_acc.json';

 
interface FirebaseAdminAppParams {
  projectId: string
  clientEmail: string
  storageBucket: string
  privateKey: string
}
 
function formatPrivateKey(key: string) {
  return key.replace(/\\n/g, "\n")
}
 
export function createFirebaseAdminApp(params: FirebaseAdminAppParams) {
  const privateKey = formatPrivateKey(params.privateKey)
 
  if (admin.apps.length > 0) {
    return admin.app()
  }
 
  const cert = admin.credential.cert({
    projectId: params.projectId,
    clientEmail: params.clientEmail,
    privateKey,
  })
 
  return admin.initializeApp({
    credential: cert,
    projectId: params.projectId,
    storageBucket: params.storageBucket,
  })
}
 
export  function initAdmin() {
  const params = {
    projectId: service_account.project_id,
    clientEmail: service_account.client_email,
    storageBucket: 'vongcongj',
    privateKey: service_account.private_key,
  }
 
  return createFirebaseAdminApp(params)
}


