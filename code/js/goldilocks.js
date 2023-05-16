'use strict';

var RangeLabeler = (function () {
  var _ = PrimitiveTools._, //gets an element
    $ = PrimitiveTools.$,
    _toggleClass = PrimitiveTools._toggleClass,
    _c = PrimitiveTools._css;

  function RangeLabeler (sliderDom, renderer) {
    this._sliderDom = sliderDom;
    this._renderer = renderer;

    this._currentItem = null;

    this._anchors = [];
    this._anchorMarkers = [];

    this._instanceAnchors = [];
    this._instanceAnchorMarkers = [];

    this._slider = null;

    this._lowerHandle = null;
    this._upperHandle = null;
    this._leftPreview = null;
    this._rightPreview = null;

    this._rangeMarker = null;
    this._distribution = null;

    this._extremeMarkers = {
      'high': null,
      'low': null
    };

    this._neighborMarkers = {
      "lower": null,
      "nlower": null,
      "higher": null,
      "nhigher": null
    };

    this._userInteractListener = null;

    this._DEFAULT_BOTTOM_WIDTH = 80;

    this._load();
  };

  RangeLabeler.prototype._findNN = function (anchors, value) {
    if (anchors.length === 0) {
      throw new Error('No anchors, cannot find neighbor');
    }
    var bestMore = anchors[0], bestLess = anchors[0];

    anchors.forEach(function (anchor) {
      var currDist = Math.abs(anchor.value - value);
      var bestMoreDist = Math.abs(bestMore.value - value);
      var bestLessDist = Math.abs(bestLess.value - value);
      if (anchor.value < value) {
        // Update best less if past invalid _or_ closer
        if (bestLess.value >= value || currDist < bestLessDist) {
          bestLess = anchor;
        }
      } else if (anchor.value >= value) {
        // Update best more if past invalid _or_ current closer
        if (bestMore.value <= value || currDist < bestMoreDist) {
          bestMore = anchor;
        }
      }
    });

    return {
      bestMore: bestMore,
      bestLess: bestLess
    };
  }

  RangeLabeler.prototype._load = function () {
    var surface = new Surface('horizontal');
    surface.width = '100%';
    this._slider = new Slider(surface);
    this._slider.trackClassName = 'shaded';

    this._slider.attachTo(this._sliderDom);
  };

  RangeLabeler.prototype._makeHandle = function (item) {
    var base = _('div', {
        'className': 'top-mode-handle'
      }, [_('div', {'className': 'handle handle-arrow handle-o-down'})]);

    if (typeof item === 'undefined' || item === null) {
      // Nothing to add
    } else {
      base.appendChild(_('div', {'className': 'handle-line'}));
      var contentDiv = _('div', {'className': 'content'});
      this._renderer(item, contentDiv);
      base.appendChild(contentDiv);
    }
    return base;
  };

  RangeLabeler.prototype._makeRangeMarker = function () {
    return _('div', {'className': 'range-marker'});
  };

  RangeLabeler.prototype._makeLocalPreview = function (side) {
    var contentDiv = _('div', {'className': 'content'});
    var labelDiv = _('div', {'className': 'preview-label'});
    var mainDiv = _('div', {
      'className': 'top-local-preview preview-' + side
    }, [
      _('div', {'className': 'content-wrap'}, [contentDiv]),
      labelDiv
    ]);
    var _parent = this;
    return {
      'dom': mainDiv,
      'setContent': function (item) {
        _parent._renderer(item, contentDiv);
      },
      'setLabel': function (text) {
        labelDiv.innerText = text;
      },
      'setVisible': function (visible) {
        mainDiv.style.display = visible ? '' : 'none';
      }
    };
  };

  RangeLabeler.prototype._triggerUserInteract = function (boundName) {
    if (typeof this._userInteractListener === 'function') {
      this._userInteractListener(boundName);
    }
  };

  RangeLabeler.prototype._renderExampleMarks = function (exampleAnchors) {
    var baseOffset = (this._anchors.length > 0) ? 50 : 20;
    return exampleAnchors.map((function (item) {
      var contentDiv = _('div', {'className': 'content'});
      this._renderer(item.item, contentDiv);
      var lineDiv = _('div', {'className': 'handle-line'});

      var mainDiv = _('div', {
        'className': 'bottom-mode-handle' +
          (this._anchors.length > 0 ? ' double-high' : '')
      }, [
        lineDiv,
        contentDiv
      ]);
      var mark = this._slider.createMark(mainDiv, 'point').place(item.value);
      mark.depth = 0;
      mark.adjustDepth = function (newDepth) {
        lineDiv.style.height = (baseOffset + 90 * newDepth) + 'px';
        contentDiv.style.top = (baseOffset + 90 * newDepth) + 'px';
        mark.depth = newDepth;
      };
      mark.setDim = function (isDimmed) {
        _toggleClass(mainDiv, 'dim', isDimmed);
      };
      return mark;
    }).bind(this));
  }

  RangeLabeler.prototype._renderLikertMarks = function (likertAnchors) {
    return likertAnchors.map((function (likert) {
      var contentDiv = _('div',
          {'className': 'content likert',
          'style': {'backgroundColor': likert.label}
          });
      var lineDiv = _('div', {'className': 'handle-line'});
      var mainDiv = _('div', {
        'className': 'bottom-mode-handle'
      }, [
        lineDiv,
        contentDiv
      ]);
      return this._slider.createMark(mainDiv, 'point').place(likert.value);
    }).bind(this));
  }

  RangeLabeler.prototype._doAvoid = function (marks) {
    var relWidth = this._DEFAULT_BOTTOM_WIDTH /
      (this._sliderDom.offsetWidth > 0 ? this._sliderDom.offsetWidth : 930);
      // Hard-coded fallback

    // Markers must first be sorted by value
    var sortedMarks = marks.sort(function (a, b) {
      return a.location() < b.location() ? -1 :
        (a.location() > b.location() ? 1 : 0);
    }).filter(function (mark) {
      // Make sure to not adjust anything not adjustable
      return typeof mark.adjustDepth === 'function';
    });

    // Auto-avoidance algorithm on the marker list
    var newDepths = [];
    sortedMarks.forEach(function (marker, i, arr) {
      var val = marker.location();
      var conflicts = [];
      /* Only compare with older things */
      for (var j = i - 1; j >= 0; j--) {
        if (Math.abs(val - arr[j].location()) < relWidth) {
          conflicts.push(newDepths[j]);
        }
      }
      var myDepth = 0;
      for (;; myDepth++) {
        if (conflicts.indexOf(myDepth) < 0) {
          newDepths.push(myDepth);
          break;
        }
      }
      /* Now make the adjustments */
      if (marker.depth !== myDepth) {
        marker.adjustDepth(myDepth);
      }
    });
  }

  RangeLabeler.prototype._renderFixedAnchors = function (labelMode) {
    // Remove any existing ones
    this._anchorMarkers.forEach(function (m) {
      m.detach();
    });
    if (this._anchors.length > 0) {
      this._anchorMarkers = this._renderLikertMarks(this._anchors);
    }
  }

  RangeLabeler.prototype._renderInstancePreview = function (currentValue, labelMode) {
    this._instanceAnchorMarkers.forEach(function (marker) {
      marker.detach(); // Detach any existing markers
    });

    var anchorsSource = this._instanceAnchors.map(function (item) {
      return {
        item: item,
        value: labelMode == 'lower' ? item.upper : item.lower
      }
    });

    if (anchorsSource.length === 0) {
      return; // No instance anchors to render
    }

    // Find list of representative items only from instance anchors
    var lastPicked = null;
    var spacedAnchors = anchorsSource.sort(function (a, b) {
        return a.value > b.value ? 1 : (a.value < b.value ? -1 : 0);
      }).filter(function (item) {
        if (lastPicked === null ||
          Math.abs(item.value - lastPicked.value) > 0.08) {
          lastPicked = item;
          return true;
        } else {
          return false;
        }
      });
    // Make sure to _also_ guarantee the nearest neighbors are around
    var neighbors = this._findNN(anchorsSource, currentValue);
    if (neighbors.bestLess.value <= currentValue) {
      if (spacedAnchors.indexOf(neighbors.bestLess) < 0) {
        spacedAnchors.push(neighbors.bestLess);
      }
    }
    if (neighbors.bestMore.value >= currentValue) {
      if (spacedAnchors.indexOf(neighbors.bestMore) < 0) {
        spacedAnchors.push(neighbors.bestMore);
      }
    }
    // Render the anchors
    this._instanceAnchorMarkers = this._renderExampleMarks(spacedAnchors);
    // Adjust and do avoid
    this._doAvoid(this._instanceAnchorMarkers);
  }

  RangeLabeler.prototype._adjustLocalPreviews = function (value, handleMode) {
    if (this._leftPreview === null) {
      var domLeft = this._makeLocalPreview('left');
      this._leftPreview = this._slider.createMark(domLeft.dom, 'point');
      this._leftPreview.controls = domLeft;
    }
    if (this._rightPreview === null) {
      var domRight = this._makeLocalPreview('right');
      this._rightPreview = this._slider.createMark(domRight.dom, 'point');
      this._rightPreview.controls = domRight;
    }
    if (handleMode === 'lower') {
      this._leftPreview.controls.setLabel(this._neighborMarkers.lower);
      this._rightPreview.controls.setLabel(this._neighborMarkers.nlower);
    } else {
      this._leftPreview.controls.setLabel(this._neighborMarkers.nhigher);
      this._rightPreview.controls.setLabel(this._neighborMarkers.higher);
    }
    // Move the two preview handles
    this._leftPreview.place(value);
    this._rightPreview.place(value);

    var seeds = [];
    if (handleMode === 'lower') {
      seeds = this._instanceAnchors.map(function (item) {
        return {
          item: item,
          value: item.upper
        };
      });

    } else if (handleMode === 'upper') {
      seeds = this._instanceAnchors.map(function (item) {
        return {
          item: item,
          value: item.lower
        }
      })
    }
    if (seeds.length < 1) {
      return; // No seeds
    }
    var bounds = this._findNN(seeds, value);
    // Assign
    if (bounds.bestMore.value >= value) {
      this._rightPreview.controls.setVisible(true);
      this._rightPreview.controls.setContent(bounds.bestMore.item);
    } else {
      this._rightPreview.controls.setVisible(false);
    }
    if (bounds.bestLess.value <= value) {
      this._leftPreview.controls.setVisible(true);
      this._leftPreview.controls.setContent(bounds.bestLess.item);
    } else {
      this._leftPreview.controls.setVisible(false);
    }
  }

  RangeLabeler.prototype._adjustRangeVisual = function () {
    var range = this.range();
    // Dim items in preview
    this._instanceAnchorMarkers.forEach(function (marker) {
      marker.setDim(
        (('lower' in range) && marker.location() < range.lower) ||
        (('upper' in range) && marker.location() > range.upper));
    });
    if (this._rangeMarker !== null) {
      this._rangeMarker.place(('lower' in range) ? range.lower : 0,
        ('upper' in range) ? range.upper : 1);
    }
  }

  RangeLabeler.prototype.setExtremeLabels = function (high, low) {
    if (this._extremeMarkers.high === null) {
      var highDom = _('div', {'className': 'label-extreme max'});
      this._extremeMarkers.high = this._slider.createMark(
        highDom, 'point').place(1);
      this._extremeMarkers.high.dom = highDom;
    }
    if (this._extremeMarkers.low === null) {
      var lowDom = _('div', {'className': 'label-extreme min'});
      this._extremeMarkers.low = this._slider.createMark(
        lowDom, 'point').place(0);
      this._extremeMarkers.low.dom = lowDom;
    }
    // Set the text
    this._extremeMarkers.high.dom.innerText = high;
    this._extremeMarkers.low.dom.innerText = low;
  }

  RangeLabeler.prototype.setCurrentItem = function (item) {
    if (typeof item === 'undefined' || item === null) {
      throw new Error('Must specify an item for setCurrentItem');
    }
    this._currentItem = item;
    // Clear the handles
    if (this._lowerHandle !== null) {
      this._lowerHandle.detach();
    }
    if (this._upperHandle !== null) {
      this._upperHandle.detach();
    }
    this._lowerHandle = null;
    this._upperHandle = null;
    // Create the range marker if it doesn't exist
    if (this._rangeMarker === null) {
      this._rangeMarker = this._slider.createMark(
        this._makeRangeMarker(), 'horizontal').place(0, 1);
    }
    // Create a new lower handle
    var handle = this._makeHandle(this._currentItem);
    this._lowerHandle = this._slider.createHandle(handle);
    this._lowerHandle.addEventListener('move', (function () {
      this._adjustLocalPreviews(this._lowerHandle.value(), 'lower');
      this._renderInstancePreview(this._lowerHandle.value(), 'lower');
      this._adjustRangeVisual();
    }).bind(this));
    this._lowerHandle.place(0);
    // Add user interaction trigger
    this._lowerHandle.addEventListener('move', (function () {
      // STORE ANNOTATIONS: Maybe I can store value form this listener
      this._triggerUserInteract('lower');
    }).bind(this));
    // Render any fixed references
    this._renderFixedAnchors();
  }

  RangeLabeler.prototype.setLower = function (value) { // STORE ANNOTATIONS
    if (this._lowerHandle === null) {
      // Loaded lower handle from extern
      this._lowerHandle = this._slider.createHandle(
        this._makeHandle()).place(value);
    } else {
      this._lowerHandle.swap(this._makeHandle());
    }
    if (typeof value === 'number' && value <= 1 && value >= 0) {
      this._lowerHandle.place(value);
    }
    this._lowerHandle._place = function () {}; // Make _place a dummy
    this._lowerHandle.clearEventListeners('move'); // Stop emitting move events
    // Create the upper handle
    if (this._upperHandle !== null) {
      // Detach any existing ones
      this._upperHandle.detach();
    }
    var handle = this._makeHandle(this._currentItem); // STORE ANNOTATIONS
    this._upperHandle = this._slider.createHandle(handle);
    this._upperHandle.addEventListener('move', (function () {
      this._adjustLocalPreviews(this._upperHandle.value(), 'upper');
      this._renderInstancePreview(this._upperHandle.value(), 'upper');
      this._adjustRangeVisual();
    }).bind(this));
    // Place the handle
    this._upperHandle.place(1);
    // Add user interaction trigger
    this._upperHandle.addEventListener('move', (function () {
      this._triggerUserInteract('upper');
    }).bind(this));
  }

  RangeLabeler.prototype.seed = function (items) {
    if (items.some(function (item) {
        return (typeof item.upper !== 'number') ||
          (typeof item.lower !== 'number');
      })) {
      throw new Error('All items must have upper and lower bounds!');
    }
    this._instanceAnchors = items.slice(0);
  }

  RangeLabeler.prototype.setAnchors = function (anchors) {
    this._anchors = anchors;
  }

  RangeLabeler.prototype.range = function () { // STORE ANNOTATIONS
    var range = {};
    if (this._lowerHandle !== null) {
      range.lower = this._lowerHandle.value();
    }
    if (this._upperHandle !== null) {
      range.upper = this._upperHandle.value();
    }
    return range;
  }

  return RangeLabeler;
})();

