var exec = require('child_process').exec;
var _ = require('underscore');
var str = require('string');
var async = require("async");

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
    exec("sleep 1 && echo AFTER KEYPRESS " + key, function (error, stdout, stderr) {
        handle_exec_result(error, stdout, stderr);
        exec("sleep 1 && echo END OF CHAIN " + key, function (error, stdout, stderr) {
            handle_exec_result(error, stdout, stderr);
        });
    });
});

//process.stdin.on( 'data', function( key ){
//    if ( key === '\u0003' ) {
//        process.exit();
//    }
//    p( key );
//    async.waterfall([
//        function(callback) {
//            exec("sleep 1 && echo AFTER KEYPRESS " + key, callback);
//        },
//        function(stdout, stderr, callback) {
//            handle_exec_result(null, stdout, stderr);
//            callback();
//        },
//        function(callback) {
//            exec("sleep 1 && echo END OF CHAIN " + key, callback);
//        },
//        function(stdout, stderr, callback) {
//            handle_exec_result(null, stdout, stderr);
//            callback();
//        },
//    ]);
//});


p("All done!");