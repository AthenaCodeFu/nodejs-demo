// This file is totally unnecessary. You can use python -m SimpleHTTPServer 8080 instead,
// and it'll do the cache control headers correctly. If for some reason you don't want
// to do that, you can use this, which is a dumb static file server that sets a 10
// minute max cache age on all resources it serves.

var http = require("http");
var url = require("url");
var path = require("path");
var fs = require("fs");


function handleRequest(request, response){
    console.log("Got a request: " + request.url);
    var uri = url.parse(request.url).pathname.substr(1);

    fs.exists(uri, function(exists) {
        if(!exists) {
            response.writeHead(404, {"Content-Type": "text/plain"});
            response.end("404 Not Found\n");
        } else {
            fs.readFile(uri, "binary", function(err, file) {
                response.writeHead(200, {
                    'Content-Type': 'text/HTML; charset=utf-8',
                    'Cache-Control': 'max-age=600, public'
                });
                response.write(file, "binary");
                response.end();
            });
        }
    });
}

var server = http.createServer(handleRequest);

server.listen(8080, function(){
    console.log("Server listening on: http://localhost:%s", 8080);
});