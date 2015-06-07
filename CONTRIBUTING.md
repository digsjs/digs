# Contributing to digs

## Getting Started
  
Clone this project or (any project in the [digsjs org](https://github.com/digsjs), then execute:

```shell
$ npm install
```

You may want to install multiple projects at once.  If so:

### Using `npm link`

I find myself usually having all of the projects open at once, and making use of `npm link` to ensure my changes to a dependency appear in its dependent(s).

For example, if I want to have my modifications to **digs-common** show up in my **digs** working copy, I'd go into my **digs-common** working copy, then execute `npm link`.  Then, I'd go back to my **digs** working copy, and execute `npm link digs-common`.  

Note that this may require superuser access, depending on your setup!

## Pull Requests

Want to help?  Check out the [issues labeled with `help wanted`](https://github.com/digsjs/digs/issues?q=is%3Aopen+is%3Aissue+label%3A%22help+wanted%22).

## Further Information

**More resources are available in [the wiki](https://github.com/digsjs/digs/wiki).**

* * *

thanks for your contribution,  
[Chris](https://github.com/boneskull)
