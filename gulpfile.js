var gulp = require('gulp');
var fs = require('fs');
var browserify = require('browserify');
var babelify = require('babelify');

gulp.task('default', function () {
  var browserifyOptions = {
    debug: true,
    standalone: 'FxRemoteManager'
  };

  function onError(e) {
    console.log("Error: " + e.message);
  }

  browserify(browserifyOptions)
    .transform(babelify)
    .require("./src/js/app.es6.js", { entry: true })
    .bundle()
    .on('error', onError)
    .pipe(fs.createWriteStream('dist/app.js'));

  gulp.src('./src/index.html').pipe(gulp.dest('./dist/'));
  gulp.src('./src/style/app.css').pipe(gulp.dest('./dist/'));
});

