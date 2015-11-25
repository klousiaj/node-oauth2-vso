var util = require('util');
var querystring = require('querystring');
var OAuth2 = require('oauth').OAuth2;

function VsoOAuth2(clientId, clientSecret, baseSite, authorizePath, accessTokenPath, customHeaders) {
  this._clientId = clientId;
  this._clientSecret = clientSecret;
  this._baseSite = baseSite;
  this._authorizeUrl = authorizePath || '/oauth2/authorize';
  this._accessTokenUrl = accessTokenPath || '/oauth2/token';
  this._accessTokenName = 'access_token';
  //this._authMethod = 'Bearer';
  this._customHeaders = customHeaders || {};
  this._useAuthorizationHeaderForGET = true;
}

util.inherits(VsoOAuth2, OAuth2);

// Build the authorization header. In particular, build the part after the colon.
// e.g. Authorization: Bearer <token>  # Build "Bearer <token>"
OAuth2.prototype.buildAuthHeader = function (token) {
  return 'Bearer ' + token;
};

// This 'hack' method is required for sites that don't use
// 'access_token' as the name of the access token (for requests).
// ( http://tools.ietf.org/html/draft-ietf-oauth-v2-16#section-7 )
// it isn't clear what the correct value should be atm, so allowing
// for specific (temporary?) override for now.
OAuth2.prototype.setAccessTokenName = function (name) {
  if (name !== 'access_token') {
    throw Error('access_token is VSOs accepted Access Token name.');
  }
  this._accessTokenName = name;
}

// Sets the authorization method for Authorization header.
// e.g. Authorization: Bearer <token>  # "Bearer" is the authorization method.
OAuth2.prototype.setAuthMethod = function (authMethod) {
  if (authMethod !== 'Bearer') {
    throw Error('authorization method must be Bearer for VSO'); 
  }
};

// don't let the user disable using the header for GET
OAuth2.prototype.useAuthorizationHeaderforGET = function (val) {
  if (!val) {
    throw Error('Authorization header is required for GET by VSO.');
  }
}

OAuth2.prototype.getOAuthAccessToken = function (code, options, callback) {
  var params = options || {};
  
  // this is why this module needs to exist at all. VSO changes the name of the 
  // parameters slightly compared to what is specified in the oauth2 module.
  // VSO has client assertion rather than client_secret
  params.client_assertion = this._clientSecret;
  // assertion rather than client_id
  params.assertion = code;
  // this is common for VSO regardless whether we are requesting with a refresh_token or not 
  params.client_assertion_type = 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer';
  // also needed to remove the grant_type default values because VSO uses a different
  // grant_type. This needs to be set by the consuming strategy as no default values are
  // provided here.

  var post_data = querystring.stringify(params);
  var post_headers = {
    'Content-Type': 'application/x-www-form-urlencoded'
  };

  this._request('POST',
    this._getAccessTokenUrl(),
    post_headers,
    post_data,
    null,
    function (error, data, response) {
      console.log('*************** debugging messages ***************')
      console.log('error message: ' + error);
      console.log('data: ' + data);
      console.log('response: ' + response);
      if (error) {
        callback(error);
      } else {
        try {
          var results = JSON.parse(data);
        } catch (err) {
          return callback('Unable to parse response. Expected JSON object.');
        }
        var access_token = results['access_token'];
        var refresh_token = results['refresh_token'];
        delete results['refresh_token'];
        callback(null, access_token, refresh_token, results); // callback results =-=
      }
    });
};

/**
 * Expose `VsoOAuth2`.
 */
module.exports = VsoOAuth2;
