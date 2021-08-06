import BookInstance from '../models/bookinstance.js'
import Book from '../models/book.js';
import async from 'async'
import { body, validationResult } from 'express-validator';

const bookInstanceList = (req, res) => {
  BookInstance.find().populate('book').exec(function(err, list_bookinstances) {
      if (err) { return next(err); }
      // Successful, so render
      res.render('bookInstanceList', { title: 'Book Instance List', bookinstance_list: list_bookinstances });
    });
}

const bookInstanceDetail = (req, res) => {
  BookInstance.findById(req.params.id)
    .populate('book')
    .exec(function (err, bookinstance) {
      if (err) { return next(err); }
      if (bookinstance==null) { // No results.
          var err = new Error('Book copy not found');
          err.status = 404;
          return next(err);
        }
      // Successful, so render.
      res.render('bookInstanceDetail', { title: 'Copy: '+bookinstance.book.title, bookinstance:  bookinstance});
    })
}

const bookInstanceCreateGet = (req, res) => {
  Book.find({},'title')
    .exec(function (err, books) {
      if (err) { return next(err); }
      // Successful, so render.
      res.render('bookInstanceForm', {title: 'Create Book Instance', book_list: books});
    });
}

const bookInstanceCreatePost = [

  // Validate and sanitise fields.
  body('book', 'Book must be specified').trim().isLength({ min: 1 }).escape(),
  body('imprint', 'Imprint must be specified').trim().isLength({ min: 1 }).escape(),
  body('status').escape(),
  body('due_back', 'Invalid date').optional({ checkFalsy: true }).isISO8601().toDate(),

  // Process request after validation and sanitization.
  (req, res, next) => {

      // Extract the validation errors from a request.
      const errors = validationResult(req);

      // Create a BookInstance object with escaped and trimmed data.
      var bookinstance = new BookInstance(
        { book: req.body.book,
          imprint: req.body.imprint,
          status: req.body.status,
          due_back: req.body.due_back
         });

      if (!errors.isEmpty()) {
          // There are errors. Render form again with sanitized values and error messages.
          Book.find({},'title')
              .exec(function (err, books) {
                  if (err) { return next(err); }
                  // Successful, so render.
                  res.render('bookInstanceForm', { title: 'Create Book Instance', book_list: books, selected_book: bookinstance.book._id , errors: errors.array(), bookinstance: bookinstance });
          });
          return;
      }
      else {
          // Data from form is valid.
          bookinstance.save(function (err) {
              if (err) { return next(err); }
                 // Successful - redirect to new record.
                 res.redirect(bookinstance.url);
              });
      }
  }
];

const bookInstanceDeleteGet = (req, res) => {
  BookInstance.findById(req.params.id)
    .populate('book')
    .exec(function (err, bookinstance) {
        if (err) { return next(err); }
        if (bookinstance==null) { // No results.
            res.redirect('/catalog/bookinstances');
        }
        // Successful, so render.
        res.render('bookInstanceDelete', { title: 'Delete BookInstance', bookinstance:  bookinstance});
    })
}

const bookInstanceDeletePost = (req, res) => {
  BookInstance.findByIdAndRemove(req.body.id, function deleteBookInstance(err) {
    if (err) { return next(err); }
    // Success, so redirect to list of BookInstance items.
    res.redirect('/catalog/bookinstances');
    });
}

const bookInstanceUpdateGet = (req, res) => {
  // Get book, authors and genres for form.
  async.parallel({
    bookinstance: function(callback) {
        BookInstance.findById(req.params.id).populate('book').exec(callback)
    },
    books: function(callback) {
        Book.find(callback)
    },

    }, function(err, results) {
        if (err) { return next(err); }
        if (results.bookinstance==null) { // No results.
            var err = new Error('Book copy not found');
            err.status = 404;
            return next(err);
        }
        // Success.
        res.render('bookInstanceForm', { title: 'Update  BookInstance', book_list : results.books, selected_book : results.bookinstance.book._id, bookinstance:results.bookinstance });
    });
}

const bookInstanceUpdatePost = [
   // Validate and sanitize fields.
   body('book', 'Book must be specified').trim().isLength({ min: 1 }).escape(),
   body('imprint', 'Imprint must be specified').trim().isLength({ min: 1 }).escape(),
   body('status').escape(),
   body('due_back', 'Invalid date').optional({ checkFalsy: true }).isISO8601().toDate(),
   
   
   // Process request after validation and sanitization.
   (req, res, next) => {

       // Extract the validation errors from a request.
       const errors = validationResult(req);

       // Create a BookInstance object with escaped/trimmed data and current id.
       var bookinstance = new BookInstance(
         { book: req.body.book,
           imprint: req.body.imprint,
           status: req.body.status,
           due_back: req.body.due_back,
           _id: req.params.id
          });

       if (!errors.isEmpty()) {
           // There are errors so render the form again, passing sanitized values and errors.
           Book.find({},'title')
               .exec(function (err, books) {
                   if (err) { return next(err); }
                   // Successful, so render.
                   res.render('bookInstanceForm', { title: 'Update BookInstance', book_list : books, selected_book : bookinstance.book._id , errors: errors.array(), bookinstance:bookinstance });
           });
           return;
       }
       else {
           // Data from form is valid.
           BookInstance.findByIdAndUpdate(req.params.id, bookinstance, {}, function (err,thebookinstance) {
               if (err) { return next(err); }
                  // Successful - redirect to detail page.
                  res.redirect(thebookinstance.url);
               });
       }
   }
];

export { bookInstanceList, bookInstanceDetail, bookInstanceCreateGet, bookInstanceCreatePost, bookInstanceDeleteGet, bookInstanceDeletePost, bookInstanceUpdateGet, bookInstanceUpdatePost }