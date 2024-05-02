/* Copyright (c) 2017, 2024, Oracle and/or its affiliates. */

/******************************************************************************
 *
 * This software is dual-licensed to you under the Universal Permissive License
 * (UPL) 1.0 as shown at https://oss.oracle.com/licenses/upl and Apache License
 * 2.0 as shown at https://www.apache.org/licenses/LICENSE-2.0. You may choose
 * either license.
 *
 * If you elect to accept the software under the Apache License, Version 2.0,
 * the following applies:
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * NAME
 *   random.js
 *
 * DESCRIPTION
 *   generate a random string which length is 'length', with specialStr
 *   at its head and tail
 *
 *****************************************************************************/
'use strict';

let random = exports;
module.exports = random;

// generate a random string which length is 'length', with specialStr in it's head and tail
random.getRandomString = function(length, specialStr) {
  let str = '';
  let strLength = length - specialStr.length * 2;
  for (; str.length < strLength; str += Math.random().toString(36).slice(2));
  str = str.slice(0, strLength);
  str = specialStr + str + specialStr;
  return str;
};

random.getRandomLengthString = function(length) {
  let str = '';
  for (; str.length < length; str += Math.random().toString(36).slice(2));
  str = str.slice(0, length);
  return str;
};

random.getRandomNumArray = function(size) {
  let numbers = new Array(size);
  for (let i = 0; i < numbers.length; i++) {
    numbers[i] = this.getRandomInt(1, 9999999);
  }
  return numbers;
};

random.getRandomInt = function(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min)) + min;
};

random.getIntArray = function(N) {
  let arr = Array.apply(null, Array(N));
  // The map() method creates a new array with the results of calling a provided function on every element in this array.
  //   var new_array = arr.map(callback[, thisArg])
  // Parameters
  //  callback
  //     Function that produces an element of the new Array, taking three arguments:
  //     currentValue
  //         The current element being processed in the array.
  //     index
  //         The index of the current element being processed in the array.
  //     array
  //         The array map was called upon.
  // thisArg
  //     Optional. Value to use as this when executing callback.
  // Return value
  // A new array with each element being the result of the callback function.
  return arr.map(function(x, i) {
    return i;
  });
};