/** Simple window render tools **/
var RichTextPanel = (function (PrimitiveTools) {
  var _ = PrimitiveTools._;

  function RichTextPanel(dom) {
    this._dom = dom;
    this._regex = new RegExp('(^|\\s+)\\*\\*(.+?)\\*\\*', 'g');
  }

  RichTextPanel.prototype._renderLine = function (lineText) {
    var lineItems = [], consumedIndex = 0;
    var matches = lineText.matchAll(this._regex);
    for  (var match of matches) {
      var index = match.index,
        length = match[0].length,
        body = match[2],
        preamble = match[1];
      // Consume the prefix
      if (index - consumedIndex > 0) {
        lineItems.push(_('', lineText.substring(consumedIndex, index)));
        consumedIndex = index;
      }
      // Create the item
      if (preamble.length > 0) {
        lineItems.push(_('', preamble));
      }
      lineItems.push(_('strong', {}, [_('', body)]));
      consumedIndex += length;
    }
    if (consumedIndex < lineText.length) {
      lineItems.push(_('', lineText.substring(consumedIndex, lineText.length)));
    }
    return lineItems;
  };

  RichTextPanel.prototype.render = function (text) {
    this._dom.innerHTML = '';
    var lines = text.split("\n");
    var blocks = [];
    lines.forEach((function (line, i) {
      line = line.trim();
      if (blocks.length < 1 || line.length === 0) {
        // Create a new block
        var block = _('div', {'className': 'richtext-p'});
        blocks.push(block);
      } else {
        var block = blocks[blocks.length - 1];
      }
      // Detect if the line should be modified
      if (line.startsWith('>')) {
        block.className = 'richtext-box';
        line = line.substring(1);
      } else if (line.startsWith('-')) {
        block.className = 'richtext-list';
        line = line.substring(1);
      }
      var items = this._renderLine(line);
      if (block.className === 'richtext-list') {
        var lineBlock = _('li', {});
        items.forEach(function (item) { lineBlock.appendChild(item); });
        var uls = block.getElementsByTagName('ul');
        if (uls.length === 0) {
          var ul = _('ul', {});
          block.appendChild(ul);
          uls = [ul];
        }
        uls[0].appendChild(lineBlock);
      } else {
        items.forEach(function (item) { block.appendChild(item); });
      }
    }).bind(this));
    blocks.forEach((function (block) {
      this._dom.appendChild(block);
    }).bind(this));
  };

  return RichTextPanel;
})(PrimitiveTools);

