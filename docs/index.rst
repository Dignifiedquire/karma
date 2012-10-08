.. testacular documentation master file, created by
   sphinx-quickstart on Mon Oct  8 07:33:53 2012.
   You can adapt this file completely to your liking, but it should at least
   contain the root `toctree` directive.

========================
Testacular Documentation
========================

This is the documentation for the spectacular testacular project.


Content
=======
.. toctree:: 
  :maxdepth: 1
  
  installation
  browser


Overview
========

What is it good for?
###############

Mostly for testing code in multiple browsers (desktop, mobile, tablets):

* executing tests locally during development
* executing tests on a continuous integration server

Let's do it!
########

Go into your project and create a testacular configuration. Basically you need to specify the source files that you want to execute.

For an example configuration, see test/client/testacular.conf.js which
contains most of the options.

.. code-block:: bash

  # create config file (testacular.conf.js by default)
  testacular init
  
  # start server
  testacular start

  # open browsers you want to test (if testacular is not configured to do it for you)
  open http://localhost:8080

  # if you want to run tests manually (without auto watching file changes), you can:
  testacular run

Testing frameworks support
######################

Testacular is not a testing framework, neither an assertion library, so for that you can use pretty much anything you like.

However, we provide an adapter for Jasmine and Mocha.
If you wanna write an adapter for your favourite testing framework,
that's great - check out adapter/jasmine.src.js and write your own. 

Browsers Supported
###############

Please see :doc:`browser` for details on supported Browsers and how to configure non-default paths.

Why am I doing this?
################

Throughout the development of AngularJS, we've been using JSTD for testing. I really think that JSTD is a great idea. Unfortunately, we had many problems with JSTD, so we decided to write our own test runner based on the same idea. We wanted a simple tool just for executing JavaScript tests that is both stable and fast. That's why we use the awesome Socket.io library and `Node.js`_.


Development
##########

If you are thinking about making Testacular better, or you just want
to hack on it, that's great - fork the repo and become a contributor!

.. code-block:: bash

  git clone git://github.com/vojtajina/testacular.git # or clone your fork

  cd testacular
  sudo npm install . --dev # install all dev dependencies (such as grunt, jasmine-node, etc...)


Tips for contributing
#################

* create a branch per feature/fix
* follow http://nodeguide.com/style.html (with exception of 100 characters per line)
* send pull request requesting a merge to ``master`` branch (not to default ``stable``)


If you have any further questions, join the mailing
list or submit an issue.

You can follow @TestacularJS as well.


Versions
#######

Testacular uses Semantic Versioning. All even versions (eg. ``0.2.x``, ``0.4.x``) are considered to
be stable - no breaking changes, only bug fixes.

Stable channel (branch "stable")

.. code-block:: bash

  npm install -g testacular

Canary channel (branch "master")

.. code-block:: bash

  npm install -g testacular@canary

.. _Node.js: http://nodejs.org
