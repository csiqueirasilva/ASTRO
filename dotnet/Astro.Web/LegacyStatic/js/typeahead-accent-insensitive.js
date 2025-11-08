// function for making a string accent insensitive
$.fn.typeahead.Constructor.prototype.normalize = function (str) {
    // escape chars
    var normalized = str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");

    // map equivalent chars
    normalized = normalized.replace(/[aãáàâ]/gi, '[aãáàâ]');
    normalized = normalized.replace(/[eẽéèê]/gi, '[eẽéèê]');
    normalized = normalized.replace(/[iĩíìî]/gi, '[iĩíìî]');
    normalized = normalized.replace(/[oõóòô]/gi, '[oõóòô]');
    normalized = normalized.replace(/[uũúùû]/gi, '[uũúùû]');
    normalized = normalized.replace(/[cç]/gi, '[cç]');

    // convert string to a regular expression
    // with case insensitive mode
    normalized = new RegExp(normalized, 'gi');

    // return regular expresion
    return normalized;
}

// change 'matcher' method so it became accent insensitive
$.fn.typeahead.Constructor.prototype.matcher = function (item) {

    // get item to be evaluated
    var source = this.displayText(item);

    // make search value case insensitive
    var normalized = this.normalize(this.query);

    // search for normalized value
    return source.match(normalized);
}

// change 'highlighter' method so it became accent insensitive
$.fn.typeahead.Constructor.prototype.highlighter = function (item) {

    // get html output
    var source = this.displayText(item);

    // make search value case insensitive
    var normalized = this.normalize(this.query);

    // highlight normalized value in bold
    return source.replace(normalized, '<strong>$&</strong>');
}