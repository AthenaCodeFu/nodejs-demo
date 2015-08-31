var exec = require('child_process').exec;
var _ = require('underscore');
var str = require('string');

function p (string) {
    console.log(string);
}

function handle_exec_result (error, stdout, stderr) {
    if ( ! _.isEmpty(stdout) ) {
        p(str('stdout: ' + stdout).collapseWhitespace().s );
    }
    if ( ! _.isEmpty(stderr) ) {
        p(str('stderr: ' + stderr).collapseWhitespace().s );
    }
    if ( ! _.isNull(error) ) {
        p('exec error: ' + error);
    }
}

p("Starting up!");
//process.stdin.setRawMode(true);
process.stdin.setEncoding( 'utf8' );
process.stdin.on( 'data', function( key ){
    if ( key === '\u0003' ) {
        process.exit();
    }
    p( key );
    //exec("sleep 1 && echo AFTER KEYPRESS " + key, handle_exec_result);
});

p("All done!");