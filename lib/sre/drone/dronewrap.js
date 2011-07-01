/**
 * System Runtime Environment Drone startup wrapper module
 * This is the location to manipulate the SRE Drone environment variables like globals
 * allowing us to override several aspects of the drone, such as the HTTP server.
 * We also have the benefit of getting returned process informations about the drone.
 *
 * Based on carapace.js of Haibu (C) 2010, Nodejitsu Inc.
 * 
 * Copyright 2011 TTC/Sander Tolsma
 * See LICENSE file for license
 */

var util = require('util'),
	net = require('net'),
	http = require('http');

// TODO : Change this to RPC interface interaction.
var carapace = {};
carapace.config = {
	script  : process.argv[2],
	server  : process.argv[3],
	port    : process.argv[4],
	root    : process.argv[5],
	appPath : process.argv[6], 
	pid     : process.pid
};

var netListen = net.Server.prototype.listen,
	reservedPorts = [843];

//
// Helper function from Node code to parse port arguments
// passed to net.prototype.Server.listen
//
function toPort(x) { 
  return (x = Number(x)) >= 0 ? x : false; 
}

/**
 * Donkey punch the listen() function.
 *
 * 1. Listen on a UNIX socket: server.listen('/tmp/socket');
 *    Ignore these cases, pass through to netListen
 *
 * 2. Listen on port 8000, accept connections from INADDR_ANY: server.listen(8000);
 *    Change the port to the port we have been passed by the config
 *
 * 3. Listen on port 8000, accept connections to '192.168.1.2': server.listen(8000, '192.168.1.2');
 *    Change the port to the port we have been passed by the config
 */
net.Server.prototype.listen = function () {
	var args = Array.prototype.slice.call(arguments),
		port = toPort(args[0]);
	
	//
	// If arguments[0] is a port, assume (2, 3) from the documentation 
	// above and change the value of the arguments to what we've been passed.
	//
	if (port && !~reservedPorts.indexOf(port)) {
		args[0] = carapace.config.port;
	}
	
	return netListen.apply(this, args);
};

// Update the require path of the target drone start script
var p = carapace.config.script.replace('.js', ''),
	tmp = util.puts, drone;
	
// Set the root of the child process if requested
if (carapace.config.root) {
	var daemon = require('daemon');
	daemon.chroot(carapace.config.root);
	process.chdir(carapace.config.appPath);
}

require.paths.unshift(process.cwd());

// Now just require the drone to get things moving.
drone = require('module').Module._load(p, null, true);