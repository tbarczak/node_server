/*
 * Worker-related tasks
 *
 */

// Dependencies
const path = require('path')
    , fs = require('fs')
    , _data = require('./data')
    , https = require('https')
    , http = require('http')
    , helpers = require('./helpers')
    , url = require('url')
    , _logs = require('./logs')
    , util = require('util')
    , debug = util.debuglog('workers');  //This allows you to turn on debug for this module:  \NODE_DEBUG=workers node index.js

// Instantiate the worker module object
const workers = {};

// Lookup all checks, get their data, send to validator
workers.gatherAllChecks = function(){
  // Get all the checks
  _data.list('checks',function(err,checks){
    if (!err && checks && checks.length > 0){
      checks.forEach(function(check){
        // Read in the check data
        _data.read('checks',check,function(err,originalCheckData){
          if (!err && originalCheckData){
            // Pass it to the check validator, and let that function continue the function or log the error(s) as needed
            workers.validateCheckData(originalCheckData);
          } else {
            debug("Error reading one of the check's data: ",err);
          }
        });
      });
    } else {
      debug('Error: Could not find any checks to process');
    }
  });
};

// Sanity-check the check-data,
workers.validateCheckData = (originalCheckData) => {
  originalCheckData = typeof(originalCheckData) === 'object' && originalCheckData !== null ? originalCheckData : {};
  originalCheckData.id = typeof(originalCheckData.id) === 'string' && originalCheckData.id.trim().length === 20 ? originalCheckData.id.trim() : false;
  originalCheckData.userPhone = typeof(originalCheckData.userPhone) === 'string' && originalCheckData.userPhone.trim().length === 10 ? originalCheckData.userPhone.trim() : false;
  originalCheckData.protocol = typeof(originalCheckData.protocol) === 'string' && ['http','https'].indexOf(originalCheckData.protocol) > -1 ? originalCheckData.protocol : false;
  originalCheckData.url = typeof(originalCheckData.url) === 'string' && originalCheckData.url.trim().length > 0 ? originalCheckData.url.trim() : false;
  originalCheckData.method = typeof(originalCheckData.method) === 'string' &&  ['post','get','put','delete'].indexOf(originalCheckData.method) > -1 ? originalCheckData.method : false;
  originalCheckData.successCodes = typeof(originalCheckData.successCodes) === 'object' && originalCheckData.successCodes instanceof Array && originalCheckData.successCodes.length > 0 ? originalCheckData.successCodes : false;
  originalCheckData.timeoutSeconds = typeof(originalCheckData.timeoutSeconds) === 'number' && originalCheckData.timeoutSeconds % 1 === 0 && originalCheckData.timeoutSeconds >= 1 && originalCheckData.timeoutSeconds <= 5 ? originalCheckData.timeoutSeconds : false;
  // Set the keys that may not be set (if the workers have never seen this check before)
  originalCheckData.state = typeof(originalCheckData.state) === 'string' && ['up','down'].indexOf(originalCheckData.state) > -1 ? originalCheckData.state : 'down';
  originalCheckData.lastChecked = typeof(originalCheckData.lastChecked) === 'number' && originalCheckData.lastChecked > 0 ? originalCheckData.lastChecked : false;

  // If all checks pass, pass the data along to the next step in the process
  if(originalCheckData.id &&
      originalCheckData.userPhone &&
      originalCheckData.protocol &&
      originalCheckData.url &&
      originalCheckData.method &&
      originalCheckData.successCodes &&
      originalCheckData.timeoutSeconds){
    workers.performCheck(originalCheckData);
  } else {
    // If checks fail, log the error and fail silently
    debug("Error: one of the checks is not properly formatted. Skipping.");
  }
};

// Perform the check, send the originalCheck data and the outcome of the check process to the next step in the process
workers.performCheck = (originalCheckData) => {
  // Prepare the intial check outcome
  let checkOutcome = {
    'error' : false,
    'responseCode' : false
  };

  // Mark that the outcome has not been sent yet
  let outcomeSent = false;

  // Parse the hostname and path out of the originalCheckData
  let parsedUrl = url.parse(originalCheckData.protocol + '://' + originalCheckData.url, true);
  let hostName = parsedUrl.hostname;
  let path = parsedUrl.path; // Using path not pathname because we want the query string

  // Construct the request
  let requestDetails = {
    'protocol' : originalCheckData.protocol + ':',
    'hostname' : hostName,
    'method' : originalCheckData.method.toUpperCase(),
    'path' : path,
    'timeout' : originalCheckData.timeoutSeconds * 1000
  };

  // Instantiate the request object (using either the http or https module)
  let _moduleToUse = originalCheckData.protocol === 'http' ? http : https;
  let req = _moduleToUse.request(requestDetails,function(res){
    // Update the checkOutcome and pass the data along
    checkOutcome.responseCode = res.statusCode;
    if (!outcomeSent){
      workers.processCheckOutcome(originalCheckData,checkOutcome);
      outcomeSent = true;
    }
  });

  req.on('error',function(e){ // Bind to the error event so it doesn't get thrown
    // Update the checkOutcome and pass the data along
    checkOutcome.error = {'error' : true, 'value' : e};
    if (!outcomeSent){
      workers.processCheckOutcome(originalCheckData,checkOutcome);
      outcomeSent = true;
    }
  });

  req.on('timeout',function(){ // Bind to the timeout event
    // Update the checkOutcome and pass the data along
    checkOutcome.error = {'error' : true, 'value' : 'timeout'};
    if (!outcomeSent){
      workers.processCheckOutcome(originalCheckData,checkOutcome);
      outcomeSent = true;
    }
  });

  req.end(); // End the request (which sends the request)
};


