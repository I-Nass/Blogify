const baseArticles = require('./data/base-articles');
const africanArticles = require('./data/african-articles');
const entertainmentArticles = require('./data/entertainment-articles');

const sampleArticles = [...entertainmentArticles, ...baseArticles, ...africanArticles];

module.exports = sampleArticles;
