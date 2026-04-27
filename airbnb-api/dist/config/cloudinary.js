"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadToCloudinary = uploadToCloudinary;
exports.deleteFromCloudinary = deleteFromCloudinary;
exports.getOptimizedUrl = getOptimizedUrl;
const cloudinary_1 = require("cloudinary");
// Configure Cloudinary with your account credentials
// This must run before any upload calls
cloudinary_1.v2.config({
    cloud_name: process.env["CLOUDINARY_CLOUD_NAME"],
    api_key: process.env["CLOUDINARY_API_KEY"],
    api_secret: process.env["CLOUDINARY_API_SECRET"],
});
// uploadToCloudinary takes a file buffer and uploads it to Cloudinary
// folder: organizes files in your Cloudinary media library
// Returns the upload result which includes secure_url and public_id
async function uploadToCloudinary(buffer, folder) {
    return new Promise((resolve, reject) => {
        // upload_stream is used when you have a buffer (not a file path)
        // It opens a writable stream that Cloudinary reads from
        const stream = cloudinary_1.v2.uploader.upload_stream({
            folder,
            // resource_type: "auto" detects whether it's an image or video
            resource_type: "auto",
        }, (error, result) => {
            if (error || !result)
                return reject(error);
            resolve({ url: result.secure_url, publicId: result.public_id });
        });
        // Write the buffer into the stream and close it
        stream.end(buffer);
    });
}
// deleteFromCloudinary removes a file from Cloudinary by its public_id
// Call this when a user deletes their profile picture or a listing photo
async function deleteFromCloudinary(publicId) {
    await cloudinary_1.v2.uploader.destroy(publicId);
}
function getOptimizedUrl(url, width, height) {
    const uploadSegment = "/upload/";
    const idx = url.indexOf(uploadSegment);
    if (idx === -1) {
        return url;
    }
    const transformation = `w_${width},h_${height},c_fill,f_auto,q_auto`;
    return `${url.slice(0, idx + uploadSegment.length)}${transformation}/${url.slice(idx + uploadSegment.length)}`;
}
exports.default = cloudinary_1.v2;
