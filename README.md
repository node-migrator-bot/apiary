# apiary

*spawn multi-user multi-system node.js clouds, on your own hardware or in combination with 3rd party virtual servers*

# What is apiary?

apiary is the open-source [node.js](http://nodejs.org) project for spawning and managing several multi-user node.js applications on multiple (virtual) servers. 

# How does it work?

apiary (which is English for 'beehive area') creates per user per (virtual) system application hives. By using [haibu](https://github.com/nodejitsu/haibu) (which is Japanese for "hive"), node.js applications are transformed into "drones". This approach allows apiary and haibu to directly interact with node.js applications and add all sorts of additional functionality.

`apiary` builds on this concept of "drones" used in `haibu` and exposes a robust and granular API for interacting with your and others node.js applications. At a low level, apiaries API is exposed as a RESTFul HTTP webservice. Any system that supports basic HTTP requests can communicate with apiary controllers. If you are working in Node.js, apiary comes with a high-level Node.js API client.

## Where can I run apiary?

`apiary` doesn't discriminate. If your environment supports node.js, you can install `apiary` and start up your own multi system multi user node.js cloud. This makes `apiary` an ideal tool for both development purposes and production usage since you can seamlessly setup apiary on your local machine, on utility computing providers (such as Amazon EC2 or Rackspace), on dedicated servers, or even on a mobile phone!

# Installation (to be implemented)

    sudo npm install apiary -g

# Documentation

apiaries documentation is still very much a work in progress. We'll be actively updating the documentation in the upcoming weeks to make it easier to get acclimated with `apiary`.

# An overview of using apiery

## Starting up a apiary environment

(to be described)