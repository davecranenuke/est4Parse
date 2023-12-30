const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

//define files to download
const filesToDownload = [
  'devout.csv',
  'inout.csv',
  'logicAnd.csv',
  'logicMatrix.csv',
  'objout.csv',
];

//establish directory for API download capability
const inteldbDirectory = path.join(__dirname);

//Include Express and set localhost:3000
const app = express();
const port = 3000;
const http = require('http').createServer(app);

//Include Archiving Fucntion from archive.js.
const archiveFiles = require("../archive");
//import archiveFiles from "../archive";

//Set directory structure
// Get the current directory
const currentDirectory = __dirname;

// Move up one directory
const parentDirectory = path.join(currentDirectory, '..');

//Include Parsing Functions from est4Promise.js
const parser = require("./est4Promise");

//Include a static path changed to remove public
app.use(express.static(__dirname));

// Set up multer for handling file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const area = req.params.area;
    const uploadPath = `../uploads/${area}/`;

//Set mime type to javascript
  app.get('/est4Parse.js', (req, res) => {
    res.type('application/javascript');
    res.sendFile('./est4Parse.js');
  });

// Check if the directory exists, create it if not
if (!fs.existsSync(uploadPath)) {
  fs.mkdirSync(uploadPath, { recursive: true });
}

    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  },
});

const upload = multer({ storage: storage });

//Display file in Building Reports

// Define a route to handle GET requests to the root URL
app.get('/displayFileBR', (req, res) => {
  const directoryPathBR = path.join(parentDirectory, 'uploads', 'building-report');
  
  // Use fs.readdir with a callback function
  fs.readdir(directoryPathBR, (err, files) => {
    if (err) {
      return res.status(500).send('Nothing in Directory');
    }

    // Store the file names in the 'brFile' variable
    var brFile = files.length > 0 ? files[0] : 'No files found';

    // Send the 'brFile' variable as JSON to the client
    res.json({ brFile });
  });
});
  
app.get('/displayFileRE', (req, res) => {
    const responsePathBR = path.join(parentDirectory, 'uploads', 'response-report');
  // Use fs.readdir with a callback function
  fs.readdir(responsePathBR, (err, files) => {
    if (err) {
      return res.status(500).send('Nothing in Directory');
    }

    // Store the file names in the 'respFile' variable
    var respFile = files.length > 0 ? files[0] : 'No files found';

    // Send the 'brFile' variable as JSON to the client
    res.json({ respFile });
  });
});

  app.get('/displayFileLO', (req, res) => {
    const logicPathBR = path.join(parentDirectory, 'uploads', 'logic-report');
    // Use fs.readdir with a callback function
    fs.readdir(logicPathBR, (err, files) => {
      if (err) {
        return res.status(500).send('Nothing in Directory');
      }
  
      // Store the file names in the 'respFile' variable
      var logFile = files.length > 0 ? files[0] : 'No files found';
  
      // Send the 'brFile' variable as JSON to the client
      res.json({ logFile });
    });
  });
//End Display File in Building Reports

// Define a route to serve the HTML file
app.get('/', (req, res) => {
  res.sendFile('index.html');
});

// Define routes
app.post('/upload/:area', upload.single('file'), (req, res) => {
  res.send('File uploaded!');
});


  //handle button for archiving files
  app.get('/buttonClick', (req, res) => {
    archiveFiles.moveFilesToArchive();
    console.log('Moving Old Files to Archive.');
    res.send('Archived Files');
  });

    //handle verify button for updating files
    app.get('/verifyButtonClick', (req, res) => {
      console.log('Verifiying Files In Storage.');
      res.send('Verified Files');    
    });

    //handle button for deleting old parse files
    app.get('/deleteButtonClick', (req, res) => {
        parser.deleteAllFiles();
        parser.writeHeaders();
        console.log('Delete Files.');
        res.send('Delete Files');
    });


    // handle button for deleting old parse files
    app.get('/deleteButtonClick', (req, res) => {
      try {
          parser.deleteAllFiles();
          parser.writeHeaders();
          console.log('Delete Files.');
          res.send('Delete Files');
      } catch (error) {
          // Send the error message to the client
          res.status(500).send(`Error: ${error.message}`);
          // You can customize the error handling further, e.g., logging the error on the server.
          console.error('Error:', error);
      }
    });

    //handle button for creating building reports files
    app.get('/buildingReportsButtonClick', (req, res) => {
      parser.parseAllFiles();
      parser.correlationFiles();
      parser.createAllLogicFiles();
      parser.writeAllLogicFiles();
      console.log('Building Report Files.');

       // Simulate an asynchronous operation (you may need to adapt this part)
    setTimeout(() => {
      res.send('Building Report Files Completed');
    }, 3000); // Adjust the timeout based on the actual time your server-side code takes
  });

  app.get('/', (req, res) => {
    res.send('Building Report Files');
  });
  
  app.get('/download-all', (req, res) => {
    const downloadsDir = path.join(require('os').homedir(), 'Downloads');
  
    // Ensure the downloads directory exists
    if (!fs.existsSync(downloadsDir)) {
      fs.mkdirSync(downloadsDir);
    }
  
    // Function to handle sending a file
    const sendFile = (filename) => {
      const filePath = path.join(parentDirectory, filename);
      const destination = path.join(downloadsDir, filename); // Use 'destination' instead of 'downloadsDir'
  
      // Set the appropriate headers for triggering a download in the browser
      res.attachment(filename);
  
      // Send the file as a response
      const fileStream = fs.createReadStream(filePath);
      const destinationStream = fs.createWriteStream(destination); // Create a write stream for the destination
  
      fileStream.on('error', (err) => {
        console.error('Error reading file:', err.message);
        // Handle error more gracefully
        res.status(500).end('Internal Server Error');
      });
  
      fileStream.pipe(destinationStream);
  
      destinationStream.on('error', (err) => {
        console.error('Error writing file:', err.message);
        // Handle error more 
        res.status(500).end('Internal Server Error');
      });
  
      destinationStream.on('close', () => {
        console.log(`File ${filename} downloaded successfully`);
  
        // End the response stream after the last file has been sent
        if (filename === filesToDownload[filesToDownload.length - 1]) {
          res.end();
        }
      });
    };
  
    // Iterate through the files and initiate downloads
    for (const filename of filesToDownload) {
      sendFile(filename);
    }
  });
  
  const uploadsDirectory = path.join(parentDirectory, 'uploads');

  // Define a route to delete all files in subdirectories
  app.get('/deleteFilesInSubdirectories', (req, res) => {
    try {
      deleteFilesInSubdirectories(uploadsDirectory);
      console.log('Deleted all files in subdirectories of the "uploads" directory.');
      res.send('Delete Files in Subdirectories');
    } catch (error) {
      res.status(500).send(`Error: ${error.message}`);
      console.error('Error:', error);
    }
  });

  // Function to delete all files in subdirectories of a given directory
  const deleteFilesInSubdirectories = (directoryPath) => {
    const subdirectories = fs.readdirSync(directoryPath, { withFileTypes: true });

    subdirectories.forEach((item) => {
      const itemPath = path.join(directoryPath, item.name);

      if (item.isDirectory()) {
        // Recursively delete files in subdirectories
        deleteFilesInSubdirectories(itemPath);
      } else {
        // Delete the file in the current subdirectory
        fs.unlinkSync(itemPath);
        console.log(`Deleted file: ${itemPath}`);
      }
    });
  };
  
    // Setup Socket.IO for real-time communication
    http.listen(port, () => {
      console.log(`Server is running at http://localhost:${port}`);
    });