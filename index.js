/*
 * Primary file for the NodeJS Server Service API & MVC Framework
 * Created: 11/1/19
 *
 *  Command + K (MacOS) to clear terminal
 *  Control + C terminates app, closing port
 */
const server = require('./lib/server')
    , workers = require('./lib/workers');

const app = {};

//init function
app.init = () => {
  //start HTTP/S servers
  server.init();

  //start background workers
 workers.init();
};

//execute
app.init();

module.exports = app;