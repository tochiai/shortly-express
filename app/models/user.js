var db = require('../config');
var bcrypt = require('bcrypt-nodejs');
var Promise = require('bluebird');

var User = db.Model.extend({

  tableName: 'users',
  hasTimestamps: true,
  // clicks: function() {
  //   return this.hasMany(Click);
  // },
  initialize: function(){
    console.log('user initializes');
    this.on('creating', function(model, attrs, options){

      var salt = bcrypt.genSaltSync(10);
      console.log('salt', salt);
      model.set('salt', salt);
      var hash = bcrypt.hashSync(model.get('password'), salt);
      model.set('hash', hash);
      delete model.attributes.password;
      console.log(' model after delete', model);
    });
  }
});

module.exports = User;