var LabelerTask = (function (PrimitiveTools) {
  var _ = PrimitiveTools._;
  function LabelerTask (page, labelerDom, subpages, trigger, next) {
    this._page = page;
    this._dom = labelerDom;
    this._subpages = subpages;
    this._trigger = trigger;
    this._nextName = next;
  }

  LabelerTask.prototype.run = function (params, name) {
    this._dom.innerHTML = '';
    // Set up the taskRenderer
    var taskRenderer = function (item, dom) {
      if (params.renderer === 'short-text') {
        dom.innerHTML = '';
        var text = _('div', {'className': 'short-text'}, [_('', item.text)]);
        dom.appendChild(text);
      } else if (params.renderer === 'image') {
        dom.style.backgroundImage = 'url(' + item.url + ')';
        dom.style.backgroundColor = '#FFF';
      } else if (params.renderer === 'text+context') {
        dom.innerHTML = '';
        var contextDiv = _('div', {});
        (new RichTextPanel(contextDiv)).render(item.context);
        var domInner = _('div', {'className': 'text-and-context'},
          [
            _('p', {}, [_('', item.text)]),
            contextDiv
          ])
        dom.appendChild(domInner);
      } else {
        throw new Error('Unknown renderer ' + params.renderer);
      }
    };

    var taskLabeler = new RangeLabeler(this._dom, taskRenderer);
    if (params.renderer === 'text+context') {
      this._dom.className += ' wide';
      taskLabeler._DEFAULT_BOTTOM_WIDTH = 120;
    }

    if ('labels' in params) {
      taskLabeler.setExtremeLabels(params.labels.high, params.labels.low);
      if ('neighbors' in params.labels) {
        taskLabeler._neighborMarkers = params.labels.neighbors;
      }
    }

    if ('anchors' in params) {
      taskLabeler.setAnchors(params.anchors);
    }

    taskLabeler.seed(params['seed']);
    taskLabeler.setCurrentItem(params['task']);

    if ('instructions' in params) {
      for (var key in params.instructions) {
        if (key == 'step-0') {
          var richText = new RichTextPanel(this._subpages['lower']);
          richText.render(params.instructions[key]);
        } else if (key == 'step-1') {
          var richText = new RichTextPanel(this._subpages['upper']);
          richText.render(params.instructions[key]);
        }
      }
    }

    if ('lower' in params) {
      taskLabeler.setLower(params['lower']);
      this._subpages.upper.className = 'subpage current';
      this._subpages.lower.className = 'subpage';
    } else {
      this._subpages.lower.className = 'subpage current';
      this._subpages.upper.className = 'subpage';
    }

    // Hook the interaction listener
    var touchedSlider = false;
    taskLabeler._userInteractListener = function () {
      touchedSlider = true;
    }

    // Now for the bog-standard page handler
    this._page.className = 'page current';
    var self = this;

    return new Promise(function (resolve, reject) {
      var listener = function () {
        self._page.className = 'page';
        self._trigger.removeEventListener('click', listener);
        if (!('lower' in params)) {

          // We call the same task as this current task to move to
          // the second half
          var nextStepConfig = {
            'task': name,
            'params': {}
          };
          for (var key in params) {
            nextStepConfig['params'][key] = params[key];
          }
          nextStepConfig['params']['lower'] = taskLabeler.range().lower;

          // Check if we need to check the answers
          if ('reference' in params) {
            var lowerNow = taskLabeler.range().lower;
            if (lowerNow >= params['reference']['lower']['lower'] &&
              lowerNow <= params['reference']['lower']['upper']) {

              resolve(nextStepConfig);
            } else if (lowerNow < params['reference']['lower']['lower']) {
              reject(params['reference']['messages']['lowTooLow']);
            } else {
              reject(params['reference']['messages']['lowTooHigh']);
            }
          } else {
            resolve(nextStepConfig);
          }
        } else {
          var nextStepConfig = {
            'task': self._nextName,
            'params': {
              'item': params['task'], //find uid string
              'range': taskLabeler.range()
            }
          };
          if ('reference' in params) {
            var upperNow = taskLabeler.range().upper;
            if (upperNow <= params['reference']['upper']['upper']) {
              resolve(nextStepConfig);
            } else {
              reject(params['reference']['messages']['highTooHigh']);
            }
          } else {
            if (nextStepConfig.params.range.lower >
              nextStepConfig.params.range.upper) {

              reject('Upper bound must be greater than lower bound!')
            } else {
              resolve(nextStepConfig);
            }
          }
        }
      };
      self._trigger.addEventListener('click', listener);
    });
  }

  return LabelerTask;
})(PrimitiveTools);

