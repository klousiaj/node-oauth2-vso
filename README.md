# node-oauth-2-vso [![NPM version][npm-image]][npm-url] [![Build Status][travis-image]][travis-url] [![Dependency Status][daviddm-image]][daviddm-url]
> Visual Studio Online specific implementation of [node-oauth](https://github.com/ciaranj/node-oauth) module for oauth2.
This was created to be used with a VSO passport module. Because of a number of unique requirements to interact with 
Visual Studio Online's TFS REST API, a variety of VSO specific changes have been introduced to this module.

## Install
```sh
$ npm install --save node-oauth-2-vso
```

## Usage
```js
var vsoOAuth2 = require('node-oauth-2-vso');

var vsoOAuth2 = new VsoOAuth2(config.vso.clientId,
        config.vso.clientSecret,
        '',
        'https://app.vssps.visualstudio.com/oauth2/authorize',
        'https://app.vssps.visualstudio.com/oauth2/token',
        config.vso.customHeaders);
     
```

## License

MIT © [J.P. Klousia](https://github.com/klousiaj)


[npm-image]: https://badge.fury.io/js/node-oauth-2-vso.svg
[npm-url]: https://npmjs.org/package/node-oauth-2-vso
[travis-image]: https://travis-ci.org/klousiaj/node-oauth-2-vso.svg?branch=master
[travis-url]: https://travis-ci.org/klousiaj/node-oauth-2-vso
[daviddm-image]: https://david-dm.org/klousiaj/node-oauth-2-vso.svg?theme=shields.io
[daviddm-url]: https://david-dm.org/klousiaj/node-oauth-2-vso
