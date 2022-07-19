//jshint esversion:6

// IMPORTS
const express = require('express');
const bodyParser = require('body-parser');
const ejs = require('ejs');
const _ = require('lodash');
const mongoose = require('mongoose');

// VARIABLES

const aboutContent =
  'Hac habitasse platea dictumst vestibulum rhoncus est pellentesque. Dictumst vestibulum rhoncus est pellentesque elit ullamcorper. Non diam phasellus vestibulum lorem sed. Platea dictumst quisque sagittis purus sit. Egestas sed sed risus pretium quam vulputate dignissim suspendisse. Mauris in aliquam sem fringilla. Semper risus in hendrerit gravida rutrum quisque non tellus orci. Amet massa vitae tortor condimentum lacinia quis vel eros. Enim ut tellus elementum sagittis vitae. Mauris ultrices eros in cursus turpis massa tincidunt dui.';
const contactContent =
  'Scelerisque eleifend donec pretium vulputate sapien. Rhoncus urna neque viverra justo nec ultrices. Arcu dui vivamus arcu felis bibendum. Consectetur adipiscing elit duis tristique. Risus viverra adipiscing at in tellus integer feugiat. Sapien nec sagittis aliquam malesuada bibendum arcu vitae. Consequat interdum varius sit amet mattis. Iaculis nunc sed augue lacus. Interdum posuere lorem ipsum dolor sit amet consectetur adipiscing elit. Pulvinar elementum integer enim neque. Ultrices gravida dictum fusce ut placerat orci nulla. Mauris in aliquam sem fringilla ut morbi tincidunt. Tortor posuere ac ut consequat semper viverra nam libero.';

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

// SETUP MONGOOSE
mongoose.connect(
  'mongodb+srv://testUser:8EGBXEU2EuI6ZQWB@cluster0.4ioj6pf.mongodb.net/blogPostsDB',
  {
    useNewUrlParser: true,
  }
);

// SCHEMA
const blogPostSchema = {
  title: String,
  body: String,
};

// MODEL (collection)
const BlogPost = mongoose.model('BlogPost', blogPostSchema);

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
  res.render('about', {
    aboutContent: aboutContent,
  });
});

// Contact page
app.get('/contact', function (req, res) {
  res.render('contact', {
    contactContent: contactContent,
  });
});

// compose page
app.get('/compose', function (req, res) {
  res.render('compose');
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

// SERVER CONFIG
let port = process.env.PORT;
if (port == null || port == '') {
  port = 3000;
}
app.listen(port, function () {
  console.log('Server started on port 3000');
});
