/*
 * Request handlers
 */

const _data = require('./data')
    , helpers = require('./helpers')
    , config = require('./config')
    , handlers = {};

handlers.users = function(data,callback){
  let acceptableMethods = ['post','get','put','delete'];
  if (acceptableMethods.indexOf(data.method) > -1) {
    handlers._users[data.method](data, callback);
  } else {
    callback(405);  //method not allowed
  }
};

handlers._users = {};
handlers._users.post = (data, callback) => {
  let firstName = typeof(data.payload.firstName) === 'string' && data.payload.firstName.trim().length > 0 ? data.payload.firstName.trim() : false;
  let lastName = typeof(data.payload.lastName) === 'string' && data.payload.lastName.trim().length > 0 ? data.payload.lastName.trim() : false;
  let phone = typeof(data.payload.phone) === 'string' && data.payload.phone.trim().length === 10 ? data.payload.phone.trim() : false;
  let password = typeof(data.payload.password) === 'string' && data.payload.password.trim().length > 0 ? data.payload.password.trim() : false;
  let tosAgreement = !!(typeof(data.payload.tosAgreement) === 'boolean' && data.payload.tosAgreement);

  if (firstName && lastName && phone && password && tosAgreement){
    _data.read('users',phone,function(err,data){ //ensure user doesn't already exist
      if (err){ //no user data found, so create new record
        let hashedPassword = helpers.hash(password);
        if (hashedPassword){
          let userObject = {
            'firstName': firstName,
            'lastName': lastName,
            'phone': phone,
            'hashedPassword': hashedPassword,
            'tosAgreement': true
          };

          _data.create('users',phone,userObject,function(err,data){
            if (!err){
              callback(200);
            } else {
              console.log(err);
              callback(500,{'Error': 'Count not create the new user.'});
            }
          });
        } else {
          callback(500, {'Error': 'Error hashing password.'});
        }

      } else {
        callback(400,{'Error': 'A user with that phone number already exists'});
      }
    });
  } else {
    callback(400,{'Error': 'Missing required fields.'});
  }
};

//Required data: phone
//Optional data: none
handlers._users.get = (data, callback) => {
  let phone = typeof(data.queryStringObject.phone) === 'string' && data.queryStringObject.phone.trim().length === 10 ? data.queryStringObject.phone.trim() : false;
  if (phone) {
    let token = typeof(data.headers.token) === 'string' ? data.headers.token : false;
    handlers._tokens.verifyToken(token, phone, function (tokenIsValid) {
      if (tokenIsValid) {
        _data.read('users',phone,function(err,data){
          if (!err && data){
            delete data.hashedPassword;
            callback(200, data);
          } else {
            callback(404);
          }
        });
      } else {
        callback(403,{'Error': 'Token is INVALID or missing!!!!'});
      }
    });
  } else {
    callback(400,{'Error': 'Missing Required field: phone number'})
  }
};

//Required: phone
//Optional: firstName,LastName,password (at least 1 must be specified)
handlers._users.put = (data, callback) => {
  let phone = typeof(data.payload.phone) === 'string' && data.payload.phone.trim().length === 10 ? data.payload.phone.trim() : false;
  let firstName = typeof(data.payload.firstName) === 'string' && data.payload.firstName.trim().length > 0 ? data.payload.firstName.trim() : false;
  let lastName = typeof(data.payload.lastName) === 'string' && data.payload.lastName.trim().length > 0 ? data.payload.lastName.trim() : false;
  let password = typeof(data.payload.password) === 'string' && data.payload.password.trim().length > 0 ? data.payload.password.trim() : false;

  if (phone) {
    if (firstName || lastName || password) {
      let token = typeof(data.headers.token) === 'string' ? data.headers.token : false;
      handlers._tokens.verifyToken(token, phone, function (tokenIsValid) {
        if (tokenIsValid) {
          _data.read('users',phone,function(err,userData){
            if (!err && userData) {
              if (firstName){
                userData.firstName = firstName;
              }
              if (lastName){
                userData.lastName = lastName;
              }
              if (password){
                userData.hashedPassword = helpers.hash(password);
              }
              _data.update('users', phone, userData, function(err){
                if (!err) {
                  callback(200);
                } else {
                  console.log(err);
                  callback(500,{'Error': 'Could not update the user.'});
                }
              });
            } else {
              callback(400,{'Error': 'The specified user does not exist.'});
            }
          });


        } else {
          callback(403,{'Error': 'Token is INVALID or missing!!!!'});
        }
      });
    } else {
      callback(400,{'Error': 'Missing field(s) to update.'})
    }
  } else {
    callback(400,{'Error': 'Missing Required field: phone number'})
  }
};

