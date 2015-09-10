var http = require("http");
var url = require("url");
var phantomProxy = require('phantom-proxy');
var fs = require("fs");

phantomProxy.create({ 'disk-cache' : 'true'}, function (proxy) {

    function handleRequest(request, response){
        console.log("Got a request: " + request.url);
        response.writeHead(200, {
            "Access-Control-Allow-Origin" : "http://localhost:8080",
            'Content-Type': 'application/octet-stream',
            'Content-Disposition' : "attachment; filename=\"page.pdf\""
        });


        var toPrint = url.parse(request.url, true).query.page;
        console.log("Attempting to print URI: " + toPrint);


        proxy.page.open(toPrint, function (result) {
            proxy.page.waitForSelector('body', function (result) {
                proxy.page.render('page.pdf', function (result) {
                    proxy.end(function () {
                        console.log('done');
                        fs.readFile("page.pdf", "binary", function(err, file) {
                            response.write(file, "binary");
                            response.end();
                        });
                    });
                });
            }, 1000); // 1 second timeout
        });
    }

    var server = http.createServer(handleRequest);


    server.listen(8081, function(){
        console.log("Server listening on: http://localhost:%s", 8081);
    });
});