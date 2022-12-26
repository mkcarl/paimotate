const admin = require("firebase-admin");
const {readdir} = require("fs/promises");
const {randomUUID} = require("crypto");
const _ = require("lodash");
const {getFirestore} = require("firebase-admin/firestore");


admin.initializeApp({
    storageBucket: "paimon-dataset.appspot.com",
    credential: admin.credential.cert("credentials.json")
});
const db = getFirestore();
const firebaseBucket = admin.storage().bucket()

exports.uploadToFirebase = async (key) => {
    [pathName, file] = key.split('/')
    console.log("Starting upload");
    const allUpload = [];
    for (const frame of await readdir(`${tempFile}/output`)) {
        const upload = firebaseBucket.upload(`${tempFile}/output/${frame}`, {
            public: true,
            destination: `uncropped/${pathName}/${frame}`,
            metadata: {
                metadata: {
                    firebaseStorageDownloadTokens:randomUUID()

                }
            }
        })
        allUpload.push(upload)
    }
    for (const partUpload of _.chunk(allUpload, 15)) {
        console.log(`Uploading ${partUpload.length} files`)
        await Promise.all(partUpload)
    }
    console.log("Done upload")
}

exports.recordInFirestore = async (videoId) => {
    const data = {
        video_id: videoId
    }

    await db.collection('available_video').doc().set(data)
}
