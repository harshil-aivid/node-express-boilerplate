const multer = require("multer")
const path = require("path");
const pdfStorage = multer.diskStorage({
    // Destination to store image
    destination: "public/pdfs",
    filename: (req, file, cb) => {
        cb(
            null,
            file.fieldname +
            "_" +
            file.originalname +
            "_" +
            Date.now() +
            path.extname(file.originalname)
        );
        // file.fieldname is name of the field (image)
        // path.extname get the uploaded file extension
    },
});

const pdfUpload = multer({
    storage: pdfStorage,
    limits: {
        fileSize: 1000000, // 1000000 Bytes = 1 MB
    },
    fileFilter(req, file, cb) {
        if (!file.originalname.match(/\.(pdf)$/)) {
            // upload only png and jpg format
            return cb(new Error("Please upload a Pdf"));
        }
        cb(undefined, true);
    },
});

module.exports = pdfUpload