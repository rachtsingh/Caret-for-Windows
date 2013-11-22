define(["command"], function (command) {

    var defaults = {};
    var local = {};
    var project = {};
    var applicationData = Windows.Storage.ApplicationData.current;
    var localSettings = applicationData.localSettings;

    //put this here because Settings is pretty early in load process
    //chrome.version = window.navigator.appVersion.match(/Chrome\/(\d+)/)[1] * 1 || 0;

    var SyncFile = function (name, c) {
        this.entry = {};
        if (name) {
            this.open(name, c);
        }
        this.virtual = true;
    };
    SyncFile.prototype = {
        name: "",
        open: function (name, c) {
            this.name = name;
            console.log("SYNCFILE: " + name);
            this.entry.name = name;
            if (c) {
                c(this);
            }
        },
        read: function (c) {
            var name = this.name;
            var data = localSettings.values[this.name];
            c(null, data[name]);
        },
        write: function (content, c) {
            var data = {};
            data[this.name] = content;
            var self = this;
            for (var propt in data) {
                localSettings.values[propt] = data[propt];
            }
            debug.push(localSettings.values);
            console.log("SYNCFILE: " + this.name + " event type 2");
            command.fire("settings:change-local");
            if (c) c(null, self);
        },
        retain: function () { return false; }
    };

    var clone = function (item) {
        var cloneArray = function (a) {
            var n = [];
            for (var i = 0; i < a.length; i++) {
                if (a[i] instanceof Array) {
                    n[i] = cloneArray(a[i]);
                } else if (typeof a[i] == "object") {
                    n[i] = cloneObject(a[i]);
                } else {
                    n[i] = a[i];
                }
            }
            return n;
        };
        var cloneObject = function (o) {
            var n = {};
            for (var key in o) {
                if (o[key] instanceof Array) {
                    n[key] = cloneArray(o[key]);
                } else if (typeof o[key] == "object") {
                    n[key] = cloneObject(o[key]);
                } else {
                    n[key] = o[key];
                }
            }
            return n;
        };
        if (item instanceof Array) {
            return cloneArray(item);
        }
        return cloneObject(item);
    };

    //track transfers to prevent multiple requests
    var pending = {};

    var Settings = {
        get: function (name) {
            name = name + ".json";
            var comments = /\/\*[\s\S]*?\*\/|\/\/.*$/gm;
            var original = clone(JSON.parse(defaults[name].replace(comments, "")));
            var custom = {};
            try {
                custom = JSON.parse(local[name].replace(comments, ""));
            } catch (e) {
                //parse failed
            }
            //flat arrays (like menus.json) just get returned, not merged
            if (custom && custom instanceof Array) {
                return custom;
            }
            for (var key in custom) {
                original[key] = custom[key];
            }
            //override settings with project settings
            for (var key in project) {
                original[key] = project[key];
            }
            return original;
        },
        getAsString: function (name, original) {
            name = name + ".json";
            if (original) {
                return defaults[name];
            }
            return local[name] || defaults[name];
        },
        getAsFile: function (name) {
            return new SyncFile(name + ".json");
        },
        load: function (name, c) {
            name = name + ".json";
            if (local[name] || defaults[name]) {
                return c();
            }

            //if a request is out, tag along with it
            /*if (pending[name]) {
                pending[name].push(c);
                return;
            }*/

            var onload = function (text) {
                //console.log(text);
                var raw = text.replace();
                //console.log(raw);
                //console.log("-==========================================-")
                defaults[name] = raw;
                //add customizable defaults later!
                //var data = localSettings.values[name];
                //chrome.storage.sync.get(name, function(data) {
                /*if (data) {
                    if (data[name]) {
                        local[name] = data[name];
                    } else {
                        local[name] = defaults[name];
                    }
                    for (var i = 0; i < pending[name].length; i++) {
                        pending[name][i]();
                    }
                    delete pending[name];
                }
                else {
                    return c();
                }*/
                return c(raw);
            };

            //pending[name] = [c]
            //console.log("GOT TO XML REQUEST");
            /*
            var xhr = new XMLHttpRequest();
            xhr.open("GET", "/config/" + name);
            xhr.onload = onload;
            xhr.send();*/
            var url = new Windows.Foundation.Uri("ms-appx:///config/" + name);
            Windows.Storage.StorageFile.getFileFromApplicationUriAsync(url).then(function (file) {
                Windows.Storage.FileIO.readTextAsync(file).then(function (text) {
                    onload(text);
                });
            });
        },
        setProject: function (settings) {
            project = settings;
            command.fire("settings:change-local");
        },
        clearProject: function () {
            project = {};
            command.fire("settings:change-local");
        }
    };

    command.on("settings:delete-local", function (key) {
        key += ".json";
        local[key] = defaults[key];
        //chrome.storage.sync.remove(key);
        command.fire("init:restart");
    });

    command.on("settings:change-local", function () {
        //reload anything that's been used
        var keys = Object.keys(defaults).map(function (n) { return n.replace(".json", "") });
        console.log(keys);
        local = {};
        defaults = {};
        var completed = 0;
        keys.forEach(function (key) {
            Settings.load(key, function () {
                completed++;
                if (completed == keys.length) {
                    command.fire("init:restart");
                }
            });
        });
    });

    return {
        load: function (name, parentRequire, onLoad, config) {
            if (name.length == 0) {
                return onLoad(Settings);
            }

            var files = name.split(",");
            var completed = 0;
            //console.log(files);

            files.forEach(function (file) {
                if (file.indexOf('_') == -1) {
                    Settings.load(file, function () {
                        completed++;
                        //console.log(completed);
                        if (completed == files.length) {
                            onLoad(Settings);
                        }
                    });
                }
            });
        }
    }

});