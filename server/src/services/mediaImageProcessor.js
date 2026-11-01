const sharp = require("sharp");
const { MAX_MEDIA_BYTES } = require("../storage/mediaStorage");
const { createHttpError } = require("../utils/httpError");

const MAX_EDGE_PIXELS = 8192;
const MAX_PIXELS = 16777216;

const OUTPUT_FORMATS = {
    jpeg: {
        mimeType: "image/jpeg",
        encode(pipeline) {
            return pipeline.jpeg({
                quality: 90,
                mozjpeg: true
            });
        }
    },
    png: {
        mimeType: "image/png",
        encode(pipeline) {
            return pipeline.png({
                compressionLevel: 9
            });
        }
    },
    webp: {
        mimeType: "image/webp",
        encode(pipeline) {
            return pipeline.webp({
                quality: 90,
                effort: 4
            });
        }
    }
};

// One libvips thread, no decoded-image cache, and no loaders except
// JPEG, PNG, and WebP files. SVG, PDF, GIF, and the other decoders stay blocked.
sharp.concurrency(1);
sharp.cache(false);
sharp.block({
    operation: ["VipsForeignLoad"]
});
sharp.unblock({
    operation: [
        "VipsForeignLoadJpegFile",
        "VipsForeignLoadPngFile",
        "VipsForeignLoadWebpFile"
    ]
});

async function processUploadedImage(filePath) {
    const pipeline = sharp(filePath, {
        autoOrient: true,
        failOn: "warning",
        animated: false,
        unlimited: false,
        sequentialRead: true,
        limitInputPixels: MAX_PIXELS
    });

    try {
        const metadata = await pipeline.metadata();
        const format = assertDecodable(metadata);
        const output = await format.encode(pipeline).toBuffer({
            resolveWithObject: true
        });

        assertProcessedOutput(output);

        return {
            buffer: output.data,
            mimeType: format.mimeType
        };
    } catch (error) {
        throw toUploadError(error);
    } finally {
        try {
            pipeline.destroy();
        } catch (destroyError) {
            console.error("Image processing cleanup failed.");
        }
    }
}

function assertDecodable(metadata) {
    if (typeof metadata.pages === "number" && metadata.pages > 1) {
        throw createHttpError(415, "Animated images are not supported.", [{
            path: "file",
            message: "Upload a single-frame JPEG, PNG, or WebP image."
        }]);
    }

    const format = OUTPUT_FORMATS[metadata.format];

    if (format === undefined) {
        throw unsupportedImageError();
    }

    assertDimensions(metadata.width, metadata.height);

    return format;
}

function assertProcessedOutput(output) {
    const width = output.info.width;
    const height = output.info.height;
    const format = OUTPUT_FORMATS[output.info.format];

    if (format === undefined || !Buffer.isBuffer(output.data) || output.data.length < 1) {
        throw unsupportedImageError();
    }

    assertDimensions(width, height);

    if (output.data.length > MAX_MEDIA_BYTES) {
        throw createHttpError(413, "Processed image is too large.", [{
            path: "file",
            message: "The processed image must be 10 MB or smaller."
        }]);
    }
}

function assertDimensions(width, height) {
    if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1) {
        throw unsupportedImageError();
    }

    if (width > MAX_EDGE_PIXELS
        || height > MAX_EDGE_PIXELS
        || width * height > MAX_PIXELS) {
        throw createHttpError(400, "Image dimensions are too large.", [{
            path: "file",
            message: "Image width and height must be at most 8192 pixels, and the image must contain at most 16777216 pixels."
        }]);
    }
}

function unsupportedImageError() {
    return createHttpError(415, "Upload must be a valid JPEG, PNG, or WebP image.", [{
        path: "file",
        message: "Upload a JPEG, PNG, or WebP image."
    }]);
}

function toUploadError(error) {
    if (Number.isInteger(error.statusCode)) {
        return error;
    }

    const message = typeof error.message === "string" ? error.message : "";

    if (/pixel limit/i.test(message)) {
        return createHttpError(400, "Image dimensions are too large.", [{
            path: "file",
            message: "Image width and height must be at most 8192 pixels, and the image must contain at most 16777216 pixels."
        }]);
    }

    return unsupportedImageError();
}

module.exports = {
    processUploadedImage
};