//Required: phone
handlers._users.delete = function(data,callback){
  // Check that phone number is valid
  let phone = typeof(data.queryStringObject.phone) === 'string' && data.queryStringObject.phone.trim().length === 10 ? data.queryStringObject.phone.trim() : false;
  if(phone){
    // Get token from headers
    let token = typeof(data.headers.token) === 'string' ? data.headers.token : false;

    // Verify that the given token is valid for the phone number
    handlers._tokens.verifyToken(token,phone,function(tokenIsValid){
      if(tokenIsValid){
        // Lookup the user
        _data.read('users',phone,function(err,userData){
          if(!err && userData){
            // Delete the user's data
            _data.delete('users',phone,function(err){
              if(!err){
                // Delete each of the checks associated with the user
                let userChecks = typeof(userData.checks) === 'object' && userData.checks instanceof Array ? userData.checks : [];
                let checksToDelete = userChecks.length;
                if(checksToDelete > 0){
                  let checksDeleted = 0;
                  let deletionErrors = false;
                  // Loop through the checks
                  userChecks.forEach(function(checkId){
                    // Delete the check
                    _data.delete('checks',checkId,function(err){
                      if(err){
                        deletionErrors = true;
                      }
                      checksDeleted++;
                      if(checksDeleted === checksToDelete){
                        if(!deletionErrors){
                          callback(200);
                        } else {
                          callback(500,{'Error' : "Errors encountered while attempting to delete all of the user's checks. All checks may not have been deleted from the system successfully."})
                        }
                      }
                    });
                  });
                } else {
                  callback(200);
                }
              } else {
                callback(500,{'Error' : 'Could not delete the specified user'});
              }
            });
          } else {
            callback(400,{'Error' : 'Could not find the specified user.'});
          }
        });
      } else {
        callback(403,{"Error" : "Missing required token in header, or token is invalid."});
      }
    });
  } else {
    callback(400,{'Error' : 'Missing required field'})
  }
};

// Tokens Handler Logic
handlers.tokens = (data,callback) => {
  let acceptableMethods = ['post','get','put','delete'];
  if (acceptableMethods.indexOf(data.method) > -1) {
    handlers._tokens[data.method](data, callback);
  } else {
    callback(405);  //method not allowed
  }
};
handlers._tokens = {};
//Required: phone, password
//Optional: none
handlers._tokens.post = (data,callback) => {
  let phone = typeof(data.payload.phone) === 'string' && data.payload.phone.trim().length === 10 ? data.payload.phone.trim() : false;
  let password = typeof(data.payload.password) === 'string' && data.payload.password.trim().length > 0 ? data.payload.password.trim() : false;
  if (phone && password) {
    _data.read('users',phone,function(err,userData){
      if (!err && userData) {
        let hashedPassword = helpers.hash(password);
        if (hashedPassword === userData.hashedPassword) {
          let tokenId = helpers.createRandomString(20);
          let expires = Date.now() + 1000 * 60 * 60;
          let tokenObject = {
            'phone': phone,
            'id': tokenId,
            'expires': expires
          };

          _data.create('tokens',tokenId,tokenObject,function(err){
            if (!err){
              callback(200, tokenObject);
            } else {
              callback(500, {'Error': 'Could not create a new token.'});
            }
          });
        } else {
          callback(400,{'Error': 'Password did not match the user account.'})
        }
      }else {
        callback(400,{'Error': 'Could not find the specified user.'})
      }
    })
  } else {
    callback(400,{'Error':'Missing Required Fields'})
  }
};
handlers._tokens.get = (data,callback) => {
  let id = typeof(data.queryStringObject.id) === 'string' && data.queryStringObject.id.trim().length === 20 ? data.queryStringObject.id.trim() : false;
  if (id) {
    _data.read('tokens',id,function(err,tokenData){
      if (!err && tokenData){
        callback(200, tokenData);
      } else {
        callback(404);
      }
    });
  } else {
    callback(400,{'Error': 'Missing Required fields'})
  }
};
//Required: id, extend
//Optional: none
handlers._tokens.put = (data,callback) => {
  let id = typeof(data.payload.id) === 'string' && data.payload.id.trim().length === 20 ? data.payload.id.trim() : false;
  let extend = !!(typeof(data.payload.extend) === 'boolean' && data.payload.extend);
  if (id && extend){
    _data.read('tokens',id,function(err,tokenData){
      if (!err && tokenData){
        if (tokenData.expires > Date.now()) {
          tokenData.expires = Date.now() + 1000 * 60 * 60;
          _data.update('tokens',id,tokenData,function(err){
            if (!err){
              callback(200);
            } else {
              callback(500,{'Error':'Could not extend token expiration.'});
            }
          })
        } else {
          callback(400,{'Error':'Token has already expired and cannot be extended.'});
        }
      } else {
        callback(400,{'Error':'Specified Token does not exist.'});
      }
    });
  } else {
    callback(400, {'Error': 'Missing required field(s) or field(s) are invalid.'});
  }
};
handlers._tokens.delete = (data,callback) => {
  let id = typeof(data.queryStringObject.id) === 'string' && data.queryStringObject.id.trim().length === 20 ? data.queryStringObject.id.trim() : false;
  if (id) {
    _data.read('tokens',id,function(err,data){
      if (!err && data){
        _data.delete('tokens',id,function(err){
          if (!err){
            callback(200);
          } else {
            callback(500,{'Error': 'Could not delete the user token'})
          }
        });
      } else {
        callback(400,{'Error': 'Could not find the specified user token.'});
      }
    });
  } else {
    callback(400,{'Error': 'Missing Required field: token ID'})
  }
};
handlers._tokens.verifyToken = (id,phone,callback) => {
  _data.read('tokens',id,function(err,tokenData){
    if (!err && tokenData){
      if (tokenData.phone === phone && tokenData.expires > Date.now()){
        callback(true);
      } else {
        callback(false);
      }
    } else {
      callback(false);
    }
  });
};


