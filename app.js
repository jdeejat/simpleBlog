//jshint esversion:6

// IMPORTS
require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const ejs = require('ejs');
const _ = require('lodash');
const mongoose = require('mongoose');
//STEP 1 for user authentication add three dependencies below + passport-local
const session = require('express-session');
const passport = require('passport');
const passportLocalMongoose = require('passport-local-mongoose');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require('mongoose-findorcreate');

// VARIABLES

const defaultPosts = [
  {
    title: 'Lorem Ipsum',
    body: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nullam id dolor id nibh ultricies vehicula ut id elit. Nullam id dolor id nibh ultricies vehicula ut id elit.',
  },
];

//APP
const app = express();
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

//STEP 2 for user authentication add session and passport configuration below
// needed to initialize session https://www.npmjs.com/package/express-session
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
  })
);
// initialize passport
/* 
passport.session() acts as a middleware to alter the req object and change the 'user' value that is currently the session id (from the client cookie) into the true deserialized user object.
https://stackoverflow.com/questions/22052258/what-does-passport-session-middleware-do/28994045#28994045
 */
app.use(passport.authenticate('session'));

// SETUP MONGOOSE
mongoose.connect(
  `mongodb+srv://testUser:${process.env.MONGO_PASS}@cluster0.4ioj6pf.mongodb.net/blogPostsDB`
);

// SCHEMA
const blogPostSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    minlength: 3,
    maxlength: 255,
  },
  body: {
    type: String,
    required: true,
    minlength: 3,
  },
});

// STEP 3 for user authentication create a new schema and add the passportLocalMongoose plugin to it
const userAccountSchema = new mongoose.Schema({
  username: {
    type: String,
  },
  password: {
    type: String,
  },
  googleId: {
    type: String,
  },
});
// add plugin to userAccountSchema to add a hashed password
userAccountSchema.plugin(passportLocalMongoose);
userAccountSchema.plugin(findOrCreate);

// MODEL (collection)
const BlogPost = mongoose.model('BlogPost', blogPostSchema);
// STEP 4 for user authentication create a new model to store the user account data
const UserAccount = mongoose.model('UserAccount', userAccountSchema);

// STEP 5 for user authentication configure passport to use the UserAccount model with mongoose
/*
https://www.npmjs.com/package/passport-local-mongoose 
*/
// use static authenticate method of model in LocalStrategy
passport.use(UserAccount.createStrategy());

// use static serialize and deserialize of model for passport session support
passport.serializeUser(function (user, cb) {
  process.nextTick(function () {
    return cb(null, {
      id: user.id,
      username: user.username,
      picture: user.picture,
    });
  });
});

passport.deserializeUser(function (user, cb) {
  process.nextTick(function () {
    return cb(null, user);
  });
});

//google strategy https://www.passportjs.org/packages/passport-google-oauth20/
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: 'https://koyto-blog.herokuapp.com/auth/google/callback',
    },
    function (accessToken, refreshToken, profile, cb) {
      console.log(profile);
      UserAccount.findOrCreate({ googleId: profile.id }, function (err, user) {
        return cb(err, user);
      });
    }
  )
);

//////////////////////////////////////////////////////////////////////////////////////////////

// ROUTES
// Home page
app.get('/', function (req, res) {
  // find posts from DB
  BlogPost.find({}, (err, postsDB) => {
    if (err) {
      console.log(err);
    } else if (postsDB.length === 0) {
      // if no posts in DB incert defaultPosts
      res.render('home', {
        posts: defaultPosts,
      });
    } else {
      res.render('home', {
        posts: postsDB,
      });
    }
  });
});

// About page
app.get('/about', function (req, res) {
  res.render('about');
});

// google auth path
app.get(
  '/auth/google',
  passport.authenticate('google', { scope: ['profile'] })
);

app.get(
  '/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/login' }),
  function (req, res) {
    // Successful authentication, redirect home.
    res.redirect('/');
  }
);

// Login page
app.get('/login', function (req, res) {
  if (req.isAuthenticated()) {
    res.redirect('/');
  } else {
    res.render('login');
  }
});

app.post('/login', function (req, res) {
  // STEP 9 for user authentication login the user
  const user = new UserAccount({
    username: req.body.username,
    password: req.body.password,
  });
  req.login(user, function (err) {
    if (err) {
      console.log(err);
    } else {
      passport.authenticate('local', { failureRedirect: '/login' })(
        req,
        res,
        function () {
          res.redirect('/');
        }
      );
    }
  });
});

// register page
app.get('/register', function (req, res) {
  res.render('register');
});
app.post('/register', function (req, res) {
  // STEP 6 for user authentication create a new user account using passport-local-mongoose
  UserAccount.register(
    { username: req.body.username },
    req.body.password,
    function (err, user) {
      if (err) {
        console.log(err);
        res.redirect('/register');
      } else {
        // STEP 7 for user authentication use passport to login the user
        passport.authenticate('local')(req, res, function () {
          res.redirect('/');
        });
      }
    }
  );
});

// compose page
app.get('/compose', function (req, res) {
  // STEP 8 for user authentication check if user is logged in
  if (req.isAuthenticated()) {
    res.render('compose');
  } else {
    res.redirect('/login');
  }
});

// compose page post
app.post('/compose', function (req, res) {
  // save post to DB with mongoose
  const post = new BlogPost({
    title: req.body.title,
    body: req.body.body,
  });
  post.save(err => {
    // only redirect if no error
    if (!err) {
      res.redirect('/');
    }
  });
});

// route to show individual post
app.get('/posts/:postName', function (req, res) {
  const requestedTitle = _.kebabCase(req.params.postName);
  // find blog posts from DB by title
  BlogPost.find({}, (err, postsDB) => {
    if (err) {
      console.log(err);
    } else {
      postsDB.forEach(function (post) {
        // convert to kebab case
        const convertedStoredTitle = _.kebabCase(post.title);
        if (convertedStoredTitle === requestedTitle) {
          res.render('post', {
            title: post.title,
            body: post.body,
          });
        }
      });
    }
  });
});

/////////////////////////

// API

app
  .route('/api/posts')
  .get((req, res) => {
    BlogPost.find({}, (err, postsDB) => {
      if (err) {
        // 400 bad request
        res.status(400).send(err);
      } else {
        res.json(postsDB);
      }
    });
  })
  .post((req, res) => {
    const post = new BlogPost({
      title: req.body.title,
      body: req.body.body,
    });
    post.save(err => {
      if (err) {
        // 400 bad request
        res.status(400).send(err);
      } else {
        res.json({
          message: 'Post saved successfully',
          createdPost: post,
        });
      }
    });
  });

// DELETE all articles
// app.delete('/v.1/articles', function (req, res) {
//   BlogPost.deleteMany({}, err => {
//     if (err) {
//       // error message 400 and show error
//       res.status(400).json({
//         error: err,
//       });
//     } else {
//       res.json({
//         message: 'All posts deleted',
//       });
//     }
//   });
// });

/////////////////////////

// SERVER CONFIG
let port = process.env.PORT;
if (port == null || port == '') {
  port = 3000;
}
app.listen(port, () => {
  console.log('Server started on port 3000');
});
