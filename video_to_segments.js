const ytdl = require("ytdl-core")
const {execSync} = require("child_process")
const fs = require("fs");
const aws = require("aws-sdk")
const {recordInFirestore} = require("./firebase_functions");
require("dotenv").config()

console.log(process.env.AWS_BUCKET_NAME)
aws.config.update({
    apiVersion: "latest",
    credentials: {accessKeyId: process.env.AWS_ACCESS_KEY, secretAccessKey: process.env.AWS_SECRET_KEY},
    region: "ap-southeast-1"
})
const s3 = new aws.S3()
const ddb = new aws.DynamoDB({apiVersion: "latest"})

async function downloadFromYoutube(info) {
    if (!fs.existsSync("/tmp/downloads")) fs.mkdirSync("/tmp/downloads")
    console.log("Downloading from YouTube")
    await new Promise((resolve) => { // wait
        ytdl(info.videoDetails.video_url, {quality: 134})
            .pipe(fs.createWriteStream(`/tmp/downloads/${info.videoDetails.videoId}.mp4`))
            .on('close', () => {
                resolve(); // finish
            })
    })
    console.log("Done downloading")
}

function extractFrames(videoId, secondsPerFrame) {
    if (!fs.existsSync("/tmp/segments")) fs.mkdirSync("/tmp/segments")
    if (!fs.existsSync(`/tmp/segments/${videoId}`)) fs.mkdirSync(`/tmp/segments/${videoId}`)

    const command = `ffmpeg -i "/tmp/downloads/${videoId}.mp4" -f segment -segment_time ${secondsPerFrame} -vcodec copy -reset_timestamps 1 -map 0:0 -an /tmp/segments/${videoId}/segment%04d.mp4`
    console.log("Extracting frames")
    execSync(command)
    console.log("Done extracting")
}

async function uploadToS3(videoID) {
    console.log("Uploading to S3")
    for (const file of fs.readdirSync(`/tmp/segments/${videoID}`)) {
        console.log(file)
        const content = fs.readFileSync(`/tmp/segments/${videoID}/${file}`)
        const params = {
            Bucket: process.env.AWS_BUCKET_NAME,
            Key: `${videoID}/${file}`,
            Body: content
        }
        await s3.upload(params, (err, data) => {
            if (err) console.log(err)
            else console.log(data.Location)
        }).promise()
    }
    console.log("Done uploading")
}

async function recordInDynamo(videoId) {
    const params = {
        TableName: "paimotate-processed-video",
        Item: {
            video_id: {
                S : videoId
            }
        }
    }

    await ddb.putItem(params).promise()
}

async function videoAlreadyProcessed(videoId) {
    const params = {
        TableName: "paimotate-processed-video",
        Key: {
            video_id:
                {
                    S: videoId
                }
        }
    }
    try {
        const res = await ddb.getItem(params).promise()
        return res.Item
    } catch (e) {
        console.log(e)
    }

}

exports.convertVideoToSegment = async (url) => {
    const info = await ytdl.getInfo(url)
    if (! await videoAlreadyProcessed(info.videoDetails.videoId)){
        await downloadFromYoutube(info)
        extractFrames(info.videoDetails.videoId, 60)
        await uploadToS3(`${info.videoDetails.videoId}`)
        await recordInDynamo(info.videoDetails.videoId)
        await recordInFirestore(info.videoDetails.videoId)
    }
    else{
        console.log("Video entry already exist!");
    }

}

