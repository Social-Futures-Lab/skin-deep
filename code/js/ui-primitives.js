/* This file is built by build.sh */
'use strict';

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define(['exports'], factory);
  } else if (typeof exports === 'object' && typeof exports.nodeName !== 'string') {
    factory(exports);
  } else {
    factory(root);
  }
})(this, function (exports) {
  var SVG_TYPES = [
    'svg', 'rect', 'circle', 'ellipse', 'path', 'g'
  ];
  var PrimitiveTools = function () {};

  // The DFC.js derivative
  PrimitiveTools.prototype._ = function _(type, props, children, callback) {
    // Initialize the element
    var elem = null;
    if (type instanceof Element || type instanceof HTMLDocument) {
      elem = type;
    } else if (typeof type === 'string') {
      type = type.toLowerCase().trim();
      if (type === '') {
        return document.createTextNode(props);
      } else if (SVG_TYPES.indexOf(type) >= 0) {
        elem = document.createElementNS("http://www.w3.org/2000/svg", type);
      } else {
        elem = document.createElement(type);
      }
    } else {
      throw new Error('First argument must be a string or Element.');
    }

    if (typeof props !== 'object' || props == null) {
      props = {};
    }

    // Set the properties for the element
    for (var propName in props) {
      if (propName === 'style' ){
        for (var styleName in props[propName]) {
          elem.style[styleName] = props[propName][styleName];
        }
      } else if (propName === 'className') {
        elem.className = props[propName];
      } else {
        elem.setAttribute(propName, props[propName]);
      }
    }

    if (Array.isArray(children)) {
      // We have child elements to add
      for (var i = 0; i < children.length; i++) {
        if (children[i] !== null) {
          elem.appendChild(children[i]);
        }
      }
    }

    if (typeof callback === 'function') {
      // Do post-processing on the element
      callback(elem);
    }

    return elem;
  };

  // The "uni-selector"
  PrimitiveTools.prototype.$ = function $(selector) {
    if (typeof selector !== 'string') {
      return selector; // Return any non-string items straight back
    }
    var items = document.querySelectorAll(selector);
    if (items.length === 0) {
      return null;
    } else if (items.length === 1) {
      return items[0];
    } else {
      return items;
    }
  };

  // Infer css values in JS
  PrimitiveTools.prototype._css = function _css(value) {
    if (typeof value === 'number') {
      if (value >= 1) {
        return value + 'px';
      } else {
        return (value * 100) + '%';
      }
    } else {
      return value;
    }
  };

  // Class toggler
  PrimitiveTools.prototype._toggleClass = function _t(dom, className, mode) {
    if (typeof NodeList !== 'undefined' && (dom instanceof NodeList)) {
      for (var i = 0; i < dom.length; i++) {
        _t(dom[i], className, mode);
      }
      return dom;
    }
    var classes = dom.className.split(' ');
    var index = classes.indexOf(className);
    if (mode === true) {
      if (index < 0) {
        classes.push(className);
        dom.className = classes.join(' ');
      }
    } else if (mode === false) {
      if (index >= 0) {
        classes.splice(index, 1);
        dom.className = classes.join(' ');
      }
    } else {
      if (index < 0) {
        this._toggleClass(dom, className, true);
      } else {
        this._toggleClass(dom, className, false);
      }
    }
    return dom;
  }

  exports.PrimitiveTools = new PrimitiveTools();
});
(function (arr) {
  arr.forEach(function (item) {
    if (item.hasOwnProperty('prepend')) {
      return;
    }
    Object.defineProperty(item, 'prepend', {
      configurable: true,
      enumerable: true,
      writable: true,
      value: function prepend() {
        var argArr = Array.prototype.slice.call(arguments),
          docFrag = document.createDocumentFragment();

        argArr.forEach(function (argItem) {
          var isNode = argItem instanceof Node;
          docFrag.appendChild(isNode ? argItem : document.createTextNode(String(argItem)));
        });

        this.insertBefore(docFrag, this.firstChild);
      }
    });
  });
})([Element.prototype, Document.prototype, DocumentFragment.prototype]);
/**
 * Surface (div) establishes a draw-able rectangular area.
 **/
