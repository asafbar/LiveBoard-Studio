const { pipeline } = require("stream");
const mediaService = require("../services/mediaService");
const { successResponse } = require("../utils/apiResponse");
const {
    toMediaAsset,
    toMediaAssetList
} = require("../utils/mediaMapper");

const FILE_CACHE_CONTROL = "private, no-cache";

async function uploadMedia(req, res, next) {
    try {
        const asset = await mediaService.createMediaAsset({
            tempPath: req.file.path,
            originalFilename: req.file.originalname
        });

        res.status(201).json(
            successResponse(
                "Media asset uploaded successfully.",
                toMediaAsset(asset)
            )
        );
    } catch (error) {
        next(error);
    }
}

async function listMedia(req, res, next) {
    try {
        const assets = await mediaService.listMediaAssets();

        res.status(200).json(
            successResponse(
                "Media assets loaded successfully.",
                toMediaAssetList(assets)
            )
        );
    } catch (error) {
        next(error);
    }
}

async function renameMedia(req, res, next) {
    try {
        const asset = await mediaService.renameMediaAsset(
            req.params.id,
            req.mediaFilename
        );

        res.status(200).json(
            successResponse(
                "Media asset renamed successfully.",
                toMediaAsset(asset)
            )
        );
    } catch (error) {
        next(error);
    }
}

async function getMediaUsage(req, res, next) {
    try {
        const usage = await mediaService.getMediaUsage(req.params.id);

        res.status(200).json(successResponse(
            "Media usage loaded successfully.",
            usage
        ));
    } catch (error) {
        next(error);
    }
}

async function getMedia(req, res, next) {
    try {
        const asset = await mediaService.getMediaAsset(req.params.id);

        res.status(200).json(
            successResponse(
                "Media asset loaded successfully.",
                toMediaAsset(asset)
            )
        );
    } catch (error) {
        next(error);
    }
}

async function getMediaFile(req, res, next) {
    try {
        const file = await mediaService.openMediaFile(req.params.id);

        res.status(200);
        res.set({
            "Content-Type": file.mimeType,
            "Content-Length": file.sizeBytes,
            "Cache-Control": FILE_CACHE_CONTROL,
            "Content-Disposition": "inline",
            "Content-Security-Policy": "default-src 'none'",
            "X-Content-Type-Options": "nosniff"
        });

        pipeline(file.stream, res, (error) => {
            if (!error || res.headersSent) {
                return;
            }

            next(error);
        });
    } catch (error) {
        next(error);
    }
}

module.exports = {
    uploadMedia,
    listMedia,
    getMedia,
    getMediaUsage,
    getMediaFile,
    renameMedia
};
