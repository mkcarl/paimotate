const {convertVideoToSegment} = require("./video_to_segments");
const {videoToFrames} = require("./video_to_frames");
exports.videoToSegments =  async function(event, context) {
    if (event.url){
        console.log(`Converting video link ${event.url} into segments`)
        await convertVideoToSegment(event.url)
        return context.logStreamName
    }
    else{
        console.error("Error! URL not provided.")
    }
}

exports.videoToFrames =  async function(event, context) {

    const key = decodeURIComponent(event.Records[0].s3.object.key.replace(/\+/g, ' '))
    console.log(`Converting ${key} into frames`)
    await videoToFrames(key)
    return context.logStreamName
}