(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define(['exports', 'PrimitiveTools'], factory);
  } else if (typeof exports === 'object' && typeof exports.nodeName !== 'string') {
    factory(exports, require('PrimitiveTools'));
  } else {
    factory(root, root.PrimitiveTools);
  }
})(this, function (exports, P) {
  var _ = P._, $ = P.$, _toggleClass = P._toggleClass, _c = P._css;

  function Surface (mode, child, domOrSelector) {
    if (mode !== ''
      && mode !== 'horizontal'
      && mode !== 'vertical'
      && mode !== 'point') {

      this._mode = '';
    } else {
      this._mode = mode;
    }

    if (typeof domOrSelector === 'undefined' || domOrSelector === null) {
      this._dom = _('div', {
        'className': 'surface' + (this._mode !== '' ? (' ' + this._mode) : '')
      });
    } else {
      this._dom = $(domOrSelector);
      _toggleClass(this._dom, 'surface', true);
      if (this._mode !== '') {
        _toggleClass(this._dom, this._mode, true);
      }
    }

    this.setChild(child);
  };

  Surface.prototype.setChild = function (child) {
    this._dom.innerHTML = '';
    this._child = child;
    if (typeof this._child !== 'undefined' && this._child !== null) {
      this._dom.appendChild(child);
    }
  };

  Surface.prototype.setMode = function (mode) {
    _toggleClass(this._dom, 'horizontal', false);
    _toggleClass(this._dom, 'vertical', false);
    _toggleClass(this._dom, 'point', false);
    if (mode === 'horizontal') {
      _toggleClass(this._dom, 'horizontal', true);
      this._mode = mode;
    } else if (mode === 'vertical') {
      _toggleClass(this._dom, 'vertical', true);
      this._mode = mode;
    } else if (mode === 'point') {
      _toggleClass(this._dom, 'point', true);
      this._mode = mode;
    } else {
      if (mode !== '' && mode !== null && typeof mode !== 'undefined') {
        console.log('[Warn] Unsupported surface mode ' + mode);
      }
      this._mode = '';
    }
  };

  Surface.prototype.addEventListener = function (event, listener) {
    this._dom.addEventListener(event, listener);
  };

  Object.defineProperty(Surface.prototype, 'absolute', {
    set: function (absolute) {
      _toggleClass(this._dom, 'absolute', absolute);
    },
    get: function () {
      return this._dom.className.split(' ').indexOf('absolute') >= 0;
    }
  });

  Object.defineProperty(Surface.prototype, 'left', {
    set: function (left) {
      this._dom.style.left = _c(left);
    },
    get: function () {
      return this._dom.offsetLeft;
    }
  });

  Object.defineProperty(Surface.prototype, 'right', {
    set: function (right) {
      this._dom.style.right = _c(right);
    },
    get: function () {
      return this._dom.offsetRight;
    }
  });

  Object.defineProperty(Surface.prototype, 'top', {
    set: function (top) {
      this._dom.style.top = _c(top);
    },
    get: function () {
      return this._dom.offsetTop;
    }
  });

  Object.defineProperty(Surface.prototype, 'bottom', {
    set: function (bottom) {
      this._dom.style.bottom = _c(bottom);
    },
    get: function () {
      return this._dom.offsetBottom;
    }
  });

  Object.defineProperty(Surface.prototype, 'width', {
    set: function (width) {
      if (this._mode === 'vertical' || this._mode === 'point') {
        throw new Error('Surface mode does not support setting this property!');
      }
      this._dom.style.width = _c(width);
    },
    get: function () {
      return this._dom.offsetWidth;
    }
  });

  Object.defineProperty(Surface.prototype, 'height', {
    set: function (height) {
      if (this._mode === 'horizontal' || this._mode === 'point') {
        throw new Error('Surface mode does not support setting this property!');
      }
      this._dom.style.height = _c(height);
    },
    get: function () {
      return this._dom.offsetHeight;
    }
  });

  Surface.prototype.attachTo = function (domOrSelector) {
    if (typeof domOrSelector === 'string') {
      var dom = $(domOrSelector);
      if (dom !== null && !Array.isArray(dom)) {
        dom.appendChild(this._dom);
      }
    } else {
      domOrSelector.appendChild(this._dom);
    }
  }

  Surface.prototype.toString = function () {
    return '[Surface @' + this._mode + ']'
  }

  exports.Surface = Surface;
});
/**
 * Slider is a generic slider element.
 **/
