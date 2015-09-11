// This is a simple semaphore that manages (probably with tons of race conditions and bugs) a captive set of Phridge-
// proxied PhantomJS processes.

var when = require("when");
var phridge = require("phridge");

function PhantomSet(maxPhantoms) {
    this.ready = new Array; // Instances that aren't being used.
    this.active = new Array; // Instances that are being used.
    this.building = 0; // Instances that are being spun up (since creation is asynchronous, this has to be tracked).
    this.maxPhantoms = maxPhantoms; // Total number of instances allowed, regardless of status.
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
        	self.logStatus("Failed to get an instance");
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