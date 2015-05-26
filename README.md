# digs :house:

*A home automation plugin for [Hapi](http://hapijs.com), leveraging [Johnny-Five](http://johnny-five.io).*

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

If this sounds good to you, I'm hoping you can lend a hand.  *I am but a man.*  Send a PR, create an [issue](/digsjs/digs/issues) to discuss, or shoot me ([Christopher Hiller](/boneskull)) an [email](mailto:boneskull@boneskull.com).  

## What's Implemented Now

- Local device configuration (things like Arduinos connected via USB)
- Local component configuration (Johnny-Five Components; see [API](http://johnny-five.io/api/))
- Simple RESTful API
    - `GET` board and component information
    - Execute any public method of a component via `POST` request
- HTTP server controls components via MQTT  
- [Demo app](https://www.npmjs.com/package/digs-example)

## Roadmap

*Roughly* in order of importance.

- Make issues for this crap.
- Breakout routing and Hapi plugin into own module
- Plugin API
    - Think about entry points into core API
    - Hell, *define* the core API.  What is it, exactly?
    - Implement hooks, events, etc.
- Document RESTful API; Swagger?
- Scheduled tasks
    - Persistent storage?
- WiFi device configuration & communication
    - Document MQTT protocol
    - Expose MQTT "broker"
    - Leverage Mosca when support for io.js 2.x lands.
    - Learn just wtf "QoS" is.
- Hot-plugging; on-the-fly configuration
- Abstraction layer; communicate with things like ATtiny devices (unless that SoftwareSerialFirmata library ever gets written)
- UI
- CLI
- Sandbox
- Run as daemon
- Get a sweet logo
- to be continued...

## Author

[Christopher Hiller](http://boneskull.com)

## License

MIT
