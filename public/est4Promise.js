const fs = require('fs');
const fsp = require('fs').promises;
const xml2js = require('xml2js');
const csvtojson = require('csvtojson');
const { promiseHooks } = require('v8');
const outputjsonfilePath = '../output.json';
const path = require("path");

var brcsvBR;
var respcsvBR;
var logcsvBR;

//obj & dev global variables
/* var IdArray=[];
var DevArray=[];
var ArrayCount = 0;
var DevArrayCount = 0;
var objOut;
var devOut; */

//response global variables
var respJsoncount;
var respJsonDataParse;
var respObjLength;
var respPanel;
var respDevice;
var respInAddress;
var respEventType;
var respFunctType;
var respPriority;
var responsePanel;
var responseAddress;
var responseDevice;
var respIncr = 1;
var inout;
const retryInterval = 1000; // 1000 milliseconds (1 second)


//logic global variables
var logIncr = 0;
var logRadius;
var logActivationCount;
var logAndMain;
var logAndSub;

//delete old csv files if they exist
async function deleteFiles(path) {
    return new Promise(resolve => {
            fs.access(path, fs.F_OK, (err) => {
                fs.unlink(path, (err) => {
                    resolve('File ' + path + ' was successfully deleted.');
                });
                reject => {
                    reject('Failure to Create Headers');
                    // main();
                }
            })
    
    })
}

async function fileId(dPath) {
    try {
        // Read the contents of the directory
        const directoryPath = dPath;
        const files = await fsp.readdir(directoryPath);

        // Assuming there is at least one file in the directory
        if (files.length > 0) {
            // Get the first file name
            const innerFile = files[0];

            console.log('File name:', innerFile);
            const finalPath = path.join(__dirname, directoryPath, innerFile);
            console.log(finalPath);

            // Now you can use the 'finalPath' variable as needed
            return finalPath;
        } else {
            console.log('No files found in the directory.');
            return null; // Or any default value as needed
        }
    } catch (err) {
        console.error('Error reading directory:', err);
        throw err;
    }
}

function appendToFile(filePath, data) {
    return fsp.appendFile(filePath, data, 'utf8');
}

function closeFile(fileHandle) {
    return fileHandle.close();
}

function createHeaders() {
    return new Promise((resolve, reject) => {
        setTimeout(async () => {
            let fileDescriptors = [];

            const appendAndClose = async (filePath, header) => {
                try {
                    const fileDescriptor = await fsp.open(filePath, 'a');
                    fileDescriptors.push(fileDescriptor);

                    await appendToFile(filePath, header);
                    await closeFile(fileDescriptor);
                } catch (err) {
                    reject(err);
                }
            };

            try {
                await Promise.all([
                    appendAndClose('../objout.csv', 'DeviceId;UniqueAddress;EST4Address;Panel;Label;DeviceType;CategoryType;LocationText\r\n'),
                    appendAndClose('../devout.csv', 'ObjectId;SerialNumber;SkuId;SkuName;ModelId;ModelName\r\n'),
                    appendAndClose('../inout.csv', 'respPanel;respDevice;respInAddress;respEventType;respFunctType;respPriority;responsePanel;responseDevice;responseAddress\r\n'),
                    appendAndClose('../logicAnd.csv', 'logicType;inLabel;path;location;activationNumber;inAddress;label;node;slot;deviceAddress;eventQueries\r\n'),
                    appendAndClose('../logicMatrix.csv', 'logicType;inLabel;path;location;logRadius;address;logActivationCount;label;node;slot;deviceAddress;column,row\r\n'),
                ]);
                console.log('Headers created');
                resolve();
            } catch (err) {
                console.error('Error in creating headers:', err);
                reject(err);
            } finally {
                // Close all file descriptors
                await Promise.all(fileDescriptors.map(async (fileHandle) => {
                    try {
                        await closeFile(fileHandle);
                    } catch (closeErr) {
                        console.error('Error closing file:', closeErr);
                    }
                }));
            }
        }, 600);
    });
}

//parse objects and devices from building reports xml file