(function () {
  var _ = PrimitiveTools._,
    $ = PrimitiveTools.$,
    _toggleClass = PrimitiveTools._toggleClass,
    _c = PrimitiveTools._css;

  function _loadConfig(mturk) {
    return mturk.loadConfig('./inputs/');
  }

  function _showError(text) {
    _toggleClass($('#error'), 'current', true);
    $('#error-description').innerText = text;
    $('#next-btn').style.display = 'none';
  }

  function TaskAssignerTask (config, mturk) {
    this._page = $('#loading');
    this._config = config;
    this._mturk = mturk;
    this._count = 0;
  }

  TaskAssignerTask.prototype.run = function (params) {
    var self = this;

    if (typeof params !== 'undefined' && params !== null) {
      var annotations = this._mturk.getLocal('main-task', {});
      annotations[params['item']['url']] = params['range'];
      this._mturk.saveLocal('main-task', annotations);
    }

    $('#current-progress').innerText = '(' + (self._count + 1) +'/' + (self._config.tasks.length) + ')';

    return new Promise(function (resolve, reject) {
      if (self._count < self._config.tasks.length) {
        var task = {
        'renderer': 'image',
        'seed': self._config.seed,
        'anchors': self._config.anchors,
        'labels': self._config.labels,
        'task': self._config.tasks[self._count]
        }

        self._count = self._count + 1;
        resolve({
          'task': 'label',
          'params': task
        })
      } else {
        resolve({
          'task': 'likert'
        })
      }
    });
  }

  /** MAIN BUSINESS LOGIC HERE **/
  window.addEventListener('load', function () {
    var mturk = new MTurk('gl-skin-tone:');

    // Inject debugging
    if (mturk.isDebug) {
      var debugBtn = _('a', {'className': 'button'}, [_('', 'Reset')]);
      document.body.appendChild(_('div', {'className': 'debug'}, [debugBtn]));
      debugBtn.addEventListener('click', function (e) {
        e.preventDefault();
        mturk.resetLocal();
        window.location.reload();
      });
    }

    var exitBtn = $('#exit-btn');
    exitBtn.addEventListener('click', function (e) {
      // add confirm dialog if needed
      e.preventDefault();
      if (window.confirm("Are you sure you would like to exit the task? You will not be able to take it again.")) {
        mturk.saveLocal('task-state', {'task': 'exit-survey'});
        window.location.reload();
      }
    });

    // Inject the final submission form
    var finalForm = _('form', {
        'id': 'final-form',
        'method': 'post',
        'action': mturk.getSubmitUrl()
      }, [
        _('input', {
          'name': 'assignmentId',
          'type': 'hidden',
          'value': mturk.assignmentId
        }),
        _('input', {
          'name': 'annotations',
          'type': 'hidden',
          'value': ''
        }),
        _('textarea', {
          'name': 'feedback'
        }),
      ]);
    $('#final-form-area').appendChild(finalForm);

    _loadConfig(mturk).then(function (config) {
      /* Patch config to have URL This is where the config can be read
      differently to included scale titles. Define the RBG values*/

      var TRAINING_TASK_CONFIG = {
        'renderer': 'image',
        'seed': config.seed,
        'anchors': config.anchors,
        'task': config.tutorial.task,
        "labels": {
          "high": config.order === 'l-d' ? "Darker" : "Lighter",
          "low": config.order === 'l-d' ? "Lighter" : "Darker",
          "neighbors": {
            "lower": config.order === 'l-d' ? "Lighter" : "Darker",
            "nlower": config.order === 'l-d' ? "not Lighter" : "not Darker",
            "higher": config.order === 'l-d' ? "Darker" : "Lighter",
            "nhigher":config.order === 'l-d' ? "not Darker" : "not Lighter"
          }
        },
        'reference': {
          'lower': config.tutorial.lower,
          'upper': config.tutorial.higher,
          'messages': {
            'lowTooLow': 'That\'s too low for the lower bound! ' +
              "Place the lower bound where the skin tone on the scale can be reasonably seen as the image subject's skin tone",
            'lowTooHigh': 'That\'s too high for the lower bound! ' +
              "Place the lower bound where the skin tone on the scale can be reasonably seen as the image subject's skin tone. Use the " +
              'slider to adjust your lower bound value.',
            'highTooHigh': 'Your upper bound is set too high! ' +
              "Place the upper bound where the skin tone on the scale can be reasonably seen as the image subject's skin tone. Adjust your " +
              'upper bound using the slider.'
          }
        }
      }

      var SELF_REPORT_TASK_CONFIG = {
        'renderer': 'image',
        'seed': config.seed,
        'anchors': config.anchors,
        "labels": config.labels,
        'task': {
          'url':'data/self_report_icon.jpg'
        }
      };
      console.log(config.labels)
      /* Make the tasks */
      var debugTask = new TaskManager.DebugTask(null);
      var introTask = new TaskManager.StaticPageTask($('#intro'),
        $('#next-btn'), {
          'task': 'consent'
        });
      var consentTask = new TaskManager.StaticPageTask($('#consent'),
        $('#next-btn'), {
          'task': 'demo-survey'
        });
      var demoTask = new TaskManager.ValidatePageTask($('#demo-survey'),
        $('#next-btn'), {
          'task': 'training',
          'params': TRAINING_TASK_CONFIG
        },
        function () {
          var surveyQuestions = [
            $('[name="age"]'),
            $('[name="gender"]'),
            $('[name="race"]')
          ];

          var surveyAnswers = {
            'age': parseInt(surveyQuestions[0].value, 10),
            'gender': [],
            'race': []
          };

          surveyQuestions[1].forEach(box => {
            if (box.checked) {
              surveyAnswers['gender'].push(box.value);
            }
          });

          surveyQuestions[2].forEach(box => {
            if (box.checked) {
              surveyAnswers['race'].push(box.value);
            }
          });

          if (surveyAnswers['age'] < 18 || isNaN(surveyAnswers['age'])) {
            return Promise.reject('Entered age is not a number or below 18.\n ' +
              'Please do not proceed with this study if you are below 18 years old!');
          }

          if (surveyAnswers['gender'].length < 1) {
            return Promise.reject('Must select at least one value for gender identity.')
          }

          if (surveyAnswers['race'].length < 1) {
            return Promise.reject('Must select at least one value for ethnicity.')
          }
          mturk.saveLocal("demo-survey", surveyAnswers);
          return Promise.resolve();
        });
      var trainingTask = new LabelerTask($('#training'),
        $('#example-label-slider'),
        {
          'lower': config.order === 'l-d' ? $('#training-step-0-ld') : $('#training-step-0-dl'),
          'upper': config.order === 'l-d' ? $('#training-step-1-ld') : $('#training-step-1-dl')
        },
        $('#next-btn'),
          'report-explainer'
        );
      var explainerTask = new TaskManager.StaticPageTask($('#report-explainer'),
        $('#next-btn'), {
          'task': 'self-report',
          'params': SELF_REPORT_TASK_CONFIG
        });
      var selfReportTask = new LabelerTask($('#self-report'),
        $('#self-report-label-slider'),
        {
          'lower': config.order === 'l-d' ? $('#self-report-step-0-ld') : $('#self-report-step-0-dl'),
          'upper': config.order === 'l-d' ? $('#self-report-step-1-ld') : $('#self-report-step-1-dl')
        },
        $('#next-btn'),
        'intermission'
        );
      var intermissionTask = new TaskManager.StaticPageTask($('#intermission'), // do something here to get
        $('#next-btn'), {
          'task': 'task-assigner'
        },
        function (params) {
          if (typeof params !== 'undefined' && params !== null) {
            var annotation = mturk.getLocal('self-annot', {});
            annotation = params['range'];
            mturk.saveLocal('self-annot', annotation);
          }
        });
      var taskAssignerTask = new TaskAssignerTask(config, mturk);
      var labelTask = new LabelerTask($('#task'),
        $('#task-label-slider'),
        {
          'lower': config.order === 'l-d' ? $('#label-step-0-ld') : $('#label-step-0-dl'),
          'upper': config.order === 'l-d' ? $('#label-step-1-ld') : $('#label-step-1-dl')
        },
        $('#next-btn'),
         'task-assigner'
        );
      var likertTask = new TaskManager.ValidatePageTask($('#post-survey'),
        $('#next-btn'), {
          'task': 'exit-survey'
        },
        function () {
          if (document.forms['likert-form'].reportValidity()) {
            var surveyQuestions = [
              document.forms['likert-form'].likert0,
              document.forms['likert-form'].likert1,
              document.forms['likert-form'].likert2,
              document.forms['likert-form'].likert3,
              document.forms['likert-form'].likert4
            ];

          var surveyAnswers = {
            'likert0': '',
            'likert1': '',
            'likert2': '',
            'likert3': '',
            'likert4': ''
          };
          surveyQuestions.forEach(function (item, i) {
            surveyAnswers['likert' + i] = item.value;
          });

          mturk.saveLocal("post-survey", surveyAnswers);
          return Promise.resolve();
        } else {
          return Promise.reject('Form not completely filled out!')
        }
        });
      var exitSurveyTask = new TaskManager.StaticPageTask($('#survey'),
        $('#next-btn'),
        function () {
          var completeFlag = true;

          // get saved responses
          var mapAnswers = mturk.getLocal('main-task', {});
          const answers = [];
          var selfReportResult = mturk.getLocal('self-annot', {});
          var lowerBound = selfReportResult.lower;
          var upperBound = selfReportResult.upper;
          var postSurvey = mturk.getLocal('post-survey', {});

          Object.entries(mapAnswers).forEach( (answer) => {
            const [itemId, range] = answer;
            var answerMap = {
              'itemId': itemId,
              "lowerBound": range.lower,
              "upperBound": range.upper
            };
            answers.push(answerMap);
          });

          if (answers.length < 5 || postSurvey === {}) {
            completeFlag = false;
          } if (typeof lowerBound === 'undefined') {
            lowerBound = null;

          } if (typeof upperBound === 'undefined') {
            upperBound = null;
          }
          var blob = {
            answers: answers,
            selfReport: {'lowerBound': lowerBound, 'upperBound': upperBound},
            surveyResults: postSurvey,
            demographics: mturk.getLocal('demo-survey', {}),
            participantId: mturk.workerId,
            condition: mturk.hitId,
            exitComments: $('[name="feedback"]').value,
            completed: completeFlag
          };
          if (mturk.platform === 'mturk' || mturk.platform === 'mockturk') {
            finalForm.annotations.value = JSON.stringify(blob);
            finalForm.feedback.value = $('[name="feedback"]').value;
            finalForm.submit();
          } else if (mturk.platform === 'prolific') {
            blob.createdTime = firebase.firestore.FieldValue.serverTimestamp();
            db.collection("responses").add(blob).then((docRef) => {
              console.log("Document written with ID: ", docRef.id);
              var redirect = "https://app.prolific.co/submissions/complete?cc=" + mturk.submitTarget;
              window.location.href = redirect;
            }).catch((error) => {
              alert('There was an error saving your response!\n ' +
                'Please contact task requester with the following info:\n' +
                error + '\n' +
                'Your responses are saved on your computer but have not been submitted.');
              console.error("Error adding document: ", error);
            });// read, make object, send to db, then redirect
          } else {
            alert('Platform unknown. Not submitted. Please check console.');
            console.log(blob);
          }
          return null;
        },
        function () {
          $('#next-btn').innerText = 'Submit HIT'; //change to Prolific term, make sure object was saved, and redirect to Prolific page
        },
        function () {
          $('#next-btn').innerText = 'Next';
        });
      var exitTask = new TaskManager.StaticPageTask($('#exit'),
        $('#exit-btn'),
        function (params) {
          var completeFlag = true;

          // get saved responses
          var mapAnswers = mturk.getLocal('main-task', {});
          const answers = [];
          var selfReportResult = mturk.getLocal('self-annot', {});
          var lowerBound = selfReportResult.lower;
          var upperBound = selfReportResult.upper;
          var postSurvey = mturk.getLocal('post-survey', {});

          Object.entries(mapAnswers).forEach( (answer) => {
            const [itemId, range] = answer;
            var answerMap = {
              'itemId': itemId,
              "lowerBound": range.lower,
              "upperBound": range.upper
            };
            answers.push(answerMap);
          });

          if (answers.length < 5 || postSurvey === {}) {
            completeFlag = false;
          } if (typeof lowerBound === 'undefined') {
            lowerBound = null;

          } if (typeof upperBound === 'undefined') {
            upperBound = null;
          }
          var blob = {
            answers: answers,
            selfReport: {
              'lowerBound': selfReportResult.lower,
              'upperBound': selfReportResult.upper
            },
            demographics: mturk.getLocal('demo-survey', {}),
            surveyResults: mturk.getLocal('post-survey', {}),
            participantId: mturk.workerId,
            condition: mturk.hitId,
            exitComments: $('[name="feedback"]').value,
            completed: false
          };
          // look through what is saved
          // if the value isn't there that means they haven't gone that far
          //TODO: Come back to this
          if (mturk.platform === 'mturk' || mturk.platform === 'mockturk') {
            finalForm.annotations.value = JSON.stringify(blob);
            finalForm.feedback.value = $('[name="feedback"]').value;
            finalForm.submit();
          } else if (mturk.platform === 'prolific') {
            blob.createdTime = firebase.firestore.FieldValue.serverTimestamp();
            db.collection("responses").add(blob).then((docRef) => {
              console.log("Document written with ID: ", docRef.id);
              var redirect = "https://app.prolific.co/submissions/complete?cc=" + mturk.submitTarget;
              window.location.href = redirect;
            }).catch((error) => {
              alert('There was an error saving your response!\n ' +
                'Please contact task requester with the following info:\n' +
                error + '\n' +
                'Your responses are saved on your computer but have not been submitted.');
              console.error("Error adding document: ", error);
            });// read, make object, send to db, then redirect
          } else {
            alert('Platform unknown. Not submitted. Please check console.');
            console.log(blob);
          }
          return null;
        });
      var taskManager = new TaskManager(mturk, 'task-state');
      taskManager.register('_debug', debugTask);
      taskManager.register('task-assigner', taskAssignerTask);
      taskManager.register('intro', introTask);
      taskManager.register('likert', likertTask);
      taskManager.register('consent', consentTask);
      taskManager.register('demo-survey', demoTask);
      taskManager.register('report-explainer', explainerTask);
      taskManager.register('training', trainingTask);
      taskManager.register('self-report', selfReportTask);
      taskManager.register('intermission', intermissionTask);
      taskManager.register('label', labelTask);
      taskManager.register('exit', exitTask);
      taskManager.register('exit-survey', exitSurveyTask);
      taskManager.start(mturk.getLocal('task-state', {'task': 'intro'}));

      /** Add the error page bindings **/
      $('#error-reset').addEventListener('click', function (e) {
        e.preventDefault();
        mturk.resetLocal();
        window.location.reload();
      });
    }).catch(function (e) {
      console.log(e);
      _showError('Error during loading of experiment configuration. ' +
        'Please return this HIT. ' +
        'Error Message: ' + e);
    });
  });
})();