//  BEGIN EXAMPLE OF EXPANDED ROUTE FUNCTIONS!!!
// Define the new Service with accepted methods
// Checks Services
handlers.checks = (data,callback) => {
  let acceptableMethods = ['post','get','put','delete'];
  if (acceptableMethods.indexOf(data.method) > -1) {
    handlers._checks[data.method](data, callback);
  } else {
    callback(405);  //method not allowed
  }
};

//container for all the Checks methods
handlers._checks = {};
//Required: protocol, url, method, successCodes, timeoutSeconds
//Optional: none
handlers._checks.post = (data,callback) => {
  let protocol = typeof(data.payload.protocol) === 'string' && ['https','http'].indexOf(data.payload.protocol) > -1 ? data.payload.protocol : false;
  let url = typeof(data.payload.url) === 'string' && data.payload.url.trim().length > 0 ? data.payload.url.trim() : false;
  let method = typeof(data.payload.method) === 'string' && ['post','get','put','delete'].indexOf(data.payload.method) > -1 ? data.payload.method : false;
  let successCodes = typeof(data.payload.successCodes) === 'object' && data.payload.successCodes instanceof Array && data.payload.successCodes.length > 0 ? data.payload.successCodes : false;
  let timeoutSeconds = typeof(data.payload.timeoutSeconds) === 'number' && data.payload.timeoutSeconds % 1 === 0 && data.payload.timeoutSeconds >= 1 && data.payload.timeoutSeconds <= 5 ? data.payload.timeoutSeconds : false;

  if (protocol && url && method && successCodes && timeoutSeconds) {  //If all data is present and valid
    // Get User Token from Headers
    let token = typeof(data.headers.token) === 'string' ? data.headers.token : false;

    //lookup the user by reading the token
    _data.read('tokens',token,function(err,tokenData){
      if (!err && tokenData) {
        let userPhone = tokenData.phone;
        //lookup User Data
        _data.read('users',userPhone,function(err,userData){
          if (!err && userData){
            let userChecks = typeof(userData.checks) === 'object' && userData.checks instanceof Array ? userData.checks : [];
            if (userChecks.length < config.maxChecks){
              let checkId = helpers.createRandomString(20);
              let checkObject = {
                'id': checkId,
                'userPhone': userPhone,
                'protocol': protocol,
                'url': url,
                'method': method,
                'successCodes': successCodes,
                'timeoutSeconds': timeoutSeconds
              };
              _data.create('checks',checkId,checkObject,function(err){
                if (!err){
                  //add the checkId to the user's object (reationship)
                  userData.checks = userChecks;
                  userData.checks.push(checkId);

                  //save the nwe user data
                  _data.update('users',userPhone,userData,function(err){
                    if (!err) {
                      callback(200, checkObject);
                    } else {
                      callback(500,{'Error': 'Could not update the user data with new check.'})
                    }
                  });
                } else {
                  callback(500,{'Error': 'Could not save new check.  Error saving data to disk.'})
                }
              })
            } else {
              callback(400,{'Error': `The user already has the maximum number of checks (${config.maxChecks}).`})
            }
          } else {
            callback(403);
          }
        })
      } else {
        callback(403);
      }
    });
  } else {
    callback(400,{'Error':'Missing required inputs, or inputs are invalid.'})
  }
};
//Required: id
//Optional: none
handlers._checks.get = (data, callback) => {
  let id = typeof(data.queryStringObject.id) === 'string' && data.queryStringObject.id.trim().length === 20 ? data.queryStringObject.id.trim() : false;
  if (id) {
    _data.read('checks',id,function(err,checkData){
      if (!err && checkData) {
        let token = typeof(data.headers.token) === 'string' ? data.headers.token : false;
        handlers._tokens.verifyToken(token, checkData.userPhone, function (tokenIsValid) {
          if (tokenIsValid) {
            callback(200, checkData);
          } else {
            callback(403,{'Error': 'Token is INVALID or missing!!!!'});
          }
        });
      } else {
        callback(404);
      }
    });
  } else {
    callback(404)
  }
};
handlers._checks.put = (data,callback) => {
  let id = typeof(data.payload.id) === 'string' && data.payload.id.trim().length === 20 ? data.payload.id.trim() : false;
  let protocol = typeof(data.payload.protocol) === 'string' && ['https','http'].indexOf(data.payload.protocol) > -1 ? data.payload.protocol : false;
  let url = typeof(data.payload.url) === 'string' && data.payload.url.trim().length > 0 ? data.payload.url.trim() : false;
  let method = typeof(data.payload.method) === 'string' && ['post','get','put','delete'].indexOf(data.payload.method) > -1 ? data.payload.method : false;
  let successCodes = typeof(data.payload.successCodes) === 'object' && data.payload.successCodes instanceof Array && data.payload.successCodes.length > 0 ? data.payload.successCodes : false;
  let timeoutSeconds = typeof(data.payload.timeoutSeconds) === 'number' && data.payload.timeoutSeconds % 1 === 0 && data.payload.timeoutSeconds >= 1 && data.payload.timeoutSeconds <= 5 ? data.payload.timeoutSeconds : false;

  if (id){
    if (protocol || url || method || successCodes || timeoutSeconds){
      _data.read('checks',id,function(err,checkData){
        if (!err && checkData) {
          let token = typeof(data.headers.token) === 'string' ? data.headers.token : false;
          handlers._tokens.verifyToken(token, checkData.userPhone, function (tokenIsValid) {
            if (tokenIsValid) {
              //update record
              if (protocol) { checkData.protocol = protocol; }
              if (url) { checkData.url = url; }
              if (method) { checkData.method = method; }
              if (successCodes) { checkData.successCodes = successCodes; }
              if (timeoutSeconds) { checkData.timeoutSeconds = timeoutSeconds; }
              _data.update('checks',id,checkData,function(err){
                if (!err) {
                  callback(200);
                } else {
                  callback(500, {'Error': 'Could not update the check data.'})
                }
              });
            } else {
              callback(403, {'Error': 'Token is INVALID or missing!!!!'});
            }
          });
        } else {
          callback(400, {'Error': 'Check ID did not exist.'})
        }
      });
    } else {
      callback(400, {'Error': 'No data fields supplied for update'});
    }
  } else {
    callback(400, {'Error': 'Missing required fields'});
  }
};
handlers._checks.delete = (data,callback) => {
  let id = typeof(data.queryStringObject.id) === 'string' && data.queryStringObject.id.trim().length === 20 ? data.queryStringObject.id.trim() : false;
  if(id){
    // Lookup the check
    _data.read('checks',id,function(err,checkData){
      if(!err && checkData){
        // Get the token that sent the request
        let token = typeof(data.headers.token) === 'string' ? data.headers.token : false;
        // Verify that the given token is valid and belongs to the user who created the check
        handlers._tokens.verifyToken(token,checkData.userPhone,function(tokenIsValid){
          if(tokenIsValid){

            // Delete the check data
            _data.delete('checks',id,function(err){
              if(!err){
                // Lookup the user's object to get all their checks
                _data.read('users',checkData.userPhone,function(err,userData){
                  if(!err){
                    let userChecks = typeof(userData.checks) === 'object' && userData.checks instanceof Array ? userData.checks : [];

                    // Remove the deleted check from their list of checks
                    let checkPosition = userChecks.indexOf(id);
                    if(checkPosition > -1){
                      userChecks.splice(checkPosition,1);
                      // Re-save the user's data
                      userData.checks = userChecks;
                      _data.update('users',checkData.userPhone,userData,function(err){
                        if(!err){
                          callback(200);
                        } else {
                          callback(500,{'Error' : 'Could not update the user.'});
                        }
                      });
                    } else {
                      callback(500,{"Error" : "Could not find the check on the user's object, so could not remove it."});
                    }
                  } else {
                    callback(500,{"Error" : "Could not find the user who created the check, so could not remove the check from the list of checks on their user object."});
                  }
                });
              } else {
                callback(500,{"Error" : "Could not delete the check data."})
              }
            });
          } else {
            callback(403);
          }
        });
      } else {
        callback(400,{"Error" : "The check ID specified could not be found"});
      }
    });
  } else {
    callback(400,{"Error" : "Missing valid id"});
  }
};
// END OF CUSTOM BEHAVIOR LOGIC
// END OF MANAGING CHECKS FOR APP


handlers.ping = function(data,callback){
  callback(200,{});
};

handlers.notFound = (data, callback) =>{
  callback(404);
};

module.exports = handlers;