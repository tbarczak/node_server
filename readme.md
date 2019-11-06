# Pure NodeJS Server Framework

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

Document the routes that are based in here, users, token requests, etc...

### User Management

Document routes associated with creating, updating and deleting users

### Token Management

Document routes associated with creating, updating and deleting tokens and setting their expiration values

### Adding Custom Routes

This is where you flush out creating new routes for custom functionality

## Logging

Document how logging works..

## Task Workers

Document how tasks can be configured and shcheduled

## CLI Functionality

Document the CLI functionality around deployments and anything else

## HTML Templates

Details around how to setup and build HTML templates (MVC format)