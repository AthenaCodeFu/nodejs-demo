var exec = require('child_process').exec;
var _ = require('underscore');
var str = require('string');
async = require("async");

function p (string) {
    console.log(string);
}

function handle_exec_result (stdout, stderr) {
    if ( ! _.isEmpty(stdout) ) {
        p(str('stdout: ' + stdout).collapseWhitespace().s );
    }
    if ( ! _.isEmpty(stderr) ) {
        p(str('stderr: ' + stderr).collapseWhitespace().s );
    }

}

p("Starting up!");
process.stdin.setRawMode(true);
process.stdin.setEncoding( 'utf8' );


process.stdin.on( 'data', function( key ){
    if ( key === '\u0003' ) {
        process.exit();
    }
    p( key );
    var results = {};
    async.parallel([
        function(callback) {
            exec("sleep 1 && echo AFTER KEYPRESS " + key, function() {
                results.first = "first done!";
                p(results.first);
                callback();
            });
        },
        function(callback) {
            exec("sleep 3 && echo AFTER KEYPRESS " + key, function() {
                results.second = "second done!";
                p(results.second);
                callback();
            });
        }
    ], function(error) {
        if ( error ) {
            p("Got an error: " + error);
        } else {
            p(results);
        }
    });
});

p("All done!");