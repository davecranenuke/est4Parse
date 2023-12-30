const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');


const app = express();
const port = 3000;

// Set up the storage for multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/'); // Files will be stored in the 'uploads' directory
  },
  filename: (req, file, cb) => {
    cb(null, `${file.originalname}`);
  },
});

const upload = multer({ storage });

// Serve the HTML page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Handle file upload
app.post('/upload', upload.array('files', 3), (req, res) => {
  const uploadedFiles = req.files.map(file => file.originalname);
  console.log('Uploaded files:', uploadedFiles);

  // Store file names in an array or perform any desired action
  const fileNamesArray = uploadedFiles;

  res.json({ message: 'Files uploaded successfully', files: uploadedFiles });
});


app.get('/run-uploadDelete', (req, res) => {
  // Execute delete.js
  exec('node delete.js', (error, stdout, stderr) => {
    if (error) {
      console.error(`Error deleting files in uploads directory: ${error}`);
      res.status(500).send('Internal Server Error');
      return;
    }
    console.log(`Upload Files Deleted output: ${stdout}`);
    res.send(`delete.js output: ${stdout}`);
  });
});

//handle button application run
app.get('/run-app', (req, res) => {
  // Execute the est4Promise.js script
  exec('node est4Promise.js', (error, stdout, stderr) => {
    if (error) {
      console.error(`Error executing est4Promise.js: ${error}`);
      res.status(500).send('Internal Server Error');
      return;
    }
    console.log(`est4Promise.js output: ${stdout}`);
    res.send(`est4Promise.js output: ${stdout}`);
  });
});

app.get('/run-dbapp', (req, res) => {
  // Execute the F52_SFAS Database script
  exec('F52_SFAS.accdb', (error, stdout, stderr) => {
    if (error) {
      console.error(`Error executing F52 Database: ${error}`);
      res.status(500).send('Internal Server Error');
      return;
    }
    console.log(`F52_SFAS output: ${stdout}`);
    res.send(`F52_SFAS.accdb output: ${stdout}`);
  });
});

/* function deleteFilesInDirectory(directoryPath) {
  return new Promise((resolve, reject) => {
    // Read the directory
    fs.readdir(directoryPath, (err, files) => {
      if (err) {
        reject(`Error reading directory: ${err}`);
        return;
      }

      // Iterate over the files and delete each one
      const deletePromises = files.map(file => {
        const filePath = path.join(directoryPath, file);

        return new Promise((resolveDelete, rejectDelete) => {
          // Use fs.unlink to delete the file
          fs.unlink(filePath, err => {
            if (err) {
              rejectDelete(`Error deleting file ${file}: ${err}`);
            } else {
              resolveDelete(`Deleted file: ${file}`);
            }
          });
        });
      });
      // Wait for all delete promises to complete
      Promise.all(deletePromises)
        .then(results => resolve(results))
        .catch(errors => reject(errors));
    });
  });
} */

app.listen(port, () => {
  console.log(`App listening at http://localhost:${port}`);
});