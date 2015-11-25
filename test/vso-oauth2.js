var mocha = require('mocha');
var should = require('should');
var OAuth2 = require('../lib/vso-oauth2');
var url = require('url');

// these test cases we taken from the oauth2 project this inherits from. They 
// have been modified to test for VSO specific functionality according to the
// spec provided here 'https://www.visualstudio.com/en-us/integrate/get-started/auth/oauth'
describe('Given an VsoOAuth2 instance, ', function () {
  var oa;
  before(function () {
    oa = new OAuth2("clientId", "clientSecret");
  });
  describe('lots of the possible configurations are predetermined for VSO ', function () {
    it('we should expect an error if we try turn off the the Auth header for GET', function () {
      should.throws(function () { oa.useAuthorizationHeaderforGET(false) }, Error);
    });
    it('we should expect success if we turn on the Auth header for GET', function () {
      should.doesNotThrow(function () { oa.useAuthorizationHeaderforGET(true) });
    }),
    it('we should build the AuthHeader as a Bearer token.', function () {
      should.equal(oa.buildAuthHeader('token'), 'Bearer token');
    }),
    it('we should expect an error if we try a access token name other than access_token', function () {
      should.throws(function () { oa.setAccessTokenName('not access_token') }, Error);
    }),
    it('we should expect success if we set access_token as the access token name', function () {
      should.doesNotThrow(function () { oa.setAccessTokenName('access_token') });
    }),
    it('we should expect an error if we try an authorization method other than Bearer', function () {
      should.throws(function () { oa.setAuthMethod('Not Bearer') }, Error);
    }),
    it('we should expect success if we set an authorization method to Bearer', function () {
      should.doesNotThrow(function () { oa.setAuthMethod('Bearer') });
    });
  });
});
describe('Given a VsoOAuth2 instance with clientId and clientSecret', function () {
  var oa;
  beforeEach(function () {
    oa = new OAuth2("clientId", "clientSecret");
  });
  describe('when handling the access token response', function () {
    it('we should error if the response is received as anything other than parseable JSON.', function () {
      oa._request = function (method, url, fo, bar, bleh, callback) {
        callback(null, "access_token=access&refresh_token=refresh");
      };
      oa.getOAuthAccessToken("", {}, function (error, access_token, refresh_token) {
        (error).should.equal('Unable to parse response. Expected JSON object.');
      });
    });
    it('we should not include access token in both querystring and headers (favors headers if specified)', function () {
      oa._request = new OAuth2("clientId", "clientSecret")._request.bind(oa);
      oa._executeRequest = function (http_library, options, post_body, callback) {
        callback(null, url.parse(options.path, true).query, options.headers);
      };
      oa._request("GET", "http://foo/", { "Authorization": "Bearer BadNews" }, null, "accessx", function (error, query, headers) {
        query.should.not.have.property('access_token');
        headers.should.have.property('Authorization');
      });
    });
    it('we should correctly extract the token if received as a JSON literal', function () {
      oa._request = function (method, url, headers, post_body, access_token, callback) {
        callback(null, '{"access_token":"access","refresh_token":"refresh"}');
      };
      oa.getOAuthAccessToken("", {}, function (error, access_token, refresh_token) {
        access_token.should.equal("access");
        refresh_token.should.equal("refresh");
      });
    });
    it('we should return the received data to the calling method', function () {
      oa._request = function (method, url, headers, post_body, access_token, callback) {
        callback(null, '{"access_token":"access","refresh_token":"refresh","extra_1":1, "extra_2":"foo"}');
      };
      oa.getOAuthAccessToken("", {}, function (error, access_token, refresh_token, results) {
        access_token.should.equal("access");
        refresh_token.should.equal("refresh");
        (results).should.be.not.null;
        results.extra_1.should.be.equal(1);
        results.extra_2.should.be.equal("foo");
      });
    });
  });
  describe('When no grant_type parameter is specified', function () {
    it('we should pass the value of the code argument as the assertion parameter ', function () {
      oa._request = function (method, url, headers, post_body, access_token, callback) {
        post_body.indexOf("assertion=xsds23").should.not.equal(-1);
      };
      oa.getOAuthAccessToken("xsds23", {});
    })
  });
  describe('When an invalid grant_type parameter is specified', function () {
    it('we should pass the value of the code argument as the assertion parameter', function () {
      oa._request = function (method, url, headers, post_body, access_token, callback) {
        post_body.indexOf("assertion=xsds23").should.not.equal(-1);
      };
      oa.getOAuthAccessToken("xsds23", { grant_type: "refresh_toucan" });
    });
  });
  describe('When a grant_type parameter of value "refresh_token" is specified', function () {
    it('we should pass the value of the assertion argument as the assertion parameter, should pass a grant_type parameter', function () {
      oa._request = function (method, url, headers, post_body, access_token, callback) {
        post_body.indexOf("assertion=sdsds2").should.not.equal(-1);
        post_body.indexOf("grant_type=refresh_token").should.not.equal(-1);
      };
      oa.getOAuthAccessToken("sdsds2", { grant_type: "refresh_token" });
    });
  });
  describe('When we use the authorization header', function () {
    describe('and call get with the default authorization method', function () {
      it('we should pass the authorization header with Bearer method and value of the access_token, _request should be passed a null access_token', function () {
        oa._request = function (method, url, headers, post_body, access_token, callback) {
          (headers["Authorization"]).should.equal("Bearer abcd5");
          should(access_token).be.null;
        };
        oa.useAuthorizationHeaderforGET(true);
        oa.get("", "abcd5");
      });
    });
    describe('and call get with the authorization method set to Basic ', function () {
      it('we should throw an exception to prevent the client from changing the authorization method.', function () {
        oa._request = function (method, url, headers, post_body, access_token, callback) {
          (headers["Authorization"]).should.equal("Bearer cdg2");
          should(access_token).be.null;
        };
        oa.useAuthorizationHeaderforGET(true);
        should.throws(function () { oa.setAuthMethod("Basic") }, Error);
        oa.get("", "cdg2");
      });
    });
  });
});

