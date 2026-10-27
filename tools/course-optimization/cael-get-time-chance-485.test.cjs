'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { getTimeChance } = require('./cael-get-time-chance-485.cjs');

test('time and chance become get/got; good time, food and drink stay had', () => {
  assert.strictEqual(getTimeChance('did you have time to ask for help?', 'gest ti amser i ofyn am help?'), 'did you get time to ask for help?');
  assert.strictEqual(getTimeChance('did you have a chance to watch that film?', 'gest ti gyfle i wylio’r ffilm ’na?'), 'did you get a chance to watch that film?');
  assert.strictEqual(getTimeChance('did you have enough time to walk to school?', 'gest ti ddigon o amser i gerdded i’r ysgol?'), 'did you get enough time to walk to school?');
  assert.strictEqual(getTimeChance('did you have less time yesterday?', 'gest ti lai o amser ddoe?'), 'did you get less time yesterday?');
  assert.strictEqual(getTimeChance('I had time', 'ges i amser'), 'I got time');
  assert.strictEqual(getTimeChance('did you have a good time?', 'gest ti amser da?'), null);
  assert.strictEqual(getTimeChance('did you have a cup of coffee?', 'gest ti banad o goffi?'), null);
  assert.strictEqual(getTimeChance('you had enough to drink', 'gest ti ddigon i yfed'), null);
  assert.strictEqual(getTimeChance('you didn’t have time to help', 'chest ti ddim amser i helpu'), null);
});
