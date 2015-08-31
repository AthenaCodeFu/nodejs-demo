var http = require('http');
var exec = require('child_process').exec;
var str = require('string');
var _ = require('underscore');

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

var server = http.createServer(function (request, response) {
    p("Got a request for: " + request.url);
    response.writeHead(200, {'Content-Type': 'text/plain'});
    exec("sleep 2 && echo SOME RESULT", function(error, stdout, stderr) {
        if (request.url === "/myurl" ) {
            response.end("Can't *quite* make an injection attack here:" + stdout);
        } else {
            response.end("Got a request for: " + request.url);
        }
    });
});

server.listen(8080, function(){
    p("Started the server!");
});