'use strict';

var TaskManager = (function () {

  function StaticPageTask (page, trigger, next, onLoad, onUnload) {
    this._page = page;
    this._trigger = trigger;
    this._next = next;

    this._onLoad = onLoad;
    this._onUnload = onUnload; //implement
  }

  StaticPageTask.prototype.run = function (params) { //add param for passing data
    this._page.className = 'page current';
    if (typeof this._onLoad === 'function') {
      try {
        this._onLoad(params);
      } catch (e) { };
    }
    var self = this;
    return new Promise(function (resolve, reject) {
      var listener = function () {
        self._page.className = 'page';
        self._trigger.removeEventListener('click', listener);

        if (typeof self._onUnload === 'function') {
          try {
            self._onUnload(params);
          } catch (e) { }
        }
        if (typeof self._next === 'function') {
          resolve(self._next());
        } else {
          resolve(self._next);
        }
      };
      self._trigger.addEventListener('click', listener);
    });
  }

  function ValidatePageTask (page, trigger, next, validate) {
    this._page = page;
    this._trigger = trigger;
    this._next = next;
    this._validate = validate;
  }

  ValidatePageTask.prototype.run = function (params) {
    this._page.className = 'page current';
    var self = this;
    return new Promise(function (resolve, reject) {
      var listener = function () {
        self._validate().then(function () {
          self._page.className = 'page';
          self._trigger.removeEventListener('click', listener);
          if (typeof self._next === 'function') {
            resolve(self._next());
          } else {
            resolve(self._next);
          }
        }).catch(function (e) {
          self._trigger.removeEventListener('click', listener);
          reject("Validation failed: " + e);
        })
      };
      self._trigger.addEventListener('click', listener);
    });
  }


  function DebugTask (next) {
    this._next = next;
  }

  DebugTask.prototype.run = function (params, name) {
    console.log('Debug task invoked as ' + name);
    console.log(params)
    return Promise.resolve(this._next);
  }

  function TaskManager(datastore, key) {
    this._tasks = {};
    this._store = datastore;
    this._key = key;
  }

  TaskManager.StaticPageTask = StaticPageTask;
  TaskManager.DebugTask = DebugTask;
  TaskManager.ValidatePageTask = ValidatePageTask;

  TaskManager.prototype.register = function (name, task) {
    this._tasks[name] = task;
  };

  TaskManager.prototype.start = function (config) {
    var name = (typeof config === 'string') ? config : config['task'];
    var data = (typeof config === 'string') ? null : config['params'];
    if (name in this._tasks) {
      this._store.saveLocal(this._key, config);

      return this._tasks[name].run(data, name).then((function (next) {
        if (next !== null) {
          return this.start(next);
        }
      }).bind(this)).catch((function (e) {
        if (typeof e === 'string') {
          alert(e);
        } else if (e instanceof Error){
          alert(e.stack);
        }
        // Restart the task again
        return this.start(config);
      }).bind(this));
    } else {
      return Promise.reject('Task ' + name + ' not found');
    }
  }

  return TaskManager;
})();
