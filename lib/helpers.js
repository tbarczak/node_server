/*
 * Helpers for tasks
 */
const crypto = require('crypto')
    , config = require('./config')
    , helpers = {}
    , querystring = require('querystring')
    , https = require('https');

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

module.exports = helpers;