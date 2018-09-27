const express = require('express');
const mongoose = require('mongoose');
const User = require('../models/user');

const router = express.Router();

/* ========== POST/CREATE AN ITEM ========== */
router.post('/', (req, res, next) => {
  const {fullname, username, password} = req.body;

  const allFields = ['username', 'password', 'fullname'];  
  const requiredFields = ['username', 'password'];
  const missingField = requiredFields.find(field => !(field in req.body));

  if(missingField){
    const err = new Error(`Missing '${missingField}' in request body`);
    err.status = 422;
    return next(err);
  }

  const notStringField = allFields.find(field => 
    field in req.body && (typeof req.body[field]) !== 'string'
  );

  if(notStringField) {
    const err = new Error(`Incorrect field type for ${notStringField}: expected string`);
    err.status = 422;
    return next(err);
  }

  const nonTrimmedField = requiredFields.find(field => {
    return req.body[field].trim() !== req.body[field];
  });

  if(nonTrimmedField){
    const err = new Error(`${nonTrimmedField} cannot start or end with whitespace`);
    err.status = 422;
    return next(err);
  }

  const requiredLength = {
    username: {
      min: 1
    },
    password: {
      min: 8,
      max: 72
    }
  };

  const tooShort = Object.keys(requiredLength).find(field => {
    return 'min' in requiredLength[field] &&
    req.body[field].length < requiredLength[field].min;
  });

  const tooLong = Object.keys(requiredLength).find(field => {
    return 'max' in requiredLength[field] &&
    req.body[field].length > requiredLength[field].max;
  });

  if(tooShort || tooLong){
    let err;
    if(tooShort){
      err = new Error(`${tooShort} must be at least ${requiredLength[tooShort].min} characters long`);
    } else {
      err = new Error(`${tooLong} must be at most ${requiredLength[tooLong].max} characters long`);
    }
    err.status = 422;
    return next(err);
  }

  let trimmedFullname;  
  if(fullname){
    trimmedFullname = fullname.trim();
  } else {
    trimmedFullname = '';
  }

  return User.hashPassword(password)
    .then(digest => {
      const newUser = {
        username,
        password: digest,
        fullname: trimmedFullname
      };
      return User.create(newUser);
    })
    .then(result => {
      res.location(`${req.originalUrl}/${result.id}`)
        .status(201)
        .json(result);
    })
    .catch(err => {
      if(err.code === 11000){
        err = new Error('The username already exists');
        err.status = 400;
      }
      next(err);
    });
});

module.exports = router;