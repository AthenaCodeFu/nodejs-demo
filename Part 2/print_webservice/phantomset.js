// This is a simple semaphore that manages (probably with tons of race conditions and bugs) a captive set of Phridge-
// proxied PhantomJS processes.

var when = require("when");
var phridge = require("phridge");

function PhantomSet(maxPhantoms) {
    this.ready = new Array;
    this.active = new Array;
    this.building = 0;
    this.maxPhantoms = maxPhantoms;
}

PhantomSet.prototype.getPhantom = function() {
    var self = this;
    return when.promise(function(resolve, reject) {
        if (self.ready.length > 0) {
            self.logStatus("Checking out an instance.");
            resolve(self.addActive(self.ready.pop()));
        } else if (self.building + self.ready.length + Object.keys(self.active).length < self.maxPhantoms) {
            self.logStatus("Creating an instance.");
            self.building++;
            phridge.spawn({}).then(function(phantom){
                self.addActive(phantom);
                self.building--;
                resolve(phantom);
            });
        } else {
            reject(new Error("No phantoms available to service request!"));
        }
    });
};

PhantomSet.prototype.logStatus = function(prefix) {
    console.log(prefix + " Active instances: " + Object.keys(this.active).length + ". Ready instances: " + this.ready.length + ". Max instances: " + this.maxPhantoms);
}

PhantomSet.prototype.addActive = function (phantom) {
    this.active[phantom] = true;
    return phantom;
};

PhantomSet.prototype.deactivate = function(phantom) {
    this.ready.push(phantom);
    return delete this.active[phantom];
};

exports.makePhantomSet = function(maxPhantoms) {
    return new PhantomSet(maxPhantoms);
};