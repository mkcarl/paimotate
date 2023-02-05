const {readdir} = require("fs/promises");
const {randomUUID} = require("crypto");
const _ = require("lodash");
const cloudinary = require('cloudinary').v2
require("dotenv").config()

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});


exports.uploadFiles = async (folder, videoId)=> {
    console.log("Starting upload");

    const files = (await readdir(folder)).slice(1)
    const allUpload = []
    for (const file of files){
        const upload = cloudinary.uploader.upload(`${folder}/${file}`, {public_id:`crowdmon/${videoId}/${file}`})
        allUpload.push(upload)
    }
    for (const chunk of _.chunk(allUpload, 20)){
        try{
            await Promise.all(chunk)
            console.log(`Uploaded ${chunk.length} files`)

        } catch (e){
            console.log(e)
        }
    }

    console.log("Done upload")
}
