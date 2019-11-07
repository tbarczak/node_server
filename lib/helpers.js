/*
 * Helpers for tasks
 */
const crypto = require('crypto')
    , config = require('./config')
    , helpers = {}
    , querystring = require('querystring')
    , https = require('https')
    , path = require('path')
    , fs = require('fs');

helpers.hash = (str) => {
  if (typeof(str) === 'string' && str.length > 0) {
    return crypto.createHmac('sha256', config.hashingSecret).update(str).digest('hex');
  } else {
    return false;
  }
};

helpers.parseJsonToObject = (str) => {
  try {
    return JSON.parse(str);
  } catch (e) {
    return {};
  }
};

helpers.createRandomString = (strLength) => {
  strLength = typeof(strLength) === 'number' && strLength > 0 ? strLength : false;
  if (strLength) {
    let possibleCharacters = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let str = '';
    for (let i = 1; i <= strLength; i++) {
      str += possibleCharacters.charAt(Math.floor(Math.random() * possibleCharacters.length));
    }
    return str;
  } else {
    return false;
  }
};


//Send an SMS via Twilio
helpers.sendTwilioSms = (phone,msg,callback) => {
  phone = typeof(phone) === 'string' && phone.trim().length === 10 ? phone.trim() : false;
  msg = typeof(msg) === 'string' && msg.trim().length > 0 && msg.trim().length <= 1600 ? msg.trim() : false;
  if (phone && msg){
    // Configure the request payload
    let payload = {
      'From' : config.twilio.fromPhone,
      'To' : '+1'+phone,
      'Body' : msg
    };
    let stringPayload = querystring.stringify(payload); //THIS IS COOL!  Convert the JSON data to convert it to a querystring format

    // Configure the request details
    let requestDetails = {
      'protocol' : 'https:',
      'hostname' : 'api.twilio.com',
      'method' : 'POST',
      'path' : '/2010-04-01/Accounts/'+config.twilio.accountSid+'/Messages.json',
      'auth' : config.twilio.accountSid+':'+config.twilio.authToken,
      'headers' : {
        'Content-Type' : 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(stringPayload)
      }
    };

    // Instantiate the request object
    let req = https.request(requestDetails,function(res){
      //When the request calls off (req.end() below), this is the logic that fires)
      // Grab the status of the sent request
      let status =  res.statusCode;
      // Callback successfully if the request went through
      if (status === 200 || status === 201){
        callback(false);
      } else {
        callback(`Status code returned was ${status}`);
      }
    });

    // Bind to the error event so it doesn't get thrown
    req.on('error',function(e){
      callback(e);
    });

    // Add the payload
    req.write(stringPayload);

    // End the request (this is what tells it to send off the request)
    req.end();

  } else {
    callback('Given parameters were missing or invalid');
  }
};

// Get the string content of a template
helpers.getTemplate = function(templateName,data,callback){
  templateName = typeof(templateName) == 'string' && templateName.length > 0 ? templateName : false;
  data = typeof(data) == 'object' && data !== null ? data : {};

  if(templateName){
    let templatesDir = path.join(__dirname,'/../templates/');
    fs.readFile(templatesDir+templateName+'.html', 'utf8', function(err,str){
      if(!err && str && str.length > 0){
        let finalString = helpers.interpolate(str,data);
        callback(false,finalString);
      } else {
        callback('No template could be found');
      }
    });
  } else {
    callback('A valid template name was not specified');
  }
};

// Add the universal header and footer to a string, and pass provided data object to header and footer for interpolation
helpers.addUniversalTemplates = function(str,data,callback) {
  str = typeof(str) == 'string' && str.length > 0 ? str : '';
  data = typeof(data) == 'object' && data !== null ? data : {};
  // Get the header
  helpers.getTemplate('_header',data,function(err,headerString) {
    if (!err && headerString) {
      // Get the footer
      helpers.getTemplate('_footer',data,function(err,footerString) {
        if (!err && headerString) {
          // Add them all together
          let fullString = headerString + str + footerString;
          callback(false,fullString);
        } else {
          callback('Could not find the footer template');
        }
      });
    } else {
      callback('Could not find the header template');
    }
  });
};

// Take a given string and data object, and find/replace all the keys within it
helpers.interpolate = function(str,data){
  str = typeof(str) == 'string' && str.length > 0 ? str : '';
  data = typeof(data) == 'object' && data !== null ? data : {};

  // Add the templateGlobals to the data object, prepending their key name with "global."
  for (var keyName in config.templateGlobals) {
     if (config.templateGlobals.hasOwnProperty(keyName)) {
       data['global.' + keyName] = config.templateGlobals[keyName]
     }
  }
  // For each key in the data object, insert its value into the string at the corresponding placeholder
  for (var key in data) {
     if(data.hasOwnProperty(key) && typeof(data[key] == 'string')){
        let replace = data[key];
        let find = '{'+key+'}';
        str = str.replace(find,replace);
     }
  }
  return str;
};

module.exports = helpers;