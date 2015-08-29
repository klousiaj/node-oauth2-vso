var vows = require('vows'),
  assert = require('assert'),
  https = require('https'),
  OAuth2 = require('../lib/vso-oauth2'),
  url = require('url');
  

// these test cases we taken from the oauth2 project this inherits from. They 
// have been modified to test for VSO specific functionality according to the
// spec provided here 'https://www.visualstudio.com/en-us/integrate/get-started/auth/oauth'
vows.describe('VsoOAuth2').addBatch({
  'Given an VsoOAuth2 instance, ' : {
    topic: new OAuth2("clientId", "clientSecret"),
    'lots of the possible configurations are predetermined for VSO ': {
      'we should expect an error if we try turn off the the Auth header for GET': function (oa) {
        assert.throws(function () { oa.useAuthorizationHeaderforGET(false) }, Error);
      },
      'we should expect success if we turn on the Auth header for GET': function (oa) {
        assert.doesNotThrow(function () { oa.useAuthorizationHeaderforGET(true) });
      },
      'we should build the AuthHeader as a Bearer token.': function (oa) {
        assert.equal(oa.buildAuthHeader('token'), 'Bearer token');
      },
      'we should expect an error if we try a access token name other than access_token': function (oa) {
        assert.throws(function () { oa.setAccessTokenName('not access_token') }, Error);
      },
      'we should expect success if we set access_token as the access token name': function (oa) {
        assert.doesNotThrow(function () { oa.setAccessTokenName('access_token') });
      },
      'we should expect an error if we try an authorization method other than Bearer': function (oa) {
        assert.throws(function () { oa.setAuthMethod('Not Bearer') }, Error);
      },
      'we should expect success if we set an authorization method to Bearer': function (oa) {
        assert.doesNotThrow(function () { oa.setAuthMethod('Bearer') });
      }
    } 
  },
  'Given a VsoOAuth2 instance with clientId and clientSecret, ': {
    topic: new OAuth2("clientId", "clientSecret"),
    'When handling the access token response ': {
      'we should error if the response is received as anything other than parseable JSON.': function (oa) {
        oa._request = function (method, url, fo, bar, bleh, callback) {
          callback(null, "access_token=access&refresh_token=refresh");
        };
        oa.getOAuthAccessToken("", {}, function (error, access_token, refresh_token) {
          assert.equal(error, 'Unable to parse response. Expected JSON object.');
        });
      },
      'we should not include access token in both querystring and headers (favors headers if specified)': function (oa) {
        oa._request = new OAuth2("clientId", "clientSecret")._request.bind(oa);
        oa._executeRequest = function (http_library, options, post_body, callback) {
          callback(null, url.parse(options.path, true).query, options.headers);
        };
        oa._request("GET", "http://foo/", { "Authorization": "Bearer BadNews" }, null, "accessx", function (error, query, headers) {
          assert.ok(!('access_token' in query), "access_token also in query");
          assert.ok('Authorization' in headers, "Authorization not in headers");
        });
      },
      'we should correctly extract the token if received as a JSON literal': function (oa) {
        oa._request = function (method, url, headers, post_body, access_token, callback) {
          callback(null, '{"access_token":"access","refresh_token":"refresh"}');
        };
        oa.getOAuthAccessToken("", {}, function (error, access_token, refresh_token) {
          assert.equal(access_token, "access");
          assert.equal(refresh_token, "refresh");
        });
      },
      'we should return the received data to the calling method': function (oa) {
        oa._request = function (method, url, headers, post_body, access_token, callback) {
          callback(null, '{"access_token":"access","refresh_token":"refresh","extra_1":1, "extra_2":"foo"}');
        };
        oa.getOAuthAccessToken("", {}, function (error, access_token, refresh_token, results) {
          assert.equal(access_token, "access");
          assert.equal(refresh_token, "refresh");
          assert.isNotNull(results);
          assert.equal(results.extra_1, 1);
          assert.equal(results.extra_2, "foo");
        });
      }
    },
    'When no grant_type parameter is specified': {
      'we should pass the value of the code argument as the assertion parameter ': function (oa) {
        oa._request = function (method, url, headers, post_body, access_token, callback) {
          console.log(post_body)
          assert.isTrue(post_body.indexOf("assertion=xsds23") != -1);
        };
        oa.getOAuthAccessToken("xsds23", {});
      }
    },
    'When an invalid grant_type parameter is specified': {
      'we should pass the value of the code argument as the assertion parameter': function (oa) {
        oa._request = function (method, url, headers, post_body, access_token, callback) {
          assert.isTrue(post_body.indexOf("assertion=xsds23") != -1);
        };
        oa.getOAuthAccessToken("xsds23", { grant_type: "refresh_toucan" });
      }
    },
    'When a grant_type parameter of value "refresh_token" is specified': {
      'we should pass the value of the assertion argument as the assertion parameter, should pass a grant_type parameter': function (oa) {
        oa._request = function (method, url, headers, post_body, access_token, callback) {
          assert.isTrue(post_body.indexOf("assertion=sdsds2") != -1);
          assert.isTrue(post_body.indexOf("grant_type=refresh_token") != -1);
        };
        oa.getOAuthAccessToken("sdsds2", { grant_type: "refresh_token" });
      }
    },
    'When we use the authorization header': {
      'and call get with the default authorization method': {
        'we should pass the authorization header with Bearer method and value of the access_token, _request should be passed a null access_token': function (oa) {
          oa._request = function (method, url, headers, post_body, access_token, callback) {
            assert.equal(headers["Authorization"], "Bearer abcd5");
            assert.isNull(access_token);
          };
          oa.useAuthorizationHeaderforGET(true);
          oa.get("", "abcd5");
        }
      },
      'and call get with the authorization method set to Basic ': {
        'we should throw an exception to prevent the client from changing the authorization method.': function (oa) {
          oa._request = function (method, url, headers, post_body, access_token, callback) {
            assert.equal(headers["Authorization"], "Bearer cdg2");
            assert.isNull(access_token);
          };
          oa.useAuthorizationHeaderforGET(true);
          assert.throws(function() { oa.setAuthMethod("Basic") }, Error);
          oa.get("", "cdg2");
        }
      }
    }
  },
  'Given an VsoOAuth2 instance with clientId, clientSecret and customHeaders': {
    topic: new OAuth2("clientId", "clientSecret", undefined, undefined, undefined,
      { 'SomeHeader': '123' }),
    'When GETing': {
      'we should see the custom headers mixed into headers property in options passed to http-library': function (oa) {
        oa._executeRequest = function (http_library, options, callback) {
          assert.equal(options.headers["SomeHeader"], "123");
        };
        oa.get("", {});
      },
    }
  },
  'Given an VsoOAuth2 instance with a clientId and clientSecret': {
    topic: new OAuth2("clientId", "clientSecret"),
    'When POSTing': {
      'we should see a given string being sent to the request': function (oa) {
        var bodyWritten = false;
        oa._chooseHttpLibrary = function () {
          return {
            request: function (options) {
              assert.equal(options.headers["Content-Type"], "text/plain");
              assert.equal(options.headers["Content-Length"], 26);
              assert.equal(options.method, "POST");
              return {
                end: function () { },
                on: function () { },
                write: function (body) {
                  bodyWritten = true;
                  assert.isNotNull(body);
                  assert.equal(body, "THIS_IS_A_POST_BODY_STRING")
                }
              }
            }
          };
        }
        oa._request("POST", "", { "Content-Type": "text/plain" }, "THIS_IS_A_POST_BODY_STRING");
        assert.ok(bodyWritten);
      },
      'we should see a given buffer being sent to the request': function (oa) {
        var bodyWritten = false;
        oa._chooseHttpLibrary = function () {
          return {
            request: function (options) {
              assert.equal(options.headers["Content-Type"], "application/octet-stream");
              assert.equal(options.headers["Content-Length"], 4);
              assert.equal(options.method, "POST");
              return {
                end: function () { },
                on: function () { },
                write: function (body) {
                  bodyWritten = true;
                  assert.isNotNull(body);
                  assert.equal(4, body.length)
                }
              }
            }
          };
        }
        oa._request("POST", "", { "Content-Type": "application/octet-stream" }, new Buffer([1, 2, 3, 4]));
        assert.ok(bodyWritten);
      }
    },
    'When PUTing': {
      'we should see a given string being sent to the request': function (oa) {
        var bodyWritten = false;
        oa._chooseHttpLibrary = function () {
          return {
            request: function (options) {
              assert.equal(options.headers["Content-Type"], "text/plain");
              assert.equal(options.headers["Content-Length"], 25);
              assert.equal(options.method, "PUT");
              return {
                end: function () { },
                on: function () { },
                write: function (body) {
                  bodyWritten = true;
                  assert.isNotNull(body);
                  assert.equal(body, "THIS_IS_A_PUT_BODY_STRING")
                }
              }
            }
          };
        }
        oa._request("PUT", "", { "Content-Type": "text/plain" }, "THIS_IS_A_PUT_BODY_STRING");
        assert.ok(bodyWritten);
      },
      'we should see a given buffer being sent to the request': function (oa) {
        var bodyWritten = false;
        oa._chooseHttpLibrary = function () {
          return {
            request: function (options) {
              assert.equal(options.headers["Content-Type"], "application/octet-stream");
              assert.equal(options.headers["Content-Length"], 4);
              assert.equal(options.method, "PUT");
              return {
                end: function () { },
                on: function () { },
                write: function (body) {
                  bodyWritten = true;
                  assert.isNotNull(body);
                  assert.equal(4, body.length)
                }
              }
            }
          };
        }
        oa._request("PUT", "", { "Content-Type": "application/octet-stream" }, new Buffer([1, 2, 3, 4]));
        assert.ok(bodyWritten);
      }
    }
  },
  'When the user passes in the User-Agent in customHeaders': {
    topic: new OAuth2("clientId", "clientSecret", undefined, undefined, undefined,
      { 'User-Agent': '123Agent' }),
    'When calling get': {
      'we should see the User-Agent mixed into headers property in options passed to http-library': function (oa) {
        oa._executeRequest = function (http_library, options, callback) {
          assert.equal(options.headers["User-Agent"], "123Agent");
        };
        oa.get("", {});
      }
    }
  },
  'When the user does not pass in a User-Agent in customHeaders': {
    topic: new OAuth2("clientId", "clientSecret", undefined, undefined, undefined,
      undefined),
    'When calling get': {
      'we should see the default User-Agent mixed into headers property in options passed to http-library': function (oa) {
        oa._executeRequest = function (http_library, options, callback) {
          assert.equal(options.headers["User-Agent"], "Node-oauth");
        };
        oa.get("", {});
      }
    }
  }
}).export(module);