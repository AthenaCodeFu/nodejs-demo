var http = require("http");
var url = require("url");
var phridge = require("phridge");
var fs = require("fs");
var temp = require("temp");
var phantomset = require("./phantomset.js");

// Create a semaphore for Phantom process instances such that there are never more than 3 child processes around.
var phantoms = phantomset.makePhantomSet(3);

var server = http.createServer(function(request, response) {
    console.log("Got a request: " + request.url);
    response.writeHead(200, {
        // Allow XO requests, since the domain sending the PDF response to the user is going to be different from the
        // domain requesting the conversion.
        "Access-Control-Allow-Origin": "http://localhost:8080",
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': "attachment; filename=\"converted.pdf\"" // Could be dynamic, but I'm lazy.
    });
    var toPrint = url.parse(request.url, true).query.toconvert;
    console.log("Attempting to print URI: " + toPrint);

    // In the initial Code-Fu NodeJS demo, we used a module called "async" to avoid callback-pyramid hell. The Phridge
    // PhantomJS proxy uses when.js, a very popular A+/future library, to accomplish the same thing. Rather than trying
    // to shoehorn familiar "async" functions onto when.js (which is perfectly possible), I dediced to go with the
    // "when in Rome" approach, which is also, in this case, a pun :p.
    phantoms.getPhantom().then(function(phantom){
        var page = phantom.createPage();
        var path = temp.path({suffix: ".pdf"});

        // The secret sauce: the below callback, with a couple of variables passed into it like SQL binds, is deparsed
        // and run inside the PhantomJS interpreter; it is *not* NodeJS code. The resolve/reject callbacks are
        // translated with special handling to allow IPC, but everything else is untouched. See the Phridge
        // documentation for mode details.
        page.run(toPrint, path, function (toPrint, path, resolve, reject) {
            var page = this; //Phantom only
            page.open(toPrint, function (status) {
                if (status !== "success") {
                    return reject(new Error("Cannot load " + this.url));
                }
                console.log("Rendering " + toPrint + "...");
                this.render(path);
                resolve();
            });
        }).then(function(resolve) {
            page.dispose().then(resolve);
        }).then(function() {
            phantoms.deactivate(phantom); // Free up this subprocess for use in other conversions.
            console.log("Done rendering!");
            fs.readFile(path, "binary", function (err, file) {
                response.write(file, "binary");
                response.end();
                fs.unlink(path); // We don't care about the callback here.
            });
        });

    });
});

server.listen(8081, function(){
    console.log("Server listening on: http://localhost:%s", 8081);
});
server.on("close", phridge.disposeAll);

