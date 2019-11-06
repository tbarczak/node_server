# Pure NodeJS Server Container Framework

This is a work in progress, pure NodeJS Web Server with API and MVC Web Template Support.  It is not ready for use.

<a href="https://github.com/tbarczak/node_server" target="\_parent">
  <img alt="" src="https://img.shields.io/github/stars/tbarczak/node_server.svg?style=social&label=Star" />
</a>


## Quick Features

- Written in native NodeJS with no external dependancies
- No libraries to update or maintain
- Framework for user accounts
- Basic token based authentication
- Support for JSON based RESTful API
- Support for MVC structured HTML Web Templates (server side)
- Logging support
- CLI Deployment Support (coming soon)
- Container Support

<details>
<summary>Challenges and Solution</summary>

## The Challenge

Writing and maintaining modern NodeJS apps includes supporting many external libraries and dependancies.  This not only increases 
the complexity of maintaining and writing for the app, but also the maintenance burdon when it comes to version management.  
Libraries depricating functionality, changing implementations, exposing possible security holes.  NodeJS after version 9, fully supports 
all the core functionality of libraries such as Express with just a few more lines of code.  This server is a fully contained, stand alone 
implementation of a native NodeJS HTTP/S server with logging, error handling and the open ended ability to code any front end into it.

- Reduce complexity and overhead
- No longer worry about maintaining version support
- Secure and easy to implement

## The Solution

Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book. It has survived not only five centuries, but also the leap into electronic typesetting, remaining essentially unchanged. It was popularised in the 1960s with the release of Letraset sheets containing Lorem Ipsum passages, and more recently with desktop publishing software like Aldus PageMaker including versions of Lorem Ipsum.
</details>



# Documentation

- [Installation](#installation)
- [Getting Started](#getting-started)
- [Default Routes](#default-routes)
  - [User Management](#user-management)
  - [Token Management](#token-management)
  - [Adding Custom Routes](#custom-routes)
- [Logging](#logging)
- [Task Workers](#task-workers)
- [CLI Functionality](#cli-functionality)
- [HTML Templates](#html-templates)


## Installation

NPM/YARN Support soon!
```bash
$ npm i --save pure-node-framework
# or
$ yarn add pure-node-framework
```

## Getting Started
```
$ node index.js
```

## Default Routes

As with any web server or Node Library such as Express, routes are necessary to define the request paths.  A few default routes are configured in the application to add support for user and token management as well as examples 
for how to build out the app for custom requests.  All routes are configured in /lib/server.js:

```js
server.router = {
  'ping': handlers.ping,
  'users': handlers.users,
  'tokens': handlers.tokens,
  'checks': handlers.checks
};
```

Each route function is then flushed out in the /lib/handers.js file.  For example, "handlers.ping" is defined as a function with a callback near the bottom of the file:

```js
handlers.ping = function(data,callback){
  callback(200,{});
};
```

This simply returns an HTTP status code of 200 and an empty data package.

### User Management

The Users Route supports 3 methods: POST, PUT, GET and DELETE.  Each defines a different function around user managment.  POST creates a new user record (if one isn't found), PUT updates an existing record based on their phone number (used as an easy user ID value) and GET retrieves the full user record.  DELETE obviously removes the user from the local system.

In this basic implementation user data (and in fact all data) is stored locally in the file system.  That functionality is defined in the data.js helper.  But in an expanded role, that data should be stored in a database.  In a future release, an example of a SQL database implementation will be added as an option.

For the basics of this application, the user data stores is first, last, phone and a password (which is encoded).

### Token Management

This app leverages basic token level authentication.  For any requests a token must be included in the header as a key / value pair of "token":"value".  The token request for a token is handled through the /tokens handler.  a POST operation including the phone number (this systems default USER ID) and correct password will generate and return a token good for 1 hour.  A PUT operation on the token, passing a valid and active token will extend the token for another 60 minutes.  A DELETE method call will remove the token assocaition with the user and deactivate it. 

### Adding Custom Routes

This is where you flush out creating new routes for custom functionality

## Logging

Document how logging works..

## Task Workers

The app supports a task workers process.  All tasks designed to run on different intervals is stored in the /lib/workers.js file.  A ``` workers.init()``` function is called when the application starts and the function runs different tasks and sets the ``` workers.loop() ``` function in order to set a timer on tasks.

## CLI Functionality

Document the CLI functionality around deployments and anything else

## HTML Templates

Details around how to setup and build HTML templates (MVC format)

## Container Support

Details around how to script deployments of this NodeJS server instance into containers for rapid deployment and configuration coming soon.  Well after I finish building it...