//   'When no grant_type parameter is specified': {
//     'we should pass the value of the code argument as the assertion parameter ': function (oa) {
//       oa._request = function (method, url, headers, post_body, access_token, callback) {
//         console.log(post_body)
//         assert.isTrue(post_body.indexOf("assertion=xsds23") != -1);
//       };
//       oa.getOAuthAccessToken("xsds23", {});
//     }
//   },
//   'When an invalid grant_type parameter is specified': {
//     'we should pass the value of the code argument as the assertion parameter': function (oa) {
//       oa._request = function (method, url, headers, post_body, access_token, callback) {
//         assert.isTrue(post_body.indexOf("assertion=xsds23") != -1);
//       };
//       oa.getOAuthAccessToken("xsds23", { grant_type: "refresh_toucan" });
//     }
//   },
//   'When a grant_type parameter of value "refresh_token" is specified': {
//     'we should pass the value of the assertion argument as the assertion parameter, should pass a grant_type parameter': function (oa) {
//       oa._request = function (method, url, headers, post_body, access_token, callback) {
//         assert.isTrue(post_body.indexOf("assertion=sdsds2") != -1);
//         assert.isTrue(post_body.indexOf("grant_type=refresh_token") != -1);
//       };
//       oa.getOAuthAccessToken("sdsds2", { grant_type: "refresh_token" });
//     }
//   },
//   'When we use the authorization header': {
//     'and call get with the default authorization method': {
//       'we should pass the authorization header with Bearer method and value of the access_token, _request should be passed a null access_token': function (oa) {
//         oa._request = function (method, url, headers, post_body, access_token, callback) {
//           assert.equal(headers["Authorization"], "Bearer abcd5");
//           assert.isNull(access_token);
//         };
//         oa.useAuthorizationHeaderforGET(true);
//         oa.get("", "abcd5");
//       }
//     },
//     'and call get with the authorization method set to Basic ': {
//       'we should throw an exception to prevent the client from changing the authorization method.': function (oa) {
//         oa._request = function (method, url, headers, post_body, access_token, callback) {
//           assert.equal(headers["Authorization"], "Bearer cdg2");
//           assert.isNull(access_token);
//         };
//         oa.useAuthorizationHeaderforGET(true);
//         assert.throws(function () { oa.setAuthMethod("Basic") }, Error);
//         oa.get("", "cdg2");
//       }
//     }
//   }
// },
// 'Given an VsoOAuth2 instance with clientId, clientSecret and customHeaders': {
//   topic: new OAuth2("clientId", "clientSecret", undefined, undefined, undefined,
//     { 'SomeHeader': '123' }),
//   'When GETing': {
//     'we should see the custom headers mixed into headers property in options passed to http-library': function (oa) {
//       oa._executeRequest = function (http_library, options, callback) {
//         assert.equal(options.headers["SomeHeader"], "123");
//       };
//       oa.get("", {});
//     },
//   }
// },
// 'Given an VsoOAuth2 instance with a clientId and clientSecret': {
//   topic: new OAuth2("clientId", "clientSecret"),
//   'When POSTing': {
//     'we should see a given string being sent to the request': function (oa) {
//       var bodyWritten = false;
//       oa._chooseHttpLibrary = function () {
//         return {
//           request: function (options) {
//             assert.equal(options.headers["Content-Type"], "text/plain");
//             assert.equal(options.headers["Content-Length"], 26);
//             assert.equal(options.method, "POST");
//             return {
//               end: function () { },
//               on: function () { },
//               write: function (body) {
//                 bodyWritten = true;
//                 assert.isNotNull(body);
//                 assert.equal(body, "THIS_IS_A_POST_BODY_STRING")
//               }
//             }
//           }
//         };
//       }
//       oa._request("POST", "", { "Content-Type": "text/plain" }, "THIS_IS_A_POST_BODY_STRING");
//       assert.ok(bodyWritten);
//     },
//     'we should see a given buffer being sent to the request': function (oa) {
//       var bodyWritten = false;
//       oa._chooseHttpLibrary = function () {
//         return {
//           request: function (options) {
//             assert.equal(options.headers["Content-Type"], "application/octet-stream");
//             assert.equal(options.headers["Content-Length"], 4);
//             assert.equal(options.method, "POST");
//             return {
//               end: function () { },
//               on: function () { },
//               write: function (body) {
//                 bodyWritten = true;
//                 assert.isNotNull(body);
//                 assert.equal(4, body.length)
//               }
//             }
//           }
//         };
//       }
//       oa._request("POST", "", { "Content-Type": "application/octet-stream" }, new Buffer([1, 2, 3, 4]));
//       assert.ok(bodyWritten);
//     }
//   },
//   'When PUTing': {
//     'we should see a given string being sent to the request': function (oa) {
//       var bodyWritten = false;
//       oa._chooseHttpLibrary = function () {
//         return {
//           request: function (options) {
//             assert.equal(options.headers["Content-Type"], "text/plain");
//             assert.equal(options.headers["Content-Length"], 25);
//             assert.equal(options.method, "PUT");
//             return {
//               end: function () { },
//               on: function () { },
//               write: function (body) {
//                 bodyWritten = true;
//                 assert.isNotNull(body);
//                 assert.equal(body, "THIS_IS_A_PUT_BODY_STRING")
//               }
//             }
//           }
//         };
//       }
//       oa._request("PUT", "", { "Content-Type": "text/plain" }, "THIS_IS_A_PUT_BODY_STRING");
//       assert.ok(bodyWritten);
//     },
//     'we should see a given buffer being sent to the request': function (oa) {
//       var bodyWritten = false;
//       oa._chooseHttpLibrary = function () {
//         return {
//           request: function (options) {
//             assert.equal(options.headers["Content-Type"], "application/octet-stream");
//             assert.equal(options.headers["Content-Length"], 4);
//             assert.equal(options.method, "PUT");
//             return {
//               end: function () { },
//               on: function () { },
//               write: function (body) {
//                 bodyWritten = true;
//                 assert.isNotNull(body);
//                 assert.equal(4, body.length)
//               }
//             }
//           }
//         };
//       }
//       oa._request("PUT", "", { "Content-Type": "application/octet-stream" }, new Buffer([1, 2, 3, 4]));
//       assert.ok(bodyWritten);
//     }
//   }
// },
// 'When the user passes in the User-Agent in customHeaders': {
//   topic: new OAuth2("clientId", "clientSecret", undefined, undefined, undefined,
//     { 'User-Agent': '123Agent' }),
//   'When calling get': {
//     'we should see the User-Agent mixed into headers property in options passed to http-library': function (oa) {
//       oa._executeRequest = function (http_library, options, callback) {
//         assert.equal(options.headers["User-Agent"], "123Agent");
//       };
//       oa.get("", {});
//     }
//   }
// },
// 'When the user does not pass in a User-Agent in customHeaders': {
//   topic: new OAuth2("clientId", "clientSecret", undefined, undefined, undefined,
//     undefined),
//   'When calling get': {
//     'we should see the default User-Agent mixed into headers property in options passed to http-library': function (oa) {
//       oa._executeRequest = function (http_library, options, callback) {
//         assert.equal(options.headers["User-Agent"], "Node-oauth");
//       };
//       oa.get("", {});
//     }
//   }
// }
// }).export(module);