async function createObjDev() {
    try {
        const data = await fsp.readFile(brcsvBR);
        const res = await new xml2js.Parser().parseStringPromise(data);
        
        const idArray = [];
        const devArray = [];
        
        res.ProjectData.ObjectsList.forEach(item => {
            item.Object.forEach(childrenEntry => {
                const {
                    ObjectId: objectIdent,
                    Label,
                    Path: panel,
                    DeviceType,
                    LocationText,
                    CategoryType,
                    NodeAddress,
                    CardAddress,
                    DeviceAddress,
                } = childrenEntry;

                const nodeAdd = NodeAddress.toString().padStart(4 - NodeAddress.length, '0');
                const slcAdd = CardAddress.toString().padStart(4 - CardAddress.length, '0');
                const slcAdd4 = CardAddress.toString().padStart(4 - CardAddress.length, '0');
                const devAdd = DeviceAddress.toString().padStart(5 - DeviceAddress.length, '0');
                const est4Address = `${nodeAdd}:${slcAdd}:${devAdd}`;
                const uniqueAddress = devAdd;
                const systemAddress = `${nodeAdd}-${slcAdd4}-${devAdd}`;

                idArray.push({
                    DeviceId: objectIdent,
                    UniqueAddress: uniqueAddress,
                    EST4Address: est4Address,
                    Panel: panel,
                    Label: Label,
                    DeviceType: DeviceType,
                    CategoryType: CategoryType,
                    LocationText: LocationText,
                });
            });
        });

        res.ProjectData.DeviceList.forEach(items => {
            items.Device.forEach(childrenEntry => {
                const {
                    Object: devObjectIdent,
                    SerialNumber = 'None',
                    SkuId,
                    SkuName,
                    ModelId,
                    ModelName,
                } = childrenEntry;

                devArray.push({
                    ObjectId: devObjectIdent,
                    SerialNumber: SerialNumber,
                    SkuId: SkuId,
                    SkuName: SkuName,
                    ModelId: ModelId,
                    ModelName: ModelName,
                });
            });
        });

        const idArrayOutput = idArray.map(entry => `${entry.DeviceId};${entry.UniqueAddress};${entry.EST4Address};${entry.Panel};${entry.Label};${entry.DeviceType};${entry.CategoryType};${entry.LocationText}\r\n`);
        const devArrayOutput = devArray.map(entry => `${entry.ObjectId};${entry.SerialNumber};${entry.SkuId};${entry.SkuName};${entry.ModelId};${entry.ModelName}\r\n`);

        await fsp.appendFile('../objout.csv', idArrayOutput.join(''));
        await fsp.appendFile('../devout.csv', devArrayOutput.join(''));

        return 'I/O File Populated from BuildingReports';
    } catch (error) {
        console.error(error);
        throw new Error('Error Creating I/O File');
    }
}

// parse correlation from response file
async function csvtojsonconv() {
    return new Promise((resolve, reject) => {
        csvtojson()
            .fromFile(respcsvBR)
            .then((json) => {
                fs.writeFile("../output.json", JSON.stringify(json), 'utf-8', (err) => {
                    if (err) {
                        console.log(err);
                        reject(err); // Reject the promise if there's an error
                    } else {
                        console.log('Successfully Parsed Correlation from csv to JSON');
                        resolve(); // Resolve the promise when successful
                    }
                });
            });
    });
}

async function jsonParse() {
    return new Promise((resolve) => {
        setTimeout(() => {
        fs.readFile('../output.json', 'utf8', (error, data) => {
            if(error){
                console.log(error);
                return;
            }
            respJsonDataParse = JSON.parse(data);
            respObjLength = Object.keys(respJsonDataParse).length

            for(respJsoncount=0; respJsoncount < respObjLength-1 ; respJsoncount+=1) {
                if(respJsonDataParse[respJsoncount].field1=='Selected Input Device') {
                    respPanel = respJsonDataParse[respJsoncount+2].field1;
                    respDevice = respJsonDataParse[respJsoncount+2].field8;
                    respInAddress = respJsonDataParse[respJsoncount+2].field12;
                }
                if(respJsonDataParse[respJsoncount].field1=='Rule Event Information') {
                    respEventType = respJsonDataParse[respJsoncount+2].field5;
                }
                if(respJsonDataParse[respJsoncount].field1=='Command Information') {
                    respFunctType = respJsonDataParse[respJsoncount+2].field4;
                    respPriority = respJsonDataParse[respJsoncount+2].field9;
                }
                if(respJsonDataParse[respJsoncount+1].field1=='Devices Affected By the Command') {
                    do {
                        responsePanel = respJsonDataParse[respJsoncount+2+respIncr].field1;
                        responseDevice = respJsonDataParse[respJsoncount+2+respIncr].field7;
                        responseAddress = respJsonDataParse[respJsoncount+2+respIncr].field10;
                        respIncr+=1;
                        inout = (respPanel + ';' + respDevice + ';' + respInAddress + ';' + respEventType + ';' + respFunctType + ';' + respPriority + ';' + responsePanel + ';' + responseDevice + ';' + responseAddress + '\r\n');
                        fs.appendFile('../inout.csv', inout, function(err){
                            if(err) {
                                //setTimeout(main, retryInterval);
                                console.log('Error in JSON parse');
                            }
                        });
                    }while(respJsonDataParse[respJsoncount+2+respIncr].field1 !='Command Information' && respJsonDataParse[respJsoncount+2+respIncr].field1 !='Selected Input Device' && respJsonDataParse[respJsoncount+2+respIncr].field1 !='Branch' && respJsonDataParse[respJsoncount+2+respIncr].field1 !='Rule Event Information' && respJsoncount < respObjLength - 3 - respIncr)
                    respIncr=1;
                }
            }
        });
        console.log('Successfully Created Correlation csv File')
        resolve();
    }, 0);
    });
}