(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define(['exports', 'PrimitiveTools', 'Surface'], factory);
  } else if (typeof exports === 'object' && typeof exports.nodeName !== 'string') {
    factory(exports, require('PrimitiveTools'), require('Surface'));
  } else {
    factory(root, root.PrimitiveTools, root.Surface);
  }
})(this, function (exports, P, Surface) {
  var _ = P._, $ = P.$, _toggleClass = P._toggleClass, _c = P._css;

  function SliderHandle (parent, inner) {
    this._parent = parent;
    this._surface = new Surface('point', inner);
    this._surface.absolute = true;
    this._listeners = {};
    this._x = null;
    this._y = null;

    // Bind
    this._surface.addEventListener('mousedown', (function (e) {
      this._parent._startDragging(this);
      var offset = this._parent._toOffsets(e.clientX, e.clientY);
      this._place(offset.x, offset.y);
    }).bind(this));
  }

  SliderHandle.prototype.swap = function (inner) {
    this._surface.setChild(inner);
  }

  SliderHandle.prototype._place = function (x, y) {
    if (typeof x !== 'undefined' && x !== null) {
      this._x = x;
      this._surface.left = x * 100 + '%';
    }
    if (typeof y !== 'undefined' && y !== null) {
      this._y = y;
      this._surface.top = y * 100 + '%';
    }
    this._dispatchEvent('move');
  }

  SliderHandle.prototype.place = function (x, y) {
    if (this._parent._mode === '') {
      if ((typeof x !== 'undefined' && x !== null) &&
        (typeof y !== 'undefined' && y !== null)) {

        this._place(x, y);
      } else {
        throw new Error('Missing coordinate!');
      }
    } else if (this._parent._mode === 'horizontal') {
      if (typeof x !== 'undefined' && x !== null) {
        this._place(x, null)
      }
    } else if (this._parent._mode === 'vertical') {
      if (typeof x !== 'undefined' && x !== null) {
        this._place(null, x);
      }
    } else {
      if ((typeof x !== 'undefined' && x !== null) ||
        (typeof y !== 'undefined' && y !== null)) {

        throw new Error('Coordinates invalid.');
      }
    }
    this.attach();
    return this;
  }

  SliderHandle.prototype.attach = function () {
    if (this._surface._dom.parent !== this._parent._dom) {
      this._parent._dom.appendChild(this._surface._dom);
    }
    return this;
  }

  SliderHandle.prototype.detach = function () {
    try {
      this._surface._dom.remove();
    } catch (e) {}
    return this;
  }

  SliderHandle.prototype._dispatchEvent = function (event, params) {
    if (event in this._listeners) {
      this._listeners[event].forEach((function (listener) {
        listener.apply(this, params);
      }).bind(this));
    }
  }

  SliderHandle.prototype.addEventListener = function (event, listener) {
    if (!(event in this._listeners)) {
      this._listeners[event] = [];
    }
    this._listeners[event].push(listener);
  }

  SliderHandle.prototype.clearEventListeners = function (event) {
    this._listeners[event] = [];
  }

  SliderHandle.prototype.value = function () {
    if (this._parent._mode === 'horizontal') {
      return this._x;
    } else if (this._parent._mode === 'vertical') {
      return this._y;
    } else if (this._parent._mode === '') {
      return {
        x: this._x,
        y: this._y
      }
    } else {
      return null; // point slider
    }
  }

  function SliderMark (parent, inner, mode) {
    this._parent = parent;
    if (typeof mode === 'undefined' || mode === null) {
      mode = this._parent._mode;
    } else if (mode !== 'point' && mode !== this._parent._mode) {
      throw new Error('Slider marks must either be points or have the same' +
        ' mode as the parent slider');
    }
    this._surface = new Surface(mode, inner);
    this._surface.absolute = true;

    this._location = {
      x1: null,
      x2: null,
      y1: null,
      y2: null
    }
  }

  SliderMark.prototype._place = function (x1, y1, x2, y2) {
    if (typeof x1 === 'number') {
      this._location.x1 = x1;
      this._surface.left = x1 * 100 + '%';
    }
    if (typeof y1 === 'number') {
      this._location.y1 = y1;
      this._surface.top = y1 * 100 + '%';
    }
    if (typeof x2 === 'number') {
      this._location.x2 = x2;
      this._surface.right = (1 - x2) * 100 + '%';
    }
    if (typeof y2 === 'number') {
      this._location.y2 = y2;
      this._surface.bottom = (1 - y2) * 100 + '%';
    }
  }

  SliderMark.prototype.place = function (startBound, endBound) {
    if (this._surface._mode === 'point') {
      if (typeof endBound !== 'undefined' && endBound !== null) {
        throw new Error('Point marks cannot have end-bounds set!');
      }
      if (this._parent._mode === '') {
        if (typeof startBound !== 'object' ||
          !('x' in startBound) ||
          !('y' in startBound)) {
          throw new Error('Point marker on area expects X,Y coordinates.');
        }
        this._place(startBound.x, startBound.y);
      } else if (this._parent._mode === 'horizontal') {
        if (typeof startBound !== 'number') {
          throw new Error('Point marker on horizontal area expects numeric.');
        }
        this._place(startBound);
      } else if (this._parent._mode === 'vertical') {
        if (typeof startBound !== 'number') {
          throw new Error('Point marker on vertical area expects numeric.');
        }
        this._place(null, startBound)
      }
    } else if (this._surface._mode === 'horizontal') {
      if (typeof startBound !== 'number' && typeof endBound !== 'number') {
        throw new Error('Start/end bounds must be numeric and both defined!');
      }
      this._place(startBound, null, endBound, null);
    } else if (this._surface._mode === 'vertical') {
      if (typeof startBound !== 'number' && typeof endBound !== 'number') {
        throw new Error('Start/end bounds must be numeric and both defined!');
      }
      this._place(null, startBound, null, endBound);
    } else {
      this._place(startBound.x, startBound.y, endBound.x, endBound.y);
    }
    return this;
  }

  SliderMark.prototype.attach = function () {
    if (this._surface._dom.parent !== this._parent._dom) {
      this._parent._dom.prepend(this._surface._dom);
    }
    return this;
  }

  SliderMark.prototype.detach = function () {
    try {
      this._surface._dom.remove();
    } catch (e) {}
    return this;
  }

  SliderMark.prototype.location = function () {
    if (this._surface._mode === 'point') {
      if (this._parent._mode === '') {
        return {x: this._location.x1, y: this._location.y1};
      } else if (this._parent._mode === 'horizontal') {
        return this._location.x1;
      } else if (this._parent._mode === 'vertical') {
        return this._location.y1;
      }
    } else if (this._surface._mode === 'horizontal') {
      return {start: this._location.x1, end: this._location.x2};
    } else if (this._surface._mode === 'vertical') {
      return {start: this._location.y1, end: this._location.y2};
    } else {
      return {
        start: {x: this._location.x1, y: this._location.y1},
        end: {x: this._location.x2, y: this._location.y2}
      };
    }
  };

  function Slider(surface) {
    if (!(surface instanceof Surface)) {
      throw new Error('Sliders need to be instantiated on a surface!');
    }
    this._surface = surface;
    this._mode = surface._mode;
    this._dom = _('div', {
      'className': 'slider'
    });
    this._trackClassName = '';

    this._dragging = null;

    surface.setChild(this._dom);
    this._init();
  }

  Slider.basicHandle = function (type, orientation) {
    if (orientation !== 'up' &&
      orientation !== 'down' &&
      orientation !== 'left' &&
      orientation !== 'right') {

      orientation = 'center';
    }

    return _('div', {
      'className': 'handle ' + 'handle-' + type + ' handle-o-' + orientation
    });
  }

  Slider.prototype._init = function () {
    document.addEventListener('mousemove', (function (e) {
      if (this._dragging !== null) {
        e.preventDefault();
        var item = this._dragging;
        var offset = this._toOffsets(e.clientX, e.clientY);
        item._place(offset.x, offset.y);
      }
    }).bind(this));
    document.addEventListener('mouseup', (function () {
      this._stopDragging();
    }).bind(this));
  }

  Slider.prototype._toOffsets = function (clientX, clientY) {
    var rect = this._dom.getBoundingClientRect();
    var offsetX = clientX - rect.x, offsetY = clientY - rect.y;
    var deltaX = this._dom.offsetWidth > 0 ?
      Math.max(Math.min(offsetX / this._dom.offsetWidth, 1), 0) : null;
    var deltaY = this._dom.offsetHeight > 0 ?
      Math.max(Math.min(offsetY / this._dom.offsetHeight, 1), 0) : null;
    return {
      'x': (this._mode === '' || this._mode === 'horizontal') ? deltaX : null,
      'y': (this._mode === '' || this._mode === 'vertical') ? deltaY : null
    };
  }

  Slider.prototype._startDragging = function (item) {
    this._dragging = item;
  }

  Slider.prototype._stopDragging = function (item) {
    this._dragging = null;
  }

  Slider.prototype.createHandle = function (handleInside) {
    return (new SliderHandle(this, handleInside)).attach();
  };

  Slider.prototype.createMark = function (markInside, mode) {
    return (new SliderMark(this, markInside, mode)).attach();
  };

  Object.defineProperty(Slider.prototype, 'trackClassName', {
    set: function (trackClassName) {
      this._trackClassName = trackClassName.trim();
      this._dom.className = 'slider' + (this._trackClassName.length > 0 ?
        (' ' + this._trackClassName) : '');
    },
    get: function () {
      return this._trackClassName;
    }
  });

  Slider.prototype.attachTo = function (domOrSelector) {
    this._surface.attachTo(domOrSelector);
  }

  Slider.prototype.toString = function () {
    var item = '';
    if (this._mode === '') {
      item += '[Area Slider]';
    } else if (this._mode === 'horizontal') {
      item += '[Horizontal Slider]';
    } else if (this._mode === 'vertical') {
      item += '[Vertical Slider]';
    } else {
      item += '[Point Slider]';
    }
  };

  exports.Slider = Slider;
});
