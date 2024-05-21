import { initAdmin } from "./config";

export async function getAdminUserInfo(email: string){
    try {
        const admin =  initAdmin()
        const userRecord = await admin.auth().getUserByEmail(email);
    
        return userRecord;
    } catch( e) {
        console.log(e)
    }
    
}

export async function getEmailviaUID(uid: string){
    try {
        const admin =  initAdmin()
        const userRecord = await admin.auth().getUser(uid);

        if(userRecord.email) return userRecord.email
        else {
            const data = userRecord.providerData[0]
            if(data) {
                return data.email
            }
        }
    } catch( e) {
        console.log(e)
    }
    
}