//parse logic relationships (or/matrix) from logic file
async function createLogic() {
    return new Promise((resolve) => {
        csvtojson()
        .fromFile(logcsvBR)
        .then((json)=> {
        fs.writeFile("../logic.json", JSON.stringify(json), 'utf-8', (err)=>{
                if(err) console.log(err);
        });
        });
        resolve('Successfully Created Logic And and Matrix csv File');
        reject => {
            reject('Error in Creating Logic And and Matrix csv File');
        }
    });
}

async function writeLogic() {
    return new Promise((resolve) => {
        setTimeout(() => {
            console.log('../logic.json created');
            buildingReportsBox = true;

        fs.readFile('../logic.json', 'utf8', (error, data) => {
        if(error){
            console.log(error);
            return;
        }
        var jsonDataParse = JSON.parse(data);
        var objLength = Object.keys(jsonDataParse).length
    
        for(var jsoncount=0; jsoncount < objLength - 1 ; jsoncount+=1) {
                if(jsonDataParse[jsoncount]["Logic Group Report"] == 'And Group') {
                    var logicType = jsonDataParse[jsoncount]["Logic Group Report"];
                    var inLabel = jsonDataParse[jsoncount+1].field5;
                    var path = jsonDataParse[jsoncount+2].field5;
                    var location = jsonDataParse[jsoncount+3].field5;
                    var activationNumber = jsonDataParse[jsoncount+4].field5;
                    var inAddress = jsonDataParse[jsoncount+5].field5;
                    logAndMain = logicType + ';' + inLabel + ';' + path +';' + location + ';' + activationNumber + ';' + inAddress + ';';
                    if(jsonDataParse[jsoncount+6].field6 == 'Node') {
                    do{
                        logIncr+=1;
                        label = jsonDataParse[jsoncount+6+logIncr]["Logic Group Report"];
                        node = jsonDataParse[jsoncount+6+logIncr].field6;
                        slot = jsonDataParse[jsoncount+6+logIncr].field13;
                        deviceAddress = jsonDataParse[jsoncount+6+logIncr].field20;
                        eventQueries = jsonDataParse[jsoncount+6+logIncr].field27;
                        logAndSub = label + ';' + node + ';' + slot + ';' + deviceAddress + ';' + eventQueries + '\r\n';
                        fs.appendFile('../logicAnd.csv', logAndMain+logAndSub, function(err){
                            if(err) throw err;
                        });
                    }while(jsonDataParse[jsoncount+7+logIncr]["Logic Group Report"]!='');
                    logIncr = 0;
                    }
                }
                if(jsonDataParse[jsoncount]["Logic Group Report"] == 'Matrix Group') {
                    logicType = jsonDataParse[jsoncount]["Logic Group Report"];
                    inLabel = jsonDataParse[jsoncount+1].field6;
                    path = jsonDataParse[jsoncount+2].field6;
                    location = jsonDataParse[jsoncount+3].field6;
                    logRadius = jsonDataParse[jsoncount+4].field6;
                    address = jsonDataParse[jsoncount+5].field6;
                    logActivationCount = jsonDataParse[jsoncount+4].field25;
                    matrixMain = logicType + ';' + inLabel + ';' + path + ';' + location + ';' + logRadius + ';' + address + ';' + logActivationCount + ';';
                    if(jsonDataParse[jsoncount+6].field7 == 'Node') {
                    do{
                        logIncr+=1;
                        label = jsonDataParse[jsoncount+6+logIncr]["Logic Group Report"];
                        node = jsonDataParse[jsoncount+6+logIncr].field7;
                        slot = jsonDataParse[jsoncount+6+logIncr].field10;
                        deviceAddress = jsonDataParse[jsoncount+6+logIncr].field17;
                        column = jsonDataParse[jsoncount+6+logIncr].field21;
                        row = jsonDataParse[jsoncount+6+logIncr].field31;
                        matrixSub = label + ';' + node + ';' + slot + ';' + deviceAddress + ';' + column + ';' + row + '\r\n';
                        fs.appendFile('../logicMatrix.csv', matrixMain+matrixSub, function(err){
                            if(err) {
                                //setTimeout(main, retryInterval);
                                console.log('Error in JSON Parse');
                            }
                        });
                    }while(jsonDataParse[jsoncount+7+logIncr]["Logic Group Report"]!='');
                    logIncr = 0;
                    }
                }
        }
        });
        resolve();
    }, 500);
        resolve('Successfully Created Logic And and Matrix csv File');
        reject => {
            reject('Error in Creating Logic And and Matrix csv File');
        }
    });
 }

 function waitForFileCreation(filePath, interval = 1000, timeout = 10000) {
    const startTime = Date.now();
  
    return new Promise((resolve, reject) => {
      function checkFile() {
        fs.access(filePath, fs.constants.F_OK, (err) => {
          if (!err) {
            // File exists
            resolve();
          } else {
            const elapsedTime = Date.now() - startTime;
            if (elapsedTime < timeout) {
              // Continue polling until timeout
              setTimeout(checkFile, interval);
            } else {
              // Timeout reached, reject the promise
              reject(`Timeout waiting for file creation: ${filePath}`);
            }
          }
        });
      }
    });
  }

  waitForFileCreation(outputjsonfilePath)
  .then(() => {
    console.log(`File ${outputjsonfilePath} has been created.`);
    jsonParse();
  })
  .catch((error) => console.error(error));
  

 //sequence the asynchronous operations with the main() function
 async function deleteAllFiles() {
    try {
        result = await deleteFiles('../output.json')
        console.log(result)
        result = await deleteFiles('../logic.json')
        console.log(result)    
        result = await deleteFiles('../inout.csv');
        console.log(result)
        result = await deleteFiles('../devout.csv');
        console.log(result);
        result = await deleteFiles('../objout.csv');
        console.log(result);
        result = await deleteFiles('../logicAnd.csv');
        console.log(result);
        result = await deleteFiles('../logicMatrix.csv');
        console.log(result);
        result = await fileId('../uploads/building-report')
            .then(result => {
                brcsvBR = result;
                console.log(brcsvBR);
            })
            .catch(error => {
                console.log('An Error Occurred in Returning File Path for Building Reports')
        });
        result = await fileId('../uploads/response-report')
            .then(result => {
                respcsvBR = result;
                console.log(respcsvBR);
            })
            .catch(error => {
                console.log('An Error Occurred in Returning File Path for Response by Object')
        });
        result = await fileId('../uploads/logic-report')
        .then(result => {
            logcsvBR = result;
            console.log(logcsvBR);
        })
        .catch(error => {
            console.log('An Error Occurred in Returning File Path for Logic Membership Report')
        });
        } catch(error){
            console.error('An Error Occurrred Delete Old Files');
        }
    }