// Process the check outcome, update the check data as needed, trigger an alert if needed
// Special logic for accomodating a check that has never been tested before (don't alert on that one)
workers.processCheckOutcome = (originalCheckData,checkOutcome) => {
  let state = !checkOutcome.error && checkOutcome.responseCode && originalCheckData.successCodes.indexOf(checkOutcome.responseCode) > -1 ? 'up' : 'down';  // Decide if the check is considered up or down
  let alertWarranted = !!(originalCheckData.lastChecked && originalCheckData.state !== state); // Decide if an alert is warranted

  // Log the outcome
  var timeOfCheck = Date.now();
  workers.log(originalCheckData,checkOutcome,state,alertWarranted,timeOfCheck);


  // Update the check data
  let newCheckData = originalCheckData;
  newCheckData.state = state;
  newCheckData.lastChecked = Date.now();

  _data.update('checks',newCheckData.id,newCheckData,function(err){ // Save the updates
    if (!err){
      // Send the new check data to the next phase in the process if needed
      if (alertWarranted){
        workers.alertUserToStatusChange(newCheckData);
      } else {
        debug("Check outcome has not changed, no alert needed");
      }
    } else {
      debut("Error trying to save updates to one of the checks");
    }
  });
};


// Alert the user as to a change in their check status
workers.alertUserToStatusChange = (newCheckData) => {
  let msg = `Alert: Your check for ${newCheckData.method.toUpperCase()} ${newCheckData.protocol}://${newCheckData.url} is currently ${newCheckData.state}`;
  helpers.sendTwilioSms(newCheckData.userPhone,msg,function(err){
    if (!err){
      debug("Success: User was alerted to a status change in their check, via sms: ", msg);
    } else {
      debug("Error: Could not send sms alert to user who had a state change in their check", err);
    }
  });
};

// Send check data to a log file
workers.log = (originalCheckData,checkOutcome,state,alertWarranted,timeOfCheck) => {
  // Form the log data
  let logData = {
    'check' : originalCheckData,
    'outcome' : checkOutcome,
    'state' : state,
    'alert' : alertWarranted,
    'time' : timeOfCheck
  };

  // Convert the data to a string
  let logString = JSON.stringify(logData);

  // Determine the name of the log file
  let logFileName = originalCheckData.id;

  // Append the log string to the file
  _logs.append(logFileName,logString,function(err){
    if(!err){
      debug("Logging to file succeeded");
    } else {
      debug("Logging to file failed");
    }
  });

};

// Timer to execute the worker-process once per minute
workers.loop = () => {
  setInterval(function(){
    workers.gatherAllChecks();
  },1000 * 60);  //@TODO: Currently sent to every Minute, should expand to 5 or longer in PROD and move to CONFIG file...
};


// Rotate (compress) the log files
workers.rotateLogs = () => {
  // List all the (non compressed) log files
  _logs.list(false,function(err,logs){
    if(!err && logs && logs.length > 0){
      logs.forEach(function(logName){
        // Compress the data to a different file
        let logId = logName.replace('.log','');
        let newFileId = logId + '-' + Date.now();
        _logs.compress(logId,newFileId,function(err){
          if(!err){
            // Truncate the log
            _logs.truncate(logId,function(err){
              if(!err){
                debug("Success truncating logfile");
              } else {
                debug("Error truncating logfile");
              }
            });
          } else {
            debug("Error compressing one of the log files.",err);
          }
        });
      });
    } else {
      debug('Error: Could not find any logs to rotate');
    }
  });
};

// Timer to execute the log-rotation process once per day
workers.logRotationLoop = () => {
  setInterval(function(){
    workers.rotateLogs();
  },1000 * 60 * 60 * 24);
};

workers.init = () => {
  console.log('\x1b[33m%s\x1b[0m','Background workers are running');
  
  // Execute all the checks immediately
  workers.gatherAllChecks();

  // Call the loop so the checks will execute later on
  workers.loop();

  // Compress all the logs immediately
  workers.rotateLogs();

  // Call the compression loop so checks will execute later on
  workers.logRotationLoop();
};
module.exports = workers;