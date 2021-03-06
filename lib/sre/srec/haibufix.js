/**
 * haibufix.js, realtime changes to haibu!
 *
 * Copyright 2011 TTC/Sander Tolsma
 * See LICENSE file for license
 */

var fs = require('fs'),
    path = require('path'),
    forever = require('forever');

module.exports = function(haibu) {
	
	// Donkey punch Drone.prototype.clean because wrong app.user check 
	// until all required patches for removing user notion in haibu, are pushed by Nodejitsu
	haibu.drone.Drone.prototype.clean = function (app, callback) {
	  if (typeof(app.user) == 'undefined' || typeof(app.name) == 'undefined') {
		return callback(new Error('Both `user` and `name` are required.'));
	  }
	
	  var appsDir = haibu.config.get('directories:apps');
		  
	  this.stop(app.name, function (err, result) {
		//
		// Ignore errors and continue cleaning
		//
		haibu.utils.rmApp(appsDir, app, callback);
	  });
	};

	// Donkey punch Spawner.prototype.spawn to add arguments support to haibu 
	// until all required patches for arguments support in haibu are pushed by Nodejitsu
	//
	// ### function spawn (app, callback)
	// #### @repo {repository.Repository} App repository to attempt to spawn on this server.
	// #### @callback {function} Continuation passed to respond to.
	// spawns the appropriate carapace for an Application and bootstraps with the events listed
	//
	haibu.Spawner.prototype.spawn = function spawn (repo, callback) {
	  if (!(repo instanceof haibu.repository.Repository)) throw (new Error('repo is not an instance of repository.Repository!'));

	  var self = this,
		  command = path.join(require.resolve('haibu-carapace'), '..', '..', 'bin', 'carapace'),
		  app = repo.app,
		  meta = { app: app.name },
		  script = repo.startScript,
		  scriptArgs = (app.scripts && app.scripts.arguments) ? app.scripts.arguments : [],
		  responded = false,
		  stderr = [],
		  foreverOptions,
		  error,
		  drone;
	
	  haibu.emit('spawn:setup', 'info', meta);
	  
	  foreverOptions = {
		silent:    true,
		cwd:       repo.homeDir,
		hideEnv:   haibu.config.get('hideEnv'),
		env:       app.env,
		minUptime: this.minUptime,
		options:   []
	  };
	
	  //
	  // Concatenate the `argv` of any plugins onto the options
	  // to be passed to the carapace script. 
	  //
	  Object.keys(haibu.activePlugins).forEach(function (plugin) {
		var spawn;
		
		if (haibu.activePlugins[plugin].argv) {
		  haibu.emit('plugin:argv', 'info', { 
			app: app.name, 
			user: app.user,
			plugin: plugin
		  });
		  
		  spawn = haibu.activePlugins[plugin].argv(repo);
		  
		  if (spawn.script) {
			script = spawn.script;
		  }
		  
		  if (spawn.scriptArgs) {
			scriptArgs = spawn.scriptArgs;
		  }
		  
		  if (spawn.argv) {
			foreverOptions.options = foreverOptions.options.concat(spawn.argv); 
		  }
		}
	  });
	
	  foreverOptions.forever = typeof self.maxRestart === 'undefined';
	  if (typeof self.maxRestart !== 'undefined') {
		foreverOptions.max = self.maxRestart;
	  }
	  
	  //
	  // Before we attempt to spawn, let's check if the startPath actually points to a file
	  // Trapping this specific error is useful as the error indicates an incorrect
	  // scripts.start property in the package.json
	  //
	  fs.stat(repo.startScript, function (err, stats) {
		if (err) {
		  return callback(new Error('package.json error: ' + 'can\'t find starting script: ' + repo.app.scripts.start));
		}
		
		haibu.emit('spawn:start', 'info', {
		  options: foreverOptions.options.join(' '), 
		  script: script,
		  arguments: scriptArgs,
		  app: meta.app, 
		  user: meta.user
		});
		
		// create command line
		var cmdline = [command].concat(foreverOptions.options).concat(script);
		cmdline = (scriptArgs) ? cmdline.concat(scriptArgs) : cmdline;
		
		drone = new forever.Monitor(cmdline, foreverOptions);
	
		drone.on('error', function() {
		  //
		  // 'error' event needs to be caught, otherwise 
		  // the haibu process will die
		  //
		});
	
		//
		// Log data from `drone.stdout` to haibu
		//
		function onStdout (data) {
		  haibu.emit('drone:stdout', 'info', data.toString(), meta);
		}
		
		//
		// Log data from `drone.stderr` to haibu
		//
		function onStderr (data) {
		  data = data.toString()
		  haibu.emit('drone:stderr', 'error', data, meta);
		  
		  if (!responded) {
			stderr = stderr.concat(data.split('\n').filter(function (line) { return line.length > 0 }));
		  }
		}
		
		//
		// If the `forever.Monitor` instance emits an error then
		// pass this error back up to the callback.
		//
		function onError (err) {
		  if (!responded) {
			errState = true;
			responded = true;
			callback(err);
	
			//
			// Remove listeners to related events.
			//
			drone.removeListener('exit', onExit);
			haibu.running.hook.removeListener('*::carapace::port', onCarapacePort);
		  }
		}
		
		//
		// When the carapace provides the port that the drone
		// has bound to then respond to the callback
		//
		// Remark: What about `"worker"` processes that never
		// start and HTTP server?
		//
		function onCarapacePort (info) {
		  if (!responded) {
			responded = true;
			result.socket = {
			  host: self.host,
			  port: info.port
			};
			drone.minUptime = 0;
	
			callback(null, result);
			
			//
			// Remove listeners to related events
			//
			drone.removeListener('exit', onExit);
			drone.removeListener('error', onError);
		  }
		}
		
		//
		// When the drone starts, update the result that 
		// we will respond with and continue to wait for 
		// `*::carapace::port` from `haibu-carapace`.
		//
		function onStart (monitor, data) {
		  result = {
			monitor: monitor,
			process: monitor.child,
			drone: data
		  };
		}
		
		//
		// If the drone exits prematurely then respond with an error 
		// containing the data we receieved from `stderr` 
		//
		function onExit () {
		  if (!responded) {
			errState = true;
			responded = true;
			error = new Error('Error spawning drone');
			error.stderr = stderr.join('\n')
			callback(error);
	
			//
			// Remove listeners to related events.
			//
			drone.removeListener('error', onError);
			haibu.running.hook.removeListener('*::carapace::port', onCarapacePort);
		  }
		}
		
		//
		// Listen to the appropriate events and start the drone process.
		//
		drone.on('stdout', onStdout);
		drone.on('stderr', onStderr);
		drone.once('exit', onExit);
		drone.once('error', onError);
		drone.once('start', onStart);
		haibu.running.hook.once('*::carapace::port', onCarapacePort);
		drone.start();
	  });
	};
}