async function writeHeaders() {
    try {
        result = await createHeaders();
        console.log(result);
    } catch {
        console.error('An Error Occurred in Writing Headers to the New Files');
    }
}

async function parseAllFiles() {
    try {
        result = await createObjDev();
        console.log(result);
        await csvtojsonconv(); // Wait for the CSV to JSON conversion
        console.log('CSV to JSON conversion completed');
        await jsonParse(); // Wait for the JSON parsing
        console.log('JSON parsing completed');
    } catch (error) {
        console.error('An Error Occurred in Creating Building Report Files:', error);
    }
}

async function correlationFiles() {
    try {
        result = await jsonParse();
        console.log(result);
    } catch {
        console.error('An Error Occurred in Writing Headers to the New BR and Correlation Files');
    }
}

async function createAllLogicFiles() {
    try {
        result = await createLogic();
        console.log(result);
    } catch {
        console.error('An Error Occurred in Writing Headers to the New Logic Files');
    }
}

async function writeAllLogicFiles() {
    try {
        result = await writeLogic();
        console.log('That Is All!');
    } catch {
        console.error('An Error Occurred in Writing Headers to the New Logic Files');
    }
}

module.exports = {deleteAllFiles, writeHeaders, parseAllFiles, correlationFiles, createAllLogicFiles, writeAllLogicFiles};