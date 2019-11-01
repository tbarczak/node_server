/*
 * Library for storing and editing data
 * Created 10/28/19
 */

const fs = require('fs')
    , path = require('path')
    , helpers = require('./helpers');

//create container for module
const lib = {};

lib.baseDir = path.join(__dirname,'/../data');
lib.create = function (dir,file,data,callback) {
   fs.open(`${lib.baseDir}/${dir}/${file}.json`,'wx',function(err,fileDescriptor){
     if (!err && fileDescriptor) {
      //convert data to string first (always)
       let stringData = JSON.stringify(data);
       fs.writeFile(fileDescriptor,stringData,function(err){
         if (!err) {
           fs.close(fileDescriptor, function (err) {
             if (!err){
               callback(false);
             } else {
               callback('Error closing new file.');
             }
           });
         } else {
           callback('Error writing to new file');
         }
       });
     } else {
       callback('Could not create new file, it may already exist.');
     }
   });
};

lib.read = (dir, file, callback) => {
  fs.readFile(`${lib.baseDir}/${dir}/${file}.json`,'utf-8',function(err,data){
    if (!err && data){
      let parsedData = helpers.parseJsonToObject(data);
      callback(false, parsedData);
    } else {
      callback(err, data);
    }
  });
};

lib.update = (dir, file, data, callback) => {
  fs.open(`${lib.baseDir}/${dir}/${file}.json`, 'r+', function (err, fileDescriptor) {
    if (!err && fileDescriptor){
      let stringData = JSON.stringify(data);
      fs.truncate(fileDescriptor,function(err) {
        if (!err) {
          fs.write(fileDescriptor, stringData, function (err) {
            if (!err){
              fs.close(fileDescriptor, function(err){
                if (!err) {
                  callback(false);
                } else {
                  callback('Error closing file');
                }
              })
            } else  {
              callback('Error writing to existing file.');
            }
          });
        } else {
          callback('Error truncating file.');
        }
      });
    } else {
      callback('Could not open file for update. It may not exist yet.');
    }
  });
};

lib.delete = (dir,file,callback) => {
  fs.unlink(`${lib.baseDir}/${dir}/${file}.json`,function(err){
    if (!err){
      callback(false)
    } else {
      callback('Error deleting file.');
    }
  });
};

// List all the items in a directory
lib.list = (dir,callback) =>{
  fs.readdir(`${lib.baseDir}/${dir}/`, function(err,data){
    if (!err && data && data.length > 0){
      let trimmedFileNames = [];
      data.forEach(function(fileName){
        trimmedFileNames.push(fileName.replace('.json',''));
      });
      callback(false,trimmedFileNames);
    } else {
      callback(err,data);
    }
  });
};


//export the module (container)
module.exports = lib;