import Author from '../models/author.js'
import Book from '../models/book.js';
import async from 'async';
import { body, validationResult } from 'express-validator';

const authorList = (req, res) => {
  Author.find()
    .sort([['family_name', 'ascending']])
    .exec(function (err, list_authors) {
      if (err) { return next(err); }
      //Successful, so render
      res.render('authorList', { title: 'Author List', author_list: list_authors });
    });
}

const authorDetail = (req, res, next) => {
  async.parallel({
    author: function(callback) {
        Author.findById(req.params.id)
          .exec(callback)
    },
    authors_books: function(callback) {
      Book.find({ 'author': req.params.id },'title summary')
      .exec(callback)
    },
}, function(err, results) {
    if (err) { return next(err); } // Error in API usage.
    if (results.author==null) { // No results.
        var err = new Error('Author not found');
        err.status = 404;
        return next(err);
    }
    // Successful, so render.
    res.render('authorDetail', { title: 'Author Detail', author: results.author, author_books: results.authors_books } );
});
}

const authorCreateGet = (req, res) => {
  res.render('authorForm', {title: 'Create Author'})
}

const authorCreatePost = [

  // Validate and sanitize fields.
  body('first_name').trim().isLength({ min: 1 }).escape().withMessage('First name must be specified.')
      .isAlphanumeric().withMessage('First name has non-alphanumeric characters.'),
  body('family_name').trim().isLength({ min: 1 }).escape().withMessage('Family name must be specified.')
      .isAlphanumeric().withMessage('Family name has non-alphanumeric characters.'),
  body('date_of_birth', 'Invalid date of birth').optional({ checkFalsy: true }).isISO8601().toDate(),
  body('date_of_death', 'Invalid date of death').optional({ checkFalsy: true }).isISO8601().toDate(),

  // Process request after validation and sanitization.
  (req, res, next) => {

      // Extract the validation errors from a request.
      const errors = validationResult(req);

      if (!errors.isEmpty()) {
          // There are errors. Render form again with sanitized values/errors messages.
          res.render('authorForm', { title: 'Create Author', author: req.body, errors: errors.array() });
          return;
      }
      else {
          // Data from form is valid.

          // Create an Author object with escaped and trimmed data.
          var author = new Author(
              {
                  first_name: req.body.first_name,
                  family_name: req.body.family_name,
                  date_of_birth: req.body.date_of_birth,
                  date_of_death: req.body.date_of_death
              });
          author.save(function (err) {
              if (err) { return next(err); }
              // Successful - redirect to new author record.
              res.redirect(author.url);
          });
      }
  }
];

const authorDeleteGet = (req, res, next) => {
  async.parallel({
    author: function(callback) {
        Author.findById(req.params.id).exec(callback)
    },
    authors_books: function(callback) {
      Book.find({ 'author': req.params.id }).exec(callback)
    },
}, function(err, results) {
    if (err) { return next(err); }
    if (results.author==null) { // No results.
        res.redirect('/catalog/authors');
    }
    // Successful, so render.
    res.render('authorDelete', { title: 'Delete Author', author: results.author, author_books: results.authors_books } );
});
}

const authorDeletePost = (req, res, next) => {
    async.parallel({
        author: function(callback) {
          Author.findById(req.body.authorid).exec(callback)
        },
        authors_books: function(callback) {
          Book.find({ 'author': req.body.authorid }).exec(callback)
        },
    }, function(err, results) {
        if (err) { return next(err); }
        // Success
        if (results.authors_books.length > 0) {
            // Author has books. Render in same way as for GET route.
            res.render('authorDelete', { title: 'Delete Author', author: results.author, author_books: results.authors_books } );
            return;
        }
        else {
            // Author has no books. Delete object and redirect to the list of authors.
            Author.findByIdAndRemove(req.body.authorid, function deleteAuthor(err) {
                if (err) { return next(err); }
                // Success - go to author list
                res.redirect('/catalog/authors')
            })
        }
    });
};


const authorUpdateGet = (req, res) => {
  Author.findById(req.params.id, function (err, author) {
    if (err) { return next(err); }
    if (author == null) { // No results.
        var err = new Error('Author not found');
        err.status = 404;
        return next(err);
    }
    // Success.
    res.render('authorForm', { title: 'Update Author', author: author });

});
}

const authorUpdatePost = [

  // Validate and santize fields.
  body('first_name').trim().isLength({ min: 1 }).escape().withMessage('First name must be specified.')
      .isAlphanumeric().withMessage('First name has non-alphanumeric characters.'),
  body('family_name').trim().isLength({ min: 1 }).escape().withMessage('Family name must be specified.')
      .isAlphanumeric().withMessage('Family name has non-alphanumeric characters.'),
  body('date_of_birth', 'Invalid date of birth').optional({ checkFalsy: true }).isISO8601().toDate(),
  body('date_of_death', 'Invalid date of death').optional({ checkFalsy: true }).isISO8601().toDate(),


  // Process request after validation and sanitization.
  (req, res, next) => {

      // Extract the validation errors from a request.
      const errors = validationResult(req);

      // Create Author object with escaped and trimmed data (and the old id!)
      var author = new Author(
          {
              first_name: req.body.first_name,
              family_name: req.body.family_name,
              date_of_birth: req.body.date_of_birth,
              date_of_death: req.body.date_of_death,
              _id: req.params.id
          }
      );

      if (!errors.isEmpty()) {
          // There are errors. Render the form again with sanitized values and error messages.
          res.render('authorForm', { title: 'Update Author', author: author, errors: errors.array() });
          return;
      }
      else {
          // Data from form is valid. Update the record.
          Author.findByIdAndUpdate(req.params.id, author, {}, function (err, theauthor) {
              if (err) { return next(err); }
              // Successful - redirect to genre detail page.
              res.redirect(theauthor.url);
          });
      }
  }
];

export { authorList, authorDetail, authorCreateGet, authorCreatePost, authorDeleteGet, authorDeletePost, authorUpdateGet, authorUpdatePost }