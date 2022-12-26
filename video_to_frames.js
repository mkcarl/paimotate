const aws = require("aws-sdk")
const fs = require("fs")
const {execSync} = require("child_process")
const admin = require("firebase-admin")
const _ = require("lodash");
const {uploadToFirebase} = require("./firebase_functions");
require("dotenv").config()


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


exports.videoToFrames = async (key) => {
    await downloadFromS3(key)
    await extractFrames(key)
    await uploadToFirebase(key)
}

