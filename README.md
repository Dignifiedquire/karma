# Testacular Docs - Spectacular Documentation

These are the docs for Testacular. 

## Installation & Building

Make sure you have [Ruby], [jekyll] and [pygments] installed and in
your path, then install the modules via

```bash
$ npm install
```
Install [grunt-cli]
```bash
$ npm install -g grunt-cli
```
and startup via
```bash
$ grunt
```

## Grunt Tasks

### `shell:server`

### `shell:build`

### `build`
* `less`: Compile all less files from `_src/less/` to `css/app.css`
* `mincss`: Minify the just compiled `app.css` file.
* `uglify`: Minify all needed js files from `_src/javascript/` into
  `javascript/app.js`.

### `watch`


[Ruby]: http://www.ruby-lang.org/en/
[jekyll]: https://github.com/mojombo/jekyll
[pygments]: http://pygments.org/
[grunt-cli]: http://github.com/gruntjs/grunt-cli
