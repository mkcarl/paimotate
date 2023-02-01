const fs = require("fs");
const ytdl = require("ytdl-core");
const {execSync} = require("child_process")
const ffmpeg = require("fluent-ffmpeg");
const {uploadToFirebase, recordInFirestore, recordExistInFirestore} = require("./firebase_functions");
const prompt = require('prompt-sync')({sigint: true});

require("dotenv").config()



const path = 'temp'

async function downloadFromYoutube(info) {
    if (!fs.existsSync(path)) fs.mkdirSync(path)
    console.log("Downloading from YouTube")

    if (fs.existsSync(`${path}/${info.videoDetails.videoId}.mp4`)) {
        console.log("File already downloaded")
        return
    }
    await new Promise((resolve) => { // wait
        ytdl(info.videoDetails.video_url, {quality: 134})
            .pipe(fs.createWriteStream(`${path}/${info.videoDetails.videoId}.mp4`))
            .on('close', () => {
                resolve(); // finish
            })
    })
    console.log("Done downloading")
}

async function segmentVideo(info){
    const videoId = info.videoDetails.videoId
    const videoLength = +info.videoDetails.lengthSeconds
    if (!fs.existsSync(`${path}/${videoId}`)) fs.mkdirSync(`${path}/${videoId}`)
    const secondsPerSegment = 60

    const command = `ffmpeg -i "${path}/${videoId}.mp4"  -f segment -segment_time ${secondsPerSegment} -vcodec copy -reset_timestamps 1 -map 0:0 -an ${path}/${videoId}/segment%02d.mp4`

    console.log("Extracting frames")
    execSync(command)
    console.log("Done extracting")


}

async function frames(info){
    const videoId = info.videoDetails.videoId
    const vidPath = `${path}/${videoId}`
    const outputPath = `${path}/${videoId}/output`
    if (!fs.existsSync(outputPath)) fs.mkdirSync(outputPath)

    const files = fs.readdirSync(vidPath)
    // for each file in files
    // ffmpeg -i ${tempFile}/\${file}.mp4 -r 1 -qscale:v 2 ${tempFile}/output/\${file}-frame%03d.jpg
    for (const file of files.slice(1)){
        // console.log(file)
        console.log(`Processing ${file}`)
        const command = `ffmpeg -i ${vidPath}/${file} -r 1 -qscale:v 2 ${vidPath}/output/${file}-frame%02d.jpg`
        execSync(command)
        console.log(`Done processing ${file}`)
    }
}

async function main(){
    const url = prompt("Enter a YouTube URL: ")
    const info = await ytdl.getInfo(url)
    console.log(`Title: ${info.videoDetails.title}`)
    if (await recordExistInFirestore(info.videoDetails.videoId)) {
        console.log("Record already exists")
        return
    }
    await downloadFromYoutube(info)
    await segmentVideo(info)
    await frames(info)
    await uploadToFirebase(`temp/${info.videoDetails.videoId}/output`, info.videoDetails.videoId)
    await recordInFirestore(info.videoDetails.videoId)
    fs.rmdirSync(`${path}/${info.videoDetails.videoId}`, {recursive: true})
    fs.rmSync(`${path}/${info.videoDetails.videoId}.mp4`)
}
main().then()
