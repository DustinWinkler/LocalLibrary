import Book from '../models/book.js'
import Author from '../models/author.js'
import Genre from '../models/genre.js'
import BookInstance from '../models/bookinstance.js'
import async from 'async'
import { body, validationResult } from 'express-validator';

const index = (req, res) => {
  async.parallel({
    book_count: function(callback) {
        Book.countDocuments({}, callback); // Pass an empty object as match condition to find all documents of this collection
    },
    book_instance_count: function(callback) {
        BookInstance.countDocuments({}, callback);
    },
    book_instance_available_count: function(callback) {
        BookInstance.countDocuments({status:'Available'}, callback);
    },
    author_count: function(callback) {
        Author.countDocuments({}, callback);
    },
    genre_count: function(callback) {
        Genre.countDocuments({}, callback);
    }
}, function(err, results) {
    res.render('index', { title: 'Local Library Home', error: err, data: results });
});
}

const bookList = (req, res) => {
  Book.find({}, 'title author')
    .populate('author')
    .exec(function (err, list_books) {
      if (err) { return next(err); }
      //Successful, so render
      res.render('bookList', { title: 'Book List', book_list: list_books });
    });
}

const bookDetail = (req, res) => {
  async.parallel({
    book: function(callback) {

        Book.findById(req.params.id)
          .populate('author')
          .populate('genre')
          .exec(callback);
    },
    book_instance: function(callback) {

      BookInstance.find({ 'book': req.params.id })
      .exec(callback);
    },
}, function(err, results) {
    if (err) { return next(err); }
    if (results.book==null) { // No results.
        var err = new Error('Book not found');
        err.status = 404;
        return next(err);
    }
    // Successful, so render.
    res.render('bookDetail', { title: results.book.title, book: results.book, book_instances: results.book_instance } );
});
}

const bookCreateGet = (req, res) => {
  async.parallel({
    authors: function(callback) {
        Author.find(callback);
    },
    genres: function(callback) {
        Genre.find(callback);
    },
}, function(err, results) {
    if (err) { return next(err); }
    res.render('bookForm', { title: 'Create Book', authors: results.authors, genres: results.genres });
});
}

const bookCreatePost = [
  // Convert the genre to an array.
  (req, res, next) => {
      if(!(req.body.genre instanceof Array)){
          if(typeof req.body.genre ==='undefined')
          req.body.genre = [];
          else
          req.body.genre = new Array(req.body.genre);
      }
      next();
  },

  // Validate and sanitise fields.
  body('title', 'Title must not be empty.').trim().isLength({ min: 1 }).escape(),
  body('author', 'Author must not be empty.').trim().isLength({ min: 1 }).escape(),
  body('summary', 'Summary must not be empty.').trim().isLength({ min: 1 }).escape(),
  body('isbn', 'ISBN must not be empty').trim().isLength({ min: 1 }).escape(),
  body('genre.*').escape(),

  // Process request after validation and sanitization.
  (req, res, next) => {

      // Extract the validation errors from a request.
      const errors = validationResult(req);

      // Create a Book object with escaped and trimmed data.
      var book = new Book(
        { title: req.body.title,
          author: req.body.author,
          summary: req.body.summary,
          isbn: req.body.isbn,
          genre: req.body.genre
         });

      if (!errors.isEmpty()) {
          // There are errors. Render form again with sanitized values/error messages.

          // Get all authors and genres for form.
          async.parallel({
              authors: function(callback) {
                  Author.find(callback);
              },
              genres: function(callback) {
                  Genre.find(callback);
              },
          }, function(err, results) {
              if (err) { return next(err); }

              // Mark our selected genres as checked.
              for (let i = 0; i < results.genres.length; i++) {
                  if (book.genre.indexOf(results.genres[i]._id) > -1) {
                      results.genres[i].checked='true';
                  }
              }
              res.render('bookForm', { title: 'Create Book',authors:results.authors, genres:results.genres, book: book, errors: errors.array() });
          });
          return;
      }
      else {
          // Data from form is valid. Save book.
          book.save(function (err) {
              if (err) { return next(err); }
                 //successful - redirect to new book record.
                 res.redirect(book.url);
              });
      }
  }
];

const bookDeleteGet = (req, res) => {
  async.parallel({
    book: function(callback) {
      Book.findById(req.params.id).populate('author').populate('genre').exec(callback)
    },
    book_instances: function(callback) {
      BookInstance.find({ 'book': req.params.id }).exec(callback);
    }
  }, function(err, results) {
    if (err) { return next(err); }
    if (results.book == null) { res.redirect('/catalog/authors') }

    res.render('bookDelete', { title: 'Delete Book', book: results.book, book_instances: results.book_instances})
  }
  )
}

