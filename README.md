# digs :house:

[![Join the chat at https://gitter.im/digsjs/digs](https://badges.gitter.im/Join%20Chat.svg)](https://gitter.im/digsjs/digs?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)

*A home automation server written in JavaScript*

Hi!  Could use your help (yes, you).  

This project has lofty goals.  **digs**, ultimately:

- should be first-class home automation server
- should support an assortment of interfaces, including:
    - a RESTful API
    - a slick user interface
    - a command-line interface
    - a [MQTT](http://mqtt.org) interface
- should support a wide range of:
    - devices
    - configurations
    - communication protocols
    - storage options
- should be easy to configure
- should be well-documented and well-tested

If this sounds good to you, I'm hoping you can lend a hand.  *I am but a man.*  Send a PR, create an [issue](https://github.com/digsjs/digs/issues) to discuss, or shoot me ([Christopher Hiller](https://github.com/boneskull)) an [email](mailto:boneskull@boneskull.com).  

## What's Implemented Now

- Local device configuration (things like Arduinos connected via USB)
- Local component configuration (Johnny-Five Components; see [API](http://johnny-five.io/api/))
- [hapi-digs](https://www.npmjs.com/package/hapi-digs): Hapi Plugin
    - A simple RESTful API
    - `GET` board and component lists and detail
    - Execute any public method of a configured component via `POST` request
- [hapi-digs-example](https://www.npmjs.com/package/hapi-digs-example): Demo!

## Roadmap

*Roughly* in order of importance.

- [x] Make issues for this crap.
- [x] Breakout routing and Hapi plugin into own module
- [ ] Plugin API
    - [ ] Think about entry points into core API
    - [ ] Hell, *define* the core API.  What is it, exactly?
    - [ ] Implement hooks, events, etc.
- [ ] Document RESTful API; Swagger?
- [ ] Scheduled tasks
    - [ ] Persistent storage?
- [ ] WiFi device configuration & communication
    - [ ] Document MQTT protocol
    - [ ] Expose MQTT "broker"
    - [ ] Leverage Mosca when support for io.js 2.x lands.
    - [ ] Learn just wtf "QoS" is.
- [ ] Hot-plugging; on-the-fly configuration
- [ ] Abstraction layer; communicate with things like ATtiny devices (unless that SoftwareSerialFirmata library ever gets written)
- [ ] UI
- [ ] CLI
- [ ] Sandbox
- [ ] Run as daemon
- [ ] Get a sweet logo
- to be continued...

## Author

[Christopher Hiller](http://boneskull.com)

## License

MIT
