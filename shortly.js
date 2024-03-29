var express = require('express');
var util = require('./lib/utility');
var partials = require('express-partials');
var bcrypt = require('bcrypt-nodejs');
var cookieParser = require('cookie-parser');

var db = require('./app/config');
var Users = require('./app/collections/users');
var User = require('./app/models/user');
var Links = require('./app/collections/links');
var Link = require('./app/models/link');
var Click = require('./app/models/click');

var app = express();

app.configure(function() {
  app.set('views', __dirname + '/views');
  app.set('view engine', 'ejs');
  app.use(partials());
  app.use(express.bodyParser());
  app.use(express.cookieParser('joelcox'));
  app.use(express.static(__dirname + '/public'));
});



app.get('/', util.authenticate, function(req, res) {
  res.render('index');
});

app.get('/create', util.authenticate, function(req, res) {
  console.log('create fired');
    res.render('/create');

  });

app.get('/links', util.authenticate, function(req, res) {
  Links.reset().fetch().then(function(links) {
    res.send(200, links.models);
  });
});

app.post('/links', function(req, res) {
  var uri = req.body.url;

  if (!util.isValidUrl(uri)) {
    console.log('Not a valid url: ', uri);
    return res.send(404);
  }

  new Link({ url: uri }).fetch().then(function(found) {
    if (found) {
      res.send(200, found.attributes);
    } else {
      util.getUrlTitle(uri, function(err, title) {
        if (err) {
          console.log('Error reading URL heading: ', err);
          return res.send(404);
        }

        var link = new Link({
          url: uri,
          title: title,
          base_url: req.headers.origin
        });

        link.save().then(function(newLink) {
          Links.add(newLink);
          res.send(200, newLink);
        });
      });
    }
  });
});


/************************************************************/
// Write your authentication routes here
/************************************************************/

app.get('/signup', function(req, res) {
  if (util.hasToken(req)){
    console.log('yes token');
    console.log('they have token - route to index');
    res.render('index');
  } else {
    console.log('no token');
    res.render('signup');
  }
});

app.get('/login', util.authenticate, function(req, res) {
  res.render('index');
});

app.post('/signup', function(req, res) {
  var username = req.body.username;
  var password = req.body.password;

  new User({ username: username }).fetch().then(function(found) {
    if (found) {
      res.send(200, 'user already exists');
    } else {
      //hash it up
      var salt = bcrypt.genSaltSync(10);
      var hash = bcrypt.hashSync(password, salt);


      var user = new User({
        username: username,

        hash: hash
      });

      user.save().then(function(newUser) {
        console.log('saving user');
        Users.add(newUser);
        //TODO: route to the index
        res.render('index');
      });
    }
  });
});

app.post('/login', function(req, res) {
  var username = req.body.username;
  var password = req.body.password;
  console.log('login page hit');


  new User({ username: username }).fetch().then(function(found) {
    if (!found) {
      res.render('signup');
    } else {

      var hash = found.get("hash");

      var pCheck =  bcrypt.compareSync(password, hash); // true

      if (pCheck){
        console.log('setting new cookie');
        res.cookie('session', '1',  { maxAge: 20000, signed: true });
        res.render('index');
      } else {
        res.render('login');
      }
    }
  });

});




/************************************************************/
// Handle the wildcard route last - if all other routes fail
// assume the route is a short code and try and handle it here.
// If the short-code doesn't exist, send the user to '/'
/************************************************************/

app.get('/*', function(req, res) {
  new Link({ code: req.params[0] }).fetch().then(function(link) {
    if (!link) {
      res.redirect('/');
    } else {
      var click = new Click({
        link_id: link.get('id')
      });

      click.save().then(function() {
        db.knex('urls')
          .where('code', '=', link.get('code'))
          .update({
            visits: link.get('visits') + 1,
          }).then(function() {
            return res.redirect(link.get('url'));
          });
      });
    }
  });
});

console.log('Shortly is listening on 4568');
app.listen(4568);
