var exec = require('child_process').exec;

function p (string) {
    console.log(string);
}

p("Starting up!");

var child;
// executes `pwd`
exec("sleep 1 && echo FIRST COMMAND DONE", function (error, stdout, stderr) {
    p('stdout: ' + stdout);
    p('stderr: ' + stderr);
    if (error !== null) {
        p('exec error: ' + error);
    }
});

p("All done!");