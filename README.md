<img src="https://cldup.com/cgZ5ZK3h1n.png" alt="digs logo"/>

# digs [![NPM](https://nodei.co/npm/digs.png?compact=true)](https://www.npmjs.com/package/digs)  
[![Build Status](https://travis-ci.org/digsjs/digs.svg?branch=master)](https://travis-ci.org/digsjs/digs) [![Join the chat at https://gitter.im/digsjs/digs](https://badges.gitter.im/Join%20Chat.svg)](https://gitter.im/digsjs/digs?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)

> A home automation server written in JavaScript

## Achtung!

This project is under heavy development and probably won't do much of anything at any given time.

The latest development release will be published under the `devel` tag.  To get it:

```shell
$ npm install digs@devel hapi@^8 
```

In addition, the [bundle-digs](https://github.com/digsjs/bundle-digs) repo includes all other projects as submodules, if you just want to grab them all at once.

## Project Goals

Hi!  Could use your help (yes, you).  

This project has lofty goals.  **digs**, ultimately:

- should be first-class home automation server
- should be modular
- should support an assortment of interfaces, including:
    - RESTful HTTP and [CoAP](https://wikipedia.org/wiki/Constrained_Application_Protocol) APIs
    - [MQTT](http://mqtt.org) and other messaging protocols
    - a slick web interface which works well on mobile
    - a CLI
- should support a wide range of:
    - devices
    - configurations
    - communication protocols
    - storage options
    - authenticate schemes
- should "just work"
- should be easily extendable for your own setup
- should support serial devices
- should work in real-time
- should be well-documented
    - tutorials
    - full API docs
- should be well-tested
    - 100% unit test coverage
    - a plethora of integration tests

If this sounds good to you, I'm hoping you can lend a hand.  *I am but a man.*  Send a PR, create an [issue](https://github.com/digsjs/digs/issues) to discuss, or shoot me ([Christopher Hiller](https://boneskull.com)) an [email](mailto:boneskull@boneskull.com).  

## Installation

[Hapi](http://hapijs.com) <= 9.0.0 is a peer depdency of this package, so:

```sh
$ npm install digs hapi
```

## Contributing

See [CONTRIBUTING.md](https://github.com/digsjs/digs/blob/master/CONTRIBUTING.md).

## Project Organization

**digs** is divided into multiple projects.  This tends to change daily as projects are renamed, removed or created.  But as of this writing:

- [digs](https://www.npmjs.com/package/digs) - A Hapi plugin which makes everything work
- [digs-common](https://www.npmjs.com/package/digs-common) - A moatload of common objects and functions shared by various packages
- [digs-data](https://www.npmjs.com/package/digs-data) - Abstraction layer for persistent storage
- [digs-serial](https://www.npmjs.com/package/digs-serial) - Serial device plugin
- [digs-dev](https://www.npmjs.com/package/digs-dev) - Common development dependencies (`devDependencies`)
- [digs-messenger](https://www.npmjs.com/package/digs-messenger) - Messaging protocol plugin
- [digs-mqtt-broker](https://www.npmjs.com/package/digs-mqtt-broker) - Flimsy MQTT broker if you don't have a proper one
- [docker-digs](https://hub.docker.com/r/digsjs/digs/) - Docker image for Digs

See the GitHub [digsjs organization](https://github.com/digsjs) for the list.

## Roadmap

TODO

## Author

[Christopher Hiller](https://boneskull.com)

## License

MIT
