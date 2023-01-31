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

// exports.uploadToFirebase = async (key) => {
//     [pathName, file] = key.split('/')
//     console.log("Starting upload");
//     const allUpload = [];
//     for (const frame of await readdir(`${tempFile}/output`)) {
//         const upload = firebaseBucket.upload(`${tempFile}/output/${frame}`, {
//             public: true,
//             destination: `uncropped/${pathName}/${frame}`,
//             metadata: {
//                 metadata: {
//                     firebaseStorageDownloadTokens:randomUUID()
//
//                 }
//             }
//         })
//         allUpload.push(upload)
//     }
//     for (const partUpload of _.chunk(allUpload, 15)) {
//         console.log(`Uploading ${partUpload.length} files`)
//         await Promise.all(partUpload)
//     }
//     console.log("Done upload")
// }

exports.recordInFirestore = async (videoId) => {
    const data = {
        video_id: videoId
    }

    await db.collection('available_video').doc().set(data)
}

exports.recordExistInFirestore = async (videoId) => {
    const doc = await db.collection('available_video').where('video_id', '==', videoId).get()
    return !doc.empty
}

exports.uploadToFirebase = async (folder, videoId)=> {
    console.log("Starting upload");

    const files = (await readdir(folder)).slice(1)
    const allUpload = []
    for (const file of files){
        const upload = firebaseBucket.upload(`${folder}/${file}`, {
            public: true,
            destination: `uncropped/${videoId}/${file}`,
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
        try {
            await Promise.all(partUpload)
        }
        catch (e) {
            console.log(e)
        }
    }
    console.log("Done upload")
}