const bookDeletePost = (req, res, next) => {
  async.parallel({
    book: function(callback) {
      Book.findById(req.params.id).populate('author').populate('genre').exec(callback)
    },
    book_instances: function(callback) {
      BookInstance.find({ 'book': req.params.id }).exec(callback);
    }
  }, function(err, results) {
    if (err) { return next(err); }
    if (results.book_instances.length > 0) {
      res.render('bookDelete', { title: 'Delete Book', book: result.book, book_instances: result.book_instances})
    } else {
      Book.findByIdAndRemove(req.body.bookid, function deleteBook(err) {
        if (err) { return next(err); }
        res.redirect('/catalog/books')
      })
    }
  }
  )
}

const bookUpdateGet = (req, res, next) => {

  // Get book, authors and genres for form.
  async.parallel({
      book: function(callback) {
          Book.findById(req.params.id).populate('author').populate('genre').exec(callback);
      },
      authors: function(callback) {
          Author.find(callback);
      },
      genres: function(callback) {
          Genre.find(callback);
      },
      }, function(err, results) {
          if (err) { return next(err); }
          if (results.book==null) { // No results.
              var err = new Error('Book not found');
              err.status = 404;
              return next(err);
          }
          // Success.
          // Mark our selected genres as checked.
          for (var all_g_iter = 0; all_g_iter < results.genres.length; all_g_iter++) {
              for (var book_g_iter = 0; book_g_iter < results.book.genre.length; book_g_iter++) {
                  if (results.genres[all_g_iter]._id.toString()===results.book.genre[book_g_iter]._id.toString()) {
                      results.genres[all_g_iter].checked='true';
                  }
              }
          }
          res.render('bookForm', { title: 'Update Book', authors: results.authors, genres: results.genres, book: results.book });
      });

};

const bookUpdatePost = [

    // Convert the genre to an array
    (req, res, next) => {
      console.log('firsu func')
        if(!(req.body.genre instanceof Array)){
            if(typeof req.body.genre==='undefined')
            req.body.genre=[];
            else
            req.body.genre=new Array(req.body.genre);
        }
        next();
    },

    // Validate and sanitise fields.
    body('title', 'Title must not be empty.').trim().isLength({ min: 1 }).escape(),
    body('author', 'Author must not be empty.').trim().isLength({ min: 1 }).escape(),
    body('summary', 'Summary must not be empty.').trim().isLength({ min: 1 }).escape(),
    body('isbn', 'ISBN must not be empty').trim().isLength({ min: 1 }).escape(),
    body('genre.*').escape(),

    // Process request after validation and sanitization.
    (req, res, next) => {

        // Extract the validation errors from a request.
        const errors = validationResult(req);

        // Create a Book object with escaped/trimmed data and old id.
        var book = new Book(
          { title: req.body.title,
            author: req.body.author,
            summary: req.body.summary,
            isbn: req.body.isbn,
            genre: (typeof req.body.genre==='undefined') ? [] : req.body.genre,
            _id:req.params.id //This is required, or a new ID will be assigned!
           });

        if (!errors.isEmpty()) {
            // There are errors. Render form again with sanitized values/error messages.

            // Get all authors and genres for form.
            async.parallel({
                authors: function(callback) {
                    Author.find(callback);
                },
                genres: function(callback) {
                    Genre.find(callback);
                },
            }, function(err, results) {
                if (err) { return next(err); }

                // Mark our selected genres as checked.
                for (let i = 0; i < results.genres.length; i++) {
                    if (book.genre.indexOf(results.genres[i]._id) > -1) {
                        results.genres[i].checked='true';
                    }
                }
                res.render('bookForm', { title: 'Update Book',authors: results.authors, genres: results.genres, book: book, errors: errors.array() });
            });
            return;
        }
        else {
          console.log('here')
            // Data from form is valid. Update the record.
            Book.findByIdAndUpdate(req.params.id, book, {}, function (err,thebook) {
                if (err) { return next(err); }
                   // Successful - redirect to book detail page.
                   res.redirect(thebook.url);
                });
        }
    }
];


export { index, bookList, bookDetail, bookCreateGet, bookCreatePost, bookDeleteGet, bookDeletePost, bookUpdateGet, bookUpdatePost }