import Genre from '../models/genre.js'
import Book from '../models/book.js';
import async from 'async'
import { body, validationResult } from 'express-validator';

const genreList = (req, res) => {
  Genre.find().sort([['name', 'ascending']]).exec(function (err, list_genres) {
    if (err) { return next(err); }
    //Successful, so render
    res.render('genreList', { title: 'Genre List', genre_list: list_genres });
  })
}

const genreDetail = (req, res) => {
  async.parallel({
    genre: function(callback) {
        Genre.findById(req.params.id)
          .exec(callback);
    },

    genre_books: function(callback) {
        Book.find({ 'genre': req.params.id })
          .exec(callback);
    },

}, function(err, results, next) {
    if (err) { return next(err); }
    if (results.genre==null) { // No results.
        var err = new Error('Genre not found');
        err.status = 404;
        return next(err);
    }
    // Successful, so render
    res.render('genreDetail', { title: 'Genre Detail', genre: results.genre, genre_books: results.genre_books } );
});
}

const genreCreateGet = (req, res) => {
  res.render('genreForm', {title: 'Create Genre'})
}

const genreCreatePost = [

  // Validate and santize the name field.
  body('name', 'Genre name required').trim().isLength({ min: 1 }).escape(),

  // Process request after validation and sanitization.
  (req, res, next) => {

    // Extract the validation errors from a request.
    const errors = validationResult(req);

    // Create a genre object with escaped and trimmed data.
    var genre = new Genre(
      { name: req.body.name }
    );

    if (!errors.isEmpty()) {
      // There are errors. Render the form again with sanitized values/error messages.
      res.render('genreForm', { title: 'Create Genre', genre: genre, errors: errors.array()});
      return;
    }
    else {
      // Data from form is valid.
      // Check if Genre with same name already exists.
      Genre.findOne({ 'name': req.body.name })
        .exec( function(err, found_genre) {
           if (err) { return next(err); }

           if (found_genre) {
             // Genre exists, redirect to its detail page.
             res.redirect(found_genre.url);
           }
           else {

             genre.save(function (err) {
               if (err) { return next(err); }
               // Genre saved. Redirect to genre detail page.
               res.redirect(genre.url);
             });

           }

         });
    }
  }
];

const genreDeleteGet = (req, res) => {
  async.parallel({
    genre: function(callback) {
        Genre.findById(req.params.id).exec(callback);
    },
    genre_books: function(callback) {
        Book.find({ 'genre': req.params.id }).exec(callback);
    },
}, function(err, results) {
    if (err) { return next(err); }
    if (results.genre==null) { // No results.
        res.redirect('/catalog/genres');
    }
    // Successful, so render.
    res.render('genre_delete', { title: 'Delete Genre', genre: results.genre, genre_books: results.genre_books } );
});
}

const genreDeletePost = (req, res) => {
  async.parallel({
    genre: function(callback) {
        Genre.findById(req.params.id).exec(callback);
    },
    genre_books: function(callback) {
        Book.find({ 'genre': req.params.id }).exec(callback);
    },
}, function(err, results) {
    if (err) { return next(err); }
    // Success
    if (results.genre_books.length > 0) {
        // Genre has books. Render in same way as for GET route.
        res.render('genre_delete', { title: 'Delete Genre', genre: results.genre, genre_books: results.genre_books } );
        return;
    }
    else {
        // Genre has no books. Delete object and redirect to the list of genres.
        Genre.findByIdAndRemove(req.body.id, function deleteGenre(err) {
            if (err) { return next(err); }
            // Success - go to genres list.
            res.redirect('/catalog/genres');
        });

    }
});
}

const genreUpdateGet = (req, res) => {
  Genre.findById(req.params.id, function(err, genre) {
    if (err) { return next(err); }
    if (genre==null) { // No results.
        var err = new Error('Genre not found');
        err.status = 404;
        return next(err);
    }
    // Success.
    res.render('genre_form', { title: 'Update Genre', genre: genre });
});
}

const genreUpdatePost = [
  body('name', 'Genre name must contain at least 3 characters').trim().isLength({ min: 3 }).escape(),
  (req, res, next) => {
      const errors = validationResult(req);
      var genre = new Genre(
        {
        name: req.body.name,
        _id: req.params.id
        }
      );

      if (!errors.isEmpty()) {
        res.render('genreForm', { title: 'Update Genre', genre: genre, errors: errors.array()});
      return;
      }
      else {
        Genre.findByIdAndUpdate(req.params.id, genre, {}, function (err,thegenre) {
          if (err) { return next(err); }
            res.redirect(thegenre.url);
        });
      }
  }
];

export { genreList, genreDetail, genreCreateGet, genreCreatePost, genreDeleteGet, genreDeletePost, genreUpdateGet, genreUpdatePost }