const fs = require('fs');
const path = require('path');

function moveFilesToArchive() {
  const uploadsFolderPath = path.join(__dirname, 'uploads');

  // Get today's date and time to create the archive folder
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');

  const archiveFolderName = `${year}-${month}-${day}_${hours}-${minutes}-${seconds}`;
  const archiveFolderPath = path.join(__dirname, 'archive', archiveFolderName);

  // Create the archive folder if it doesn't exist
  if (!fs.existsSync(archiveFolderPath)) {
    fs.mkdirSync(archiveFolderPath, { recursive: true });
    console.log(`Archive folder '${archiveFolderName}' created.`);
  }

  // Read the contents of the uploads folder
  fs.readdir(uploadsFolderPath, (err, files) => {
    if (err) {
      console.error('Error reading uploads folder:', err);
      return;
    }

    // Move each file to the archive folder
    files.forEach(file => {
      const sourceFilePath = path.join(uploadsFolderPath, file);
      const destinationFilePath = path.join(archiveFolderPath, file);

      // Move the file
      fs.rename(sourceFilePath, destinationFilePath, err => {
        if (err) {
          console.error(`Error moving file ${file}:`, err);
        } else {
          console.log(`Successfully moved file to archive: ${file}`);
        }
      });
    });
  });
}

//Export the Module
module.exports = {moveFilesToArchive};

// Call the function to move files
// moveFilesToArchive();