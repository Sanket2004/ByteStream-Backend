require("dotenv").config();
const express = require("express");
const multer = require("multer");
const cors = require("cors");
const bcrypt = require("bcrypt");
const mongoose = require("mongoose");
const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const File = require("./models/File");
const UploadAttempt = require("./models/UploadAttempt");
const nodemailer = require("nodemailer");

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Middleware
app.use(cors());
app.use(express.json());

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "uploads",
    resource_type: "auto", // Automatically detect resource type
    public_id: (req, file) => file.originalname.split(".")[0], // Remove file extension
  },
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB in bytes
  },
  fileFilter: (req, file, cb) => {
    // Accept all file types
    if (
      !file.originalname.match(
        /\.(jpg|jpeg|png|gif|pdf|doc|docx|xls|xlsx|ppt|pptx|txt|mp3|mp4)$/
      )
    ) {
      return cb(
        new Error(
          "Only images, documents, videos, and audio files are allowed!"
        )
      );
    }
    cb(null, true);
  },
});

mongoose
  .connect(process.env.DATABASE_URL)
  .then(() => {
    console.log("Connected to MongoDB Atlas");
  })
  .catch((err) => {
    console.error("MongoDB connection error:", err);
  });

// Routes
app.get("/", (req, res) => {
  res.send("Hello, this is the root of files app backend!");
});

app.post("/upload", upload.single("file"), async (req, res) => {
  try {
    const ipAddress = req.ip;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const uploadAttempts = await UploadAttempt.find({
      ipAddress: ipAddress,
      timestamp: { $gte: today },
    });

    if (uploadAttempts.length >= 4) {
      return res
        .status(429)
        .json({ error: "You have reached the upload limit for today." });
    }

    const fileData = {
      path: req.file.path,
      originalName: req.file.originalname,
      createdAt: new Date(),
      createdBy: req.body.createdBy, // Store createdBy as a string
      downloads: 0,
    };

    if (req.body.password) {
      fileData.password = await bcrypt.hash(req.body.password, 10);
    }

    const createdFile = await File.create(fileData);

    await UploadAttempt.create({ ipAddress: ipAddress });

    const downloadLink = `${createdFile._id}`;
    res.json({ fileLink: downloadLink, fileName: req.file.originalname });
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app
  .route("/file/:id")
  .get(async (req, res) => {
    try {
      const file = await File.findById(req.params.id);
      if (!file) {
        return res.status(404).json({ error: "File not found" });
      }

      // Send back whether the file is password-protected
      return res.status(200).json({
        fileUrl: file.fileUrl,
        passwordProtected: !!file.password,
        originalName: file.originalName, // Include other necessary details
      });
    } catch (error) {
      return res.status(500).json({ error });
    }
  })
  .post(async (req, res) => {
    try {
      const file = await File.findById(req.params.id);
      if (!file) {
        return res.status(404).json({ error: "File not found" });
      }

      if (file.password) {
        if (!req.body.password) {
          return res.status(401).json({ error: "Password required" });
        }

        if (typeof req.body.password !== "string") {
          return res.status(400).json({ error: "Invalid password format" });
        }

        const isPasswordCorrect = await bcrypt.compare(
          req.body.password,
          file.password
        );
        if (!isPasswordCorrect) {
          return res.status(403).json({ error: "Incorrect password" });
        }
      }

      file.downloads++;
      // await file.save();

      // Return the file URL for download
      return res.status(200).json({ path: file.path });
    } catch (error) {
      console.error(error); // Log the error
      return res.status(500).json({ error: "Internal Server Error" });
    }
  });

app.get("/files", async (req, res) => {
  try {
    const files = await File.find();
    res.json(files);
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

const transporter = nodemailer.createTransport({
  service: "Gmail",
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: "sanketbanerjee.2004@gmail.com",
    pass: "aernvfubzctfrzgf",
  },
});

app.post("/send-email", (req, res) => {
  const { email, fileLink, fileName } = req.body;

  const mailOptions = {
    from: "ByteStream <sanketbanerjee.2004@gmail.com>",
    to: email,
    subject: "File Download Link",
    html: `
        <!DOCTYPE html>
        <html lang="en">
        
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Secure-Share</title>
            <style>

                *{
                    font-family: 'Roboto Mono', monospace;
                }

                body {
                    background-color: #f4f4f4;
                    margin: 0;
                    padding: 0;
                }
        
                .container {
                    max-width: 600px;
                    margin: 0 auto;
                    padding: 50px 20px;
                    background-color: #ffffff;
                    border-radius: 10px !important;
                    box-shadow: 0px 4px 10px rgba(0, 0, 0, 0.1) !important;
                }

                a{
                    text-decoration: none;
                    color: #4CAF50 !important;
                }
        
                .logo {
                    margin-bottom: 30px;
                }
        
                .logo img {
                    width: 150px;
                    height: auto;
                }
        
                .download-link {
                    color: #4CAF50;
                    font-size: 18px;
                    text-decoration: none;
                }
        
                .download-button {
                    display: inline-block;
                    padding: 12px 24px;
                    background-color: #4CAF50;
                    color: white !important;
                    font-size: 16px;
                    text-decoration: none;
                    border-radius: 50px;
                    transition: background-color 0.3s ease;
                }
        
                .download-button:hover {
                    background-color: #45a049;
                }
            </style>
        </head>
        
        <body>
            <div class="container">
                <h1 style="color: #4CAF50; font-size: 24px; margin-bottom: 20px; font-weight:bold;">ByteStream</h1>
                <h1 style="color: #4CAF50; font-size: 24px; margin-bottom: 20px;">Download Your File</h1>
                <p style="font-size: 18px; margin-bottom: 30px;">${fileName}</p>
                <p style="font-size: 18px; margin-bottom: 30px;">Click the button below to download your file securely:</p>
                <a class="download-link" href="${process.env.CLIENT_URL}/file/${fileLink}">
                    ${process.env.CLIENT_URL}/file/${fileLink}
                </a>
                <p style="margin-top: 20px;">
                    <a class="download-button" href="${process.env.CLIENT_URL}/file/${fileLink}" download>Download Now</a>
                </p>
            </div>
        </body>
        
        </html>
        
        `,
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to send email." });
    } else {
      console.log("Email sent: " + info.response);
      res.status(200).json({ message: "Email sent successfully." });
    }
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
