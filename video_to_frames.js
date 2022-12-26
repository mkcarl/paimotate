const aws = require("aws-sdk")
const fs = require("fs")
const {execSync} = require("child_process")
const admin = require("firebase-admin")
const {readdir} = require("fs/promises");
const {randomUUID} = require("crypto");
const _ = require("lodash");
require("dotenv").config()


admin.initializeApp({
    storageBucket: "paimon-dataset.appspot.com",
    credential: admin.credential.cert("credentials.json")
});
const firebaseBucket = admin.storage().bucket()
const s3 = new aws.S3()
aws.config.update({apiVersion:"latest", credentials:{accessKeyId:process.env.AWS_ACCESS_KEY, secretAccessKey:process.env.AWS_SECRET_KEY}})
tempFile = "/tmp"

async function downloadFromS3(objectKey){
    console.log("Downloading from S3")
    const params = {Bucket: process.env.AWS_BUCKET_NAME, Key: objectKey}
    const data= await s3.getObject(params).promise()
    fs.writeFileSync(`${tempFile}/${objectKey.split('/').join('-')}`, data.Body)
    console.log("Done downloading")

}

async function extractFrames(filePath){
    console.log("Extracting frames")
    const formatted = filePath.replace('/', '-').replace('.mp4', '')
    if (!fs.existsSync(`${tempFile}/output`)) fs.mkdirSync(`${tempFile}/output`)
    const cmd = `file=${formatted} && ffmpeg -i ${tempFile}/\${file}.mp4 -r 1 -qscale:v 2 ${tempFile}/output/\${file}-frame%03d.jpg`
    execSync(cmd)
    console.log("Done extracting frames")
}

async function uploadToFirebase(key){
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

exports.videoToFrames = async (key) => {
    await downloadFromS3(key)
    await extractFrames(key)
    await uploadToFirebase(key)
}

