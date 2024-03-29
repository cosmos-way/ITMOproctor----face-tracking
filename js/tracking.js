/**
 * tracking - A modern approach for Computer Vision on the web.
 * @author Eduardo Lundgren <edu@rdo.io>
 * @version v1.1.3
 * @link http://trackingjs.com
 * @license BSD
 */
(function(window, undefined) {
  window.tracking = window.tracking || {};

  /**
   * Inherit the prototype methods from one constructor into another.
   *
   * Usage:
   * <pre>
   * function ParentClass(a, b) { }
   * ParentClass.prototype.foo = function(a) { }
   *
   * function ChildClass(a, b, c) {
   *   tracking.base(this, a, b);
   * }
   * tracking.inherits(ChildClass, ParentClass);
   *
   * var child = new ChildClass('a', 'b', 'c');
   * child.foo();
   * </pre>
   *
   * @param {Function} childCtor Child class.
   * @param {Function} parentCtor Parent class.
   */
  tracking.inherits = function(childCtor, parentCtor) {
    function TempCtor() {
    }
    TempCtor.prototype = parentCtor.prototype;
    childCtor.superClass_ = parentCtor.prototype;
    childCtor.prototype = new TempCtor();
    childCtor.prototype.constructor = childCtor;

    /**
     * Calls superclass constructor/method.
     *
     * This function is only available if you use tracking.inherits to express
     * inheritance relationships between classes.
     *
     * @param {!object} me Should always be "this".
     * @param {string} methodName The method name to call. Calling superclass
     *     constructor can be done with the special string 'constructor'.
     * @param {...*} var_args The arguments to pass to superclass
     *     method/constructor.
     * @return {*} The return value of the superclass method/constructor.
     */
    childCtor.base = function(me, methodName) {
      var args = Array.prototype.slice.call(arguments, 2);
      return parentCtor.prototype[methodName].apply(me, args);
    };
  };

  /**
   * Captures the user camera when tracking a video element and set its source
   * to the camera stream.
   * @param {HTMLVideoElement} element Canvas element to track.
   * @param {object} opt_options Optional configuration to the tracker.
   */
  tracking.initUserMedia_ = function(element, opt_options) {
    window.navigator.mediaDevices.getUserMedia({
      video: true,
      audio: (opt_options && opt_options.audio) ? true : false,
    }).then(function(stream) {
      element.srcObject = stream;
    }).catch(function(err) {
      throw Error('Cannot capture user camera.');
    });
  };

  /**
   * Tests whether the object is a dom node.
   * @param {object} o Object to be tested.
   * @return {boolean} True if the object is a dom node.
   */
  tracking.isNode = function(o) {
    return o.nodeType || this.isWindow(o);
  };

  /**
   * Tests whether the object is the `window` object.
   * @param {object} o Object to be tested.
   * @return {boolean} True if the object is the `window` object.
   */
  tracking.isWindow = function(o) {
    return !!(o && o.alert && o.document);
  };

  /**
   * Selects a dom node from a CSS3 selector using `document.querySelector`.
   * @param {string} selector
   * @param {object} opt_element The root element for the query. When not
   *     specified `document` is used as root element.
   * @return {HTMLElement} The first dom element that matches to the selector.
   *     If not found, returns `null`.
   */
  tracking.one = function(selector, opt_element) {
    if (this.isNode(selector)) {
      return selector;
    }
    return (opt_element || document).querySelector(selector);
  };

  /**
   * Tracks a canvas, image or video element based on the specified `tracker`
   * instance. This method extract the pixel information of the input element
   * to pass to the `tracker` instance. When tracking a video, the
   * `tracker.track(pixels, width, height)` will be in a
   * `requestAnimationFrame` loop in order to track all video frames.
   *
   * Example:
   * var tracker = new tracking.ColorTracker();
   *
   * tracking.track('#video', tracker);
   * or
   * tracking.track('#video', tracker, { camera: true });
   *
   * tracker.on('track', function(event) {
   *   // console.log(event.data[0].x, event.data[0].y)
   * });
   *
   * @param {HTMLElement} element The element to track, canvas, image or
   *     video.
   * @param {tracking.Tracker} tracker The tracker instance used to track the
   *     element.
   * @param {object} opt_options Optional configuration to the tracker.
   */
  tracking.track = function(element, tracker, opt_options) {
    element = tracking.one(element);
    if (!element) {
      throw new Error('Element not found, try a different element or selector.');
    }
    if (!tracker) {
      throw new Error('Tracker not specified, try `tracking.track(element, new tracking.FaceTracker())`.');
    }

    switch (element.nodeName.toLowerCase()) {
      case 'canvas':
        return this.trackCanvas_(element, tracker, opt_options);
      case 'img':
        return this.trackImg_(element, tracker, opt_options);
      case 'video':
        if (opt_options) {
          if (opt_options.camera) {
            this.initUserMedia_(element, opt_options);
          }
        }
        return this.trackVideo_(element, tracker, opt_options);
      default:
        throw new Error('Element not supported, try in a canvas, img, or video.');
    }
  };

  /**
   * Tracks a canvas element based on the specified `tracker` instance and
   * returns a `TrackerTask` for this track.
   * @param {HTMLCanvasElement} element Canvas element to track.
   * @param {tracking.Tracker} tracker The tracker instance used to track the
   *     element.
   * @param {object} opt_options Optional configuration to the tracker.
   * @return {tracking.TrackerTask}
   * @private
   */
  tracking.trackCanvas_ = function(element, tracker) {
    var self = this;
    var task = new tracking.TrackerTask(tracker);
    task.on('run', function() {
      self.trackCanvasInternal_(element, tracker);
    });
    return task.run();
  };

  /**
   * Tracks a canvas element based on the specified `tracker` instance. This
   * method extract the pixel information of the input element to pass to the
   * `tracker` instance.
   * @param {HTMLCanvasElement} element Canvas element to track.
   * @param {tracking.Tracker} tracker The tracker instance used to track the
   *     element.
   * @param {object} opt_options Optional configuration to the tracker.
   * @private
   */
  tracking.trackCanvasInternal_ = function(element, tracker) {
    var width = element.width;
    var height = element.height;
    var context = element.getContext('2d');
    var imageData = context.getImageData(0, 0, width, height);
    tracker.track(imageData.data, width, height);
  };

  /**
   * Tracks a image element based on the specified `tracker` instance. This
   * method extract the pixel information of the input element to pass to the
   * `tracker` instance.
   * @param {HTMLImageElement} element Canvas element to track.
   * @param {tracking.Tracker} tracker The tracker instance used to track the
   *     element.
   * @param {object} opt_options Optional configuration to the tracker.
   * @private
   */
  tracking.trackImg_ = function(element, tracker) {
    var width = element.width;
    var height = element.height;
    var canvas = document.createElement('canvas');

    canvas.width = width;
    canvas.height = height;

    var task = new tracking.TrackerTask(tracker);
    task.on('run', function() {
      tracking.Canvas.loadImage(canvas, element.src, 0, 0, width, height, function() {
        tracking.trackCanvasInternal_(canvas, tracker);
      });
    });
    return task.run();
  };

  /**
   * Tracks a video element based on the specified `tracker` instance. This
   * method extract the pixel information of the input element to pass to the
   * `tracker` instance. The `tracker.track(pixels, width, height)` will be in
   * a `requestAnimationFrame` loop in order to track all video frames.
   * @param {HTMLVideoElement} element Canvas element to track.
   * @param {tracking.Tracker} tracker The tracker instance used to track the
   *     element.
   * @param {object} opt_options Optional configuration to the tracker.
   * @private
   */
  tracking.trackVideo_ = function(element, tracker) {
    var canvas = document.createElement('canvas');
    var context = canvas.getContext('2d');
    var width;
    var height;

    var resizeCanvas_ = function() {
      width = element.offsetWidth;
      height = element.offsetHeight;
      canvas.width = width;
      canvas.height = height;
    };
    resizeCanvas_();
    element.addEventListener('resize', resizeCanvas_);

    var requestId;
    var requestAnimationFrame_ = function() {
      requestId = window.requestAnimationFrame(function() {
        if (element.readyState === element.HAVE_ENOUGH_DATA) {
          try {
            // Firefox v~30.0 gets confused with the video readyState firing an
            // erroneous HAVE_ENOUGH_DATA just before HAVE_CURRENT_DATA state,
            // hence keep trying to read it until resolved.
            context.drawImage(element, 0, 0, width, height);
          } catch (err) {}
          tracking.trackCanvasInternal_(canvas, tracker);
        }
        requestAnimationFrame_();
      });
    };

    var task = new tracking.TrackerTask(tracker);
    task.on('stop', function() {
      window.cancelAnimationFrame(requestId);
    });
    task.on('run', function() {
      requestAnimationFrame_();
    });
    return task.run();
  };

  // Browser polyfills
  //===================

  if (!window.URL) {
    window.URL = window.URL || window.webkitURL || window.msURL || window.oURL;
  }

  if (!navigator.getUserMedia) {
    navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia ||
    navigator.mozGetUserMedia || navigator.msGetUserMedia;
  }
}(window));

(function() {
  /**
   * EventEmitter utility.
   * @constructor
   */
  tracking.EventEmitter = function() {};

  /**
   * Holds event listeners scoped by event type.
   * @type {object}
   * @private
   */
  tracking.EventEmitter.prototype.events_ = null;

  /**
   * Adds a listener to the end of the listeners array for the specified event.
   * @param {string} event
   * @param {function} listener
   * @return {object} Returns emitter, so calls can be chained.
   */
  tracking.EventEmitter.prototype.addListener = function(event, listener) {
    if (typeof listener !== 'function') {
      throw new TypeError('Listener must be a function');
    }
    if (!this.events_) {
      this.events_ = {};
    }

    this.emit('newListener', event, listener);

    if (!this.events_[event]) {
      this.events_[event] = [];
    }

    this.events_[event].push(listener);

    return this;
  };

  /**
   * Returns an array of listeners for the specified event.
   * @param {string} event
   * @return {array} Array of listeners.
   */
  tracking.EventEmitter.prototype.listeners = function(event) {
    return this.events_ && this.events_[event];
  };

  /**
   * Execute each of the listeners in order with the supplied arguments.
   * @param {string} event
   * @param {*} opt_args [arg1], [arg2], [...]
   * @return {boolean} Returns true if event had listeners, false otherwise.
   */
  tracking.EventEmitter.prototype.emit = function(event) {
    var listeners = this.listeners(event);
    if (listeners) {
      var args = Array.prototype.slice.call(arguments, 1);
      for (var i = 0; i < listeners.length; i++) {
        if (listeners[i]) {
          listeners[i].apply(this, args);
        }
      }
      return true;
    }
    return false;
  };

  /**
   * Adds a listener to the end of the listeners array for the specified event.
   * @param {string} event
   * @param {function} listener
   * @return {object} Returns emitter, so calls can be chained.
   */
  tracking.EventEmitter.prototype.on = tracking.EventEmitter.prototype.addListener;

  /**
   * Adds a one time listener for the event. This listener is invoked only the
   * next time the event is fired, after which it is removed.
   * @param {string} event
   * @param {function} listener
   * @return {object} Returns emitter, so calls can be chained.
   */
  tracking.EventEmitter.prototype.once = function(event, listener) {
    var self = this;
    self.on(event, function handlerInternal() {
      self.removeListener(event, handlerInternal);
      listener.apply(this, arguments);
    });
  };

  /**
   * Removes all listeners, or those of the specified event. It's not a good
   * idea to remove listeners that were added elsewhere in the code,
   * especially when it's on an emitter that you didn't create.
   * @param {string} event
   * @return {object} Returns emitter, so calls can be chained.
   */
  tracking.EventEmitter.prototype.removeAllListeners = function(opt_event) {
    if (!this.events_) {
      return this;
    }
    if (opt_event) {
      delete this.events_[opt_event];
    } else {
      delete this.events_;
    }
    return this;
  };

  /**
   * Remove a listener from the listener array for the specified event.
   * Caution: changes array indices in the listener array behind the listener.
   * @param {string} event
   * @param {function} listener
   * @return {object} Returns emitter, so calls can be chained.
   */
  tracking.EventEmitter.prototype.removeListener = function(event, listener) {
    if (typeof listener !== 'function') {
      throw new TypeError('Listener must be a function');
    }
    if (!this.events_) {
      return this;
    }

    var listeners = this.listeners(event);
    if (Array.isArray(listeners)) {
      var i = listeners.indexOf(listener);
      if (i < 0) {
        return this;
      }
      listeners.splice(i, 1);
    }

    return this;
  };

  /**
   * By default EventEmitters will print a warning if more than 10 listeners
   * are added for a particular event. This is a useful default which helps
   * finding memory leaks. Obviously not all Emitters should be limited to 10.
   * This function allows that to be increased. Set to zero for unlimited.
   * @param {number} n The maximum number of listeners.
   */
  tracking.EventEmitter.prototype.setMaxListeners = function() {
    throw new Error('Not implemented');
  };

}());

(function() {
  /**
   * Canvas utility.
   * @static
   * @constructor
   */
  tracking.Canvas = {};

  /**
   * Loads an image source into the canvas.
   * @param {HTMLCanvasElement} canvas The canvas dom element.
   * @param {string} src The image source.
   * @param {number} x The canvas horizontal coordinate to load the image.
   * @param {number} y The canvas vertical coordinate to load the image.
   * @param {number} width The image width.
   * @param {number} height The image height.
   * @param {function} opt_callback Callback that fires when the image is loaded
   *     into the canvas.
   * @static
   */
  tracking.Canvas.loadImage = function(canvas, src, x, y, width, height, opt_callback) {
    var instance = this;
    var img = new window.Image();
    img.crossOrigin = '*';
    img.onload = function() {
      var context = canvas.getContext('2d');
      canvas.width = width;
      canvas.height = height;
      context.drawImage(img, x, y, width, height);
      if (opt_callback) {
        opt_callback.call(instance);
      }
      img = null;
    };
    img.src = src;
  };
}());

(function() {
  /**
   * DisjointSet utility with path compression. Some applications involve
   * grouping n distinct objects into a collection of disjoint sets. Two
   * important operations are then finding which set a given object belongs to
   * and uniting the two sets. A disjoint set data structure maintains a
   * collection S={ S1 , S2 ,..., Sk } of disjoint dynamic sets. Each set is
   * identified by a representative, which usually is a member in the set.
   * @static
   * @constructor
   */
  tracking.DisjointSet = function(length) {
    if (length === undefined) {
      throw new Error('DisjointSet length not specified.');
    }
    this.length = length;
    this.parent = new Uint32Array(length);
    for (var i = 0; i < length; i++) {
      this.parent[i] = i;
    }
  };

  /**
   * Holds the length of the internal set.
   * @type {number}
   */
  tracking.DisjointSet.prototype.length = null;

  /**
   * Holds the set containing the representative values.
   * @type {Array.<number>}
   */
  tracking.DisjointSet.prototype.parent = null;

  /**
   * Finds a pointer to the representative of the set containing i.
   * @param {number} i
   * @return {number} The representative set of i.
   */
  tracking.DisjointSet.prototype.find = function(i) {
    if (this.parent[i] === i) {
      return i;
    } else {
      return (this.parent[i] = this.find(this.parent[i]));
    }
  };

  /**
   * Unites two dynamic sets containing objects i and j, say Si and Sj, into
   * a new set that Si ∪ Sj, assuming that Si ∩ Sj = ∅;
   * @param {number} i
   * @param {number} j
   */
  tracking.DisjointSet.prototype.union = function(i, j) {
    var iRepresentative = this.find(i);
    var jRepresentative = this.find(j);
    this.parent[iRepresentative] = jRepresentative;
  };

}());

(function() {
  /**
   * Image utility.
   * @static
   * @constructor
   */
  tracking.Image = {};

  /**
   * Computes gaussian blur. Adapted from
   * https://github.com/kig/canvasfilters.
   * @param {pixels} pixels The pixels in a linear [r,g,b,a,...] array.
   * @param {number} width The image width.
   * @param {number} height The image height.
   * @param {number} diameter Gaussian blur diameter, must be greater than 1.
   * @return {array} The edge pixels in a linear [r,g,b,a,...] array.
   */
  tracking.Image.blur = function(pixels, width, height, diameter) {
    diameter = Math.abs(diameter);
    if (diameter <= 1) {
      throw new Error('Diameter should be greater than 1.');
    }
    var radius = diameter / 2;
    var len = Math.ceil(diameter) + (1 - (Math.ceil(diameter) % 2));
    var weights = new Float32Array(len);
    var rho = (radius + 0.5) / 3;
    var rhoSq = rho * rho;
    var gaussianFactor = 1 / Math.sqrt(2 * Math.PI * rhoSq);
    var rhoFactor = -1 / (2 * rho * rho);
    var wsum = 0;
    var middle = Math.floor(len / 2);
    for (var i = 0; i < len; i++) {
      var x = i - middle;
      var gx = gaussianFactor * Math.exp(x * x * rhoFactor);
      weights[i] = gx;
      wsum += gx;
    }
    for (var j = 0; j < weights.length; j++) {
      weights[j] /= wsum;
    }
    return this.separableConvolve(pixels, width, height, weights, weights, false);
  };

  /**
   * Computes the integral image for summed, squared, rotated and sobel pixels.
   * @param {array} pixels The pixels in a linear [r,g,b,a,...] array to loop
   *     through.
   * @param {number} width The image width.
   * @param {number} height The image height.
   * @param {array} opt_integralImage Empty array of size `width * height` to
   *     be filled with the integral image values. If not specified compute sum
   *     values will be skipped.
   * @param {array} opt_integralImageSquare Empty array of size `width *
   *     height` to be filled with the integral image squared values. If not
   *     specified compute squared values will be skipped.
   * @param {array} opt_tiltedIntegralImage Empty array of size `width *
   *     height` to be filled with the rotated integral image values. If not
   *     specified compute sum values will be skipped.
   * @param {array} opt_integralImageSobel Empty array of size `width *
   *     height` to be filled with the integral image of sobel values. If not
   *     specified compute sobel filtering will be skipped.
   * @static
   */
  tracking.Image.computeIntegralImage = function(pixels, width, height, opt_integralImage, opt_integralImageSquare, opt_tiltedIntegralImage, opt_integralImageSobel) {
    if (arguments.length < 4) {
      throw new Error('You should specify at least one output array in the order: sum, square, tilted, sobel.');
    }
    var pixelsSobel;
    if (opt_integralImageSobel) {
      pixelsSobel = tracking.Image.sobel(pixels, width, height);
    }
    for (var i = 0; i < height; i++) {
      for (var j = 0; j < width; j++) {
        var w = i * width * 4 + j * 4;
        var pixel = ~~(pixels[w] * 0.299 + pixels[w + 1] * 0.587 + pixels[w + 2] * 0.114);
        if (opt_integralImage) {
          this.computePixelValueSAT_(opt_integralImage, width, i, j, pixel);
        }
        if (opt_integralImageSquare) {
          this.computePixelValueSAT_(opt_integralImageSquare, width, i, j, pixel * pixel);
        }
        if (opt_tiltedIntegralImage) {
          var w1 = w - width * 4;
          var pixelAbove = ~~(pixels[w1] * 0.299 + pixels[w1 + 1] * 0.587 + pixels[w1 + 2] * 0.114);
          this.computePixelValueRSAT_(opt_tiltedIntegralImage, width, i, j, pixel, pixelAbove || 0);
        }
        if (opt_integralImageSobel) {
          this.computePixelValueSAT_(opt_integralImageSobel, width, i, j, pixelsSobel[w]);
        }
      }
    }
  };

  /**
   * Helper method to compute the rotated summed area table (RSAT) by the
   * formula:
   *
   * RSAT(x, y) = RSAT(x-1, y-1) + RSAT(x+1, y-1) - RSAT(x, y-2) + I(x, y) + I(x, y-1)
   *
   * @param {number} width The image width.
   * @param {array} RSAT Empty array of size `width * height` to be filled with
   *     the integral image values. If not specified compute sum values will be
   *     skipped.
   * @param {number} i Vertical position of the pixel to be evaluated.
   * @param {number} j Horizontal position of the pixel to be evaluated.
   * @param {number} pixel Pixel value to be added to the integral image.
   * @static
   * @private
   */
  tracking.Image.computePixelValueRSAT_ = function(RSAT, width, i, j, pixel, pixelAbove) {
    var w = i * width + j;
    RSAT[w] = (RSAT[w - width - 1] || 0) + (RSAT[w - width + 1] || 0) - (RSAT[w - width - width] || 0) + pixel + pixelAbove;
  };

  /**
   * Helper method to compute the summed area table (SAT) by the formula:
   *
   * SAT(x, y) = SAT(x, y-1) + SAT(x-1, y) + I(x, y) - SAT(x-1, y-1)
   *
   * @param {number} width The image width.
   * @param {array} SAT Empty array of size `width * height` to be filled with
   *     the integral image values. If not specified compute sum values will be
   *     skipped.
   * @param {number} i Vertical position of the pixel to be evaluated.
   * @param {number} j Horizontal position of the pixel to be evaluated.
   * @param {number} pixel Pixel value to be added to the integral image.
   * @static
   * @private
   */
  tracking.Image.computePixelValueSAT_ = function(SAT, width, i, j, pixel) {
    var w = i * width + j;
    SAT[w] = (SAT[w - width] || 0) + (SAT[w - 1] || 0) + pixel - (SAT[w - width - 1] || 0);
  };

  /**
   * Converts a color from a colorspace based on an RGB color model to a
   * grayscale representation of its luminance. The coefficients represent the
   * measured intensity perception of typical trichromat humans, in
   * particular, human vision is most sensitive to green and least sensitive
   * to blue.
   * @param {pixels} pixels The pixels in a linear [r,g,b,a,...] array.
   * @param {number} width The image width.
   * @param {number} height The image height.
   * @param {boolean} fillRGBA If the result should fill all RGBA values with the gray scale
   *  values, instead of returning a single value per pixel.
   * @param {Uint8ClampedArray} The grayscale pixels in a linear array ([p,p,p,a,...] if fillRGBA
   *  is true and [p1, p2, p3, ...] if fillRGBA is false).
   * @static
   */
  tracking.Image.grayscale = function(pixels, width, height, fillRGBA) {
    var gray = new Uint8ClampedArray(fillRGBA ? pixels.length : pixels.length >> 2);
    var p = 0;
    var w = 0;
    for (var i = 0; i < height; i++) {
      for (var j = 0; j < width; j++) {
        var value = pixels[w] * 0.299 + pixels[w + 1] * 0.587 + pixels[w + 2] * 0.114;
        gray[p++] = value;

        if (fillRGBA) {
          gray[p++] = value;
          gray[p++] = value;
          gray[p++] = pixels[w + 3];
        }

        w += 4;
      }
    }
    return gray;
  };

  /**
   * Fast horizontal separable convolution. A point spread function (PSF) is
   * said to be separable if it can be broken into two one-dimensional
   * signals: a vertical and a horizontal projection. The convolution is
   * performed by sliding the kernel over the image, generally starting at the
   * top left corner, so as to move the kernel through all the positions where
   * the kernel fits entirely within the boundaries of the image. Adapted from
   * https://github.com/kig/canvasfilters.
   * @param {pixels} pixels The pixels in a linear [r,g,b,a,...] array.
   * @param {number} width The image width.
   * @param {number} height The image height.
   * @param {array} weightsVector The weighting vector, e.g [-1,0,1].
   * @param {number} opaque
   * @return {array} The convoluted pixels in a linear [r,g,b,a,...] array.
   */
  tracking.Image.horizontalConvolve = function(pixels, width, height, weightsVector, opaque) {
    var side = weightsVector.length;
    var halfSide = Math.floor(side / 2);
    var output = new Float32Array(width * height * 4);
    var alphaFac = opaque ? 1 : 0;

    for (var y = 0; y < height; y++) {
      for (var x = 0; x < width; x++) {
        var sy = y;
        var sx = x;
        var offset = (y * width + x) * 4;
        var r = 0;
        var g = 0;
        var b = 0;
        var a = 0;
        for (var cx = 0; cx < side; cx++) {
          var scy = sy;
          var scx = Math.min(width - 1, Math.max(0, sx + cx - halfSide));
          var poffset = (scy * width + scx) * 4;
          var wt = weightsVector[cx];
          r += pixels[poffset] * wt;
          g += pixels[poffset + 1] * wt;
          b += pixels[poffset + 2] * wt;
          a += pixels[poffset + 3] * wt;
        }
        output[offset] = r;
        output[offset + 1] = g;
        output[offset + 2] = b;
        output[offset + 3] = a + alphaFac * (255 - a);
      }
    }
    return output;
  };

  /**
   * Fast vertical separable convolution. A point spread function (PSF) is
   * said to be separable if it can be broken into two one-dimensional
   * signals: a vertical and a horizontal projection. The convolution is
   * performed by sliding the kernel over the image, generally starting at the
   * top left corner, so as to move the kernel through all the positions where
   * the kernel fits entirely within the boundaries of the image. Adapted from
   * https://github.com/kig/canvasfilters.
   * @param {pixels} pixels The pixels in a linear [r,g,b,a,...] array.
   * @param {number} width The image width.
   * @param {number} height The image height.
   * @param {array} weightsVector The weighting vector, e.g [-1,0,1].
   * @param {number} opaque
   * @return {array} The convoluted pixels in a linear [r,g,b,a,...] array.
   */
  tracking.Image.verticalConvolve = function(pixels, width, height, weightsVector, opaque) {
    var side = weightsVector.length;
    var halfSide = Math.floor(side / 2);
    var output = new Float32Array(width * height * 4);
    var alphaFac = opaque ? 1 : 0;

    for (var y = 0; y < height; y++) {
      for (var x = 0; x < width; x++) {
        var sy = y;
        var sx = x;
        var offset = (y * width + x) * 4;
        var r = 0;
        var g = 0;
        var b = 0;
        var a = 0;
        for (var cy = 0; cy < side; cy++) {
          var scy = Math.min(height - 1, Math.max(0, sy + cy - halfSide));
          var scx = sx;
          var poffset = (scy * width + scx) * 4;
          var wt = weightsVector[cy];
          r += pixels[poffset] * wt;
          g += pixels[poffset + 1] * wt;
          b += pixels[poffset + 2] * wt;
          a += pixels[poffset + 3] * wt;
        }
        output[offset] = r;
        output[offset + 1] = g;
        output[offset + 2] = b;
        output[offset + 3] = a + alphaFac * (255 - a);
      }
    }
    return output;
  };

  /**
   * Fast separable convolution. A point spread function (PSF) is said to be
   * separable if it can be broken into two one-dimensional signals: a
   * vertical and a horizontal projection. The convolution is performed by
   * sliding the kernel over the image, generally starting at the top left
   * corner, so as to move the kernel through all the positions where the
   * kernel fits entirely within the boundaries of the image. Adapted from
   * https://github.com/kig/canvasfilters.
   * @param {pixels} pixels The pixels in a linear [r,g,b,a,...] array.
   * @param {number} width The image width.
   * @param {number} height The image height.
   * @param {array} horizWeights The horizontal weighting vector, e.g [-1,0,1].
   * @param {array} vertWeights The vertical vector, e.g [-1,0,1].
   * @param {number} opaque
   * @return {array} The convoluted pixels in a linear [r,g,b,a,...] array.
   */
  tracking.Image.separableConvolve = function(pixels, width, height, horizWeights, vertWeights, opaque) {
    var vertical = this.verticalConvolve(pixels, width, height, vertWeights, opaque);
    return this.horizontalConvolve(vertical, width, height, horizWeights, opaque);
  };

  /**
   * Compute image edges using Sobel operator. Computes the vertical and
   * horizontal gradients of the image and combines the computed images to
   * find edges in the image. The way we implement the Sobel filter here is by
   * first grayscaling the image, then taking the horizontal and vertical
   * gradients and finally combining the gradient images to make up the final
   * image. Adapted from https://github.com/kig/canvasfilters.
   * @param {pixels} pixels The pixels in a linear [r,g,b,a,...] array.
   * @param {number} width The image width.
   * @param {number} height The image height.
   * @return {array} The edge pixels in a linear [r,g,b,a,...] array.
   */
  tracking.Image.sobel = function(pixels, width, height) {
    pixels = this.grayscale(pixels, width, height, true);
    var output = new Float32Array(width * height * 4);
    var sobelSignVector = new Float32Array([-1, 0, 1]);
    var sobelScaleVector = new Float32Array([1, 2, 1]);
    var vertical = this.separableConvolve(pixels, width, height, sobelSignVector, sobelScaleVector);
    var horizontal = this.separableConvolve(pixels, width, height, sobelScaleVector, sobelSignVector);

    for (var i = 0; i < output.length; i += 4) {
      var v = vertical[i];
      var h = horizontal[i];
      var p = Math.sqrt(h * h + v * v);
      output[i] = p;
      output[i + 1] = p;
      output[i + 2] = p;
      output[i + 3] = 255;
    }

    return output;
  };

  /**
   * Equalizes the histogram of a grayscale image, normalizing the
   * brightness and increasing the contrast of the image.
   * @param {pixels} pixels The grayscale pixels in a linear array.
   * @param {number} width The image width.
   * @param {number} height The image height.
   * @return {array} The equalized grayscale pixels in a linear array.
   */
  tracking.Image.equalizeHist = function(pixels, width, height){
    var equalized = new Uint8ClampedArray(pixels.length);

    var histogram = new Array(256);
    for(var i=0; i < 256; i++) histogram[i] = 0;

    for(var i=0; i < pixels.length; i++){
      equalized[i] = pixels[i];
      histogram[pixels[i]]++;
    }

    var prev = histogram[0];
    for(var i=0; i < 256; i++){
      histogram[i] += prev;
      prev = histogram[i];
    }

    var norm = 255 / pixels.length;
    for(var i=0; i < pixels.length; i++)
      equalized[i] = (histogram[pixels[i]] * norm + 0.5) | 0;

    return equalized;
  }

}());

(function() {
  /**
   * ViolaJones utility.
   * @static
   * @constructor
   */
  tracking.ViolaJones = {};

  /**
   * Holds the minimum area of intersection that defines when a rectangle is
   * from the same group. Often when a face is matched multiple rectangles are
   * classified as possible rectangles to represent the face, when they
   * intersects they are grouped as one face.
   * @type {number}
   * @default 0.5
   * @static
   */
  tracking.ViolaJones.REGIONS_OVERLAP = 0.5;

  /**
   * Holds the HAAR cascade classifiers converted from OpenCV training.
   * @type {array}
   * @static
   */
  tracking.ViolaJones.classifiers = {};

  /**
   * Detects through the HAAR cascade data rectangles matches.
   * @param {pixels} pixels The pixels in a linear [r,g,b,a,...] array.
   * @param {number} width The image width.
   * @param {number} height The image height.
   * @param {number} initialScale The initial scale to start the block
   *     scaling.
   * @param {number} scaleFactor The scale factor to scale the feature block.
   * @param {number} stepSize The block step size.
   * @param {number} edgesDensity Percentage density edges inside the
   *     classifier block. Value from [0.0, 1.0], defaults to 0.2. If specified
   *     edge detection will be applied to the image to prune dead areas of the
   *     image, this can improve significantly performance.
   * @param {number} data The HAAR cascade data.
   * @return {array} Found rectangles.
   * @static
   */
  tracking.ViolaJones.detect = function(pixels, width, height, initialScale, scaleFactor, stepSize, edgesDensity, data) {
    var total = 0;
    var rects = [];
    var integralImage = new Int32Array(width * height);
    var integralImageSquare = new Int32Array(width * height);
    var tiltedIntegralImage = new Int32Array(width * height);

    var integralImageSobel;
    if (edgesDensity > 0) {
      integralImageSobel = new Int32Array(width * height);
    }

    tracking.Image.computeIntegralImage(pixels, width, height, integralImage, integralImageSquare, tiltedIntegralImage, integralImageSobel);

    var minWidth = data[0];
    var minHeight = data[1];
    var scale = initialScale * scaleFactor;
    var blockWidth = (scale * minWidth) | 0;
    var blockHeight = (scale * minHeight) | 0;

    while (blockWidth < width && blockHeight < height) {
      var step = (scale * stepSize + 0.5) | 0;
      for (var i = 0; i < (height - blockHeight); i += step) {
        for (var j = 0; j < (width - blockWidth); j += step) {

          if (edgesDensity > 0) {
            if (this.isTriviallyExcluded(edgesDensity, integralImageSobel, i, j, width, blockWidth, blockHeight)) {
              continue;
            }
          }

          if (this.evalStages_(data, integralImage, integralImageSquare, tiltedIntegralImage, i, j, width, blockWidth, blockHeight, scale)) {
            rects[total++] = {
              width: blockWidth,
              height: blockHeight,
              x: j,
              y: i
            };
          }
        }
      }

      scale *= scaleFactor;
      blockWidth = (scale * minWidth) | 0;
      blockHeight = (scale * minHeight) | 0;
    }
    return this.mergeRectangles_(rects);
  };

  /**
   * Fast check to test whether the edges density inside the block is greater
   * than a threshold, if true it tests the stages. This can improve
   * significantly performance.
   * @param {number} edgesDensity Percentage density edges inside the
   *     classifier block.
   * @param {array} integralImageSobel The integral image of a sobel image.
   * @param {number} i Vertical position of the pixel to be evaluated.
   * @param {number} j Horizontal position of the pixel to be evaluated.
   * @param {number} width The image width.
   * @return {boolean} True whether the block at position i,j can be skipped,
   *     false otherwise.
   * @static
   * @protected
   */
  tracking.ViolaJones.isTriviallyExcluded = function(edgesDensity, integralImageSobel, i, j, width, blockWidth, blockHeight) {
    var wbA = i * width + j;
    var wbB = wbA + blockWidth;
    var wbD = wbA + blockHeight * width;
    var wbC = wbD + blockWidth;
    var blockEdgesDensity = (integralImageSobel[wbA] - integralImageSobel[wbB] - integralImageSobel[wbD] + integralImageSobel[wbC]) / (blockWidth * blockHeight * 255);
    if (blockEdgesDensity < edgesDensity) {
      return true;
    }
    return false;
  };

  /**
   * Evaluates if the block size on i,j position is a valid HAAR cascade
   * stage.
   * @param {number} data The HAAR cascade data.
   * @param {number} i Vertical position of the pixel to be evaluated.
   * @param {number} j Horizontal position of the pixel to be evaluated.
   * @param {number} width The image width.
   * @param {number} blockSize The block size.
   * @param {number} scale The scale factor of the block size and its original
   *     size.
   * @param {number} inverseArea The inverse area of the block size.
   * @return {boolean} Whether the region passes all the stage tests.
   * @private
   * @static
   */
  tracking.ViolaJones.evalStages_ = function(data, integralImage, integralImageSquare, tiltedIntegralImage, i, j, width, blockWidth, blockHeight, scale) {
    var inverseArea = 1.0 / (blockWidth * blockHeight);
    var wbA = i * width + j;
    var wbB = wbA + blockWidth;
    var wbD = wbA + blockHeight * width;
    var wbC = wbD + blockWidth;
    var mean = (integralImage[wbA] - integralImage[wbB] - integralImage[wbD] + integralImage[wbC]) * inverseArea;
    var variance = (integralImageSquare[wbA] - integralImageSquare[wbB] - integralImageSquare[wbD] + integralImageSquare[wbC]) * inverseArea - mean * mean;

    var standardDeviation = 1;
    if (variance > 0) {
      standardDeviation = Math.sqrt(variance);
    }

    var length = data.length;

    for (var w = 2; w < length; ) {
      var stageSum = 0;
      var stageThreshold = data[w++];
      var nodeLength = data[w++];

      while (nodeLength--) {
        var rectsSum = 0;
        var tilted = data[w++];
        var rectsLength = data[w++];

        for (var r = 0; r < rectsLength; r++) {
          var rectLeft = (j + data[w++] * scale + 0.5) | 0;
          var rectTop = (i + data[w++] * scale + 0.5) | 0;
          var rectWidth = (data[w++] * scale + 0.5) | 0;
          var rectHeight = (data[w++] * scale + 0.5) | 0;
          var rectWeight = data[w++];

          var w1;
          var w2;
          var w3;
          var w4;
          if (tilted) {
            // RectSum(r) = RSAT(x-h+w, y+w+h-1) + RSAT(x, y-1) - RSAT(x-h, y+h-1) - RSAT(x+w, y+w-1)
            w1 = (rectLeft - rectHeight + rectWidth) + (rectTop + rectWidth + rectHeight - 1) * width;
            w2 = rectLeft + (rectTop - 1) * width;
            w3 = (rectLeft - rectHeight) + (rectTop + rectHeight - 1) * width;
            w4 = (rectLeft + rectWidth) + (rectTop + rectWidth - 1) * width;
            rectsSum += (tiltedIntegralImage[w1] + tiltedIntegralImage[w2] - tiltedIntegralImage[w3] - tiltedIntegralImage[w4]) * rectWeight;
          } else {
            // RectSum(r) = SAT(x-1, y-1) + SAT(x+w-1, y+h-1) - SAT(x-1, y+h-1) - SAT(x+w-1, y-1)
            w1 = rectTop * width + rectLeft;
            w2 = w1 + rectWidth;
            w3 = w1 + rectHeight * width;
            w4 = w3 + rectWidth;
            rectsSum += (integralImage[w1] - integralImage[w2] - integralImage[w3] + integralImage[w4]) * rectWeight;
            // TODO: Review the code below to analyze performance when using it instead.
            // w1 = (rectLeft - 1) + (rectTop - 1) * width;
            // w2 = (rectLeft + rectWidth - 1) + (rectTop + rectHeight - 1) * width;
            // w3 = (rectLeft - 1) + (rectTop + rectHeight - 1) * width;
            // w4 = (rectLeft + rectWidth - 1) + (rectTop - 1) * width;
            // rectsSum += (integralImage[w1] + integralImage[w2] - integralImage[w3] - integralImage[w4]) * rectWeight;
          }
        }

        var nodeThreshold = data[w++];
        var nodeLeft = data[w++];
        var nodeRight = data[w++];

        if (rectsSum * inverseArea < nodeThreshold * standardDeviation) {
          stageSum += nodeLeft;
        } else {
          stageSum += nodeRight;
        }
      }

      if (stageSum < stageThreshold) {
        return false;
      }
    }
    return true;
  };

  /**
   * Postprocess the detected sub-windows in order to combine overlapping
   * detections into a single detection.
   * @param {array} rects
   * @return {array}
   * @private
   * @static
   */
  tracking.ViolaJones.mergeRectangles_ = function(rects) {
    var disjointSet = new tracking.DisjointSet(rects.length);

    for (var i = 0; i < rects.length; i++) {
      var r1 = rects[i];
      for (var j = 0; j < rects.length; j++) {
        var r2 = rects[j];
        if (tracking.Math.intersectRect(r1.x, r1.y, r1.x + r1.width, r1.y + r1.height, r2.x, r2.y, r2.x + r2.width, r2.y + r2.height)) {
          var x1 = Math.max(r1.x, r2.x);
          var y1 = Math.max(r1.y, r2.y);
          var x2 = Math.min(r1.x + r1.width, r2.x + r2.width);
          var y2 = Math.min(r1.y + r1.height, r2.y + r2.height);
          var overlap = (x1 - x2) * (y1 - y2);
          var area1 = (r1.width * r1.height);
          var area2 = (r2.width * r2.height);

          if ((overlap / (area1 * (area1 / area2)) >= this.REGIONS_OVERLAP) &&
            (overlap / (area2 * (area1 / area2)) >= this.REGIONS_OVERLAP)) {
            disjointSet.union(i, j);
          }
        }
      }
    }

    var map = {};
    for (var k = 0; k < disjointSet.length; k++) {
      var rep = disjointSet.find(k);
      if (!map[rep]) {
        map[rep] = {
          total: 1,
          width: rects[k].width,
          height: rects[k].height,
          x: rects[k].x,
          y: rects[k].y
        };
        continue;
      }
      map[rep].total++;
      map[rep].width += rects[k].width;
      map[rep].height += rects[k].height;
      map[rep].x += rects[k].x;
      map[rep].y += rects[k].y;
    }

    var result = [];
    Object.keys(map).forEach(function(key) {
      var rect = map[key];
      result.push({
        total: rect.total,
        width: (rect.width / rect.total + 0.5) | 0,
        height: (rect.height / rect.total + 0.5) | 0,
        x: (rect.x / rect.total + 0.5) | 0,
        y: (rect.y / rect.total + 0.5) | 0
      });
    });

    return result;
  };

}());

(function() {
  /**
   * Brief intends for "Binary Robust Independent Elementary Features".This
   * method generates a binary string for each keypoint found by an extractor
   * method.
   * @static
   * @constructor
   */
  tracking.Brief = {};

  /**
   * The set of binary tests is defined by the nd (x,y)-location pairs
   * uniquely chosen during the initialization. Values could vary between N =
   * 128,256,512. N=128 yield good compromises between speed, storage
   * efficiency, and recognition rate.
   * @type {number}
   */
  tracking.Brief.N = 512;

  /**
   * Caches coordinates values of (x,y)-location pairs uniquely chosen during
   * the initialization.
   * @type {Object.<number, Int32Array>}
   * @private
   * @static
   */
  tracking.Brief.randomImageOffsets_ = {};

  /**
   * Caches delta values of (x,y)-location pairs uniquely chosen during
   * the initialization.
   * @type {Int32Array}
   * @private
   * @static
   */
  tracking.Brief.randomWindowOffsets_ = null;

  /**
   * Generates a binary string for each found keypoints extracted using an
   * extractor method.
   * @param {array} The grayscale pixels in a linear [p1,p2,...] array.
   * @param {number} width The image width.
   * @param {array} keypoints
   * @return {Int32Array} Returns an array where for each four sequence int
   *     values represent the descriptor binary string (128 bits) necessary
   *     to describe the corner, e.g. [0,0,0,0, 0,0,0,0, ...].
   * @static
   */
  tracking.Brief.getDescriptors = function(pixels, width, keypoints) {
    // Optimizing divide by 32 operation using binary shift
    // (this.N >> 5) === this.N/32.
    var descriptors = new Int32Array((keypoints.length >> 1) * (this.N >> 5));
    var descriptorWord = 0;
    var offsets = this.getRandomOffsets_(width);
    var position = 0;

    for (var i = 0; i < keypoints.length; i += 2) {
      var w = width * keypoints[i + 1] + keypoints[i];

      var offsetsPosition = 0;
      for (var j = 0, n = this.N; j < n; j++) {
        if (pixels[offsets[offsetsPosition++] + w] < pixels[offsets[offsetsPosition++] + w]) {
          // The bit in the position `j % 32` of descriptorWord should be set to 1. We do
          // this by making an OR operation with a binary number that only has the bit
          // in that position set to 1. That binary number is obtained by shifting 1 left by
          // `j % 32` (which is the same as `j & 31` left) positions.
          descriptorWord |= 1 << (j & 31);
        }

        // If the next j is a multiple of 32, we will need to use a new descriptor word to hold
        // the next results.
        if (!((j + 1) & 31)) {
          descriptors[position++] = descriptorWord;
          descriptorWord = 0;
        }
      }
    }

    return descriptors;
  };

  /**
   * Matches sets of features {mi} and {m′j} extracted from two images taken
   * from similar, and often successive, viewpoints. A classical procedure
   * runs as follows. For each point {mi} in the first image, search in a
   * region of the second image around location {mi} for point {m′j}. The
   * search is based on the similarity of the local image windows, also known
   * as kernel windows, centered on the points, which strongly characterizes
   * the points when the images are sufficiently close. Once each keypoint is
   * described with its binary string, they need to be compared with the
   * closest matching point. Distance metric is critical to the performance of
   * in- trusion detection systems. Thus using binary strings reduces the size
   * of the descriptor and provides an interesting data structure that is fast
   * to operate whose similarity can be measured by the Hamming distance.
   * @param {array} keypoints1
   * @param {array} descriptors1
   * @param {array} keypoints2
   * @param {array} descriptors2
   * @return {Int32Array} Returns an array where the index is the corner1
   *     index coordinate, and the value is the corresponding match index of
   *     corner2, e.g. keypoints1=[x0,y0,x1,y1,...] and
   *     keypoints2=[x'0,y'0,x'1,y'1,...], if x0 matches x'1 and x1 matches x'0,
   *     the return array would be [3,0].
   * @static
   */
  tracking.Brief.match = function(keypoints1, descriptors1, keypoints2, descriptors2) {
    var len1 = keypoints1.length >> 1;
    var len2 = keypoints2.length >> 1;
    var matches = new Array(len1);

    for (var i = 0; i < len1; i++) {
      var min = Infinity;
      var minj = 0;
      for (var j = 0; j < len2; j++) {
        var dist = 0;
        // Optimizing divide by 32 operation using binary shift
        // (this.N >> 5) === this.N/32.
        for (var k = 0, n = this.N >> 5; k < n; k++) {
          dist += tracking.Math.hammingWeight(descriptors1[i * n + k] ^ descriptors2[j * n + k]);
        }
        if (dist < min) {
          min = dist;
          minj = j;
        }
      }
      matches[i] = {
        index1: i,
        index2: minj,
        keypoint1: [keypoints1[2 * i], keypoints1[2 * i + 1]],
        keypoint2: [keypoints2[2 * minj], keypoints2[2 * minj + 1]],
        confidence: 1 - min / this.N
      };
    }

    return matches;
  };

  /**
   * Removes matches outliers by testing matches on both directions.
   * @param {array} keypoints1
   * @param {array} descriptors1
   * @param {array} keypoints2
   * @param {array} descriptors2
   * @return {Int32Array} Returns an array where the index is the corner1
   *     index coordinate, and the value is the corresponding match index of
   *     corner2, e.g. keypoints1=[x0,y0,x1,y1,...] and
   *     keypoints2=[x'0,y'0,x'1,y'1,...], if x0 matches x'1 and x1 matches x'0,
   *     the return array would be [3,0].
   * @static
   */
  tracking.Brief.reciprocalMatch = function(keypoints1, descriptors1, keypoints2, descriptors2) {
    var matches = [];
    if (keypoints1.length === 0 || keypoints2.length === 0) {
      return matches;
    }

    var matches1 = tracking.Brief.match(keypoints1, descriptors1, keypoints2, descriptors2);
    var matches2 = tracking.Brief.match(keypoints2, descriptors2, keypoints1, descriptors1);
    for (var i = 0; i < matches1.length; i++) {
      if (matches2[matches1[i].index2].index2 === i) {
        matches.push(matches1[i]);
      }
    }
    return matches;
  };

  /**
   * Gets the coordinates values of (x,y)-location pairs uniquely chosen
   * during the initialization.
   * @return {array} Array with the random offset values.
   * @private
   */
  tracking.Brief.getRandomOffsets_ = function(width) {
    if (!this.randomWindowOffsets_) {
      var windowPosition = 0;
      var windowOffsets = new Int32Array(4 * this.N);
      for (var i = 0; i < this.N; i++) {
        windowOffsets[windowPosition++] = Math.round(tracking.Math.uniformRandom(-15, 16));
        windowOffsets[windowPosition++] = Math.round(tracking.Math.uniformRandom(-15, 16));
        windowOffsets[windowPosition++] = Math.round(tracking.Math.uniformRandom(-15, 16));
        windowOffsets[windowPosition++] = Math.round(tracking.Math.uniformRandom(-15, 16));
      }
      this.randomWindowOffsets_ = windowOffsets;
    }

    if (!this.randomImageOffsets_[width]) {
      var imagePosition = 0;
      var imageOffsets = new Int32Array(2 * this.N);
      for (var j = 0; j < this.N; j++) {
        imageOffsets[imagePosition++] = this.randomWindowOffsets_[4 * j] * width + this.randomWindowOffsets_[4 * j + 1];
        imageOffsets[imagePosition++] = this.randomWindowOffsets_[4 * j + 2] * width + this.randomWindowOffsets_[4 * j + 3];
      }
      this.randomImageOffsets_[width] = imageOffsets;
    }

    return this.randomImageOffsets_[width];
  };
}());

(function() {
  /**
   * FAST intends for "Features from Accelerated Segment Test". This method
   * performs a point segment test corner detection. The segment test
   * criterion operates by considering a circle of sixteen pixels around the
   * corner candidate p. The detector classifies p as a corner if there exists
   * a set of n contiguous pixelsin the circle which are all brighter than the
   * intensity of the candidate pixel Ip plus a threshold t, or all darker
   * than Ip − t.
   *
   *       15 00 01
   *    14          02
   * 13                03
   * 12       []       04
   * 11                05
   *    10          06
   *       09 08 07
   *
   * For more reference:
   * http://citeseerx.ist.psu.edu/viewdoc/download?doi=10.1.1.60.3991&rep=rep1&type=pdf
   * @static
   * @constructor
   */
  tracking.Fast = {};

  /**
   * Holds the threshold to determine whether the tested pixel is brighter or
   * darker than the corner candidate p.
   * @type {number}
   * @default 40
   * @static
   */
  tracking.Fast.THRESHOLD = 40;

  /**
   * Caches coordinates values of the circle surrounding the pixel candidate p.
   * @type {Object.<number, Int32Array>}
   * @private
   * @static
   */
  tracking.Fast.circles_ = {};

  /**
   * Finds corners coordinates on the graysacaled image.
   * @param {array} The grayscale pixels in a linear [p1,p2,...] array.
   * @param {number} width The image width.
   * @param {number} height The image height.
   * @param {number} threshold to determine whether the tested pixel is brighter or
   *     darker than the corner candidate p. Default value is 40.
   * @return {array} Array containing the coordinates of all found corners,
   *     e.g. [x0,y0,x1,y1,...], where P(x0,y0) represents a corner coordinate.
   * @static
   */
  tracking.Fast.findCorners = function(pixels, width, height, opt_threshold) {
    var circleOffsets = this.getCircleOffsets_(width);
    var circlePixels = new Int32Array(16);
    var corners = [];

    if (opt_threshold === undefined) {
      opt_threshold = this.THRESHOLD;
    }

    // When looping through the image pixels, skips the first three lines from
    // the image boundaries to constrain the surrounding circle inside the image
    // area.
    for (var i = 3; i < height - 3; i++) {
      for (var j = 3; j < width - 3; j++) {
        var w = i * width + j;
        var p = pixels[w];

        // Loops the circle offsets to read the pixel value for the sixteen
        // surrounding pixels.
        for (var k = 0; k < 16; k++) {
          circlePixels[k] = pixels[w + circleOffsets[k]];
        }

        if (this.isCorner(p, circlePixels, opt_threshold)) {
          // The pixel p is classified as a corner, as optimization increment j
          // by the circle radius 3 to skip the neighbor pixels inside the
          // surrounding circle. This can be removed without compromising the
          // result.
          corners.push(j, i);
          j += 3;
        }
      }
    }

    return corners;
  };

  /**
   * Checks if the circle pixel is brighter than the candidate pixel p by
   * a threshold.
   * @param {number} circlePixel The circle pixel value.
   * @param {number} p The value of the candidate pixel p.
   * @param {number} threshold
   * @return {Boolean}
   * @static
   */
  tracking.Fast.isBrighter = function(circlePixel, p, threshold) {
    return circlePixel - p > threshold;
  };

  /**
   * Checks if the circle pixel is within the corner of the candidate pixel p
   * by a threshold.
   * @param {number} p The value of the candidate pixel p.
   * @param {number} circlePixel The circle pixel value.
   * @param {number} threshold
   * @return {Boolean}
   * @static
   */
  tracking.Fast.isCorner = function(p, circlePixels, threshold) {
    if (this.isTriviallyExcluded(circlePixels, p, threshold)) {
      return false;
    }

    for (var x = 0; x < 16; x++) {
      var darker = true;
      var brighter = true;

      for (var y = 0; y < 9; y++) {
        var circlePixel = circlePixels[(x + y) & 15];

        if (!this.isBrighter(p, circlePixel, threshold)) {
          brighter = false;
          if (darker === false) {
            break;
          }
        }

        if (!this.isDarker(p, circlePixel, threshold)) {
          darker = false;
          if (brighter === false) {
            break;
          }
        }
      }

      if (brighter || darker) {
        return true;
      }
    }

    return false;
  };

  /**
   * Checks if the circle pixel is darker than the candidate pixel p by
   * a threshold.
   * @param {number} circlePixel The circle pixel value.
   * @param {number} p The value of the candidate pixel p.
   * @param {number} threshold
   * @return {Boolean}
   * @static
   */
  tracking.Fast.isDarker = function(circlePixel, p, threshold) {
    return p - circlePixel > threshold;
  };

  /**
   * Fast check to test if the candidate pixel is a trivially excluded value.
   * In order to be a corner, the candidate pixel value should be darker or
   * brighter than 9-12 surrounding pixels, when at least three of the top,
   * bottom, left and right pixels are brighter or darker it can be
   * automatically excluded improving the performance.
   * @param {number} circlePixel The circle pixel value.
   * @param {number} p The value of the candidate pixel p.
   * @param {number} threshold
   * @return {Boolean}
   * @static
   * @protected
   */
  tracking.Fast.isTriviallyExcluded = function(circlePixels, p, threshold) {
    var count = 0;
    var circleBottom = circlePixels[8];
    var circleLeft = circlePixels[12];
    var circleRight = circlePixels[4];
    var circleTop = circlePixels[0];

    if (this.isBrighter(circleTop, p, threshold)) {
      count++;
    }
    if (this.isBrighter(circleRight, p, threshold)) {
      count++;
    }
    if (this.isBrighter(circleBottom, p, threshold)) {
      count++;
    }
    if (this.isBrighter(circleLeft, p, threshold)) {
      count++;
    }

    if (count < 3) {
      count = 0;
      if (this.isDarker(circleTop, p, threshold)) {
        count++;
      }
      if (this.isDarker(circleRight, p, threshold)) {
        count++;
      }
      if (this.isDarker(circleBottom, p, threshold)) {
        count++;
      }
      if (this.isDarker(circleLeft, p, threshold)) {
        count++;
      }
      if (count < 3) {
        return true;
      }
    }

    return false;
  };

  /**
   * Gets the sixteen offset values of the circle surrounding pixel.
   * @param {number} width The image width.
   * @return {array} Array with the sixteen offset values of the circle
   *     surrounding pixel.
   * @private
   */
  tracking.Fast.getCircleOffsets_ = function(width) {
    if (this.circles_[width]) {
      return this.circles_[width];
    }

    var circle = new Int32Array(16);

    circle[0] = -width - width - width;
    circle[1] = circle[0] + 1;
    circle[2] = circle[1] + width + 1;
    circle[3] = circle[2] + width + 1;
    circle[4] = circle[3] + width;
    circle[5] = circle[4] + width;
    circle[6] = circle[5] + width - 1;
    circle[7] = circle[6] + width - 1;
    circle[8] = circle[7] - 1;
    circle[9] = circle[8] - 1;
    circle[10] = circle[9] - width - 1;
    circle[11] = circle[10] - width - 1;
    circle[12] = circle[11] - width;
    circle[13] = circle[12] - width;
    circle[14] = circle[13] - width + 1;
    circle[15] = circle[14] - width + 1;

    this.circles_[width] = circle;
    return circle;
  };
}());

(function() {
  /**
   * Math utility.
   * @static
   * @constructor
   */
  tracking.Math = {};

  /**
   * Euclidean distance between two points P(x0, y0) and P(x1, y1).
   * @param {number} x0 Horizontal coordinate of P0.
   * @param {number} y0 Vertical coordinate of P0.
   * @param {number} x1 Horizontal coordinate of P1.
   * @param {number} y1 Vertical coordinate of P1.
   * @return {number} The euclidean distance.
   */
  tracking.Math.distance = function(x0, y0, x1, y1) {
    var dx = x1 - x0;
    var dy = y1 - y0;

    return Math.sqrt(dx * dx + dy * dy);
  };

  /**
   * Calculates the Hamming weight of a string, which is the number of symbols that are
   * different from the zero-symbol of the alphabet used. It is thus
   * equivalent to the Hamming distance from the all-zero string of the same
   * length. For the most typical case, a string of bits, this is the number
   * of 1's in the string.
   *
   * Example:
   *
   * <pre>
   *  Binary string     Hamming weight
   *   11101                 4
   *   11101010              5
   * </pre>
   *
   * @param {number} i Number that holds the binary string to extract the hamming weight.
   * @return {number} The hamming weight.
   */
  tracking.Math.hammingWeight = function(i) {
    i = i - ((i >> 1) & 0x55555555);
    i = (i & 0x33333333) + ((i >> 2) & 0x33333333);

    return ((i + (i >> 4) & 0xF0F0F0F) * 0x1010101) >> 24;
  };

  /**
   * Generates a random number between [a, b] interval.
   * @param {number} a
   * @param {number} b
   * @return {number}
   */
  tracking.Math.uniformRandom = function(a, b) {
    return a + Math.random() * (b - a);
  };

  /**
   * Tests if a rectangle intersects with another.
   *
   *  <pre>
   *  x0y0 --------       x2y2 --------
   *      |       |           |       |
   *      -------- x1y1       -------- x3y3
   * </pre>
   *
   * @param {number} x0 Horizontal coordinate of P0.
   * @param {number} y0 Vertical coordinate of P0.
   * @param {number} x1 Horizontal coordinate of P1.
   * @param {number} y1 Vertical coordinate of P1.
   * @param {number} x2 Horizontal coordinate of P2.
   * @param {number} y2 Vertical coordinate of P2.
   * @param {number} x3 Horizontal coordinate of P3.
   * @param {number} y3 Vertical coordinate of P3.
   * @return {boolean}
   */
  tracking.Math.intersectRect = function(x0, y0, x1, y1, x2, y2, x3, y3) {
    return !(x2 > x1 || x3 < x0 || y2 > y1 || y3 < y0);
  };

}());

(function() {
  /**
   * Matrix utility.
   * @static
   * @constructor
   */
  tracking.Matrix = {};

  /**
   * Loops the array organized as major-row order and executes `fn` callback
   * for each iteration. The `fn` callback receives the following parameters:
   * `(r,g,b,a,index,i,j)`, where `r,g,b,a` represents the pixel color with
   * alpha channel, `index` represents the position in the major-row order
   * array and `i,j` the respective indexes positions in two dimensions.
   * @param {array} pixels The pixels in a linear [r,g,b,a,...] array to loop
   *     through.
   * @param {number} width The image width.
   * @param {number} height The image height.
   * @param {function} fn The callback function for each pixel.
   * @param {number} opt_jump Optional jump for the iteration, by default it
   *     is 1, hence loops all the pixels of the array.
   * @static
   */
  tracking.Matrix.forEach = function(pixels, width, height, fn, opt_jump) {
    opt_jump = opt_jump || 1;
    for (var i = 0; i < height; i += opt_jump) {
      for (var j = 0; j < width; j += opt_jump) {
        var w = i * width * 4 + j * 4;
        fn.call(this, pixels[w], pixels[w + 1], pixels[w + 2], pixels[w + 3], w, i, j);
      }
    }
  };

  /**
   * Calculates the per-element subtraction of two NxM matrices and returns a 
   * new NxM matrix as the result.
   * @param {matrix} a The first matrix.
   * @param {matrix} a The second matrix.
   * @static
   */
  tracking.Matrix.sub = function(a, b){
    var res = tracking.Matrix.clone(a);
    for(var i=0; i < res.length; i++){
      for(var j=0; j < res[i].length; j++){
        res[i][j] -= b[i][j]; 
      }
    }
    return res;
  }

  /**
   * Calculates the per-element sum of two NxM matrices and returns a new NxM
   * NxM matrix as the result.
   * @param {matrix} a The first matrix.
   * @param {matrix} a The second matrix.
   * @static
   */
  tracking.Matrix.add = function(a, b){
    var res = tracking.Matrix.clone(a);
    for(var i=0; i < res.length; i++){
      for(var j=0; j < res[i].length; j++){
        res[i][j] += b[i][j]; 
      }
    }
    return res;
  }

  /**
   * Clones a matrix (or part of it) and returns a new matrix as the result.
   * @param {matrix} src The matrix to be cloned.
   * @param {number} width The second matrix.
   * @static
   */
  tracking.Matrix.clone = function(src, width, height){
    width = width || src[0].length;
    height = height || src.length;
    var temp = new Array(height);
    var i = height;
    while(i--){
      temp[i] = new Array(width);
      var j = width;
      while(j--) temp[i][j] = src[i][j];
    } 
    return temp;
  }

  /**
   * Multiply a matrix by a scalar and returns a new matrix as the result.
   * @param {number} scalar The scalar to multiply the matrix by.
   * @param {matrix} src The matrix to be multiplied.
   * @static
   */
  tracking.Matrix.mulScalar = function(scalar, src){
    var res = tracking.Matrix.clone(src);
    for(var i=0; i < src.length; i++){
      for(var j=0; j < src[i].length; j++){
        res[i][j] *= scalar;
      }
    }
    return res;
  }

  /**
   * Transpose a matrix and returns a new matrix as the result.
   * @param {matrix} src The matrix to be transposed.
   * @static
   */
  tracking.Matrix.transpose = function(src){
    var transpose = new Array(src[0].length);
    for(var i=0; i < src[0].length; i++){
      transpose[i] = new Array(src.length);
      for(var j=0; j < src.length; j++){
        transpose[i][j] = src[j][i];
      }
    }
    return transpose;
  }

  /**
   * Multiply an MxN matrix with an NxP matrix and returns a new MxP matrix
   * as the result.
   * @param {matrix} a The first matrix.
   * @param {matrix} b The second matrix.
   * @static
   */
  tracking.Matrix.mul = function(a, b) {
    var res = new Array(a.length);
    for (var i = 0; i < a.length; i++) {
      res[i] = new Array(b[0].length);
      for (var j = 0; j < b[0].length; j++) {
        res[i][j] = 0;            
        for (var k = 0; k < a[0].length; k++) {
          res[i][j] += a[i][k] * b[k][j];
        }
      }
    }
    return res;
  }

  /**
   * Calculates the absolute norm of a matrix.
   * @param {matrix} src The matrix which norm will be calculated.
   * @static
   */
  tracking.Matrix.norm = function(src){
    var res = 0;
    for(var i=0; i < src.length; i++){
      for(var j=0; j < src[i].length; j++){
        res += src[i][j]*src[i][j];
      }
    }
    return Math.sqrt(res);
  }

  /**
   * Calculates and returns the covariance matrix of a set of vectors as well
   * as the mean of the matrix.
   * @param {matrix} src The matrix which covariance matrix will be calculated.
   * @static
   */
  tracking.Matrix.calcCovarMatrix = function(src){

    var mean = new Array(src.length);
    for(var i=0; i < src.length; i++){
      mean[i] = [0.0];
      for(var j=0; j < src[i].length; j++){
        mean[i][0] += src[i][j]/src[i].length;
      }
    }

    var deltaFull = tracking.Matrix.clone(mean);
    for(var i=0; i < deltaFull.length; i++){
      for(var j=0; j < src[0].length - 1; j++){
        deltaFull[i].push(deltaFull[i][0]);
      }
    }

    var a = tracking.Matrix.sub(src, deltaFull);
    var b = tracking.Matrix.transpose(a);
    var covar = tracking.Matrix.mul(b,a); 
    return [covar, mean];

  }

}());
(function() {
  /**
   * EPnp utility.
   * @static
   * @constructor
   */
  tracking.EPnP = {};

  tracking.EPnP.solve = function(objectPoints, imagePoints, cameraMatrix) {};
}());

(function() {
  /**
   * Tracker utility.
   * @constructor
   * @extends {tracking.EventEmitter}
   */
  tracking.Tracker = function() {
    tracking.Tracker.base(this, 'constructor');
  };

  tracking.inherits(tracking.Tracker, tracking.EventEmitter);

  /**
   * Tracks the pixels on the array. This method is called for each video
   * frame in order to emit `track` event.
   * @param {Uint8ClampedArray} pixels The pixels data to track.
   * @param {number} width The pixels canvas width.
   * @param {number} height The pixels canvas height.
   */
  tracking.Tracker.prototype.track = function() {};
}());

(function() {
  /**
   * TrackerTask utility.
   * @constructor
   * @extends {tracking.EventEmitter}
   */
  tracking.TrackerTask = function(tracker) {
    tracking.TrackerTask.base(this, 'constructor');

    if (!tracker) {
      throw new Error('Tracker instance not specified.');
    }

    this.setTracker(tracker);
  };

  tracking.inherits(tracking.TrackerTask, tracking.EventEmitter);

  /**
   * Holds the tracker instance managed by this task.
   * @type {tracking.Tracker}
   * @private
   */
  tracking.TrackerTask.prototype.tracker_ = null;

  /**
   * Holds if the tracker task is in running.
   * @type {boolean}
   * @private
   */
  tracking.TrackerTask.prototype.running_ = false;

  /**
   * Gets the tracker instance managed by this task.
   * @return {tracking.Tracker}
   */
  tracking.TrackerTask.prototype.getTracker = function() {
    return this.tracker_;
  };

  /**
   * Returns true if the tracker task is in running, false otherwise.
   * @return {boolean}
   * @private
   */
  tracking.TrackerTask.prototype.inRunning = function() {
    return this.running_;
  };

  /**
   * Sets if the tracker task is in running.
   * @param {boolean} running
   * @private
   */
  tracking.TrackerTask.prototype.setRunning = function(running) {
    this.running_ = running;
  };

  /**
   * Sets the tracker instance managed by this task.
   * @return {tracking.Tracker}
   */
  tracking.TrackerTask.prototype.setTracker = function(tracker) {
    this.tracker_ = tracker;
  };

  /**
   * Emits a `run` event on the tracker task for the implementers to run any
   * child action, e.g. `requestAnimationFrame`.
   * @return {object} Returns itself, so calls can be chained.
   */
  tracking.TrackerTask.prototype.run = function() {
    var self = this;

    if (this.inRunning()) {
      return;
    }

    this.setRunning(true);
    this.reemitTrackEvent_ = function(event) {
      self.emit('track', event);
    };
    this.tracker_.on('track', this.reemitTrackEvent_);
    this.emit('run');
    return this;
  };

  /**
   * Emits a `stop` event on the tracker task for the implementers to stop any
   * child action being done, e.g. `requestAnimationFrame`.
   * @return {object} Returns itself, so calls can be chained.
   */
  tracking.TrackerTask.prototype.stop = function() {
    if (!this.inRunning()) {
      return;
    }

    this.setRunning(false);
    this.emit('stop');
    this.tracker_.removeListener('track', this.reemitTrackEvent_);
    return this;
  };
}());

(function() {
  /**
   * ColorTracker utility to track colored blobs in a frame using color
   * difference evaluation.
   * @constructor
   * @param {string|Array.<string>} opt_colors Optional colors to track.
   * @extends {tracking.Tracker}
   */
  tracking.ColorTracker = function(opt_colors) {
    tracking.ColorTracker.base(this, 'constructor');

    if (typeof opt_colors === 'string') {
      opt_colors = [opt_colors];
    }

    if (opt_colors) {
      opt_colors.forEach(function(color) {
        if (!tracking.ColorTracker.getColor(color)) {
          throw new Error('Color not valid, try `new tracking.ColorTracker("magenta")`.');
        }
      });
      this.setColors(opt_colors);
    }
  };

  tracking.inherits(tracking.ColorTracker, tracking.Tracker);

  /**
   * Holds the known colors.
   * @type {Object.<string, function>}
   * @private
   * @static
   */
  tracking.ColorTracker.knownColors_ = {};

  /**
   * Caches coordinates values of the neighbours surrounding a pixel.
   * @type {Object.<number, Int32Array>}
   * @private
   * @static
   */
  tracking.ColorTracker.neighbours_ = {};

  /**
   * Registers a color as known color.
   * @param {string} name The color name.
   * @param {function} fn The color function to test if the passed (r,g,b) is
   *     the desired color.
   * @static
   */
  tracking.ColorTracker.registerColor = function(name, fn) {
    tracking.ColorTracker.knownColors_[name] = fn;
  };

  /**
   * Gets the known color function that is able to test whether an (r,g,b) is
   * the desired color.
   * @param {string} name The color name.
   * @return {function} The known color test function.
   * @static
   */
  tracking.ColorTracker.getColor = function(name) {
    return tracking.ColorTracker.knownColors_[name];
  };

  /**
   * Holds the colors to be tracked by the `ColorTracker` instance.
   * @default ['magenta']
   * @type {Array.<string>}
   */
  tracking.ColorTracker.prototype.colors = ['magenta'];

  /**
   * Holds the minimum dimension to classify a rectangle.
   * @default 20
   * @type {number}
   */
  tracking.ColorTracker.prototype.minDimension = 20;

  /**
   * Holds the maximum dimension to classify a rectangle.
   * @default Infinity
   * @type {number}
   */
  tracking.ColorTracker.prototype.maxDimension = Infinity;


  /**
   * Holds the minimum group size to be classified as a rectangle.
   * @default 30
   * @type {number}
   */
  tracking.ColorTracker.prototype.minGroupSize = 30;

  /**
   * Calculates the central coordinate from the cloud points. The cloud points
   * are all points that matches the desired color.
   * @param {Array.<number>} cloud Major row order array containing all the
   *     points from the desired color, e.g. [x1, y1, c2, y2, ...].
   * @param {number} total Total numbers of pixels of the desired color.
   * @return {object} Object containing the x, y and estimated z coordinate of
   *     the blog extracted from the cloud points.
   * @private
   */
  tracking.ColorTracker.prototype.calculateDimensions_ = function(cloud, total) {
    var maxx = -1;
    var maxy = -1;
    var minx = Infinity;
    var miny = Infinity;

    for (var c = 0; c < total; c += 2) {
      var x = cloud[c];
      var y = cloud[c + 1];

      if (x < minx) {
        minx = x;
      }
      if (x > maxx) {
        maxx = x;
      }
      if (y < miny) {
        miny = y;
      }
      if (y > maxy) {
        maxy = y;
      }
    }

    return {
      width: maxx - minx,
      height: maxy - miny,
      x: minx,
      y: miny
    };
  };

  /**
   * Gets the colors being tracked by the `ColorTracker` instance.
   * @return {Array.<string>}
   */
  tracking.ColorTracker.prototype.getColors = function() {
    return this.colors;
  };

  /**
   * Gets the minimum dimension to classify a rectangle.
   * @return {number}
   */
  tracking.ColorTracker.prototype.getMinDimension = function() {
    return this.minDimension;
  };

  /**
   * Gets the maximum dimension to classify a rectangle.
   * @return {number}
   */
  tracking.ColorTracker.prototype.getMaxDimension = function() {
    return this.maxDimension;
  };

  /**
   * Gets the minimum group size to be classified as a rectangle.
   * @return {number}
   */
  tracking.ColorTracker.prototype.getMinGroupSize = function() {
    return this.minGroupSize;
  };

  /**
   * Gets the eight offset values of the neighbours surrounding a pixel.
   * @param {number} width The image width.
   * @return {array} Array with the eight offset values of the neighbours
   *     surrounding a pixel.
   * @private
   */
  tracking.ColorTracker.prototype.getNeighboursForWidth_ = function(width) {
    if (tracking.ColorTracker.neighbours_[width]) {
      return tracking.ColorTracker.neighbours_[width];
    }

    var neighbours = new Int32Array(8);

    neighbours[0] = -width * 4;
    neighbours[1] = -width * 4 + 4;
    neighbours[2] = 4;
    neighbours[3] = width * 4 + 4;
    neighbours[4] = width * 4;
    neighbours[5] = width * 4 - 4;
    neighbours[6] = -4;
    neighbours[7] = -width * 4 - 4;

    tracking.ColorTracker.neighbours_[width] = neighbours;

    return neighbours;
  };

  /**
   * Unites groups whose bounding box intersect with each other.
   * @param {Array.<Object>} rects
   * @private
   */
  tracking.ColorTracker.prototype.mergeRectangles_ = function(rects) {
    var intersects;
    var results = [];
    var minDimension = this.getMinDimension();
    var maxDimension = this.getMaxDimension();

    for (var r = 0; r < rects.length; r++) {
      var r1 = rects[r];
      intersects = true;
      for (var s = r + 1; s < rects.length; s++) {
        var r2 = rects[s];
        if (tracking.Math.intersectRect(r1.x, r1.y, r1.x + r1.width, r1.y + r1.height, r2.x, r2.y, r2.x + r2.width, r2.y + r2.height)) {
          intersects = false;
          var x1 = Math.min(r1.x, r2.x);
          var y1 = Math.min(r1.y, r2.y);
          var x2 = Math.max(r1.x + r1.width, r2.x + r2.width);
          var y2 = Math.max(r1.y + r1.height, r2.y + r2.height);
          r2.height = y2 - y1;
          r2.width = x2 - x1;
          r2.x = x1;
          r2.y = y1;
          break;
        }
      }

      if (intersects) {
        if (r1.width >= minDimension && r1.height >= minDimension) {
          if (r1.width <= maxDimension && r1.height <= maxDimension) {
            results.push(r1);
          }
        }
      }
    }

    return results;
  };

  /**
   * Sets the colors to be tracked by the `ColorTracker` instance.
   * @param {Array.<string>} colors
   */
  tracking.ColorTracker.prototype.setColors = function(colors) {
    this.colors = colors;
  };

  /**
   * Sets the minimum dimension to classify a rectangle.
   * @param {number} minDimension
   */
  tracking.ColorTracker.prototype.setMinDimension = function(minDimension) {
    this.minDimension = minDimension;
  };

  /**
   * Sets the maximum dimension to classify a rectangle.
   * @param {number} maxDimension
   */
  tracking.ColorTracker.prototype.setMaxDimension = function(maxDimension) {
    this.maxDimension = maxDimension;
  };

  /**
   * Sets the minimum group size to be classified as a rectangle.
   * @param {number} minGroupSize
   */
  tracking.ColorTracker.prototype.setMinGroupSize = function(minGroupSize) {
    this.minGroupSize = minGroupSize;
  };

  /**
   * Tracks the `Video` frames. This method is called for each video frame in
   * order to emit `track` event.
   * @param {Uint8ClampedArray} pixels The pixels data to track.
   * @param {number} width The pixels canvas width.
   * @param {number} height The pixels canvas height.
   */
  tracking.ColorTracker.prototype.track = function(pixels, width, height) {
    var self = this;
    var colors = this.getColors();

    if (!colors) {
      throw new Error('Colors not specified, try `new tracking.ColorTracker("magenta")`.');
    }

    var results = [];

    colors.forEach(function(color) {
      results = results.concat(self.trackColor_(pixels, width, height, color));
    });

    this.emit('track', {
      data: results
    });
  };

  /**
   * Find the given color in the given matrix of pixels using Flood fill
   * algorithm to determines the area connected to a given node in a
   * multi-dimensional array.
   * @param {Uint8ClampedArray} pixels The pixels data to track.
   * @param {number} width The pixels canvas width.
   * @param {number} height The pixels canvas height.
   * @param {string} color The color to be found
   * @private
   */
  tracking.ColorTracker.prototype.trackColor_ = function(pixels, width, height, color) {
    var colorFn = tracking.ColorTracker.knownColors_[color];
    var currGroup = new Int32Array(pixels.length >> 2);
    var currGroupSize;
    var currI;
    var currJ;
    var currW;
    var marked = new Int8Array(pixels.length);
    var minGroupSize = this.getMinGroupSize();
    var neighboursW = this.getNeighboursForWidth_(width);
    var queue = new Int32Array(pixels.length);
    var queuePosition;
    var results = [];
    var w = -4;

    if (!colorFn) {
      return results;
    }

    for (var i = 0; i < height; i++) {
      for (var j = 0; j < width; j++) {
        w += 4;

        if (marked[w]) {
          continue;
        }

        currGroupSize = 0;

        queuePosition = -1;
        queue[++queuePosition] = w;
        queue[++queuePosition] = i;
        queue[++queuePosition] = j;

        marked[w] = 1;

        while (queuePosition >= 0) {
          currJ = queue[queuePosition--];
          currI = queue[queuePosition--];
          currW = queue[queuePosition--];

          if (colorFn(pixels[currW], pixels[currW + 1], pixels[currW + 2], pixels[currW + 3], currW, currI, currJ)) {
            currGroup[currGroupSize++] = currJ;
            currGroup[currGroupSize++] = currI;

            for (var k = 0; k < neighboursW.length; k++) {
              var otherW = currW + neighboursW[k];
              var otherI = currI + neighboursI[k];
              var otherJ = currJ + neighboursJ[k];
              if (!marked[otherW] && otherI >= 0 && otherI < height && otherJ >= 0 && otherJ < width) {
                queue[++queuePosition] = otherW;
                queue[++queuePosition] = otherI;
                queue[++queuePosition] = otherJ;

                marked[otherW] = 1;
              }
            }
          }
        }

        if (currGroupSize >= minGroupSize) {
          var data = this.calculateDimensions_(currGroup, currGroupSize);
          if (data) {
            data.color = color;
            results.push(data);
          }
        }
      }
    }

    return this.mergeRectangles_(results);
  };

  // Default colors
  //===================

  tracking.ColorTracker.registerColor('cyan', function(r, g, b) {
    var thresholdGreen = 50,
      thresholdBlue = 70,
      dx = r - 0,
      dy = g - 255,
      dz = b - 255;

    if ((g - r) >= thresholdGreen && (b - r) >= thresholdBlue) {
      return true;
    }
    return dx * dx + dy * dy + dz * dz < 6400;
  });

  tracking.ColorTracker.registerColor('magenta', function(r, g, b) {
    var threshold = 50,
      dx = r - 255,
      dy = g - 0,
      dz = b - 255;

    if ((r - g) >= threshold && (b - g) >= threshold) {
      return true;
    }
    return dx * dx + dy * dy + dz * dz < 19600;
  });

  tracking.ColorTracker.registerColor('yellow', function(r, g, b) {
    var threshold = 50,
      dx = r - 255,
      dy = g - 255,
      dz = b - 0;

    if ((r - b) >= threshold && (g - b) >= threshold) {
      return true;
    }
    return dx * dx + dy * dy + dz * dz < 10000;
  });


  // Caching neighbour i/j offset values.
  //=====================================
  var neighboursI = new Int32Array([-1, -1, 0, 1, 1, 1, 0, -1]);
  var neighboursJ = new Int32Array([0, 1, 1, 1, 0, -1, -1, -1]);
}());

(function() {
  /**
   * ObjectTracker utility.
   * @constructor
   * @param {string|Array.<string|Array.<number>>} opt_classifiers Optional
   *     object classifiers to track.
   * @extends {tracking.Tracker}
   */
  tracking.ObjectTracker = function(opt_classifiers) {
    tracking.ObjectTracker.base(this, 'constructor');

    if (opt_classifiers) {
      if (!Array.isArray(opt_classifiers)) {
        opt_classifiers = [opt_classifiers];
      }

      if (Array.isArray(opt_classifiers)) {
        opt_classifiers.forEach(function(classifier, i) {
          if (typeof classifier === 'string') {
            opt_classifiers[i] = tracking.ViolaJones.classifiers[classifier];
          }
          if (!opt_classifiers[i]) {
            throw new Error('Object classifier not valid, try `new tracking.ObjectTracker("face")`.');
          }
        });
      }
    }

    this.setClassifiers(opt_classifiers);
  };

  tracking.inherits(tracking.ObjectTracker, tracking.Tracker);

  /**
   * Specifies the edges density of a block in order to decide whether to skip
   * it or not.
   * @default 0.2
   * @type {number}
   */
  tracking.ObjectTracker.prototype.edgesDensity = 0.2;

  /**
   * Specifies the initial scale to start the feature block scaling.
   * @default 1.0
   * @type {number}
   */
  tracking.ObjectTracker.prototype.initialScale = 1.0;

  /**
   * Specifies the scale factor to scale the feature block.
   * @default 1.25
   * @type {number}
   */
  tracking.ObjectTracker.prototype.scaleFactor = 1.25;

  /**
   * Specifies the block step size.
   * @default 1.5
   * @type {number}
   */
  tracking.ObjectTracker.prototype.stepSize = 1.5;

  /**
   * Gets the tracker HAAR classifiers.
   * @return {TypedArray.<number>}
   */
  tracking.ObjectTracker.prototype.getClassifiers = function() {
    return this.classifiers;
  };

  /**
   * Gets the edges density value.
   * @return {number}
   */
  tracking.ObjectTracker.prototype.getEdgesDensity = function() {
    return this.edgesDensity;
  };

  /**
   * Gets the initial scale to start the feature block scaling.
   * @return {number}
   */
  tracking.ObjectTracker.prototype.getInitialScale = function() {
    return this.initialScale;
  };

  /**
   * Gets the scale factor to scale the feature block.
   * @return {number}
   */
  tracking.ObjectTracker.prototype.getScaleFactor = function() {
    return this.scaleFactor;
  };

  /**
   * Gets the block step size.
   * @return {number}
   */
  tracking.ObjectTracker.prototype.getStepSize = function() {
    return this.stepSize;
  };

  /**
   * Tracks the `Video` frames. This method is called for each video frame in
   * order to emit `track` event.
   * @param {Uint8ClampedArray} pixels The pixels data to track.
   * @param {number} width The pixels canvas width.
   * @param {number} height The pixels canvas height.
   */
  tracking.ObjectTracker.prototype.track = function(pixels, width, height) {
    var self = this;
    var classifiers = this.getClassifiers();

    if (!classifiers) {
      throw new Error('Object classifier not specified, try `new tracking.ObjectTracker("face")`.');
    }

    var results = [];
    var tmpRes;

    var i = 1;
    var typeOfArea;
    classifiers.forEach(function(classifier) {
      if(classifier[3]==6)
        typeOfArea = "eye";
      else if(classifier[3]==13)
        typeOfArea = "mouth";
      else if(classifier[3]==3)
        typeOfArea = "face";
      tmpRes = tracking.ViolaJones.detect(pixels, width, height, self.getInitialScale(), self.getScaleFactor(), self.getStepSize(), self.getEdgesDensity(), classifier);
      tmpRes.forEach(function(tmpResData){
        tmpResData.typeOfArea = typeOfArea;
      });
      results = results.concat(tmpRes);
    });

    this.emit('track', {
      data: results
    });
  };

  /**
   * Sets the tracker HAAR classifiers.
   * @param {TypedArray.<number>} classifiers
   */
  tracking.ObjectTracker.prototype.setClassifiers = function(classifiers) {
    this.classifiers = classifiers;
  };

  /**
   * Sets the edges density.
   * @param {number} edgesDensity
   */
  tracking.ObjectTracker.prototype.setEdgesDensity = function(edgesDensity) {
    this.edgesDensity = edgesDensity;
  };

  /**
   * Sets the initial scale to start the block scaling.
   * @param {number} initialScale
   */
  tracking.ObjectTracker.prototype.setInitialScale = function(initialScale) {
    this.initialScale = initialScale;
  };

  /**
   * Sets the scale factor to scale the feature block.
   * @param {number} scaleFactor
   */
  tracking.ObjectTracker.prototype.setScaleFactor = function(scaleFactor) {
    this.scaleFactor = scaleFactor;
  };

  /**
   * Sets the block step size.
   * @param {number} stepSize
   */
  tracking.ObjectTracker.prototype.setStepSize = function(stepSize) {
    this.stepSize = stepSize;
  };

}());

(function() {


  tracking.LandmarksTracker = function() {
    tracking.LandmarksTracker.base(this, 'constructor');
  }

  tracking.inherits(tracking.LandmarksTracker, tracking.ObjectTracker);

  tracking.LandmarksTracker.prototype.track = function(pixels, width, height) {
	 
    var image = {
      'data': pixels,
      'width': width,
      'height': height
    };

    var classifier = tracking.ViolaJones.classifiers['face'];

    var faces = tracking.ViolaJones.detect(pixels, width, height, 
      this.getInitialScale(), this.getScaleFactor(), this.getStepSize(), 
      this.getEdgesDensity(), classifier);

    var landmarks = tracking.LBF.align(pixels, width, height, faces);

    this.emit('track', {
      'data': {
        'faces' : faces,
        'landmarks' : landmarks
      }
    });

  }

}());

(function() {

  tracking.LBF = {};

  /**
   * LBF Regressor utility.
   * @constructor
   */
  tracking.LBF.Regressor = function(maxNumStages){
    this.maxNumStages = maxNumStages;

    this.rfs = new Array(maxNumStages);
    this.models = new Array(maxNumStages);
    for(var i=0; i < maxNumStages; i++){
      this.rfs[i] = new tracking.LBF.RandomForest(i);
      this.models[i] = tracking.LBF.RegressorData[i].models;
    }

    this.meanShape = tracking.LBF.LandmarksData;
  }

  /**
   * Predicts the position of the landmarks based on the bounding box of the face.
   * @param {pixels} pixels The grayscale pixels in a linear array.
   * @param {number} width Width of the image.
   * @param {number} height Height of the image.
   * @param {object} boudingBox Bounding box of the face to be aligned.
   * @return {matrix} A matrix with each landmark position in a row [x,y].
   */
  tracking.LBF.Regressor.prototype.predict = function(pixels, width, height, boundingBox) {

    var images = [];
    var currentShapes = [];
    var boundingBoxes = [];

    var meanShapeClone = tracking.Matrix.clone(this.meanShape);

    images.push({
      'data': pixels,
      'width': width,
      'height': height
    });
    boundingBoxes.push(boundingBox);

    currentShapes.push(tracking.LBF.projectShapeToBoundingBox_(meanShapeClone, boundingBox));

    for(var stage = 0; stage < this.maxNumStages; stage++){
      var binaryFeatures = tracking.LBF.Regressor.deriveBinaryFeat(this.rfs[stage], images, currentShapes, boundingBoxes, meanShapeClone);
      this.applyGlobalPrediction(binaryFeatures, this.models[stage], currentShapes, boundingBoxes);
    }

    return currentShapes[0];
  };

  /**
   * Multiplies the binary features of the landmarks with the regression matrix
   * to obtain the displacement for each landmark. Then applies this displacement
   * into the landmarks shape.
   * @param {object} binaryFeatures The binary features for the landmarks.
   * @param {object} models The regressor models.
   * @param {matrix} currentShapes The landmarks shapes.
   * @param {array} boudingBoxes The bounding boxes of the faces.
   */
  tracking.LBF.Regressor.prototype.applyGlobalPrediction = function(binaryFeatures, models, currentShapes, 
    boundingBoxes){

    var residual = currentShapes[0].length * 2;

    var rotation = [];
    var deltashape = new Array(residual/2);
    for(var i=0; i < residual/2; i++){
      deltashape[i] = [0.0, 0.0];
    }

    for(var i=0; i < currentShapes.length; i++){
      for(var j=0; j < residual; j++){
        var tmp = 0;
        for(var lx=0, idx=0; (idx = binaryFeatures[i][lx].index) != -1; lx++){
          if(idx <= models[j].nr_feature){
            tmp += models[j].data[(idx - 1)] * binaryFeatures[i][lx].value;
          }
        }
        if(j < residual/2){
          deltashape[j][0] = tmp;
        }else{
          deltashape[j - residual/2][1] = tmp;
        }
      }

      var res = tracking.LBF.similarityTransform_(tracking.LBF.unprojectShapeToBoundingBox_(currentShapes[i], boundingBoxes[i]), this.meanShape);
      var rotation = tracking.Matrix.transpose(res[0]);

      var s = tracking.LBF.unprojectShapeToBoundingBox_(currentShapes[i], boundingBoxes[i]);
      s = tracking.Matrix.add(s, deltashape);

      currentShapes[i] = tracking.LBF.projectShapeToBoundingBox_(s, boundingBoxes[i]);

    }
  };

  /**
   * Derives the binary features from the image for each landmark. 
   * @param {object} forest The random forest to search for the best binary feature match.
   * @param {array} images The images with pixels in a grayscale linear array.
   * @param {array} currentShapes The current landmarks shape.
   * @param {array} boudingBoxes The bounding boxes of the faces.
   * @param {matrix} meanShape The mean shape of the current landmarks set.
   * @return {array} The binary features extracted from the image and matched with the
   *     training data.
   * @static
   */
  tracking.LBF.Regressor.deriveBinaryFeat = function(forest, images, currentShapes, boundingBoxes, meanShape){

    var binaryFeatures = new Array(images.length);
    for(var i=0; i < images.length; i++){
      var t = forest.maxNumTrees * forest.landmarkNum + 1;
      binaryFeatures[i] = new Array(t);
      for(var j=0; j < t; j++){
        binaryFeatures[i][j] = {};
      }
    }

    var leafnodesPerTree = 1 << (forest.maxDepth - 1);

    for(var i=0; i < images.length; i++){

      var projectedShape = tracking.LBF.unprojectShapeToBoundingBox_(currentShapes[i], boundingBoxes[i]);
      var transform = tracking.LBF.similarityTransform_(projectedShape, meanShape);
      
      for(var j=0; j < forest.landmarkNum; j++){
        for(var k=0; k < forest.maxNumTrees; k++){

          var binaryCode = tracking.LBF.Regressor.getCodeFromTree(forest.rfs[j][k], images[i], 
                              currentShapes[i], boundingBoxes[i], transform[0], transform[1]);

          var index = j*forest.maxNumTrees + k;
          binaryFeatures[i][index].index = leafnodesPerTree * index + binaryCode;
          binaryFeatures[i][index].value = 1;

        }
      }
      binaryFeatures[i][forest.landmarkNum * forest.maxNumTrees].index = -1;
      binaryFeatures[i][forest.landmarkNum * forest.maxNumTrees].value = -1;
    }
    return binaryFeatures;

  }

  /**
   * Gets the binary code for a specific tree in a random forest. For each landmark,
   * the position from two pre-defined points are recovered from the training data
   * and then the intensity of the pixels corresponding to these points is extracted 
   * from the image and used to traverse the trees in the random forest. At the end,
   * the ending nodes will be represented by 1, and the remaining nodes by 0.
   * 
   * +--------------------------- Random Forest -----------------------------+ 
   * | Ø = Ending leaf                                                       |
   * |                                                                       |
   * |       O             O             O             O             O       |
   * |     /   \         /   \         /   \         /   \         /   \     |
   * |    O     O       O     O       O     O       O     O       O     O    |
   * |   / \   / \     / \   / \     / \   / \     / \   / \     / \   / \   |
   * |  Ø   O O   O   O   O Ø   O   O   Ø O   O   O   O Ø   O   O   O O   Ø  |
   * |  1   0 0   0   0   0 1   0   0   1 0   0   0   0 1   0   0   0 0   1  |
   * +-----------------------------------------------------------------------+
   * Final binary code for this landmark: 10000010010000100001
   *
   * @param {object} forest The tree to be analyzed.
   * @param {array} image The image with pixels in a grayscale linear array.
   * @param {matrix} shape The current landmarks shape.
   * @param {object} boudingBoxes The bounding box of the face.
   * @param {matrix} rotation The rotation matrix used to transform the projected landmarks
   *     into the mean shape.
   * @param {number} scale The scale factor used to transform the projected landmarks
   *     into the mean shape.
   * @return {number} The binary code extracted from the tree.
   * @static
   */
  tracking.LBF.Regressor.getCodeFromTree = function(tree, image, shape, boundingBox, rotation, scale){
    var current = 0;
    var bincode = 0;

    while(true){
      
      var x1 = Math.cos(tree.nodes[current].feats[0]) * tree.nodes[current].feats[2] * tree.maxRadioRadius * boundingBox.width;
      var y1 = Math.sin(tree.nodes[current].feats[0]) * tree.nodes[current].feats[2] * tree.maxRadioRadius * boundingBox.height;
      var x2 = Math.cos(tree.nodes[current].feats[1]) * tree.nodes[current].feats[3] * tree.maxRadioRadius * boundingBox.width;
      var y2 = Math.sin(tree.nodes[current].feats[1]) * tree.nodes[current].feats[3] * tree.maxRadioRadius * boundingBox.height;

      var project_x1 = rotation[0][0] * x1 + rotation[0][1] * y1;
      var project_y1 = rotation[1][0] * x1 + rotation[1][1] * y1;

      var real_x1 = Math.floor(project_x1 + shape[tree.landmarkID][0]);
      var real_y1 = Math.floor(project_y1 + shape[tree.landmarkID][1]);
      real_x1 = Math.max(0.0, Math.min(real_x1, image.height - 1.0));
      real_y1 = Math.max(0.0, Math.min(real_y1, image.width - 1.0));

      var project_x2 = rotation[0][0] * x2 + rotation[0][1] * y2;
      var project_y2 = rotation[1][0] * x2 + rotation[1][1] * y2;

      var real_x2 = Math.floor(project_x2 + shape[tree.landmarkID][0]);
      var real_y2 = Math.floor(project_y2 + shape[tree.landmarkID][1]);
      real_x2 = Math.max(0.0, Math.min(real_x2, image.height - 1.0));
      real_y2 = Math.max(0.0, Math.min(real_y2, image.width - 1.0));
      var pdf = Math.floor(image.data[real_y1*image.width + real_x1]) - 
          Math.floor(image.data[real_y2 * image.width +real_x2]);

      if(pdf < tree.nodes[current].thresh){
        current = tree.nodes[current].cnodes[0];
      }else{
        current = tree.nodes[current].cnodes[1];
      }

      if (tree.nodes[current].is_leafnode == 1) {
        bincode = 1;
        for (var i=0; i < tree.leafnodes.length; i++) {
          if (tree.leafnodes[i] == current) {
            return bincode;
          }
          bincode++;
        }
        return bincode;
      }

    }

    return bincode;
  }

}());
(function() {
  /**
   * Face Alignment via Regressing Local Binary Features (LBF)
   * This approach has two components: a set of local binary features and
   * a locality principle for learning those features.
   * The locality principle is used to guide the learning of a set of highly
   * discriminative local binary features for each landmark independently.
   * The obtained local binary features are used to learn a linear regression
   * that later will be used to guide the landmarks in the alignment phase.
   * 
   * @authors: VoxarLabs Team (http://cin.ufpe.br/~voxarlabs)
   *           Lucas Figueiredo <lsf@cin.ufpe.br>, Thiago Menezes <tmc2@cin.ufpe.br>,
   *           Thiago Domingues <tald@cin.ufpe.br>, Rafael Roberto <rar3@cin.ufpe.br>,
   *           Thulio Araujo <tlsa@cin.ufpe.br>, Joao Victor <jvfl@cin.ufpe.br>,
   *           Tomer Simis <tls@cin.ufpe.br>)
   */
  
  /**
   * Holds the maximum number of stages that will be used in the alignment algorithm.
   * Each stage contains a different set of random forests and retrieves the binary
   * code from a more "specialized" (i.e. smaller) region around the landmarks.
   * @type {number}
   * @static
   */
  tracking.LBF.maxNumStages = 4;

  /**
   * Holds the regressor that will be responsible for extracting the local features from 
   * the image and guide the landmarks using the training data.
   * @type {object}
   * @protected
   * @static
   */
  tracking.LBF.regressor_ = null; 
  
  /**
   * Generates a set of landmarks for a set of faces
   * @param {pixels} pixels The pixels in a linear [r,g,b,a,...] array.
   * @param {number} width The image width.
   * @param {number} height The image height.
   * @param {array} faces The list of faces detected in the image
   * @return {array} The aligned landmarks, each set of landmarks corresponding
   *     to a specific face.
   * @static
   */
  tracking.LBF.align = function(pixels, width, height, faces){

    if(tracking.LBF.regressor_ == null){
      tracking.LBF.regressor_ = new tracking.LBF.Regressor(
        tracking.LBF.maxNumStages
      );
    }

    pixels = tracking.Image.grayscale(pixels, width, height, false);

    pixels = tracking.Image.equalizeHist(pixels, width, height);

    var shapes = new Array(faces.length);

    for(var i in faces){

      faces[i].height = faces[i].width;

      var boundingBox = {};
      boundingBox.startX = faces[i].x;
      boundingBox.startY = faces[i].y;
      boundingBox.width = faces[i].width;
      boundingBox.height = faces[i].height;

      shapes[i] = tracking.LBF.regressor_.predict(pixels, width, height, boundingBox);
    }

    return shapes;
  }

  /**
   * Unprojects the landmarks shape from the bounding box.
   * @param {matrix} shape The landmarks shape.
   * @param {matrix} boudingBox The bounding box.
   * @return {matrix} The landmarks shape projected into the bounding box.
   * @static
   * @protected
   */
  tracking.LBF.unprojectShapeToBoundingBox_ = function(shape, boundingBox){
    var temp = new Array(shape.length);
    for(var i=0; i < shape.length; i++){
      temp[i] = [
        (shape[i][0] - boundingBox.startX) / boundingBox.width,
        (shape[i][1] - boundingBox.startY) / boundingBox.height
      ];
    }
    return temp;
  }

  /**
   * Projects the landmarks shape into the bounding box. The landmarks shape has
   * normalized coordinates, so it is necessary to map these coordinates into
   * the bounding box coordinates.
   * @param {matrix} shape The landmarks shape.
   * @param {matrix} boudingBox The bounding box.
   * @return {matrix} The landmarks shape.
   * @static
   * @protected
   */
  tracking.LBF.projectShapeToBoundingBox_ = function(shape, boundingBox){
    var temp = new Array(shape.length);
    for(var i=0; i < shape.length; i++){
      temp[i] = [
        shape[i][0] * boundingBox.width + boundingBox.startX,
        shape[i][1] * boundingBox.height + boundingBox.startY
      ];
    }
    return temp;
  }

  /**
   * Calculates the rotation and scale necessary to transform shape1 into shape2.
   * @param {matrix} shape1 The shape to be transformed.
   * @param {matrix} shape2 The shape to be transformed in.
   * @return {[matrix, scalar]} The rotation matrix and scale that applied to shape1
   *     results in shape2.
   * @static
   * @protected
   */
  tracking.LBF.similarityTransform_ = function(shape1, shape2){

    var center1 = [0,0];
    var center2 = [0,0];
    for (var i = 0; i < shape1.length; i++) {
      center1[0] += shape1[i][0];
      center1[1] += shape1[i][1];
      center2[0] += shape2[i][0];
      center2[1] += shape2[i][1];
    }
    center1[0] /= shape1.length;
    center1[1] /= shape1.length;
    center2[0] /= shape2.length;
    center2[1] /= shape2.length;

    var temp1 = tracking.Matrix.clone(shape1);
    var temp2 = tracking.Matrix.clone(shape2);
    for(var i=0; i < shape1.length; i++){
      temp1[i][0] -= center1[0];
      temp1[i][1] -= center1[1];
      temp2[i][0] -= center2[0];
      temp2[i][1] -= center2[1];
    }

    var covariance1, covariance2;
    var mean1, mean2;

    var t = tracking.Matrix.calcCovarMatrix(temp1);
    covariance1 = t[0];
    mean1 = t[1];

    t = tracking.Matrix.calcCovarMatrix(temp2);
    covariance2 = t[0];
    mean2 = t[1];

    var s1 = Math.sqrt(tracking.Matrix.norm(covariance1));
    var s2 = Math.sqrt(tracking.Matrix.norm(covariance2));

    var scale = s1/s2;
    temp1 = tracking.Matrix.mulScalar(1.0/s1, temp1);
    temp2 = tracking.Matrix.mulScalar(1.0/s2, temp2);

    var num = 0, den = 0;
    for (var i = 0; i < shape1.length; i++) {
      num = num + temp1[i][1] * temp2[i][0] - temp1[i][0] * temp2[i][1];
      den = den + temp1[i][0] * temp2[i][0] + temp1[i][1] * temp2[i][1];
    }

    var norm = Math.sqrt(num*num + den*den);
    var sin_theta = num/norm;
    var cos_theta = den/norm;
    var rotation = [
      [cos_theta, -sin_theta],
      [sin_theta, cos_theta]
    ];

    return [rotation, scale];
  }

  /**
   * LBF Random Forest data structure.
   * @static
   * @constructor
   */
  tracking.LBF.RandomForest = function(forestIndex){
    this.maxNumTrees = tracking.LBF.RegressorData[forestIndex].max_numtrees;
    this.landmarkNum = tracking.LBF.RegressorData[forestIndex].num_landmark;
    this.maxDepth = tracking.LBF.RegressorData[forestIndex].max_depth;
    this.stages = tracking.LBF.RegressorData[forestIndex].stages; 

    this.rfs = new Array(this.landmarkNum);
    for(var i=0; i < this.landmarkNum; i++){
      this.rfs[i] = new Array(this.maxNumTrees);
      for(var j=0; j < this.maxNumTrees; j++){
        this.rfs[i][j] = new tracking.LBF.Tree(forestIndex, i, j);
      }
    }
  }

  /**
   * LBF Tree data structure.
   * @static
   * @constructor
   */
  tracking.LBF.Tree = function(forestIndex, landmarkIndex, treeIndex){
    var data = tracking.LBF.RegressorData[forestIndex].landmarks[landmarkIndex][treeIndex];
    this.maxDepth = data.max_depth;
    this.maxNumNodes = data.max_numnodes;
    this.nodes = data.nodes;
    this.landmarkID = data.landmark_id;
    this.numLeafnodes = data.num_leafnodes;
    this.numNodes = data.num_nodes;
    this.maxNumFeats = data.max_numfeats;
    this.maxRadioRadius = data.max_radio_radius;
    this.leafnodes = data.id_leafnodes;
  }

    tracking.ViolaJones.classifiers.face = new Float64Array([20,20,0.822689414024353,3,0,2,3,7,14,4,-1,3,9,14,2,2,0.004014195874333382,0.0337941907346249,0.8378106951713562,0,2,1,2,18,4,-1,7,2,6,4,3,0.0151513395830989,0.1514132022857666,0.7488812208175659,0,2,1,7,15,9,-1,1,10,15,3,3,0.004210993181914091,0.0900492817163467,0.6374819874763489,6.956608772277832,16,0,2,5,6,2,6,-1,5,9,2,3,2,0.0016227109590545297,0.0693085864186287,0.7110946178436279,0,2,7,5,6,3,-1,9,5,2,3,3,0.002290664939209819,0.1795803010463715,0.6668692231178284,0,2,4,0,12,9,-1,4,3,12,3,3,0.005002570804208517,0.1693672984838486,0.6554006934165955,0,2,6,9,10,8,-1,6,13,10,4,2,0.007965989410877228,0.5866332054138184,0.0914145186543465,0,2,3,6,14,8,-1,3,10,14,4,2,-0.003522701095789671,0.1413166970014572,0.6031895875930786,0,2,14,1,6,10,-1,14,1,3,10,2,0.0366676896810532,0.3675672113895416,0.7920318245887756,0,2,7,8,5,12,-1,7,12,5,4,3,0.009336147457361221,0.6161385774612427,0.2088509947061539,0,2,1,1,18,3,-1,7,1,6,3,3,0.008696131408214569,0.2836230993270874,0.6360273957252502,0,2,1,8,17,2,-1,1,9,17,1,2,0.0011488880263641477,0.2223580926656723,0.5800700783729553,0,2,16,6,4,2,-1,16,7,4,1,2,-0.002148468978703022,0.2406464070081711,0.5787054896354675,0,2,5,17,2,2,-1,5,18,2,1,2,0.002121906029060483,0.5559654831886292,0.136223703622818,0,2,14,2,6,12,-1,14,2,3,12,2,-0.0939491465687752,0.8502737283706665,0.4717740118503571,0,3,4,0,4,12,-1,4,0,2,6,2,6,6,2,6,2,0.0013777789426967502,0.5993673801422119,0.2834529876708984,0,2,2,11,18,8,-1,8,11,6,8,3,0.0730631574988365,0.4341886043548584,0.7060034275054932,0,2,5,7,10,2,-1,5,8,10,1,2,0.00036767389974556863,0.3027887940406799,0.6051574945449829,0,2,15,11,5,3,-1,15,12,5,1,3,-0.0060479710809886456,0.17984339594841,0.5675256848335266,9.498542785644531,21,0,2,5,3,10,9,-1,5,6,10,3,3,-0.0165106896311045,0.6644225120544434,0.1424857974052429,0,2,9,4,2,14,-1,9,11,2,7,2,0.002705249935388565,0.6325352191925049,0.1288477033376694,0,2,3,5,4,12,-1,3,9,4,4,3,0.002806986914947629,0.1240288019180298,0.6193193197250366,0,2,4,5,12,5,-1,8,5,4,5,3,-0.0015402400167658925,0.1432143002748489,0.5670015811920166,0,2,5,6,10,8,-1,5,10,10,4,2,-0.0005638627917505801,0.1657433062791824,0.5905207991600037,0,2,8,0,6,9,-1,8,3,6,3,3,0.0019253729842603207,0.2695507109165192,0.5738824009895325,0,2,9,12,1,8,-1,9,16,1,4,2,-0.005021484103053808,0.1893538981676102,0.5782774090766907,0,2,0,7,20,6,-1,0,9,20,2,3,0.0026365420781075954,0.2309329062700272,0.5695425868034363,0,2,7,0,6,17,-1,9,0,2,17,3,-0.0015127769438549876,0.2759602069854736,0.5956642031669617,0,2,9,0,6,4,-1,11,0,2,4,3,-0.0101574398577213,0.1732538044452667,0.5522047281265259,0,2,5,1,6,4,-1,7,1,2,4,3,-0.011953660286963,0.1339409947395325,0.5559014081954956,0,2,12,1,6,16,-1,14,1,2,16,3,0.004885949194431305,0.3628703951835632,0.6188849210739136,0,3,0,5,18,8,-1,0,5,9,4,2,9,9,9,4,2,-0.0801329165697098,0.0912110507488251,0.5475944876670837,0,3,8,15,10,4,-1,13,15,5,2,2,8,17,5,2,2,0.0010643280111253262,0.3715142905712128,0.5711399912834167,0,3,3,1,4,8,-1,3,1,2,4,2,5,5,2,4,2,-0.0013419450260698795,0.5953313708305359,0.331809788942337,0,3,3,6,14,10,-1,10,6,7,5,2,3,11,7,5,2,-0.0546011403203011,0.1844065934419632,0.5602846145629883,0,2,2,1,6,16,-1,4,1,2,16,3,0.0029071690514683723,0.3594244122505188,0.6131715178489685,0,2,0,18,20,2,-1,0,19,20,1,2,0.0007471871795132756,0.5994353294372559,0.3459562957286835,0,2,8,13,4,3,-1,8,14,4,1,3,0.004301380831748247,0.4172652065753937,0.6990845203399658,0,2,9,14,2,3,-1,9,15,2,1,3,0.004501757211983204,0.4509715139865875,0.7801457047462463,0,2,0,12,9,6,-1,0,14,9,2,3,0.0241385009139776,0.5438212752342224,0.1319826990365982,18.4129695892334,39,0,2,5,7,3,4,-1,5,9,3,2,2,0.001921223010867834,0.1415266990661621,0.6199870705604553,0,2,9,3,2,16,-1,9,11,2,8,2,-0.00012748669541906565,0.6191074252128601,0.1884928941726685,0,2,3,6,13,8,-1,3,10,13,4,2,0.0005140993162058294,0.1487396955490112,0.5857927799224854,0,2,12,3,8,2,-1,12,3,4,2,2,0.004187860991805792,0.2746909856796265,0.6359239816665649,0,2,8,8,4,12,-1,8,12,4,4,3,0.005101571790874004,0.5870851278305054,0.2175628989934921,0,3,11,3,8,6,-1,15,3,4,3,2,11,6,4,3,2,-0.002144844038411975,0.5880944728851318,0.2979590892791748,0,2,7,1,6,19,-1,9,1,2,19,3,-0.0028977119363844395,0.2373327016830444,0.5876647233963013,0,2,9,0,6,4,-1,11,0,2,4,3,-0.0216106791049242,0.1220654994249344,0.5194202065467834,0,2,3,1,9,3,-1,6,1,3,3,3,-0.004629931878298521,0.263123095035553,0.5817409157752991,0,3,8,15,10,4,-1,13,15,5,2,2,8,17,5,2,2,0.000593937118537724,0.363862007856369,0.5698544979095459,0,2,0,3,6,10,-1,3,3,3,10,2,0.0538786612451077,0.4303531050682068,0.7559366226196289,0,2,3,4,15,15,-1,3,9,15,5,3,0.0018887349870055914,0.2122603058815002,0.561342716217041,0,2,6,5,8,6,-1,6,7,8,2,3,-0.0023635339457541704,0.563184916973114,0.2642767131328583,0,3,4,4,12,10,-1,10,4,6,5,2,4,9,6,5,2,0.0240177996456623,0.5797107815742493,0.2751705944538117,0,2,6,4,4,4,-1,8,4,2,4,2,0.00020543030404951423,0.2705242037773132,0.575256884098053,0,2,15,11,1,2,-1,15,12,1,1,2,0.0008479019743390381,0.5435624718666077,0.2334876954555512,0,2,3,11,2,2,-1,3,12,2,1,2,0.0014091329649090767,0.5319424867630005,0.2063155025243759,0,2,16,11,1,3,-1,16,12,1,1,3,0.0014642629539594054,0.5418980717658997,0.3068861067295075,0,3,3,15,6,4,-1,3,15,3,2,2,6,17,3,2,2,0.0016352549428120255,0.3695372939109802,0.6112868189811707,0,2,6,7,8,2,-1,6,8,8,1,2,0.0008317275205627084,0.3565036952495575,0.6025236248970032,0,2,3,11,1,3,-1,3,12,1,1,3,-0.0020998890977352858,0.1913982033729553,0.5362827181816101,0,2,6,0,12,2,-1,6,1,12,1,2,-0.0007421398186124861,0.3835555016994476,0.552931010723114,0,2,9,14,2,3,-1,9,15,2,1,3,0.0032655049581080675,0.4312896132469177,0.7101895809173584,0,2,7,15,6,2,-1,7,16,6,1,2,0.0008913499186746776,0.3984830975532532,0.6391963958740234,0,2,0,5,4,6,-1,0,7,4,2,3,-0.0152841797098517,0.2366732954978943,0.5433713793754578,0,2,4,12,12,2,-1,8,12,4,2,3,0.004838141147047281,0.5817500948905945,0.3239189088344574,0,2,6,3,1,9,-1,6,6,1,3,3,-0.0009109317907132208,0.5540593862533569,0.2911868989467621,0,2,10,17,3,2,-1,11,17,1,2,3,-0.006127506028860807,0.1775255054235458,0.5196629166603088,0,2,9,9,2,2,-1,9,10,2,1,2,-0.00044576259097084403,0.3024170100688934,0.5533593893051147,0,2,7,6,6,4,-1,9,6,2,4,3,0.0226465407758951,0.4414930939674377,0.6975377202033997,0,2,7,17,3,2,-1,8,17,1,2,3,-0.0018804960418492556,0.2791394889354706,0.5497952103614807,0,2,10,17,3,3,-1,11,17,1,3,3,0.007088910788297653,0.5263199210166931,0.2385547012090683,0,2,8,12,3,2,-1,8,13,3,1,2,0.0017318050377070904,0.4319379031658173,0.6983600854873657,0,2,9,3,6,2,-1,11,3,2,2,3,-0.006848270073533058,0.3082042932510376,0.5390920042991638,0,2,3,11,14,4,-1,3,13,14,2,2,-0.000015062530110299122,0.552192211151123,0.3120366036891937,0,3,1,10,18,4,-1,10,10,9,2,2,1,12,9,2,2,0.0294755697250366,0.5401322841644287,0.1770603060722351,0,2,0,10,3,3,-1,0,11,3,1,3,0.008138732984662056,0.5178617835044861,0.121101900935173,0,2,9,1,6,6,-1,11,1,2,6,3,0.0209429506212473,0.5290294289588928,0.3311221897602081,0,2,8,7,3,6,-1,9,7,1,6,3,-0.009566552937030792,0.7471994161605835,0.4451968967914581,15.324139595031738,33,0,2,1,0,18,9,-1,1,3,18,3,3,-0.00028206960996612906,0.2064086049795151,0.6076732277870178,0,2,12,10,2,6,-1,12,13,2,3,2,0.00167906004935503,0.5851997137069702,0.1255383938550949,0,2,0,5,19,8,-1,0,9,19,4,2,0.0006982791237533092,0.094018429517746,0.5728961229324341,0,2,7,0,6,9,-1,9,0,2,9,3,0.0007895901217125356,0.1781987994909287,0.5694308876991272,0,2,5,3,6,1,-1,7,3,2,1,3,-0.002856049919500947,0.1638399064540863,0.5788664817810059,0,2,11,3,6,1,-1,13,3,2,1,3,-0.0038122469559311867,0.2085440009832382,0.5508564710617065,0,2,5,10,4,6,-1,5,13,4,3,2,0.0015896620461717248,0.5702760815620422,0.1857215017080307,0,2,11,3,6,1,-1,13,3,2,1,3,0.0100783398374915,0.5116943120956421,0.2189770042896271,0,2,4,4,12,6,-1,4,6,12,2,3,-0.0635263025760651,0.7131379842758179,0.4043813049793243,0,2,15,12,2,6,-1,15,14,2,2,3,-0.009103149175643921,0.2567181885242462,0.54639732837677,0,2,9,3,2,2,-1,10,3,1,2,2,-0.002403500024229288,0.1700665950775147,0.559097409248352,0,2,9,3,3,1,-1,10,3,1,1,3,0.001522636041045189,0.5410556793212891,0.2619054019451141,0,2,1,1,4,14,-1,3,1,2,14,2,0.0179974399507046,0.3732436895370483,0.6535220742225647,0,3,9,0,4,4,-1,11,0,2,2,2,9,2,2,2,2,-0.00645381910726428,0.2626481950283051,0.5537446141242981,0,2,7,5,1,14,-1,7,12,1,7,2,-0.0118807600811124,0.2003753930330277,0.5544745922088623,0,2,19,0,1,4,-1,19,2,1,2,2,0.0012713660253211856,0.5591902732849121,0.303197592496872,0,2,5,5,6,4,-1,8,5,3,4,2,0.0011376109905540943,0.2730407118797302,0.5646508932113647,0,2,9,18,3,2,-1,10,18,1,2,3,-0.00426519988104701,0.1405909061431885,0.5461820960044861,0,2,8,18,3,2,-1,9,18,1,2,3,-0.0029602861031889915,0.1795035004615784,0.5459290146827698,0,2,4,5,12,6,-1,4,7,12,2,3,-0.008844822645187378,0.5736783146858215,0.280921995639801,0,2,3,12,2,6,-1,3,14,2,2,3,-0.006643068976700306,0.2370675951242447,0.5503826141357422,0,2,10,8,2,12,-1,10,12,2,4,3,0.003999780863523483,0.5608199834823608,0.3304282128810883,0,2,7,18,3,2,-1,8,18,1,2,3,-0.004122172016650438,0.1640105992555618,0.5378993153572083,0,2,9,0,6,2,-1,11,0,2,2,3,0.0156249096617103,0.5227649211883545,0.2288603931665421,0,2,5,11,9,3,-1,5,12,9,1,3,-0.0103564197197557,0.7016193866729736,0.4252927899360657,0,2,9,0,6,2,-1,11,0,2,2,3,-0.008796080946922302,0.2767347097396851,0.5355830192565918,0,2,1,1,18,5,-1,7,1,6,5,3,0.1622693985700607,0.434224009513855,0.744257926940918,0,3,8,0,4,4,-1,10,0,2,2,2,8,2,2,2,2,0.0045542530715465546,0.5726485848426819,0.2582125067710877,0,2,3,12,1,3,-1,3,13,1,1,3,-0.002130920998752117,0.2106848061084747,0.5361018776893616,0,2,8,14,5,3,-1,8,15,5,1,3,-0.0132084200158715,0.7593790888786316,0.4552468061447144,0,3,5,4,10,12,-1,5,4,5,6,2,10,10,5,6,2,-0.0659966766834259,0.125247597694397,0.5344039797782898,0,2,9,6,9,12,-1,9,10,9,4,3,0.007914265617728233,0.3315384089946747,0.5601043105125427,0,3,2,2,12,14,-1,2,2,6,7,2,8,9,6,7,2,0.0208942797034979,0.5506049990653992,0.2768838107585907,21.010639190673828,44,0,2,4,7,12,2,-1,8,7,4,2,3,0.0011961159761995077,0.1762690991163254,0.6156241297721863,0,2,7,4,6,4,-1,7,6,6,2,2,-0.0018679830245673656,0.6118106842041016,0.1832399964332581,0,2,4,5,11,8,-1,4,9,11,4,2,-0.00019579799845814705,0.0990442633628845,0.5723816156387329,0,2,3,10,16,4,-1,3,12,16,2,2,-0.0008025565766729414,0.5579879879951477,0.2377282977104187,0,2,0,0,16,2,-1,0,1,16,1,2,-0.0024510810617357492,0.2231457978487015,0.5858935117721558,0,2,7,5,6,2,-1,9,5,2,2,3,0.0005036185029894114,0.2653993964195252,0.5794103741645813,0,3,3,2,6,10,-1,3,2,3,5,2,6,7,3,5,2,0.0040293349884450436,0.5803827047348022,0.2484865039587021,0,2,10,5,8,15,-1,10,10,8,5,3,-0.0144517095759511,0.1830351948738098,0.5484204888343811,0,3,3,14,8,6,-1,3,14,4,3,2,7,17,4,3,2,0.0020380979403853416,0.3363558948040009,0.6051092743873596,0,2,14,2,2,2,-1,14,3,2,1,2,-0.0016155190533027053,0.2286642044782639,0.5441246032714844,0,2,1,10,7,6,-1,1,13,7,3,2,0.0033458340913057327,0.5625913143157959,0.2392338067293167,0,2,15,4,4,3,-1,15,4,2,3,2,0.0016379579901695251,0.3906993865966797,0.5964621901512146,0,3,2,9,14,6,-1,2,9,7,3,2,9,12,7,3,2,0.0302512105554342,0.524848222732544,0.1575746983289719,0,2,5,7,10,4,-1,5,9,10,2,2,0.037251990288496,0.4194310903549194,0.6748418807983398,0,3,6,9,8,8,-1,6,9,4,4,2,10,13,4,4,2,-0.0251097902655602,0.1882549971342087,0.5473451018333435,0,2,14,1,3,2,-1,14,2,3,1,2,-0.005309905856847763,0.133997306227684,0.5227110981941223,0,2,1,4,4,2,-1,3,4,2,2,2,0.0012086479691788554,0.3762088119983673,0.6109635829925537,0,2,11,10,2,8,-1,11,14,2,4,2,-0.0219076797366142,0.266314297914505,0.5404006838798523,0,2,0,0,5,3,-1,0,1,5,1,3,0.0054116579703986645,0.5363578796386719,0.2232273072004318,0,3,2,5,18,8,-1,11,5,9,4,2,2,9,9,4,2,0.069946326315403,0.5358232855796814,0.2453698068857193,0,2,6,6,1,6,-1,6,9,1,3,2,0.00034520021290518343,0.2409671992063522,0.5376930236816406,0,2,19,1,1,3,-1,19,2,1,1,3,0.0012627709656953812,0.5425856709480286,0.3155693113803864,0,2,7,6,6,6,-1,9,6,2,6,3,0.0227195098996162,0.4158405959606171,0.6597865223884583,0,2,19,1,1,3,-1,19,2,1,1,3,-0.001811100053600967,0.2811253070831299,0.5505244731903076,0,2,3,13,2,3,-1,3,14,2,1,3,0.0033469670452177525,0.526002824306488,0.1891465038061142,0,3,8,4,8,12,-1,12,4,4,6,2,8,10,4,6,2,0.00040791751234792173,0.5673509240150452,0.3344210088253021,0,2,5,2,6,3,-1,7,2,2,3,3,0.0127347996458411,0.5343592166900635,0.2395612001419067,0,2,6,1,9,10,-1,6,6,9,5,2,-0.007311972789466381,0.6010890007019043,0.4022207856178284,0,2,0,4,6,12,-1,2,4,2,12,3,-0.0569487512111664,0.8199151158332825,0.4543190896511078,0,2,15,13,2,3,-1,15,14,2,1,3,-0.005011659115552902,0.2200281023979187,0.5357710719108582,0,2,7,14,5,3,-1,7,15,5,1,3,0.006033436860889196,0.4413081109523773,0.7181751132011414,0,2,15,13,3,3,-1,15,14,3,1,3,0.0039437441155314445,0.547886073589325,0.2791733145713806,0,2,6,14,8,3,-1,6,15,8,1,3,-0.0036591119132936,0.635786771774292,0.3989723920822144,0,2,15,13,3,3,-1,15,14,3,1,3,-0.0038456181064248085,0.3493686020374298,0.5300664901733398,0,2,2,13,3,3,-1,2,14,3,1,3,-0.007192626129835844,0.1119614988565445,0.5229672789573669,0,3,4,7,12,12,-1,10,7,6,6,2,4,13,6,6,2,-0.0527989417314529,0.2387102991342545,0.54534512758255,0,2,9,7,2,6,-1,10,7,1,6,2,-0.007953766733407974,0.7586917877197266,0.4439376890659332,0,2,8,9,5,2,-1,8,10,5,1,2,-0.0027344180271029472,0.2565476894378662,0.5489321947097778,0,2,8,6,3,4,-1,9,6,1,4,3,-0.0018507939530536532,0.6734347939491272,0.4252474904060364,0,2,9,6,2,8,-1,9,10,2,4,2,0.0159189198166132,0.548835277557373,0.2292661964893341,0,2,7,7,3,6,-1,8,7,1,6,3,-0.0012687679845839739,0.6104331016540527,0.4022389948368073,0,2,11,3,3,3,-1,12,3,1,3,3,0.006288391072303057,0.5310853123664856,0.1536193042993546,0,2,5,4,6,1,-1,7,4,2,1,3,-0.0062259892001748085,0.1729111969470978,0.524160623550415,0,2,5,6,10,3,-1,5,7,10,1,3,-0.0121325999498367,0.659775972366333,0.4325182139873505,23.918790817260742,50,0,2,7,3,6,9,-1,7,6,6,3,3,-0.0039184908382594585,0.6103435158729553,0.1469330936670303,0,2,6,7,9,1,-1,9,7,3,1,3,0.0015971299726516008,0.2632363140583038,0.5896466970443726,0,2,2,8,16,8,-1,2,12,16,4,2,0.0177801102399826,0.587287425994873,0.1760361939668655,0,2,14,6,2,6,-1,14,9,2,3,2,0.0006533476989716291,0.1567801982164383,0.5596066117286682,0,2,1,5,6,15,-1,1,10,6,5,3,-0.00028353091329336166,0.1913153976202011,0.5732036232948303,0,2,10,0,6,9,-1,10,3,6,3,3,0.0016104689566418529,0.2914913892745972,0.5623080730438232,0,2,6,6,7,14,-1,6,13,7,7,2,-0.0977506190538406,0.194347694516182,0.5648233294487,0,2,13,7,3,6,-1,13,9,3,2,3,0.0005518235848285258,0.3134616911411285,0.5504639744758606,0,2,1,8,15,4,-1,6,8,5,4,3,-0.0128582203760743,0.253648191690445,0.5760142803192139,0,2,11,2,3,10,-1,11,7,3,5,2,0.004153023939579725,0.5767722129821777,0.36597740650177,0,2,3,7,4,6,-1,3,9,4,2,3,0.0017092459602281451,0.2843191027641296,0.5918939113616943,0,2,13,3,6,10,-1,15,3,2,10,3,0.007521735969930887,0.4052427113056183,0.6183109283447266,0,3,5,7,8,10,-1,5,7,4,5,2,9,12,4,5,2,0.0022479810286313295,0.578375518321991,0.3135401010513306,0,3,4,4,12,12,-1,10,4,6,6,2,4,10,6,6,2,0.0520062111318111,0.5541312098503113,0.1916636973619461,0,2,1,4,6,9,-1,3,4,2,9,3,0.0120855299755931,0.4032655954360962,0.6644591093063354,0,2,11,3,2,5,-1,11,3,1,5,2,0.000014687820112158079,0.3535977900028229,0.5709382891654968,0,2,7,3,2,5,-1,8,3,1,5,2,0.000007139518857002258,0.3037444949150085,0.5610269904136658,0,2,10,14,2,3,-1,10,15,2,1,3,-0.0046001640148460865,0.7181087136268616,0.4580326080322266,0,2,5,12,6,2,-1,8,12,3,2,2,0.0020058949012309313,0.5621951818466187,0.2953684031963348,0,2,9,14,2,3,-1,9,15,2,1,3,0.004505027085542679,0.4615387916564941,0.7619017958641052,0,2,4,11,12,6,-1,4,14,12,3,2,0.0117468303069472,0.5343837141990662,0.1772529035806656,0,2,11,11,5,9,-1,11,14,5,3,3,-0.0583163388073444,0.1686245948076248,0.5340772271156311,0,2,6,15,3,2,-1,6,16,3,1,2,0.00023629379575140774,0.3792056143283844,0.6026803851127625,0,2,11,0,3,5,-1,12,0,1,5,3,-0.007815618067979813,0.151286706328392,0.5324323773384094,0,2,5,5,6,7,-1,8,5,3,7,2,-0.0108761601150036,0.2081822007894516,0.5319945216178894,0,2,13,0,1,9,-1,13,3,1,3,3,-0.0027745519764721394,0.4098246991634369,0.5210328102111816,0,3,3,2,4,8,-1,3,2,2,4,2,5,6,2,4,2,-0.0007827638182789087,0.5693274140357971,0.3478842079639435,0,2,13,12,4,6,-1,13,14,4,2,3,0.0138704096898437,0.5326750874519348,0.2257698029279709,0,2,3,12,4,6,-1,3,14,4,2,3,-0.0236749108880758,0.1551305055618286,0.5200707912445068,0,2,13,11,3,4,-1,13,13,3,2,2,-0.000014879409718560055,0.5500566959381104,0.3820176124572754,0,2,4,4,4,3,-1,4,5,4,1,3,0.00361906411126256,0.4238683879375458,0.6639748215675354,0,2,7,5,11,8,-1,7,9,11,4,2,-0.0198171101510525,0.2150038033723831,0.5382357835769653,0,2,7,8,3,4,-1,8,8,1,4,3,-0.0038154039066284895,0.6675711274147034,0.4215297102928162,0,2,9,1,6,1,-1,11,1,2,1,3,-0.0049775829538702965,0.2267289012670517,0.5386328101158142,0,2,5,5,3,3,-1,5,6,3,1,3,0.002244102070108056,0.4308691024780273,0.6855735778808594,0,3,0,9,20,6,-1,10,9,10,3,2,0,12,10,3,2,0.0122824599966407,0.5836614966392517,0.3467479050159454,0,2,8,6,3,5,-1,9,6,1,5,3,-0.002854869933798909,0.7016944885253906,0.4311453998088837,0,2,11,0,1,3,-1,11,1,1,1,3,-0.0037875669077038765,0.2895345091819763,0.5224946141242981,0,2,4,2,4,2,-1,4,3,4,1,2,-0.0012201230274513364,0.2975570857524872,0.5481644868850708,0,2,12,6,4,3,-1,12,7,4,1,3,0.010160599835217,0.4888817965984345,0.8182697892189026,0,2,5,0,6,4,-1,7,0,2,4,3,-0.0161745697259903,0.1481492966413498,0.5239992737770081,0,2,9,7,3,8,-1,10,7,1,8,3,0.0192924607545137,0.4786309897899628,0.7378190755844116,0,2,9,7,2,2,-1,10,7,1,2,2,-0.003247953951358795,0.7374222874641418,0.4470643997192383,0,3,6,7,14,4,-1,13,7,7,2,2,6,9,7,2,2,-0.009380348026752472,0.3489154875278473,0.5537996292114258,0,2,0,5,3,6,-1,0,7,3,2,3,-0.0126061299815774,0.2379686981439591,0.5315443277359009,0,2,13,11,3,4,-1,13,13,3,2,2,-0.0256219301372766,0.1964688003063202,0.5138769745826721,0,2,4,11,3,4,-1,4,13,3,2,2,-0.00007574149640277028,0.5590522885322571,0.3365853130817413,0,3,5,9,12,8,-1,11,9,6,4,2,5,13,6,4,2,-0.0892108827829361,0.0634046569466591,0.516263484954834,0,2,9,12,1,3,-1,9,13,1,1,3,-0.002767048077657819,0.732346773147583,0.4490706026554108,0,2,10,15,2,4,-1,10,17,2,2,2,0.0002715257869567722,0.411483496427536,0.5985518097877502,24.52787971496582,51,0,2,7,7,6,1,-1,9,7,2,1,3,0.001478621968999505,0.266354501247406,0.6643316745758057,0,3,12,3,6,6,-1,15,3,3,3,2,12,6,3,3,2,-0.001874165958724916,0.6143848896026611,0.2518512904644013,0,2,0,4,10,6,-1,0,6,10,2,3,-0.001715100952424109,0.5766341090202332,0.2397463023662567,0,3,8,3,8,14,-1,12,3,4,7,2,8,10,4,7,2,-0.0018939269939437509,0.5682045817375183,0.2529144883155823,0,2,4,4,7,15,-1,4,9,7,5,3,-0.005300605203956366,0.1640675961971283,0.5556079745292664,0,3,12,2,6,8,-1,15,2,3,4,2,12,6,3,4,2,-0.0466625317931175,0.6123154163360596,0.4762830138206482,0,3,2,2,6,8,-1,2,2,3,4,2,5,6,3,4,2,-0.000794313324149698,0.5707858800888062,0.2839404046535492,0,2,2,13,18,7,-1,8,13,6,7,3,0.0148916700854898,0.4089672863483429,0.6006367206573486,0,3,4,3,8,14,-1,4,3,4,7,2,8,10,4,7,2,-0.0012046529445797205,0.5712450742721558,0.2705289125442505,0,2,18,1,2,6,-1,18,3,2,2,3,0.006061938125640154,0.526250422000885,0.3262225985527039,0,2,9,11,2,3,-1,9,12,2,1,3,-0.0025286648888140917,0.6853830814361572,0.4199256896972656,0,2,18,1,2,6,-1,18,3,2,2,3,-0.005901021882891655,0.3266282081604004,0.5434812903404236,0,2,0,1,2,6,-1,0,3,2,2,3,0.005670276004821062,0.5468410849571228,0.2319003939628601,0,2,1,5,18,6,-1,1,7,18,2,3,-0.003030410036444664,0.557066798210144,0.2708238065242767,0,2,0,2,6,7,-1,3,2,3,7,2,0.002980364952236414,0.3700568974018097,0.5890625715255737,0,2,7,3,6,14,-1,7,10,6,7,2,-0.0758405104279518,0.2140070050954819,0.5419948101043701,0,2,3,7,13,10,-1,3,12,13,5,2,0.0192625392228365,0.5526772141456604,0.2726590037345886,0,2,11,15,2,2,-1,11,16,2,1,2,0.00018888259364757687,0.3958011865615845,0.6017209887504578,0,3,2,11,16,4,-1,2,11,8,2,2,10,13,8,2,2,0.0293695498257875,0.5241373777389526,0.1435758024454117,0,3,13,7,6,4,-1,16,7,3,2,2,13,9,3,2,2,0.0010417619487270713,0.3385409116744995,0.5929983258247375,0,2,6,10,3,9,-1,6,13,3,3,3,0.0026125640142709017,0.5485377907752991,0.3021597862243652,0,2,14,6,1,6,-1,14,9,1,3,2,0.0009697746718302369,0.3375276029109955,0.553203284740448,0,2,5,10,4,1,-1,7,10,2,1,2,0.0005951265920884907,0.563174307346344,0.3359399139881134,0,2,3,8,15,5,-1,8,8,5,5,3,-0.1015655994415283,0.0637350380420685,0.5230425000190735,0,2,1,6,5,4,-1,1,8,5,2,2,0.0361566990613937,0.5136963129043579,0.1029528975486755,0,2,3,1,17,6,-1,3,3,17,2,3,0.003462414024397731,0.3879320025444031,0.5558289289474487,0,2,6,7,8,2,-1,10,7,4,2,2,0.0195549800992012,0.5250086784362793,0.1875859946012497,0,2,9,7,3,2,-1,10,7,1,2,3,-0.0023121440317481756,0.667202889919281,0.4679641127586365,0,2,8,7,3,2,-1,9,7,1,2,3,-0.001860528951510787,0.7163379192352295,0.4334670901298523,0,2,8,9,4,2,-1,8,10,4,1,2,-0.0009402636205777526,0.302136093378067,0.5650203227996826,0,2,8,8,4,3,-1,8,9,4,1,3,-0.005241833161562681,0.1820009052753449,0.5250256061553955,0,2,9,5,6,4,-1,9,5,3,4,2,0.00011729019752237946,0.3389188051223755,0.544597327709198,0,2,8,13,4,3,-1,8,14,4,1,3,0.0011878840159624815,0.4085349142551422,0.6253563165664673,0,3,4,7,12,6,-1,10,7,6,3,2,4,10,6,3,2,-0.0108813596889377,0.3378399014472961,0.5700082778930664,0,2,8,14,4,3,-1,8,15,4,1,3,0.0017354859737679362,0.4204635918140411,0.6523038744926453,0,2,9,7,3,3,-1,9,8,3,1,3,-0.00651190523058176,0.2595216035842896,0.5428143739700317,0,2,7,4,3,8,-1,8,4,1,8,3,-0.0012136430013924837,0.6165143847465515,0.3977893888950348,0,2,10,0,3,6,-1,11,0,1,6,3,-0.010354240424931,0.1628028005361557,0.5219504833221436,0,2,6,3,4,8,-1,8,3,2,8,2,0.0005585883045569062,0.3199650943279266,0.5503574013710022,0,2,14,3,6,13,-1,14,3,3,13,2,0.0152996499091387,0.4103994071483612,0.6122388243675232,0,2,8,13,3,6,-1,8,16,3,3,2,-0.021588210016489,0.103491298854351,0.519738495349884,0,2,14,3,6,13,-1,14,3,3,13,2,-0.1283462941646576,0.8493865132331848,0.4893102943897247,0,3,0,7,10,4,-1,0,7,5,2,2,5,9,5,2,2,-0.0022927189711481333,0.3130157887935638,0.5471575260162354,0,2,14,3,6,13,-1,14,3,3,13,2,0.0799151062965393,0.4856320917606354,0.6073989272117615,0,2,0,3,6,13,-1,3,3,3,13,2,-0.0794410929083824,0.8394674062728882,0.462453305721283,0,2,9,1,4,1,-1,9,1,2,1,2,-0.00528000108897686,0.1881695985794067,0.5306698083877563,0,2,8,0,2,1,-1,9,0,1,1,2,0.0010463109938427806,0.5271229147911072,0.2583065927028656,0,3,10,16,4,4,-1,12,16,2,2,2,10,18,2,2,2,0.00026317298761568964,0.4235304892063141,0.5735440850257874,0,2,9,6,2,3,-1,10,6,1,3,2,-0.0036173160187900066,0.6934396028518677,0.4495444893836975,0,2,4,5,12,2,-1,8,5,4,2,3,0.0114218797534704,0.590092122554779,0.4138193130493164,0,2,8,7,3,5,-1,9,7,1,5,3,-0.0019963278900831938,0.6466382741928101,0.4327239990234375,27.153350830078125,56,0,2,6,4,8,6,-1,6,6,8,2,3,-0.00996912457048893,0.6142324209213257,0.2482212036848068,0,2,9,5,2,12,-1,9,11,2,6,2,0.0007307305932044983,0.5704951882362366,0.2321965992450714,0,2,4,6,6,8,-1,4,10,6,4,2,0.0006404530140571296,0.2112251967191696,0.5814933180809021,0,2,12,2,8,5,-1,12,2,4,5,2,0.004542401991784573,0.2950482070446014,0.586631178855896,0,2,0,8,18,3,-1,0,9,18,1,3,0.00009247744310414419,0.2990990877151489,0.5791326761245728,0,2,8,12,4,8,-1,8,16,4,4,2,-0.008660314604640007,0.2813029885292053,0.5635542273521423,0,2,0,2,8,5,-1,4,2,4,5,2,0.008051581680774689,0.3535369038581848,0.6054757237434387,0,2,13,11,3,4,-1,13,13,3,2,2,0.00043835240649059415,0.5596532225608826,0.2731510996818543,0,2,5,11,6,1,-1,7,11,2,1,3,-0.0000981689736363478,0.5978031754493713,0.3638561069965363,0,2,11,3,3,1,-1,12,3,1,1,3,-0.0011298790341243148,0.2755252122879028,0.5432729125022888,0,2,7,13,5,3,-1,7,14,5,1,3,0.006435615010559559,0.4305641949176788,0.7069833278656006,0,2,11,11,7,6,-1,11,14,7,3,2,-0.0568293295800686,0.2495242953300476,0.5294997096061707,0,2,2,11,7,6,-1,2,14,7,3,2,0.004066816996783018,0.5478553175926208,0.2497723996639252,0,2,12,14,2,6,-1,12,16,2,2,3,0.0000481647984997835,0.3938601016998291,0.5706356167793274,0,2,8,14,3,3,-1,8,15,3,1,3,0.00617950176820159,0.440760612487793,0.7394766807556152,0,2,11,0,3,5,-1,12,0,1,5,3,0.006498575210571289,0.5445243120193481,0.2479152977466583,0,2,6,1,4,9,-1,8,1,2,9,2,-0.0010211090557277203,0.2544766962528229,0.5338971018791199,0,2,10,3,6,1,-1,12,3,2,1,3,-0.005424752831459045,0.2718858122825623,0.5324069261550903,0,2,8,8,3,4,-1,8,10,3,2,2,-0.0010559899965301156,0.3178288042545319,0.553450882434845,0,2,8,12,4,2,-1,8,13,4,1,2,0.0006646580877713859,0.4284219145774841,0.6558194160461426,0,2,5,18,4,2,-1,5,19,4,1,2,-0.00027524109464138746,0.5902860760688782,0.3810262978076935,0,2,2,1,18,6,-1,2,3,18,2,3,0.004229320213198662,0.381648987531662,0.5709385871887207,0,2,6,0,3,2,-1,7,0,1,2,3,-0.0032868210691958666,0.1747743934392929,0.5259544253349304,0,3,13,8,6,2,-1,16,8,3,1,2,13,9,3,1,2,0.0001561187964398414,0.3601722121238709,0.5725612044334412,0,2,6,10,3,6,-1,6,13,3,3,2,-0.000007362138148891972,0.540185809135437,0.3044497072696686,0,3,0,13,20,4,-1,10,13,10,2,2,0,15,10,2,2,-0.014767250046134,0.3220770061016083,0.5573434829711914,0,2,7,7,6,5,-1,9,7,2,5,3,0.0244895908981562,0.4301528036594391,0.6518812775611877,0,2,11,0,2,2,-1,11,1,2,1,2,-0.000376520911231637,0.356458306312561,0.5598236918449402,0,3,1,8,6,2,-1,1,8,3,1,2,4,9,3,1,2,0.00000736576885174145,0.3490782976150513,0.556189775466919,0,3,0,2,20,2,-1,10,2,10,1,2,0,3,10,1,2,-0.0150999398902059,0.1776272058486939,0.5335299968719482,0,2,7,14,5,3,-1,7,15,5,1,3,-0.0038316650316119194,0.6149687767028809,0.4221394062042236,0,3,7,13,6,6,-1,10,13,3,3,2,7,16,3,3,2,0.0169254001230001,0.5413014888763428,0.2166585028171539,0,2,9,12,2,3,-1,9,13,2,1,3,-0.003047785023227334,0.6449490785598755,0.4354617893695831,0,2,16,11,1,6,-1,16,13,1,2,3,0.003214058931916952,0.5400155186653137,0.3523217141628265,0,2,3,11,1,6,-1,3,13,1,2,3,-0.004002320114523172,0.2774524092674255,0.5338417291641235,0,3,4,4,14,12,-1,11,4,7,6,2,4,10,7,6,2,0.0074182129465043545,0.567673921585083,0.3702817857265472,0,2,5,4,3,3,-1,5,5,3,1,3,-0.008876458741724491,0.7749221920967102,0.4583688974380493,0,2,12,3,3,3,-1,13,3,1,3,3,0.002731173997744918,0.5338721871376038,0.3996661007404327,0,2,6,6,8,3,-1,6,7,8,1,3,-0.0025082379579544067,0.5611963272094727,0.377749890089035,0,2,12,3,3,3,-1,13,3,1,3,3,-0.008054107427597046,0.291522890329361,0.5179182887077332,0,3,3,1,4,10,-1,3,1,2,5,2,5,6,2,5,2,-0.0009793881326913834,0.5536432862281799,0.3700192868709564,0,2,5,7,10,2,-1,5,7,5,2,2,-0.005874590948224068,0.3754391074180603,0.5679376125335693,0,2,8,7,3,3,-1,9,7,1,3,3,-0.00449367193505168,0.7019699215888977,0.4480949938297272,0,2,15,12,2,3,-1,15,13,2,1,3,-0.00543892290443182,0.2310364991426468,0.5313386917114258,0,2,7,8,3,4,-1,8,8,1,4,3,-0.0007509464048780501,0.5864868760108948,0.4129343032836914,0,2,13,4,1,12,-1,13,10,1,6,2,0.000014528800420521293,0.3732407093048096,0.5619621276855469,0,3,4,5,12,12,-1,4,5,6,6,2,10,11,6,6,2,0.0407580696046352,0.5312091112136841,0.2720521986484528,0,2,7,14,7,3,-1,7,15,7,1,3,0.006650593131780624,0.4710015952587128,0.6693493723869324,0,2,3,12,2,3,-1,3,13,2,1,3,0.0045759351924061775,0.5167819261550903,0.1637275964021683,0,3,3,2,14,2,-1,10,2,7,1,2,3,3,7,1,2,0.0065269311890006065,0.5397608876228333,0.2938531935214996,0,2,0,1,3,10,-1,1,1,1,10,3,-0.0136603796854615,0.7086488008499146,0.453220009803772,0,2,9,0,6,5,-1,11,0,2,5,3,0.0273588690906763,0.5206481218338013,0.3589231967926025,0,2,5,7,6,2,-1,8,7,3,2,2,0.0006219755159690976,0.3507075905799866,0.5441123247146606,0,2,7,1,6,10,-1,7,6,6,5,2,-0.0033077080734074116,0.5859522819519043,0.402489185333252,0,2,1,1,18,3,-1,7,1,6,3,3,-0.0106311095878482,0.6743267178535461,0.4422602951526642,0,2,16,3,3,6,-1,16,5,3,2,3,0.0194416493177414,0.5282716155052185,0.1797904968261719,34.55411148071289,71,0,2,6,3,7,6,-1,6,6,7,3,2,-0.005505216773599386,0.5914731025695801,0.2626559138298035,0,2,4,7,12,2,-1,8,7,4,2,3,0.001956227933987975,0.2312581986188889,0.5741627216339111,0,2,0,4,17,10,-1,0,9,17,5,2,-0.008892478421330452,0.1656530052423477,0.5626654028892517,0,2,3,4,15,16,-1,3,12,15,8,2,0.0836383774876595,0.5423449873924255,0.1957294940948486,0,2,7,15,6,4,-1,7,17,6,2,2,0.0012282270472496748,0.3417904078960419,0.5992503762245178,0,2,15,2,4,9,-1,15,2,2,9,2,0.0057629169896245,0.3719581961631775,0.6079903841018677,0,2,2,3,3,2,-1,2,4,3,1,2,-0.0016417410224676132,0.2577486038208008,0.5576915740966797,0,2,13,6,7,9,-1,13,9,7,3,3,0.0034113149158656597,0.2950749099254608,0.5514171719551086,0,2,8,11,4,3,-1,8,12,4,1,3,-0.0110693201422691,0.7569358944892883,0.4477078914642334,0,3,0,2,20,6,-1,10,2,10,3,2,0,5,10,3,2,0.0348659716546535,0.5583708882331848,0.2669621109962463,0,3,3,2,6,10,-1,3,2,3,5,2,6,7,3,5,2,0.0006570109981112182,0.5627313256263733,0.2988890111446381,0,2,13,10,3,4,-1,13,12,3,2,2,-0.0243391301482916,0.2771185040473938,0.5108863115310669,0,2,4,10,3,4,-1,4,12,3,2,2,0.0005943520227447152,0.5580651760101318,0.3120341897010803,0,2,7,5,6,3,-1,9,5,2,3,3,0.0022971509024500847,0.3330250084400177,0.5679075717926025,0,2,7,6,6,8,-1,7,10,6,4,2,-0.0037801829166710377,0.2990534901618958,0.5344808101654053,0,2,0,11,20,6,-1,0,14,20,3,2,-0.13420669734478,0.1463858932256699,0.5392568111419678,0,3,4,13,4,6,-1,4,13,2,3,2,6,16,2,3,2,0.0007522454834543169,0.3746953904628754,0.5692734718322754,0,3,6,0,8,12,-1,10,0,4,6,2,6,6,4,6,2,-0.040545541793108,0.2754747867584229,0.5484297871589661,0,2,2,0,15,2,-1,2,1,15,1,2,0.0012572970008477569,0.3744584023952484,0.5756075978279114,0,2,9,12,2,3,-1,9,13,2,1,3,-0.007424994837492704,0.7513859272003174,0.4728231132030487,0,2,3,12,1,2,-1,3,13,1,1,2,0.0005090812919661403,0.540489673614502,0.2932321131229401,0,2,9,11,2,3,-1,9,12,2,1,3,-0.001280845026485622,0.6169779896736145,0.4273349046707153,0,2,7,3,3,1,-1,8,3,1,1,3,-0.0018348860321566463,0.2048496007919312,0.5206472277641296,0,2,17,7,3,6,-1,17,9,3,2,3,0.0274848695844412,0.5252984762191772,0.1675522029399872,0,2,7,2,3,2,-1,8,2,1,2,3,0.0022372419480234385,0.5267782807350159,0.2777658104896545,0,2,11,4,5,3,-1,11,5,5,1,3,-0.008863529190421104,0.69545578956604,0.4812048971652985,0,2,4,4,5,3,-1,4,5,5,1,3,0.004175397101789713,0.4291887879371643,0.6349195837974548,0,2,19,3,1,2,-1,19,4,1,1,2,-0.0017098189564421773,0.2930536866188049,0.5361248850822449,0,2,5,5,4,3,-1,5,6,4,1,3,0.006532854866236448,0.4495325088500977,0.7409694194793701,0,2,17,7,3,6,-1,17,9,3,2,3,-0.009537290781736374,0.3149119913578033,0.5416501760482788,0,2,0,7,3,6,-1,0,9,3,2,3,0.0253109894692898,0.5121892094612122,0.1311707943677902,0,2,14,2,6,9,-1,14,5,6,3,3,0.0364609695971012,0.5175911784172058,0.2591339945793152,0,2,0,4,5,6,-1,0,6,5,2,3,0.0208543296903372,0.5137140154838562,0.1582316011190414,0,2,10,5,6,2,-1,12,5,2,2,3,-0.0008720774785615504,0.5574309825897217,0.439897894859314,0,2,4,5,6,2,-1,6,5,2,2,3,-0.000015227000403683633,0.5548940896987915,0.3708069920539856,0,2,8,1,4,6,-1,8,3,4,2,3,-0.0008431650931015611,0.3387419879436493,0.5554211139678955,0,2,0,2,3,6,-1,0,4,3,2,3,0.0036037859972566366,0.5358061790466309,0.3411171138286591,0,2,6,6,8,3,-1,6,7,8,1,3,-0.006805789191275835,0.6125202775001526,0.4345862865447998,0,2,0,1,5,9,-1,0,4,5,3,3,-0.0470216609537601,0.2358165979385376,0.519373893737793,0,2,16,0,4,15,-1,16,0,2,15,2,-0.0369541086256504,0.7323111295700073,0.4760943949222565,0,2,1,10,3,2,-1,1,11,3,1,2,0.0010439479956403375,0.5419455170631409,0.3411330878734589,0,2,14,4,1,10,-1,14,9,1,5,2,-0.00021050689974799752,0.2821694016456604,0.5554947257041931,0,2,0,1,4,12,-1,2,1,2,12,2,-0.0808315873146057,0.9129930138587952,0.4697434902191162,0,2,11,11,4,2,-1,11,11,2,2,2,-0.0003657905908767134,0.6022670269012451,0.3978292942047119,0,2,5,11,4,2,-1,7,11,2,2,2,-0.00012545920617412776,0.5613213181495667,0.384553998708725,0,2,3,8,15,5,-1,8,8,5,5,3,-0.0687864869832993,0.2261611968278885,0.5300496816635132,0,2,0,0,6,10,-1,3,0,3,10,2,0.0124157899990678,0.4075691998004913,0.5828812122344971,0,2,11,4,3,2,-1,12,4,1,2,3,-0.004717481788247824,0.2827253937721252,0.5267757773399353,0,2,8,12,3,8,-1,8,16,3,4,2,0.0381368584930897,0.5074741244316101,0.1023615971207619,0,2,8,14,5,3,-1,8,15,5,1,3,-0.0028168049175292253,0.6169006824493408,0.4359692931175232,0,2,7,14,4,3,-1,7,15,4,1,3,0.008130360394716263,0.4524433016777039,0.76060950756073,0,2,11,4,3,2,-1,12,4,1,2,3,0.006005601957440376,0.5240408778190613,0.185971200466156,0,3,3,15,14,4,-1,3,15,7,2,2,10,17,7,2,2,0.0191393196582794,0.5209379196166992,0.2332071959972382,0,3,2,2,16,4,-1,10,2,8,2,2,2,4,8,2,2,0.0164457596838474,0.5450702905654907,0.3264234960079193,0,2,0,8,6,12,-1,3,8,3,12,2,-0.0373568907380104,0.6999046802520752,0.4533241987228394,0,2,5,7,10,2,-1,5,7,5,2,2,-0.0197279006242752,0.2653664946556091,0.54128098487854,0,2,9,7,2,5,-1,10,7,1,5,2,0.0066972579807043076,0.4480566084384918,0.7138652205467224,0,3,13,7,6,4,-1,16,7,3,2,2,13,9,3,2,2,0.0007445752853527665,0.4231350123882294,0.5471320152282715,0,2,0,13,8,2,-1,0,14,8,1,2,0.0011790640419349074,0.5341702103614807,0.3130455017089844,0,3,13,7,6,4,-1,16,7,3,2,2,13,9,3,2,2,0.0349806100130081,0.5118659734725952,0.343053013086319,0,3,1,7,6,4,-1,1,7,3,2,2,4,9,3,2,2,0.0005685979267582297,0.3532187044620514,0.5468639731407166,0,2,12,6,1,12,-1,12,12,1,6,2,-0.0113406497985125,0.2842353880405426,0.5348700881004333,0,2,9,5,2,6,-1,10,5,1,6,2,-0.00662281084805727,0.6883640289306641,0.4492664933204651,0,2,14,12,2,3,-1,14,13,2,1,3,-0.008016033098101616,0.1709893941879273,0.5224308967590332,0,2,4,12,2,3,-1,4,13,2,1,3,0.0014206819469109178,0.5290846228599548,0.299338310956955,0,2,8,12,4,3,-1,8,13,4,1,3,-0.002780171111226082,0.6498854160308838,0.4460499882698059,0,3,5,2,2,4,-1,5,2,1,2,2,6,4,1,2,2,-0.0014747589593753219,0.3260438144207001,0.5388113260269165,0,2,5,5,11,3,-1,5,6,11,1,3,-0.0238303393125534,0.7528941035270691,0.4801219999790192,0,2,7,6,4,12,-1,7,12,4,6,2,0.00693697901442647,0.5335165858268738,0.3261427879333496,0,2,12,13,8,5,-1,12,13,4,5,2,0.008280625566840172,0.458039402961731,0.5737829804420471,0,2,7,6,1,12,-1,7,12,1,6,2,-0.0104395002126694,0.2592320144176483,0.5233827829360962,39.1072883605957,80,0,2,1,2,6,3,-1,4,2,3,3,2,0.0072006587870419025,0.325888603925705,0.6849808096885681,0,3,9,5,6,10,-1,12,5,3,5,2,9,10,3,5,2,-0.002859358908608556,0.5838881134986877,0.2537829875946045,0,3,5,5,8,12,-1,5,5,4,6,2,9,11,4,6,2,0.0006858052802272141,0.5708081722259521,0.2812424004077911,0,2,0,7,20,6,-1,0,9,20,2,3,0.007958019152283669,0.2501051127910614,0.5544260740280151,0,2,4,2,2,2,-1,4,3,2,1,2,-0.0012124150525778532,0.2385368049144745,0.5433350205421448,0,2,4,18,12,2,-1,8,18,4,2,3,0.00794261321425438,0.3955070972442627,0.6220757961273193,0,2,7,4,4,16,-1,7,12,4,8,2,0.0024630590341985226,0.5639708042144775,0.2992357909679413,0,2,7,6,7,8,-1,7,10,7,4,2,-0.006039659958332777,0.218651294708252,0.541167676448822,0,2,6,3,3,1,-1,7,3,1,1,3,-0.0012988339876756072,0.23507060110569,0.5364584922790527,0,2,11,15,2,4,-1,11,17,2,2,2,0.00022299369447864592,0.380411297082901,0.572960615158081,0,2,3,5,4,8,-1,3,9,4,4,2,0.0014654280385002494,0.2510167956352234,0.5258268713951111,0,2,7,1,6,12,-1,7,7,6,6,2,-0.0008121004211716354,0.5992823839187622,0.3851158916950226,0,2,4,6,6,2,-1,6,6,2,2,3,-0.0013836020370945334,0.5681396126747131,0.3636586964130402,0,2,16,4,4,6,-1,16,6,4,2,3,-0.0279364492744207,0.1491317003965378,0.5377560257911682,0,2,3,3,5,2,-1,3,4,5,1,2,-0.0004691955109592527,0.3692429959774017,0.5572484731674194,0,2,9,11,2,3,-1,9,12,2,1,3,-0.004982965998351574,0.6758509278297424,0.4532504081726074,0,2,2,16,4,2,-1,2,17,4,1,2,0.001881530974060297,0.5368022918701172,0.2932539880275726,0,3,7,13,6,6,-1,10,13,3,3,2,7,16,3,3,2,-0.0190675500780344,0.1649377048015595,0.5330067276954651,0,2,7,0,3,4,-1,8,0,1,4,3,-0.0046906559728085995,0.1963925957679749,0.5119361877441406,0,2,8,15,4,3,-1,8,16,4,1,3,0.005977713968604803,0.467117190361023,0.7008398175239563,0,2,0,4,4,6,-1,0,6,4,2,3,-0.0333031304180622,0.1155416965484619,0.5104162096977234,0,2,5,6,12,3,-1,9,6,4,3,3,0.0907441079616547,0.5149660110473633,0.1306173056364059,0,2,7,6,6,14,-1,9,6,2,14,3,0.0009355589863844216,0.3605481088161469,0.543985903263092,0,2,9,7,3,3,-1,10,7,1,3,3,0.0149016501381993,0.4886212050914764,0.7687569856643677,0,2,6,12,2,4,-1,6,14,2,2,2,0.0006159411859698594,0.5356813073158264,0.3240939080715179,0,2,10,12,7,6,-1,10,14,7,2,3,-0.0506709888577461,0.1848621964454651,0.5230404138565063,0,2,1,0,15,2,-1,1,1,15,1,2,0.0006866574985906482,0.3840579986572266,0.5517945885658264,0,2,14,0,6,6,-1,14,0,3,6,2,0.008371243253350258,0.4288564026355743,0.6131753921508789,0,2,5,3,3,1,-1,6,3,1,1,3,-0.0012953069526702166,0.2913674116134644,0.528073787689209,0,2,14,0,6,6,-1,14,0,3,6,2,-0.0419416800141335,0.7554799914360046,0.4856030941009522,0,2,0,3,20,10,-1,0,8,20,5,2,-0.0235293805599213,0.2838279902935028,0.5256081223487854,0,2,14,0,6,6,-1,14,0,3,6,2,0.0408574491739273,0.4870935082435608,0.6277297139167786,0,2,0,0,6,6,-1,3,0,3,6,2,-0.0254068691283464,0.7099707722663879,0.4575029015541077,0,2,19,15,1,2,-1,19,16,1,1,2,-0.00041415440500713885,0.4030886888504028,0.5469412207603455,0,2,0,2,4,8,-1,2,2,2,8,2,0.0218241196125746,0.4502024054527283,0.6768701076507568,0,3,2,1,18,4,-1,11,1,9,2,2,2,3,9,2,2,0.0141140399500728,0.5442860722541809,0.3791700005531311,0,2,8,12,1,2,-1,8,13,1,1,2,0.00006721459067193791,0.4200463891029358,0.5873476266860962,0,3,5,2,10,6,-1,10,2,5,3,2,5,5,5,3,2,-0.00794176384806633,0.3792561888694763,0.5585265755653381,0,2,9,7,2,4,-1,10,7,1,4,2,-0.00721444096416235,0.7253103852272034,0.4603548943996429,0,2,9,7,3,3,-1,10,7,1,3,3,0.002581733977422118,0.4693301916122437,0.5900238752365112,0,2,4,5,12,8,-1,8,5,4,8,3,0.1340931951999664,0.5149213075637817,0.1808844953775406,0,2,15,15,4,3,-1,15,16,4,1,3,0.0022962710354477167,0.5399743914604187,0.3717867136001587,0,2,8,18,3,1,-1,9,18,1,1,3,-0.002157584996894002,0.2408495992422104,0.5148863792419434,0,2,9,13,4,3,-1,9,14,4,1,3,-0.004919618833810091,0.6573588252067566,0.4738740026950836,0,2,7,13,4,3,-1,7,14,4,1,3,0.0016267469618469477,0.4192821979522705,0.6303114295005798,0,2,19,15,1,2,-1,19,16,1,1,2,0.00033413388882763684,0.5540298223495483,0.3702101111412048,0,2,0,15,8,4,-1,0,17,8,2,2,-0.0266980808228254,0.1710917949676514,0.5101410746574402,0,2,9,3,6,4,-1,11,3,2,4,3,-0.0305618792772293,0.1904218047857285,0.5168793797492981,0,2,8,14,4,3,-1,8,15,4,1,3,0.002851154888048768,0.4447506964206696,0.6313853859901428,0,2,3,14,14,6,-1,3,16,14,2,3,-0.0362114794552326,0.2490727007389069,0.5377349257469177,0,2,6,3,6,6,-1,6,6,6,3,2,-0.002411518944427371,0.5381243228912354,0.3664236962795258,0,2,5,11,10,6,-1,5,14,10,3,2,-0.0007725320174358785,0.5530232191085815,0.3541550040245056,0,2,3,10,3,4,-1,4,10,1,4,3,0.0002948172914329916,0.4132699072360992,0.5667243003845215,0,2,13,9,2,2,-1,13,9,1,2,2,-0.006233456078916788,0.0987872332334518,0.5198668837547302,0,2,5,3,6,4,-1,7,3,2,4,3,-0.0262747295200825,0.0911274924874306,0.5028107166290283,0,2,9,7,3,3,-1,10,7,1,3,3,0.005321226082742214,0.4726648926734924,0.6222720742225647,0,2,2,12,2,3,-1,2,13,2,1,3,-0.004112905822694302,0.2157457023859024,0.5137804746627808,0,2,9,8,3,12,-1,9,12,3,4,3,0.0032457809429615736,0.5410770773887634,0.3721776902675629,0,3,3,14,4,6,-1,3,14,2,3,2,5,17,2,3,2,-0.0163597092032433,0.7787874937057495,0.4685291945934296,0,2,16,15,2,2,-1,16,16,2,1,2,0.00032166109303943813,0.5478987097740173,0.4240373969078064,0,2,2,15,2,2,-1,2,16,2,1,2,0.000644524407107383,0.5330560803413391,0.3501324951648712,0,2,8,12,4,3,-1,8,13,4,1,3,-0.0078909732401371,0.6923521161079407,0.4726569056510925,0,2,0,7,20,1,-1,10,7,10,1,2,0.048336211591959,0.50559002161026,0.0757492035627365,0,2,7,6,8,3,-1,7,6,4,3,2,-0.000751781277358532,0.3783741891384125,0.5538573861122131,0,2,5,7,8,2,-1,9,7,4,2,2,-0.002495391061529517,0.3081651031970978,0.5359612107276917,0,2,9,7,3,5,-1,10,7,1,5,3,-0.0022385010961443186,0.663395881652832,0.4649342894554138,0,2,8,7,3,5,-1,9,7,1,5,3,-0.0017988430336117744,0.6596844792366028,0.4347187876701355,0,2,11,1,3,5,-1,12,1,1,5,3,0.008786091580986977,0.523183286190033,0.2315579950809479,0,2,6,2,3,6,-1,7,2,1,6,3,0.003671538084745407,0.520425021648407,0.2977376878261566,0,2,14,14,6,5,-1,14,14,3,5,2,-0.0353364497423172,0.7238878011703491,0.4861505031585693,0,2,9,8,2,2,-1,9,9,2,1,2,-0.0006918924045749009,0.3105022013187408,0.5229824781417847,0,2,10,7,1,3,-1,10,8,1,1,3,-0.003394610946998,0.3138968050479889,0.5210173726081848,0,3,6,6,2,2,-1,6,6,1,1,2,7,7,1,1,2,0.0009856928372755647,0.4536580145359039,0.6585097908973694,0,3,2,11,18,4,-1,11,11,9,2,2,2,13,9,2,2,-0.0501631014049053,0.1804454028606415,0.5198916792869568,0,3,6,6,2,2,-1,6,6,1,1,2,7,7,1,1,2,-0.0022367259953171015,0.7255702018737793,0.4651359021663666,0,2,0,15,20,2,-1,0,16,20,1,2,0.0007432628772221506,0.4412921071052551,0.5898545980453491,0,2,4,14,2,3,-1,4,15,2,1,3,-0.0009348518215119839,0.3500052988529205,0.5366017818450928,0,2,8,14,4,3,-1,8,15,4,1,3,0.0174979399889708,0.4912194907665253,0.8315284848213196,0,2,8,7,2,3,-1,8,8,2,1,3,-0.0015200000489130616,0.3570275902748108,0.537056028842926,0,2,9,10,2,3,-1,9,11,2,1,3,0.0007800394087098539,0.4353772103786469,0.5967335104942322,50.61048126220703,103,0,2,5,4,10,4,-1,5,6,10,2,2,-0.00999455526471138,0.6162583231925964,0.3054533004760742,0,3,9,7,6,4,-1,12,7,3,2,2,9,9,3,2,2,-0.001108522992581129,0.5818294882774353,0.3155578076839447,0,2,4,7,3,6,-1,4,9,3,2,3,0.001036438043229282,0.2552052140235901,0.5692911744117737,0,3,11,15,4,4,-1,13,15,2,2,2,11,17,2,2,2,0.000682113110087812,0.3685089945793152,0.5934931039810181,0,2,7,8,4,2,-1,7,9,4,1,2,-0.0006805734010413289,0.2332392036914825,0.5474792122840881,0,2,13,1,4,3,-1,13,1,2,3,2,0.0002606878988444805,0.325745701789856,0.5667545795440674,0,3,5,15,4,4,-1,5,15,2,2,2,7,17,2,2,2,0.0005160737200640142,0.3744716942310333,0.5845472812652588,0,2,9,5,4,7,-1,9,5,2,7,2,0.0008500752155669034,0.3420371115207672,0.5522807240486145,0,2,5,6,8,3,-1,9,6,4,3,2,-0.0018607829697430134,0.2804419994354248,0.5375424027442932,0,2,9,9,2,2,-1,9,10,2,1,2,-0.001503397012129426,0.2579050958156586,0.5498952269554138,0,2,7,15,5,3,-1,7,16,5,1,3,0.0023478909861296415,0.4175156056880951,0.6313710808753967,0,2,11,10,4,3,-1,11,10,2,3,2,-0.00028880240279249847,0.5865169763565063,0.4052666127681732,0,2,6,9,8,10,-1,6,14,8,5,2,0.008940547704696655,0.5211141109466553,0.231865406036377,0,2,10,11,6,2,-1,10,11,3,2,2,-0.0193277392536402,0.2753432989120483,0.5241525769233704,0,2,4,11,6,2,-1,7,11,3,2,2,-0.0002020206011366099,0.5722978711128235,0.3677195906639099,0,2,11,3,8,1,-1,11,3,4,1,2,0.002117906929925084,0.4466108083724976,0.5542430877685547,0,2,6,3,3,2,-1,7,3,1,2,3,-0.0017743760254234076,0.2813253104686737,0.5300959944725037,0,2,14,5,6,5,-1,14,5,3,5,2,0.004223445896059275,0.439970999956131,0.5795428156852722,0,2,7,5,2,12,-1,7,11,2,6,2,-0.0143752200528979,0.2981117963790894,0.5292059183120728,0,2,8,11,4,3,-1,8,12,4,1,3,-0.0153491804376245,0.7705215215682983,0.4748171865940094,0,2,4,1,2,3,-1,5,1,1,3,2,0.000015152279956964776,0.3718844056129456,0.5576897263526917,0,2,18,3,2,6,-1,18,5,2,2,3,-0.009129391983151436,0.3615196049213409,0.5286766886711121,0,2,0,3,2,6,-1,0,5,2,2,3,0.0022512159775942564,0.5364704728126526,0.3486298024654388,0,2,9,12,2,3,-1,9,13,2,1,3,-0.0049696918576955795,0.6927651762962341,0.4676836133003235,0,2,7,13,4,3,-1,7,14,4,1,3,-0.0128290103748441,0.7712153792381287,0.4660735130310059,0,2,18,0,2,6,-1,18,2,2,2,3,-0.009366006590425968,0.3374983966350555,0.5351287722587585,0,2,0,0,2,6,-1,0,2,2,2,3,0.0032452319283038378,0.5325189828872681,0.3289610147476196,0,2,8,14,6,3,-1,8,15,6,1,3,-0.0117235602810979,0.6837652921676636,0.4754300117492676,0,2,7,4,2,4,-1,8,4,1,4,2,0.00002925794069597032,0.357208788394928,0.5360502004623413,0,2,8,5,4,6,-1,8,7,4,2,3,-0.000022244219508138485,0.5541427135467529,0.3552064001560211,0,2,6,4,2,2,-1,7,4,1,2,2,0.005088150966912508,0.5070844292640686,0.1256462037563324,0,3,3,14,14,4,-1,10,14,7,2,2,3,16,7,2,2,0.0274296794086695,0.5269560217857361,0.1625818014144898,0,3,6,15,6,2,-1,6,15,3,1,2,9,16,3,1,2,-0.00641428679227829,0.7145588994026184,0.4584197103977203,0,2,14,15,6,2,-1,14,16,6,1,2,0.003347995923832059,0.5398612022399902,0.3494696915149689,0,2,2,12,12,8,-1,2,16,12,4,2,-0.0826354920864105,0.2439192980527878,0.5160226225852966,0,2,7,7,7,2,-1,7,8,7,1,2,0.0010261740535497665,0.3886891901493073,0.5767908096313477,0,2,0,2,18,2,-1,0,3,18,1,2,-0.0016307090409100056,0.3389458060264587,0.5347700715065002,0,2,9,6,2,5,-1,9,6,1,5,2,0.0024546680506318808,0.4601413905620575,0.638724684715271,0,2,7,5,3,8,-1,8,5,1,8,3,-0.0009947651997208595,0.5769879221916199,0.4120396077632904,0,2,9,6,3,4,-1,10,6,1,4,3,0.0154091902077198,0.4878709018230438,0.7089822292327881,0,2,4,13,3,2,-1,4,14,3,1,2,0.001178440055809915,0.5263553261756897,0.2895244956016541,0,2,9,4,6,3,-1,11,4,2,3,3,-0.0277019198983908,0.149882897734642,0.5219606757164001,0,2,5,4,6,3,-1,7,4,2,3,3,-0.0295053999871016,0.024893319234252,0.4999816119670868,0,2,14,11,5,2,-1,14,12,5,1,2,0.0004515943001024425,0.5464622974395752,0.4029662907123566,0,2,1,2,6,9,-1,3,2,2,9,3,0.007177263963967562,0.4271056950092316,0.5866296887397766,0,2,14,6,6,13,-1,14,6,3,13,2,-0.0741820484399796,0.6874179244041443,0.4919027984142304,0,3,3,6,14,8,-1,3,6,7,4,2,10,10,7,4,2,-0.0172541607171297,0.3370676040649414,0.534873902797699,0,2,16,0,4,11,-1,16,0,2,11,2,0.0148515598848462,0.4626792967319489,0.6129904985427856,0,3,3,4,12,12,-1,3,4,6,6,2,9,10,6,6,2,0.0100020002573729,0.5346122980117798,0.3423453867435455,0,2,11,4,5,3,-1,11,5,5,1,3,0.0020138120744377375,0.4643830060958862,0.5824304223060608,0,2,4,11,4,2,-1,4,12,4,1,2,0.0015135470312088728,0.5196396112442017,0.2856149971485138,0,2,10,7,2,2,-1,10,7,1,2,2,0.003138143103569746,0.4838162958621979,0.5958529710769653,0,2,8,7,2,2,-1,9,7,1,2,2,-0.005145044066011906,0.8920302987098694,0.4741412103176117,0,2,9,17,3,2,-1,10,17,1,2,3,-0.004473670851439238,0.2033942937850952,0.5337278842926025,0,2,5,6,3,3,-1,5,7,3,1,3,0.001962847076356411,0.457163393497467,0.6725863218307495,0,2,10,0,3,3,-1,11,0,1,3,3,0.005426045041531324,0.5271108150482178,0.2845670878887177,0,3,5,6,6,2,-1,5,6,3,1,2,8,7,3,1,2,0.0004961146041750908,0.4138312935829163,0.5718597769737244,0,2,12,16,4,3,-1,12,17,4,1,3,0.009372878819704056,0.5225151181221008,0.2804847061634064,0,2,3,12,3,2,-1,3,13,3,1,2,0.0006050089723430574,0.523676872253418,0.3314523994922638,0,2,9,12,3,2,-1,9,13,3,1,2,0.0005679255118593574,0.4531059861183167,0.6276971101760864,0,3,1,11,16,4,-1,1,11,8,2,2,9,13,8,2,2,0.0246443394571543,0.5130851864814758,0.2017143964767456,0,2,12,4,3,3,-1,12,5,3,1,3,-0.0102904504165053,0.7786595225334167,0.4876641035079956,0,2,4,4,5,3,-1,4,5,5,1,3,0.002062941901385784,0.4288598895072937,0.5881264209747314,0,2,12,16,4,3,-1,12,17,4,1,3,-0.005051948130130768,0.3523977994918823,0.5286008715629578,0,2,5,4,3,3,-1,5,5,3,1,3,-0.0057692620903253555,0.6841086149215698,0.4588094055652618,0,2,9,0,2,2,-1,9,1,2,1,2,-0.0004578994121402502,0.356552004814148,0.5485978126525879,0,2,8,9,4,2,-1,8,10,4,1,2,-0.0007591883768327534,0.336879312992096,0.5254197120666504,0,2,8,8,4,3,-1,8,9,4,1,3,-0.001773725962266326,0.3422161042690277,0.5454015135765076,0,2,0,13,6,3,-1,2,13,2,3,3,-0.008561046794056892,0.6533612012863159,0.4485856890678406,0,2,16,14,3,2,-1,16,15,3,1,2,0.0017277270089834929,0.5307580232620239,0.3925352990627289,0,2,1,18,18,2,-1,7,18,6,2,3,-0.0281996093690395,0.685745894908905,0.4588584005832672,0,2,16,14,3,2,-1,16,15,3,1,2,-0.001778110978193581,0.4037851095199585,0.5369856953620911,0,2,1,14,3,2,-1,1,15,3,1,2,0.00033177141449414194,0.539979875087738,0.3705750107765198,0,2,7,14,6,3,-1,7,15,6,1,3,0.0026385399978607893,0.4665437042713165,0.6452730894088745,0,2,5,14,8,3,-1,5,15,8,1,3,-0.0021183069329708815,0.5914781093597412,0.4064677059650421,0,2,10,6,4,14,-1,10,6,2,14,2,-0.0147732896730304,0.3642038106918335,0.5294762849807739,0,2,6,6,4,14,-1,8,6,2,14,2,-0.0168154407292604,0.2664231956005096,0.5144972801208496,0,2,13,5,2,3,-1,13,6,2,1,3,-0.006337014026939869,0.6779531240463257,0.4852097928524017,0,2,7,16,6,1,-1,9,16,2,1,3,-0.000044560048991115764,0.5613964796066284,0.4153054058551788,0,2,9,12,3,3,-1,9,13,3,1,3,-0.0010240620467811823,0.5964478254318237,0.4566304087638855,0,2,7,0,3,3,-1,8,0,1,3,3,-0.00231616897508502,0.2976115047931671,0.5188159942626953,0,2,4,0,16,18,-1,4,9,16,9,2,0.5321757197380066,0.5187839269638062,0.220263198018074,0,2,1,1,16,14,-1,1,8,16,7,2,-0.1664305031299591,0.1866022944450378,0.5060343146324158,0,2,3,9,15,4,-1,8,9,5,4,3,0.112535297870636,0.5212125182151794,0.1185022965073586,0,2,6,12,7,3,-1,6,13,7,1,3,0.009304686449468136,0.4589937031269074,0.6826149225234985,0,2,14,15,2,3,-1,14,16,2,1,3,-0.004625509958714247,0.3079940974712372,0.5225008726119995,0,3,2,3,16,14,-1,2,3,8,7,2,10,10,8,7,2,-0.1111646965146065,0.2101044058799744,0.5080801844596863,0,3,16,2,4,18,-1,18,2,2,9,2,16,11,2,9,2,-0.0108884396031499,0.5765355229377747,0.4790464043617249,0,2,4,15,2,3,-1,4,16,2,1,3,0.005856430158019066,0.5065100193023682,0.1563598960638046,0,3,16,2,4,18,-1,18,2,2,9,2,16,11,2,9,2,0.0548543892800808,0.49669149518013,0.7230510711669922,0,2,1,1,8,3,-1,1,2,8,1,3,-0.0111973397433758,0.2194979041814804,0.5098798274993896,0,2,8,11,4,3,-1,8,12,4,1,3,0.004406907130032778,0.4778401851654053,0.6770902872085571,0,2,5,11,5,9,-1,5,14,5,3,3,-0.0636652931571007,0.1936362981796265,0.5081024169921875,0,2,16,0,4,11,-1,16,0,2,11,2,-0.009808149188756943,0.599906325340271,0.4810341000556946,0,2,7,0,6,1,-1,9,0,2,1,3,-0.0021717099007219076,0.3338333964347839,0.5235472917556763,0,2,16,3,3,7,-1,17,3,1,7,3,-0.0133155202493072,0.6617069840431213,0.4919213056564331,0,2,1,3,3,7,-1,2,3,1,7,3,0.002544207964092493,0.4488744139671326,0.6082184910774231,0,2,7,8,6,12,-1,7,12,6,4,3,0.0120378397405148,0.540939211845398,0.3292432129383087,0,2,0,0,4,11,-1,2,0,2,11,2,-0.0207010507583618,0.6819120049476624,0.4594995975494385,0,2,14,0,6,20,-1,14,0,3,20,2,0.0276082791388035,0.4630792140960693,0.5767282843589783,0,2,0,3,1,2,-1,0,4,1,1,2,0.0012370620388537645,0.5165379047393799,0.2635016143321991,0,3,5,5,10,8,-1,10,5,5,4,2,5,9,5,4,2,-0.037669338285923,0.2536393105983734,0.5278980135917664,0,3,4,7,12,4,-1,4,7,6,2,2,10,9,6,2,2,-0.0018057259730994701,0.3985156118869782,0.5517500042915344,54.62007141113281,111,0,2,2,1,6,4,-1,5,1,3,4,2,0.004429902881383896,0.2891018092632294,0.633522629737854,0,3,9,7,6,4,-1,12,7,3,2,2,9,9,3,2,2,-0.0023813319858163595,0.621178925037384,0.3477487862110138,0,2,5,6,2,6,-1,5,9,2,3,2,0.0022915711160749197,0.2254412025213242,0.5582118034362793,0,3,9,16,6,4,-1,12,16,3,2,2,9,18,3,2,2,0.0009945794008672237,0.3711710870265961,0.5930070877075195,0,2,9,4,2,12,-1,9,10,2,6,2,0.0007716466789133847,0.565172016620636,0.334799587726593,0,2,7,1,6,18,-1,9,1,2,18,3,-0.001138641033321619,0.3069126009941101,0.5508630871772766,0,2,4,12,12,2,-1,8,12,4,2,3,-0.0001640303962631151,0.576282799243927,0.3699047863483429,0,2,8,8,6,2,-1,8,9,6,1,2,0.000029793529392918572,0.2644244134426117,0.5437911152839661,0,2,8,0,3,6,-1,9,0,1,6,3,0.008577490225434303,0.5051138997077942,0.1795724928379059,0,2,11,18,3,2,-1,11,19,3,1,2,-0.0002603268949314952,0.5826969146728516,0.4446826875209808,0,2,1,1,17,4,-1,1,3,17,2,2,-0.006140463054180145,0.3113852143287659,0.5346971750259399,0,2,11,8,4,12,-1,11,8,2,12,2,-0.0230869501829147,0.32779461145401,0.533119797706604,0,2,8,14,4,3,-1,8,15,4,1,3,-0.0142436502501369,0.7381709814071655,0.4588063061237335,0,2,12,3,2,17,-1,12,3,1,17,2,0.0194871295243502,0.5256630778312683,0.2274471968412399,0,2,4,7,6,1,-1,6,7,2,1,3,-0.0009668110869824886,0.5511230826377869,0.3815006911754608,0,2,18,3,2,3,-1,18,4,2,1,3,0.003147470997646451,0.5425636768341064,0.2543726861476898,0,2,8,4,3,4,-1,8,6,3,2,2,-0.00018026070029009134,0.5380191802978516,0.3406304121017456,0,2,4,5,12,10,-1,4,10,12,5,2,-0.006026626098901033,0.3035801947116852,0.54205721616745,0,2,5,18,4,2,-1,7,18,2,2,2,0.00044462960795499384,0.3990997076034546,0.5660110116004944,0,2,17,2,3,6,-1,17,4,3,2,3,0.002260976005345583,0.5562806725502014,0.3940688073635101,0,2,7,7,6,6,-1,9,7,2,6,3,0.0511330589652061,0.4609653949737549,0.7118561863899231,0,2,17,2,3,6,-1,17,4,3,2,3,-0.0177863091230392,0.2316166013479233,0.5322144031524658,0,2,8,0,3,4,-1,9,0,1,4,3,-0.004967962857335806,0.233077198266983,0.5122029185295105,0,2,9,14,2,3,-1,9,15,2,1,3,0.002066768938675523,0.4657444059848785,0.6455488204956055,0,2,0,12,6,3,-1,0,13,6,1,3,0.007441376801580191,0.5154392123222351,0.236163392663002,0,2,8,14,4,3,-1,8,15,4,1,3,-0.003627727972343564,0.6219773292541504,0.4476661086082459,0,2,3,12,2,3,-1,3,13,2,1,3,-0.005353075917810202,0.1837355047464371,0.5102208256721497,0,2,5,6,12,7,-1,9,6,4,7,3,0.1453091949224472,0.5145987272262573,0.1535930931568146,0,2,0,2,3,6,-1,0,4,3,2,3,0.0024394490756094456,0.5343660116195679,0.3624661862850189,0,2,14,6,1,3,-1,14,7,1,1,3,-0.003128339070826769,0.6215007901191711,0.4845592081546783,0,2,2,0,3,14,-1,3,0,1,14,3,0.0017940260004252195,0.4299261868000031,0.5824198126792908,0,2,12,14,5,6,-1,12,16,5,2,3,0.0362538211047649,0.5260334014892578,0.1439467966556549,0,2,4,14,5,6,-1,4,16,5,2,3,-0.005174672231078148,0.350653886795044,0.5287045240402222,0,3,11,10,2,2,-1,12,10,1,1,2,11,11,1,1,2,0.0006538329762406647,0.4809640944004059,0.6122040152549744,0,2,5,0,3,14,-1,6,0,1,14,3,-0.0264802295714617,0.1139362007379532,0.5045586228370667,0,2,10,15,2,3,-1,10,16,2,1,3,-0.0030440660193562508,0.6352095007896423,0.4794734120368958,0,2,0,2,2,3,-1,0,3,2,1,3,0.0036993520334362984,0.5131118297576904,0.2498510926961899,0,2,5,11,12,6,-1,5,14,12,3,2,-0.0003676293126773089,0.54213947057724,0.3709532022476196,0,2,6,11,3,9,-1,6,14,3,3,3,-0.041382260620594,0.1894959956407547,0.5081691741943359,0,3,11,10,2,2,-1,12,10,1,1,2,11,11,1,1,2,-0.0010532729793339968,0.645436704158783,0.4783608913421631,0,2,5,6,1,3,-1,5,7,1,1,3,-0.0021648600231856108,0.6215031147003174,0.449982613325119,0,2,4,9,13,3,-1,4,10,13,1,3,-0.0005674774874933064,0.3712610900402069,0.5419334769248962,0,2,1,7,15,6,-1,6,7,5,6,3,0.173758402466774,0.5023643970489502,0.1215742006897926,0,2,4,5,12,6,-1,8,5,4,6,3,-0.0029049699660390615,0.3240267932415009,0.5381883978843689,0,2,8,10,4,3,-1,8,11,4,1,3,0.0012299539521336555,0.4165507853031158,0.5703486204147339,0,2,15,14,1,3,-1,15,15,1,1,3,-0.0005432923790067434,0.3854042887687683,0.554754912853241,0,2,1,11,5,3,-1,1,12,5,1,3,-0.008329725824296474,0.2204494029283524,0.5097082853317261,0,2,7,1,7,12,-1,7,7,7,6,2,-0.00010417630255687982,0.560706615447998,0.4303036034107208,0,3,0,1,6,10,-1,0,1,3,5,2,3,6,3,5,2,0.0312047004699707,0.4621657133102417,0.6982004046440125,0,2,16,1,4,3,-1,16,2,4,1,3,0.007894350215792656,0.5269594192504883,0.226906806230545,0,2,5,5,2,3,-1,5,6,2,1,3,-0.004364531021565199,0.6359223127365112,0.4537956118583679,0,2,12,2,3,5,-1,13,2,1,5,3,0.007679305970668793,0.5274767875671387,0.274048388004303,0,2,0,3,4,6,-1,0,5,4,2,3,-0.0254311393946409,0.2038519978523254,0.5071732997894287,0,2,8,12,4,2,-1,8,13,4,1,2,0.0008200060110539198,0.4587455093860626,0.6119868159294128,0,2,8,18,3,1,-1,9,18,1,1,3,0.002928460016846657,0.5071274042129517,0.2028204947710037,0,3,11,10,2,2,-1,12,10,1,1,2,11,11,1,1,2,0.00004525647091213614,0.4812104105949402,0.5430821776390076,0,3,7,10,2,2,-1,7,10,1,1,2,8,11,1,1,2,0.0013158309739083052,0.4625813961029053,0.6779323220252991,0,2,11,11,4,4,-1,11,13,4,2,2,0.0015870389761403203,0.5386291742324829,0.3431465029716492,0,2,8,12,3,8,-1,9,12,1,8,3,-0.0215396601706743,0.025942500680685,0.5003222823143005,0,2,13,0,6,3,-1,13,1,6,1,3,0.014334480278194,0.5202844738960266,0.1590632945299149,0,2,8,8,3,4,-1,9,8,1,4,3,-0.008388138376176357,0.728248119354248,0.4648044109344482,0,3,5,7,10,10,-1,10,7,5,5,2,5,12,5,5,2,0.00919068418443203,0.556235671043396,0.3923191130161285,0,3,3,18,8,2,-1,3,18,4,1,2,7,19,4,1,2,-0.005845305975526571,0.6803392767906189,0.4629127979278565,0,2,10,2,6,8,-1,12,2,2,8,3,-0.0547077991068363,0.2561671137809753,0.5206125974655151,0,2,4,2,6,8,-1,6,2,2,8,3,0.009114277549088001,0.518962025642395,0.3053877055644989,0,2,11,0,3,7,-1,12,0,1,7,3,-0.0155750000849366,0.1295074969530106,0.5169094800949097,0,2,7,11,2,1,-1,8,11,1,1,2,-0.0001205060034408234,0.5735098123550415,0.4230825006961823,0,2,15,14,1,3,-1,15,15,1,1,3,0.0012273970060050488,0.5289878249168396,0.4079791903495789,0,3,7,15,2,2,-1,7,15,1,1,2,8,16,1,1,2,-0.0012186600361019373,0.6575639843940735,0.4574409127235413,0,2,15,14,1,3,-1,15,15,1,1,3,-0.0033256649039685726,0.3628047108650208,0.5195019841194153,0,2,6,0,3,7,-1,7,0,1,7,3,-0.0132883097976446,0.1284265965223312,0.504348874092102,0,2,18,1,2,7,-1,18,1,1,7,2,-0.0033839771058410406,0.6292240023612976,0.475750595331192,0,2,2,0,8,20,-1,2,10,8,10,2,-0.2195422053337097,0.148773193359375,0.5065013766288757,0,2,3,0,15,6,-1,3,2,15,2,3,0.004911170806735754,0.425610214471817,0.5665838718414307,0,2,4,3,12,2,-1,4,4,12,1,2,-0.00018744950648397207,0.4004144072532654,0.5586857199668884,0,2,16,0,4,5,-1,16,0,2,5,2,-0.00521786417812109,0.6009116172790527,0.4812706112861633,0,2,7,0,3,4,-1,8,0,1,4,3,-0.0011111519997939467,0.3514933884143829,0.5287089943885803,0,2,16,0,4,5,-1,16,0,2,5,2,0.004403640050441027,0.4642275869846344,0.5924085974693298,0,2,1,7,6,13,-1,3,7,2,13,3,0.1229949966073036,0.5025529265403748,0.0691524818539619,0,2,16,0,4,5,-1,16,0,2,5,2,-0.0123135102912784,0.5884591937065125,0.4934012889862061,0,2,0,0,4,5,-1,2,0,2,5,2,0.004147103987634182,0.4372239112854004,0.589347779750824,0,2,14,12,3,6,-1,14,14,3,2,3,-0.003550264984369278,0.4327551126480103,0.5396270155906677,0,2,3,12,3,6,-1,3,14,3,2,3,-0.0192242693156004,0.1913134008646011,0.5068330764770508,0,2,16,1,4,3,-1,16,2,4,1,3,0.0014395059552043676,0.5308178067207336,0.424353301525116,0,3,8,7,2,10,-1,8,7,1,5,2,9,12,1,5,2,-0.00677519990131259,0.6365395784378052,0.4540086090564728,0,2,11,11,4,4,-1,11,13,4,2,2,0.007011963054537773,0.5189834237098694,0.302619993686676,0,2,0,1,4,3,-1,0,2,4,1,3,0.005401465110480785,0.5105062127113342,0.2557682991027832,0,2,13,4,1,3,-1,13,5,1,1,3,0.0009027498890645802,0.4696914851665497,0.5861827731132507,0,2,7,15,3,5,-1,8,15,1,5,3,0.0114744501188397,0.5053645968437195,0.152717798948288,0,2,9,7,3,5,-1,10,7,1,5,3,-0.006702343001961708,0.6508980989456177,0.4890604019165039,0,2,8,7,3,5,-1,9,7,1,5,3,-0.0020462959073483944,0.6241816878318787,0.4514600038528442,0,2,10,6,4,14,-1,10,6,2,14,2,-0.009995156899094582,0.3432781100273132,0.5400953888893127,0,2,0,5,5,6,-1,0,7,5,2,3,-0.0357007086277008,0.1878059059381485,0.5074077844619751,0,2,9,5,6,4,-1,9,5,3,4,2,0.0004558456130325794,0.3805277049541473,0.5402569770812988,0,2,0,0,18,10,-1,6,0,6,10,3,-0.0542606003582478,0.6843714714050293,0.4595097005367279,0,2,10,6,4,14,-1,10,6,2,14,2,0.0060600461438298225,0.5502905249595642,0.450052797794342,0,2,6,6,4,14,-1,8,6,2,14,2,-0.006479183211922646,0.3368858098983765,0.5310757160186768,0,2,13,4,1,3,-1,13,5,1,1,3,-0.0014939469983801246,0.6487640142440796,0.4756175875663757,0,2,5,1,2,3,-1,6,1,1,3,2,0.000014610530342906713,0.403457909822464,0.5451064109802246,0,3,18,1,2,18,-1,19,1,1,9,2,18,10,1,9,2,-0.00723219383507967,0.6386873722076416,0.4824739992618561,0,2,2,1,4,3,-1,2,2,4,1,3,-0.004064581822603941,0.2986421883106232,0.5157335996627808,0,3,18,1,2,18,-1,19,1,1,9,2,18,10,1,9,2,0.0304630808532238,0.5022199749946594,0.7159956097602844,0,3,1,14,4,6,-1,1,14,2,3,2,3,17,2,3,2,-0.008054491132497787,0.6492452025413513,0.4619275033473969,0,2,10,11,7,6,-1,10,13,7,2,3,0.0395051389932632,0.5150570869445801,0.2450613975524902,0,3,0,10,6,10,-1,0,10,3,5,2,3,15,3,5,2,0.008453020825982094,0.4573669135570526,0.6394037008285522,0,2,11,0,3,4,-1,12,0,1,4,3,-0.0011688120430335402,0.3865512013435364,0.548366129398346,0,2,5,10,5,6,-1,5,13,5,3,2,0.002807067008689046,0.5128579139709473,0.2701480090618134,0,2,14,6,1,8,-1,14,10,1,4,2,0.000473652093205601,0.4051581919193268,0.5387461185455322,0,3,1,7,18,6,-1,1,7,9,3,2,10,10,9,3,2,0.0117410803213716,0.5295950174331665,0.3719413876533508,0,2,9,7,2,2,-1,9,7,1,2,2,0.0031833238899707794,0.4789406955242157,0.6895126104354858,0,2,5,9,4,5,-1,7,9,2,5,2,0.0007024150108918548,0.5384489297866821,0.3918080925941467,50.16973114013672,102,0,2,7,6,6,3,-1,9,6,2,3,3,0.0170599296689034,0.3948527872562408,0.7142534852027893,0,2,1,0,18,4,-1,7,0,6,4,3,0.0218408405780792,0.3370316028594971,0.6090016961097717,0,2,7,15,2,4,-1,7,17,2,2,2,0.00024520049919374287,0.3500576019287109,0.5987902283668518,0,2,1,0,19,9,-1,1,3,19,3,3,0.008327260613441467,0.3267528116703033,0.5697240829467773,0,2,3,7,3,6,-1,3,9,3,2,3,0.0005714829894714057,0.3044599890708923,0.5531656742095947,0,3,13,7,4,4,-1,15,7,2,2,2,13,9,2,2,2,0.0006737398798577487,0.3650012016296387,0.567263126373291,0,3,3,7,4,4,-1,3,7,2,2,2,5,9,2,2,2,0.00003468159047770314,0.3313541114330292,0.5388727188110352,0,2,9,6,10,8,-1,9,10,10,4,2,-0.005856339819729328,0.2697942852973938,0.5498778820037842,0,2,3,8,14,12,-1,3,14,14,6,2,0.00851022731512785,0.5269358158111572,0.2762879133224487,0,3,6,5,10,12,-1,11,5,5,6,2,6,11,5,6,2,-0.0698172077536583,0.2909603118896484,0.5259246826171875,0,2,9,11,2,3,-1,9,12,2,1,3,-0.0008611367084085941,0.5892577171325684,0.4073697924613953,0,2,9,5,6,5,-1,9,5,3,5,2,0.0009714924963191152,0.3523564040660858,0.5415862202644348,0,2,9,4,2,4,-1,9,6,2,2,2,-0.00001472749045206001,0.5423017740249634,0.3503156006336212,0,2,9,5,6,5,-1,9,5,3,5,2,0.0484202913939953,0.51939457654953,0.3411195874214172,0,2,5,5,6,5,-1,8,5,3,5,2,0.0013257140526548028,0.315776914358139,0.5335376262664795,0,2,11,2,6,1,-1,13,2,2,1,3,0.00001492214960308047,0.4451299905776978,0.5536553859710693,0,2,3,2,6,1,-1,5,2,2,1,3,-0.002717339899390936,0.3031741976737976,0.5248088836669922,0,2,13,5,2,3,-1,13,6,2,1,3,0.0029219500720500946,0.4781453013420105,0.6606041789054871,0,2,0,10,1,4,-1,0,12,1,2,2,-0.0019804988987743855,0.3186308145523071,0.5287625193595886,0,2,13,5,2,3,-1,13,6,2,1,3,-0.004001210909336805,0.6413596868515015,0.4749928116798401,0,2,8,18,3,2,-1,9,18,1,2,3,-0.004349199123680592,0.1507498025894165,0.5098996758460999,0,2,6,15,9,2,-1,6,16,9,1,2,0.0013490889687091112,0.4316158890724182,0.5881167054176331,0,2,8,14,4,3,-1,8,15,4,1,3,0.0185970701277256,0.4735553860664368,0.9089794158935547,0,2,18,4,2,4,-1,18,6,2,2,2,-0.001856237999163568,0.3553189039230347,0.5577837228775024,0,2,5,5,2,3,-1,5,6,2,1,3,0.002294043079018593,0.4500094950199127,0.6580877900123596,0,2,15,16,3,2,-1,15,17,3,1,2,0.00029982850537635386,0.5629242062568665,0.3975878953933716,0,2,0,0,3,9,-1,0,3,3,3,3,0.0035455459728837013,0.5381547212600708,0.3605485856533051,0,2,9,7,3,3,-1,9,8,3,1,3,0.009610472247004509,0.5255997180938721,0.1796745955944061,0,2,8,7,3,3,-1,8,8,3,1,3,-0.0062783220782876015,0.227285698056221,0.5114030241966248,0,2,9,5,2,6,-1,9,5,1,6,2,0.0034598479978740215,0.4626308083534241,0.6608219146728516,0,2,8,6,3,4,-1,9,6,1,4,3,-0.0013112019514665008,0.6317539811134338,0.4436857998371124,0,3,7,6,8,12,-1,11,6,4,6,2,7,12,4,6,2,0.002687617903575301,0.5421109795570374,0.4054022133350372,0,3,5,6,8,12,-1,5,6,4,6,2,9,12,4,6,2,0.003911816980689764,0.5358477830886841,0.3273454904556274,0,2,12,4,3,3,-1,12,5,3,1,3,-0.014206450432539,0.7793576717376709,0.4975781142711639,0,2,2,16,3,2,-1,2,17,3,1,2,0.0007170552853494883,0.5297319889068604,0.3560903966426849,0,2,12,4,3,3,-1,12,5,3,1,3,0.001663501956500113,0.467809408903122,0.5816481709480286,0,2,2,12,6,6,-1,2,14,6,2,3,0.0033686188980937004,0.5276734232902527,0.3446420133113861,0,2,7,13,6,3,-1,7,14,6,1,3,0.0127995302900672,0.4834679961204529,0.7472159266471863,0,2,6,14,6,3,-1,6,15,6,1,3,0.0033901201095432043,0.4511859118938446,0.6401721239089966,0,2,14,15,5,3,-1,14,16,5,1,3,0.004707077983766794,0.533565878868103,0.355522096157074,0,2,5,4,3,3,-1,5,5,3,1,3,0.0014819339849054813,0.4250707030296326,0.5772724151611328,0,2,14,15,5,3,-1,14,16,5,1,3,-0.0069995759986341,0.3003320097923279,0.5292900204658508,0,2,5,3,6,2,-1,7,3,2,2,3,0.0159390103071928,0.5067319273948669,0.1675581932067871,0,2,8,15,4,3,-1,8,16,4,1,3,0.007637734990566969,0.4795069992542267,0.7085601091384888,0,2,1,15,5,3,-1,1,16,5,1,3,0.006733404006808996,0.5133113265037537,0.2162470072507858,0,3,8,13,4,6,-1,10,13,2,3,2,8,16,2,3,2,-0.012858809903264,0.1938841938972473,0.525137186050415,0,2,7,8,3,3,-1,8,8,1,3,3,-0.0006227080011740327,0.5686538219451904,0.419786810874939,0,2,12,0,5,4,-1,12,2,5,2,2,-0.0005265168147161603,0.4224168956279755,0.5429695844650269,0,3,0,2,20,2,-1,0,2,10,1,2,10,3,10,1,2,0.0110750999301672,0.5113775134086609,0.2514517903327942,0,2,1,0,18,4,-1,7,0,6,4,3,-0.0367282517254353,0.7194662094116211,0.4849618971347809,0,2,4,3,6,1,-1,6,3,2,1,3,-0.00028207109426148236,0.3840261995792389,0.539444625377655,0,2,4,18,13,2,-1,4,19,13,1,2,-0.0027489690110087395,0.593708872795105,0.4569182097911835,0,2,2,10,3,6,-1,2,12,3,2,3,0.0100475195795298,0.5138576030731201,0.2802298069000244,0,3,14,12,6,8,-1,17,12,3,4,2,14,16,3,4,2,-0.008149784058332443,0.6090037226676941,0.4636121094226837,0,3,4,13,10,6,-1,4,13,5,3,2,9,16,5,3,2,-0.006883388850837946,0.3458611071109772,0.5254660248756409,0,2,14,12,1,2,-1,14,13,1,1,2,-0.0000140393603942357,0.5693104267120361,0.4082083106040955,0,2,8,13,4,3,-1,8,14,4,1,3,0.001549841952510178,0.4350537061691284,0.5806517004966736,0,2,14,12,2,2,-1,14,13,2,1,2,-0.006784149911254644,0.1468873023986816,0.5182775259017944,0,2,4,12,2,2,-1,4,13,2,1,2,0.00021705629478674382,0.5293524265289307,0.345617413520813,0,2,8,12,9,2,-1,8,13,9,1,2,0.00031198898795992136,0.4652450978755951,0.5942413806915283,0,2,9,14,2,3,-1,9,15,2,1,3,0.005450753029435873,0.4653508961200714,0.7024846076965332,0,2,11,10,3,6,-1,11,13,3,3,2,-0.00025818689027801156,0.5497295260429382,0.3768967092037201,0,2,5,6,9,12,-1,5,12,9,6,2,-0.0174425393342972,0.3919087946414948,0.5457497835159302,0,2,11,10,3,6,-1,11,13,3,3,2,-0.045343529433012,0.1631357073783875,0.5154908895492554,0,2,6,10,3,6,-1,6,13,3,3,2,0.0019190689781680703,0.514589786529541,0.2791895866394043,0,2,5,4,11,3,-1,5,5,11,1,3,-0.006017786916345358,0.6517636179924011,0.4756332933902741,0,2,7,1,5,10,-1,7,6,5,5,2,-0.004072073847055435,0.5514652729034424,0.4092685878276825,0,2,2,8,18,2,-1,2,9,18,1,2,0.00039855059003457427,0.316524088382721,0.5285550951957703,0,2,7,17,5,3,-1,7,18,5,1,3,-0.0065418570302426815,0.6853377819061279,0.4652808904647827,0,2,5,9,12,1,-1,9,9,4,1,3,0.003484508953988552,0.5484588146209717,0.4502759873867035,0,3,0,14,6,6,-1,0,14,3,3,2,3,17,3,3,2,-0.0136967804282904,0.6395779848098755,0.4572555124759674,0,2,5,9,12,1,-1,9,9,4,1,3,-0.017347140237689,0.2751072943210602,0.5181614756584167,0,2,3,9,12,1,-1,7,9,4,1,3,-0.004088542889803648,0.3325636088848114,0.5194984078407288,0,2,14,10,6,7,-1,14,10,3,7,2,-0.009468790143728256,0.5942280888557434,0.485181987285614,0,2,1,0,16,2,-1,1,1,16,1,2,0.0017084840219467878,0.4167110919952393,0.5519806146621704,0,2,10,9,10,9,-1,10,12,10,3,3,0.009480909444391727,0.5433894991874695,0.4208514988422394,0,2,0,1,10,2,-1,5,1,5,2,2,-0.004738965071737766,0.6407189965248108,0.4560655057430267,0,2,17,3,2,3,-1,17,4,2,1,3,0.006576105020940304,0.5214555263519287,0.2258227020502091,0,2,1,3,2,3,-1,1,4,2,1,3,-0.0021690549328923225,0.3151527941226959,0.5156704783439636,0,2,9,7,3,6,-1,10,7,1,6,3,0.014660170301795,0.4870837032794952,0.668994128704071,0,2,6,5,4,3,-1,8,5,2,3,2,0.00017231999663636088,0.3569748997688294,0.5251078009605408,0,2,7,5,6,6,-1,9,5,2,6,3,-0.0218037609010935,0.8825920820236206,0.496632993221283,0,3,3,4,12,12,-1,3,4,6,6,2,9,10,6,6,2,-0.0947361066937447,0.1446162015199661,0.5061113834381104,0,2,9,2,6,15,-1,11,2,2,15,3,0.0055825551971793175,0.5396478772163391,0.4238066077232361,0,2,2,2,6,17,-1,4,2,2,17,3,0.001951709040440619,0.4170410931110382,0.5497786998748779,0,2,14,10,6,7,-1,14,10,3,7,2,0.0121499001979828,0.4698367118835449,0.5664274096488953,0,2,0,10,6,7,-1,3,10,3,7,2,-0.007516962010413408,0.6267772912979126,0.4463135898113251,0,2,9,2,6,15,-1,11,2,2,15,3,-0.0716679096221924,0.3097011148929596,0.5221003293991089,0,2,5,2,6,15,-1,7,2,2,15,3,-0.0882924199104309,0.0811238884925842,0.5006365180015564,0,2,17,9,3,6,-1,17,11,3,2,3,0.0310630798339844,0.5155503749847412,0.1282255947589874,0,2,6,7,6,6,-1,8,7,2,6,3,0.0466218404471874,0.4699777960777283,0.736396074295044,0,3,1,10,18,6,-1,10,10,9,3,2,1,13,9,3,2,-0.0121894897893071,0.3920530080795288,0.5518996715545654,0,2,0,9,10,9,-1,0,12,10,3,3,0.0130161102861166,0.5260658264160156,0.3685136139392853,0,2,8,15,4,3,-1,8,16,4,1,3,-0.003495289944112301,0.6339294910430908,0.4716280996799469,0,2,5,12,3,4,-1,5,14,3,2,2,-0.00004401503974804655,0.5333027243614197,0.3776184916496277,0,2,3,3,16,12,-1,3,9,16,6,2,-0.1096649020910263,0.1765342056751251,0.5198346972465515,0,3,1,1,12,12,-1,1,1,6,6,2,7,7,6,6,2,-0.0009027955820783973,0.5324159860610962,0.3838908076286316,0,3,10,4,2,4,-1,11,4,1,2,2,10,6,1,2,2,0.0007112664170563221,0.4647929966449738,0.5755224227905273,0,3,0,9,10,2,-1,0,9,5,1,2,5,10,5,1,2,-0.003125027986243367,0.323670893907547,0.5166770815849304,0,2,9,11,3,3,-1,9,12,3,1,3,0.002414467977359891,0.4787439107894898,0.6459717750549316,0,2,3,12,9,2,-1,3,13,9,1,2,0.00044391240226104856,0.4409308135509491,0.6010255813598633,0,2,9,9,2,2,-1,9,10,2,1,2,-0.0002261118934256956,0.4038113951683044,0.5493255853652954,66.66912078857422,135,0,2,3,4,13,6,-1,3,6,13,2,3,-0.0469012893736362,0.660017192363739,0.3743801116943359,0,3,9,7,6,4,-1,12,7,3,2,2,9,9,3,2,2,-0.001456834957934916,0.578399121761322,0.3437797129154205,0,2,1,0,6,8,-1,4,0,3,8,2,0.005559836979955435,0.3622266948223114,0.5908216238021851,0,2,9,5,2,12,-1,9,11,2,6,2,0.0007317048730328679,0.550041913986206,0.2873558104038239,0,2,4,4,3,10,-1,4,9,3,5,2,0.001331800944171846,0.267316997051239,0.5431019067764282,0,2,6,17,8,3,-1,6,18,8,1,3,0.00024347059661522508,0.3855027854442596,0.574138879776001,0,2,0,5,10,6,-1,0,7,10,2,3,-0.0030512469820678234,0.5503209829330444,0.3462845087051392,0,2,13,2,3,2,-1,13,3,3,1,2,-0.0006865719915367663,0.3291221857070923,0.5429509282112122,0,2,7,5,4,5,-1,9,5,2,5,2,0.001466820016503334,0.3588382005691528,0.5351811051368713,0,2,12,14,3,6,-1,12,16,3,2,3,0.0003202187072020024,0.429684191942215,0.5700234174728394,0,2,1,11,8,2,-1,1,12,8,1,2,0.0007412218837998807,0.5282164812088013,0.3366870880126953,0,2,7,13,6,3,-1,7,14,6,1,3,0.0038330298848450184,0.4559567868709564,0.6257336139678955,0,2,0,5,3,6,-1,0,7,3,2,3,-0.0154564399272203,0.2350116968154907,0.512945294380188,0,2,13,2,3,2,-1,13,3,3,1,2,0.002679677912965417,0.5329415202140808,0.4155062139034271,0,3,4,14,4,6,-1,4,14,2,3,2,6,17,2,3,2,0.0028296569362282753,0.4273087978363037,0.5804538130760193,0,2,13,2,3,2,-1,13,3,3,1,2,-0.0039444249123334885,0.2912611961364746,0.5202686190605164,0,2,8,2,4,12,-1,8,6,4,4,3,0.002717955969274044,0.5307688117027283,0.3585677146911621,0,3,14,0,6,8,-1,17,0,3,4,2,14,4,3,4,2,0.005907762795686722,0.470377504825592,0.5941585898399353,0,2,7,17,3,2,-1,8,17,1,2,3,-0.004224034957587719,0.2141567021608353,0.5088796019554138,0,2,8,12,4,2,-1,8,13,4,1,2,0.0040725888684391975,0.4766413867473602,0.6841061115264893,0,3,6,0,8,12,-1,6,0,4,6,2,10,6,4,6,2,0.0101495301350951,0.5360798835754395,0.3748497068881989,0,3,14,0,2,10,-1,15,0,1,5,2,14,5,1,5,2,-0.00018864999583456665,0.5720130205154419,0.3853805065155029,0,3,5,3,8,6,-1,5,3,4,3,2,9,6,4,3,2,-0.0048864358104765415,0.3693122863769531,0.5340958833694458,0,3,14,0,6,10,-1,17,0,3,5,2,14,5,3,5,2,0.0261584799736738,0.4962374866008759,0.6059989929199219,0,2,9,14,1,2,-1,9,15,1,1,2,0.0004856075975112617,0.4438945949077606,0.6012468934059143,0,2,15,10,4,3,-1,15,11,4,1,3,0.0112687097862363,0.5244250297546387,0.1840388029813767,0,2,8,14,2,3,-1,8,15,2,1,3,-0.0028114619199186563,0.6060283780097961,0.4409897029399872,0,3,3,13,14,4,-1,10,13,7,2,2,3,15,7,2,2,-0.005611272994428873,0.3891170918941498,0.5589237213134766,0,2,1,10,4,3,-1,1,11,4,1,3,0.008568009361624718,0.5069345831871033,0.2062619030475617,0,2,9,11,6,1,-1,11,11,2,1,3,-0.00038172779022715986,0.5882201790809631,0.41926109790802,0,2,5,11,6,1,-1,7,11,2,1,3,-0.00017680290329735726,0.5533605813980103,0.400336891412735,0,2,3,5,16,15,-1,3,10,16,5,3,0.006511253770440817,0.3310146927833557,0.5444191098213196,0,2,6,12,4,2,-1,8,12,2,2,2,-0.00006594868318643421,0.5433831810951233,0.3944905996322632,0,3,4,4,12,10,-1,10,4,6,5,2,4,9,6,5,2,0.006993905175477266,0.5600358247756958,0.4192714095115662,0,2,8,6,3,4,-1,9,6,1,4,3,-0.0046744439750909805,0.6685466766357422,0.4604960978031158,0,3,8,12,4,8,-1,10,12,2,4,2,8,16,2,4,2,0.0115898502990603,0.5357121229171753,0.2926830053329468,0,2,8,14,4,3,-1,8,15,4,1,3,0.013007840141654,0.4679817855358124,0.730746328830719,0,2,12,2,3,2,-1,13,2,1,2,3,-0.0011008579749614,0.3937501013278961,0.5415065288543701,0,2,8,15,3,2,-1,8,16,3,1,2,0.0006047264905646443,0.4242376089096069,0.5604041218757629,0,2,6,0,9,14,-1,9,0,3,14,3,-0.0144948400557041,0.3631210029125214,0.5293182730674744,0,2,9,6,2,3,-1,10,6,1,3,2,-0.005305694881826639,0.686045229434967,0.4621821045875549,0,2,10,8,2,3,-1,10,9,2,1,3,-0.00081829127157107,0.3944096863269806,0.542043924331665,0,2,0,9,4,6,-1,0,11,4,2,3,-0.0190775208175182,0.1962621957063675,0.5037891864776611,0,2,6,0,8,2,-1,6,1,8,1,2,0.00035549470339901745,0.4086259007453919,0.5613973140716553,0,2,6,14,7,3,-1,6,15,7,1,3,0.0019679730758070946,0.448912113904953,0.5926123261451721,0,2,8,10,8,9,-1,8,13,8,3,3,0.006918914150446653,0.5335925817489624,0.3728385865688324,0,2,5,2,3,2,-1,6,2,1,2,3,0.002987277926877141,0.5111321210861206,0.2975643873214722,0,3,14,1,6,8,-1,17,1,3,4,2,14,5,3,4,2,-0.006226461846381426,0.5541489720344543,0.4824537932872772,0,3,0,1,6,8,-1,0,1,3,4,2,3,5,3,4,2,0.013353300280869,0.4586423933506012,0.6414797902107239,0,3,1,2,18,6,-1,10,2,9,3,2,1,5,9,3,2,0.0335052385926247,0.5392425060272217,0.3429994881153107,0,2,9,3,2,1,-1,10,3,1,1,2,-0.0025294460356235504,0.1703713983297348,0.5013315081596375,0,3,13,2,4,6,-1,15,2,2,3,2,13,5,2,3,2,-0.001280162949115038,0.5305461883544922,0.4697405099868774,0,2,5,4,3,3,-1,5,5,3,1,3,0.007068738806992769,0.4615545868873596,0.643650472164154,0,2,13,5,1,3,-1,13,6,1,1,3,0.0009688049904070795,0.4833599030971527,0.6043894290924072,0,2,2,16,5,3,-1,2,17,5,1,3,0.003964765928685665,0.5187637209892273,0.323181688785553,0,3,13,2,4,6,-1,15,2,2,3,2,13,5,2,3,2,-0.022057730704546,0.4079256951808929,0.520098090171814,0,3,3,2,4,6,-1,3,2,2,3,2,5,5,2,3,2,-0.0006690631271339953,0.533160924911499,0.3815600872039795,0,2,13,5,1,2,-1,13,6,1,1,2,-0.0006700932863168418,0.5655422210693359,0.4688901901245117,0,2,5,5,2,2,-1,5,6,2,1,2,0.000742845528293401,0.4534381031990051,0.6287400126457214,0,2,13,9,2,2,-1,13,9,1,2,2,0.0022227810695767403,0.5350633263587952,0.3303655982017517,0,2,5,9,2,2,-1,6,9,1,2,2,-0.005413052160292864,0.1113687008619309,0.500543475151062,0,2,13,17,3,2,-1,13,18,3,1,2,-0.000014520040167553816,0.5628737807273865,0.4325133860111237,0,3,6,16,4,4,-1,6,16,2,2,2,8,18,2,2,2,0.00023369169502984732,0.4165835082530975,0.5447791218757629,0,2,9,16,2,3,-1,9,17,2,1,3,0.004289454780519009,0.4860391020774841,0.6778649091720581,0,2,0,13,9,6,-1,0,15,9,2,3,0.0059103150852024555,0.52623051404953,0.3612113893032074,0,2,9,14,2,6,-1,9,17,2,3,2,0.0129005396738648,0.5319377183914185,0.32502880692482,0,2,9,15,2,3,-1,9,16,2,1,3,0.004698297940194607,0.461824506521225,0.6665925979614258,0,2,1,10,18,6,-1,1,12,18,2,3,0.0104398597031832,0.550567090511322,0.3883604109287262,0,2,8,11,4,2,-1,8,12,4,1,2,0.0030443191062659025,0.4697853028774262,0.7301844954490662,0,2,7,9,6,2,-1,7,10,6,1,2,-0.0006159375188872218,0.3830839097499847,0.5464984178543091,0,2,8,8,2,3,-1,8,9,2,1,3,-0.0034247159492224455,0.256630003452301,0.5089530944824219,0,2,17,5,3,4,-1,18,5,1,4,3,-0.009353856556117535,0.6469966173171997,0.49407958984375,0,2,1,19,18,1,-1,7,19,6,1,3,0.0523389987647533,0.4745982885360718,0.787877082824707,0,2,9,0,3,2,-1,10,0,1,2,3,0.0035765620414167643,0.5306664705276489,0.2748498022556305,0,2,1,8,1,6,-1,1,10,1,2,3,0.0007155531784519553,0.541312575340271,0.4041908979415894,0,2,12,17,8,3,-1,12,17,4,3,2,-0.0105166798457503,0.6158512234687805,0.4815283119678497,0,2,0,5,3,4,-1,1,5,1,4,3,0.007734792772680521,0.4695805907249451,0.7028980851173401,0,2,9,7,2,3,-1,9,8,2,1,3,-0.004322677850723267,0.2849566042423248,0.5304684042930603,0,3,7,11,2,2,-1,7,11,1,1,2,8,12,1,1,2,-0.0025534399319440126,0.7056984901428223,0.4688892066478729,0,2,11,3,2,5,-1,11,3,1,5,2,0.00010268510231981054,0.3902932107448578,0.5573464035987854,0,2,7,3,2,5,-1,8,3,1,5,2,0.000007139518857002258,0.368423193693161,0.526398777961731,0,2,15,13,2,3,-1,15,14,2,1,3,-0.0016711989883333445,0.3849175870418549,0.5387271046638489,0,2,5,6,2,3,-1,5,7,2,1,3,0.004926044959574938,0.4729771912097931,0.7447251081466675,0,2,4,19,15,1,-1,9,19,5,1,3,0.0043908702209591866,0.4809181094169617,0.5591921806335449,0,2,1,19,15,1,-1,6,19,5,1,3,-0.0177936293184757,0.6903678178787231,0.4676927030086517,0,2,15,13,2,3,-1,15,14,2,1,3,0.002046966925263405,0.5370690226554871,0.3308162093162537,0,2,5,0,4,15,-1,7,0,2,15,2,0.0298914890736341,0.5139865279197693,0.3309059143066406,0,2,9,6,2,5,-1,9,6,1,5,2,0.0015494900289922953,0.466023713350296,0.6078342795372009,0,2,9,5,2,7,-1,10,5,1,7,2,0.001495696953497827,0.4404835999011993,0.5863919854164124,0,2,16,11,3,3,-1,16,12,3,1,3,0.0009588592802174389,0.5435971021652222,0.4208523035049439,0,2,1,11,3,3,-1,1,12,3,1,3,0.0004964370164088905,0.5370578169822693,0.4000622034072876,0,2,6,6,8,3,-1,6,7,8,1,3,-0.00272808107547462,0.5659412741661072,0.4259642958641052,0,2,0,15,6,2,-1,0,16,6,1,2,0.0023026480339467525,0.5161657929420471,0.3350869119167328,0,2,1,0,18,6,-1,7,0,6,6,3,0.2515163123607636,0.4869661927223206,0.714730978012085,0,2,6,0,3,4,-1,7,0,1,4,3,-0.004632802214473486,0.27274489402771,0.5083789825439453,0,3,14,10,4,10,-1,16,10,2,5,2,14,15,2,5,2,-0.0404344908893108,0.6851438879966736,0.5021767020225525,0,2,3,2,3,2,-1,4,2,1,2,3,0.000014972220014897175,0.428446501493454,0.5522555112838745,0,2,11,2,2,2,-1,11,3,2,1,2,-0.00024050309730228037,0.4226118922233582,0.5390074849128723,0,3,2,10,4,10,-1,2,10,2,5,2,4,15,2,5,2,0.0236578397452831,0.4744631946086884,0.7504366040229797,0,3,0,13,20,6,-1,10,13,10,3,2,0,16,10,3,2,-0.00814491044729948,0.424505889415741,0.5538362860679626,0,2,0,5,2,15,-1,1,5,1,15,2,-0.003699213033542037,0.5952357053756714,0.4529713094234467,0,3,1,7,18,4,-1,10,7,9,2,2,1,9,9,2,2,-0.0067718601785600185,0.4137794077396393,0.5473399758338928,0,2,0,0,2,17,-1,1,0,1,17,2,0.004266953095793724,0.4484114944934845,0.5797994136810303,0,3,2,6,16,6,-1,10,6,8,3,2,2,9,8,3,2,0.0017791989957913756,0.5624858736991882,0.4432444870471954,0,2,8,14,1,3,-1,8,15,1,1,3,0.0016774770338088274,0.4637751877307892,0.63642418384552,0,2,8,15,4,2,-1,8,16,4,1,2,0.0011732629500329494,0.4544503092765808,0.5914415717124939,0,3,5,2,8,2,-1,5,2,4,1,2,9,3,4,1,2,0.000869981711730361,0.5334752798080444,0.3885917961597443,0,2,6,11,8,6,-1,6,14,8,3,2,0.0007637834060005844,0.5398585200309753,0.374494194984436,0,2,9,13,2,2,-1,9,14,2,1,2,0.00015684569370932877,0.4317873120307922,0.5614616274833679,0,2,18,4,2,6,-1,18,6,2,2,3,-0.0215113703161478,0.1785925030708313,0.5185542702674866,0,2,9,12,2,2,-1,9,13,2,1,2,0.00013081369979772717,0.4342499077320099,0.5682849884033203,0,2,18,4,2,6,-1,18,6,2,2,3,0.021992040798068,0.5161716938018799,0.2379394024610519,0,2,9,13,1,3,-1,9,14,1,1,3,-0.0008013650076463819,0.598676323890686,0.4466426968574524,0,2,18,4,2,6,-1,18,6,2,2,3,-0.008273609913885593,0.410821795463562,0.5251057147979736,0,2,0,4,2,6,-1,0,6,2,2,3,0.0036831789184361696,0.5173814296722412,0.339751809835434,0,2,9,12,3,3,-1,9,13,3,1,3,-0.007952568121254444,0.6888983249664307,0.4845924079418182,0,2,3,13,2,3,-1,3,14,2,1,3,0.0015382299898192286,0.5178567171096802,0.3454113900661469,0,2,13,13,4,3,-1,13,14,4,1,3,-0.0140435304492712,0.1678421050310135,0.518866777420044,0,2,5,4,3,3,-1,5,5,3,1,3,0.0014315890148282051,0.436825692653656,0.5655773878097534,0,2,5,2,10,6,-1,5,4,10,2,3,-0.0340142287313938,0.7802296280860901,0.4959217011928558,0,2,3,13,4,3,-1,3,14,4,1,3,-0.0120272999629378,0.1585101038217545,0.503223180770874,0,2,3,7,15,5,-1,8,7,5,5,3,0.1331661939620972,0.5163304805755615,0.2755128145217896,0,2,3,7,12,2,-1,7,7,4,2,3,-0.0015221949433907866,0.372831791639328,0.5214552283287048,0,2,10,3,3,9,-1,11,3,1,9,3,-0.000939292716793716,0.5838379263877869,0.4511165022850037,0,2,8,6,4,6,-1,10,6,2,6,2,0.0277197398245335,0.4728286862373352,0.7331544756889343,0,2,9,7,4,3,-1,9,8,4,1,3,0.003103015013039112,0.5302202105522156,0.4101563096046448,0,2,0,9,4,9,-1,2,9,2,9,2,0.0778612196445465,0.4998334050178528,0.127296194434166,0,2,9,13,3,5,-1,10,13,1,5,3,-0.0158549398183823,0.0508333593606949,0.5165656208992004,0,2,7,7,6,3,-1,9,7,2,3,3,-0.00497253006324172,0.6798133850097656,0.4684231877326965,0,2,9,7,3,5,-1,10,7,1,5,3,-0.0009767650626599789,0.6010771989822388,0.4788931906223297,0,2,5,7,8,2,-1,9,7,4,2,2,-0.0024647710379213095,0.3393397927284241,0.5220503807067871,0,2,5,9,12,2,-1,9,9,4,2,3,-0.006793770007789135,0.4365136921405792,0.5239663124084473,0,2,5,6,10,3,-1,10,6,5,3,2,0.0326080210506916,0.505272388458252,0.2425214946269989,0,2,10,12,3,1,-1,11,12,1,1,3,-0.0005851442110724747,0.5733973979949951,0.4758574068546295,0,2,0,1,11,15,-1,0,6,11,5,3,-0.0296326000243425,0.3892289102077484,0.5263597965240479,67.69892120361328,137,0,2,1,0,18,6,-1,7,0,6,6,3,0.0465508513152599,0.3276950120925903,0.6240522861480713,0,2,7,7,6,1,-1,9,7,2,1,3,0.007953712716698647,0.4256485104560852,0.6942939162254333,0,3,5,16,6,4,-1,5,16,3,2,2,8,18,3,2,2,0.0006822156137786806,0.3711487054824829,0.59007328748703,0,2,6,5,9,8,-1,6,9,9,4,2,-0.00019348249770700932,0.2041133940219879,0.53005450963974,0,2,5,10,2,6,-1,5,13,2,3,2,-0.0002671050897333771,0.5416126251220703,0.3103179037570953,0,3,7,6,8,10,-1,11,6,4,5,2,7,11,4,5,2,0.0027818060480058193,0.5277832746505737,0.3467069864273071,0,3,5,6,8,10,-1,5,6,4,5,2,9,11,4,5,2,-0.000467790785478428,0.5308231115341187,0.3294492065906525,0,2,9,5,2,2,-1,9,6,2,1,2,-0.000030335160772665404,0.577387273311615,0.3852097094058991,0,2,5,12,8,2,-1,5,13,8,1,2,0.0007803800981491804,0.4317438900470734,0.6150057911872864,0,2,10,2,8,2,-1,10,3,8,1,2,-0.004255385138094425,0.2933903932571411,0.5324292778968811,0,3,4,0,2,10,-1,4,0,1,5,2,5,5,1,5,2,-0.0002473561035003513,0.5468844771385193,0.3843030035495758,0,2,9,10,2,2,-1,9,11,2,1,2,-0.00014724259381182492,0.4281542897224426,0.5755587220191956,0,2,2,8,15,3,-1,2,9,15,1,3,0.0011864770203828812,0.374730110168457,0.5471466183662415,0,2,8,13,4,3,-1,8,14,4,1,3,0.0023936580400913954,0.4537783861160278,0.6111528873443604,0,2,7,2,3,2,-1,8,2,1,2,3,-0.0015390539774671197,0.2971341907978058,0.518953800201416,0,2,7,13,6,3,-1,7,14,6,1,3,-0.007196879014372826,0.6699066758155823,0.4726476967334747,0,2,9,9,2,2,-1,9,10,2,1,2,-0.0004149978922214359,0.3384954035282135,0.5260317921638489,0,2,17,2,3,6,-1,17,4,3,2,3,0.004435983020812273,0.539912223815918,0.3920140862464905,0,2,1,5,3,4,-1,2,5,1,4,3,0.0026606200262904167,0.4482578039169312,0.6119617819786072,0,2,14,8,4,6,-1,14,10,4,2,3,-0.0015287200221791863,0.3711237907409668,0.5340266227722168,0,2,1,4,3,8,-1,2,4,1,8,3,-0.0047397250309586525,0.603108823299408,0.4455145001411438,0,2,8,13,4,6,-1,8,16,4,3,2,-0.0148291299119592,0.2838754057884216,0.5341861844062805,0,2,3,14,2,2,-1,3,15,2,1,2,0.0009227555710822344,0.5209547281265259,0.3361653983592987,0,2,14,8,4,6,-1,14,10,4,2,3,0.0835298076272011,0.5119969844818115,0.0811644494533539,0,2,2,8,4,6,-1,2,10,4,2,3,-0.0007563314866274595,0.331712007522583,0.5189831256866455,0,2,10,14,1,6,-1,10,17,1,3,2,0.009840385988354683,0.524759829044342,0.233495905995369,0,2,7,5,3,6,-1,8,5,1,6,3,-0.0015953830443322659,0.5750094056129456,0.4295622110366821,0,3,11,2,2,6,-1,12,2,1,3,2,11,5,1,3,2,0.000034766020689858124,0.4342445135116577,0.5564029216766357,0,2,6,6,6,5,-1,8,6,2,5,3,0.0298629105091095,0.4579147100448608,0.6579188108444214,0,2,17,1,3,6,-1,17,3,3,2,3,0.0113255903124809,0.5274311900138855,0.3673888146877289,0,2,8,7,3,5,-1,9,7,1,5,3,-0.008782864548265934,0.7100368738174438,0.4642167091369629,0,2,9,18,3,2,-1,10,18,1,2,3,0.004363995976746082,0.5279216170310974,0.2705877125263214,0,2,8,18,3,2,-1,9,18,1,2,3,0.004180472809821367,0.5072525143623352,0.2449083030223846,0,2,12,3,5,2,-1,12,4,5,1,2,-0.0004566851130221039,0.4283105134963989,0.5548691153526306,0,2,7,1,5,12,-1,7,7,5,6,2,-0.0037140368949621916,0.5519387722015381,0.4103653132915497,0,2,1,0,18,4,-1,7,0,6,4,3,-0.025304289534688,0.6867002248764038,0.48698890209198,0,2,4,2,2,2,-1,4,3,2,1,2,-0.0003445408074185252,0.3728874027729034,0.528769314289093,0,3,11,14,4,2,-1,13,14,2,1,2,11,15,2,1,2,-0.0008393523166887462,0.6060152053833008,0.4616062045097351,0,2,0,2,3,6,-1,0,4,3,2,3,0.0172800496220589,0.5049635767936707,0.1819823980331421,0,2,9,7,2,3,-1,9,8,2,1,3,-0.006359507795423269,0.1631239950656891,0.5232778787612915,0,2,5,5,1,3,-1,5,6,1,1,3,0.0010298109846189618,0.446327805519104,0.6176549196243286,0,2,10,10,6,1,-1,10,10,3,1,2,0.0010117109632119536,0.5473384857177734,0.4300698935985565,0,2,4,10,6,1,-1,7,10,3,1,2,-0.010308800265193,0.1166985034942627,0.5000867247581482,0,2,9,17,3,3,-1,9,18,3,1,3,0.005468201823532581,0.4769287109375,0.6719213724136353,0,2,4,14,1,3,-1,4,15,1,1,3,-0.0009169646073132753,0.3471089899539948,0.5178164839744568,0,2,12,5,3,3,-1,12,6,3,1,3,0.002392282010987401,0.4785236120223999,0.6216310858726501,0,2,4,5,12,3,-1,4,6,12,1,3,-0.007557381875813007,0.5814796090126038,0.4410085082054138,0,2,9,8,2,3,-1,9,9,2,1,3,-0.0007702403236180544,0.387800008058548,0.546572208404541,0,2,4,9,3,3,-1,5,9,1,3,3,-0.00871259905397892,0.1660051047801971,0.4995836019515991,0,2,6,0,9,17,-1,9,0,3,17,3,-0.0103063201531768,0.4093391001224518,0.5274233818054199,0,2,9,12,1,3,-1,9,13,1,1,3,-0.002094097901135683,0.6206194758415222,0.4572280049324036,0,2,9,5,2,15,-1,9,10,2,5,3,0.006809905171394348,0.5567759275436401,0.4155600070953369,0,2,8,14,2,3,-1,8,15,2,1,3,-0.0010746059706434608,0.5638927817344666,0.4353024959564209,0,2,10,14,1,3,-1,10,15,1,1,3,0.0021550289820879698,0.4826265871524811,0.6749758124351501,0,2,7,1,6,5,-1,9,1,2,5,3,0.0317423194646835,0.5048379898071289,0.188324898481369,0,2,0,0,20,2,-1,0,0,10,2,2,-0.0783827230334282,0.2369548976421356,0.5260158181190491,0,2,2,13,5,3,-1,2,14,5,1,3,0.005741511937230825,0.5048828721046448,0.2776469886302948,0,2,9,11,2,3,-1,9,12,2,1,3,-0.0029014600440859795,0.6238604784011841,0.4693317115306854,0,2,2,5,9,15,-1,2,10,9,5,3,-0.0026427931152284145,0.3314141929149628,0.5169777274131775,0,3,5,0,12,10,-1,11,0,6,5,2,5,5,6,5,2,-0.1094966009259224,0.2380045056343079,0.5183441042900085,0,2,5,1,2,3,-1,6,1,1,3,2,0.00007407591328956187,0.406963586807251,0.5362150073051453,0,2,10,7,6,1,-1,12,7,2,1,3,-0.0005059380200691521,0.5506706237792969,0.437459409236908,0,3,3,1,2,10,-1,3,1,1,5,2,4,6,1,5,2,-0.0008213177789002657,0.5525709986686707,0.4209375977516174,0,2,13,7,2,1,-1,13,7,1,1,2,-0.000060276539443293586,0.5455474853515625,0.4748266041278839,0,2,4,13,4,6,-1,4,15,4,2,3,0.006806514225900173,0.5157995820045471,0.3424577116966248,0,2,13,7,2,1,-1,13,7,1,1,2,0.0017202789895236492,0.5013207793235779,0.6331263780593872,0,2,5,7,2,1,-1,6,7,1,1,2,-0.0001301692973356694,0.5539718270301819,0.4226869940757752,0,3,2,12,18,4,-1,11,12,9,2,2,2,14,9,2,2,-0.004801638890057802,0.4425095021724701,0.5430780053138733,0,3,5,7,2,2,-1,5,7,1,1,2,6,8,1,1,2,-0.002539931097999215,0.7145782113075256,0.4697605073451996,0,2,16,3,4,2,-1,16,4,4,1,2,-0.0014278929447755218,0.4070445001125336,0.539960503578186,0,3,0,2,2,18,-1,0,2,1,9,2,1,11,1,9,2,-0.0251425504684448,0.7884690761566162,0.4747352004051209,0,3,1,2,18,4,-1,10,2,9,2,2,1,4,9,2,2,-0.0038899609353393316,0.4296191930770874,0.5577110052108765,0,2,9,14,1,3,-1,9,15,1,1,3,0.004394745919853449,0.4693162143230438,0.702394425868988,0,3,2,12,18,4,-1,11,12,9,2,2,2,14,9,2,2,0.0246784202754498,0.5242322087287903,0.3812510073184967,0,3,0,12,18,4,-1,0,12,9,2,2,9,14,9,2,2,0.0380476787686348,0.5011739730834961,0.1687828004360199,0,2,11,4,5,3,-1,11,5,5,1,3,0.007942486554384232,0.4828582108020783,0.6369568109512329,0,2,6,4,7,3,-1,6,5,7,1,3,-0.0015110049862414598,0.5906485915184021,0.4487667977809906,0,2,13,17,3,3,-1,13,18,3,1,3,0.0064201741479337215,0.5241097807884216,0.2990570068359375,0,2,8,1,3,4,-1,9,1,1,4,3,-0.0029802159406244755,0.3041465878486633,0.5078489780426025,0,2,11,4,2,4,-1,11,4,1,4,2,-0.0007458007894456387,0.4128139019012451,0.5256826281547546,0,2,0,17,9,3,-1,3,17,3,3,3,-0.0104709500446916,0.5808395147323608,0.4494296014308929,0,3,11,0,2,8,-1,12,0,1,4,2,11,4,1,4,2,0.009336920455098152,0.524655282497406,0.265894889831543,0,3,0,8,6,12,-1,0,8,3,6,2,3,14,3,6,2,0.0279369000345469,0.4674955010414124,0.7087256908416748,0,2,10,7,4,12,-1,10,13,4,6,2,0.007427767850458622,0.5409486889839172,0.3758518099784851,0,2,5,3,8,14,-1,5,10,8,7,2,-0.0235845092684031,0.3758639991283417,0.5238550901412964,0,2,14,10,6,1,-1,14,10,3,1,2,0.0011452640173956752,0.4329578876495361,0.5804247260093689,0,2,0,4,10,4,-1,0,6,10,2,2,-0.0004346866044215858,0.5280618071556091,0.3873069882392883,0,2,10,0,5,8,-1,10,4,5,4,2,0.0106485402211547,0.4902113080024719,0.5681251883506775,0,3,8,1,4,8,-1,8,1,2,4,2,10,5,2,4,2,-0.0003941805043723434,0.5570880174636841,0.4318251013755798,0,2,9,11,6,1,-1,11,11,2,1,3,-0.00013270479394122958,0.5658439993858337,0.4343554973602295,0,2,8,9,3,4,-1,9,9,1,4,3,-0.002012551063671708,0.6056739091873169,0.4537523984909058,0,2,18,4,2,6,-1,18,6,2,2,3,0.0024854319635778666,0.5390477180480957,0.4138010144233704,0,2,8,8,3,4,-1,9,8,1,4,3,0.0018237880431115627,0.4354828894138336,0.5717188715934753,0,2,7,1,13,3,-1,7,2,13,1,3,-0.0166566595435143,0.3010913133621216,0.521612286567688,0,2,7,13,6,1,-1,9,13,2,1,3,0.0008034955826587975,0.5300151109695435,0.3818396925926209,0,2,12,11,3,6,-1,12,13,3,2,3,0.003417037893086672,0.5328028798103333,0.4241400063037872,0,2,5,11,6,1,-1,7,11,2,1,3,-0.00036222729249857366,0.5491728186607361,0.418697714805603,0,3,1,4,18,10,-1,10,4,9,5,2,1,9,9,5,2,-0.1163002029061317,0.1440722048282623,0.522645115852356,0,2,8,6,4,9,-1,8,9,4,3,3,-0.0146950101479888,0.7747725248336792,0.4715717136859894,0,2,8,6,4,3,-1,8,7,4,1,3,0.0021972130052745342,0.5355433821678162,0.3315644860267639,0,2,8,7,3,3,-1,9,7,1,3,3,-0.00046965209185145795,0.5767235159873962,0.4458136856555939,0,2,14,15,4,3,-1,14,16,4,1,3,0.006514499895274639,0.5215674042701721,0.3647888898849487,0,2,5,10,3,10,-1,6,10,1,10,3,0.0213000606745481,0.4994204938411713,0.1567950993776321,0,2,8,15,4,3,-1,8,16,4,1,3,0.0031881409231573343,0.4742200076580048,0.6287270188331604,0,2,0,8,1,6,-1,0,10,1,2,3,0.0009001977741718292,0.5347954034805298,0.394375205039978,0,2,10,15,1,3,-1,10,16,1,1,3,-0.005177227780222893,0.6727191805839539,0.5013138055801392,0,2,2,15,4,3,-1,2,16,4,1,3,-0.004376464989036322,0.3106675148010254,0.5128793120384216,0,3,18,3,2,8,-1,19,3,1,4,2,18,7,1,4,2,0.002629996044561267,0.488631010055542,0.5755215883255005,0,3,0,3,2,8,-1,0,3,1,4,2,1,7,1,4,2,-0.002045868895947933,0.6025794148445129,0.4558076858520508,0,3,3,7,14,10,-1,10,7,7,5,2,3,12,7,5,2,0.0694827064871788,0.5240747928619385,0.2185259014368057,0,2,0,7,19,3,-1,0,8,19,1,3,0.0240489393472672,0.501186728477478,0.2090622037649155,0,2,12,6,3,3,-1,12,7,3,1,3,0.003109534038230777,0.4866712093353272,0.7108548283576965,0,2,0,6,1,3,-1,0,7,1,1,3,-0.00125032605137676,0.3407891094684601,0.5156195163726807,0,2,12,6,3,3,-1,12,7,3,1,3,-0.0010281190043315291,0.557557225227356,0.443943202495575,0,2,5,6,3,3,-1,5,7,3,1,3,-0.008889362215995789,0.6402000784873962,0.4620442092418671,0,2,8,2,4,2,-1,8,3,4,1,2,-0.0006109480164013803,0.3766441941261292,0.5448899865150452,0,2,6,3,4,12,-1,8,3,2,12,2,-0.005768635775893927,0.3318648934364319,0.5133677124977112,0,2,13,6,2,3,-1,13,7,2,1,3,0.0018506490159779787,0.4903570115566254,0.6406934857368469,0,2,0,10,20,4,-1,0,12,20,2,2,-0.0997994691133499,0.1536051034927368,0.5015562176704407,0,2,2,0,17,14,-1,2,7,17,7,2,-0.3512834906578064,0.0588231310248375,0.5174378752708435,0,3,0,0,6,10,-1,0,0,3,5,2,3,5,3,5,2,-0.0452445708215237,0.6961488723754883,0.4677872955799103,0,2,14,6,6,4,-1,14,6,3,4,2,0.0714815780520439,0.5167986154556274,0.1038092970848084,0,2,0,6,6,4,-1,3,6,3,4,2,0.0021895780228078365,0.4273078143596649,0.5532060861587524,0,2,13,2,7,2,-1,13,3,7,1,2,-0.0005924265133216977,0.46389439702034,0.5276389122009277,0,2,0,2,7,2,-1,0,3,7,1,2,0.0016788389766588807,0.530164897441864,0.3932034969329834,0,3,6,11,14,2,-1,13,11,7,1,2,6,12,7,1,2,-0.0022163488902151585,0.5630694031715393,0.4757033884525299,0,3,8,5,2,2,-1,8,5,1,1,2,9,6,1,1,2,0.00011568699846975505,0.4307535886764526,0.5535702705383301,0,2,13,9,2,3,-1,13,9,1,3,2,-0.007201728876680136,0.144488200545311,0.5193064212799072,0,2,1,1,3,12,-1,2,1,1,12,3,0.0008908127201721072,0.4384432137012482,0.5593621134757996,0,2,17,4,1,3,-1,17,5,1,1,3,0.00019605009583756328,0.5340415835380554,0.4705956876277924,0,2,2,4,1,3,-1,2,5,1,1,3,0.0005202214233577251,0.5213856101036072,0.3810079097747803,0,2,14,5,1,3,-1,14,6,1,1,3,0.0009458857239224017,0.4769414961338043,0.6130738854408264,0,2,7,16,2,3,-1,7,17,2,1,3,0.0000916984718060121,0.4245009124279022,0.5429363250732422,0,3,8,13,4,6,-1,10,13,2,3,2,8,16,2,3,2,0.002183320000767708,0.5457730889320374,0.419107586145401,0,2,5,5,1,3,-1,5,6,1,1,3,-0.0008603967144154012,0.5764588713645935,0.4471659958362579,0,2,16,0,4,20,-1,16,0,2,20,2,-0.0132362395524979,0.6372823119163513,0.4695009887218475,0,3,5,1,2,6,-1,5,1,1,3,2,6,4,1,3,2,0.0004337670106906444,0.5317873954772949,0.394582986831665,69.22987365722656,140,0,2,5,4,10,4,-1,5,6,10,2,2,-0.024847149848938,0.6555516719818115,0.3873311877250671,0,2,15,2,4,12,-1,15,2,2,12,2,0.006134861148893833,0.374807208776474,0.5973997712135315,0,2,7,6,4,12,-1,7,12,4,6,2,0.006449849810451269,0.542549192905426,0.2548811137676239,0,2,14,5,1,8,-1,14,9,1,4,2,0.0006349121103994548,0.2462442070245743,0.5387253761291504,0,3,1,4,14,10,-1,1,4,7,5,2,8,9,7,5,2,0.0014023890253156424,0.5594322085380554,0.3528657853603363,0,3,11,6,6,14,-1,14,6,3,7,2,11,13,3,7,2,0.0003004400059580803,0.3958503901958466,0.576593816280365,0,3,3,6,6,14,-1,3,6,3,7,2,6,13,3,7,2,0.00010042409849120304,0.3698996901512146,0.5534998178482056,0,2,4,9,15,2,-1,9,9,5,2,3,-0.005084149073809385,0.3711090981960297,0.5547800064086914,0,2,7,14,6,3,-1,7,15,6,1,3,-0.0195372607558966,0.7492755055427551,0.4579297006130219,0,3,6,3,14,4,-1,13,3,7,2,2,6,5,7,2,2,-0.000007453274065483129,0.5649787187576294,0.390406996011734,0,2,1,9,15,2,-1,6,9,5,2,3,-0.0036079459823668003,0.3381088078022003,0.5267801284790039,0,2,6,11,8,9,-1,6,14,8,3,3,0.002069750102236867,0.5519291162490845,0.3714388906955719,0,2,7,4,3,8,-1,8,4,1,8,3,-0.0004646384040825069,0.5608214735984802,0.4113566875457764,0,2,14,6,2,6,-1,14,9,2,3,2,0.0007549045258201659,0.3559206128120422,0.532935619354248,0,3,5,7,6,4,-1,5,7,3,2,2,8,9,3,2,2,-0.0009832223877310753,0.5414795875549316,0.3763205111026764,0,2,1,1,18,19,-1,7,1,6,19,3,-0.0199406407773495,0.634790301322937,0.4705299139022827,0,2,1,2,6,5,-1,4,2,3,5,2,0.0037680300883948803,0.3913489878177643,0.5563716292381287,0,2,12,17,6,2,-1,12,18,6,1,2,-0.009452850557863712,0.2554892897605896,0.5215116739273071,0,2,2,17,6,2,-1,2,18,6,1,2,0.002956084907054901,0.5174679160118103,0.3063920140266419,0,2,17,3,3,6,-1,17,5,3,2,3,0.009107873775064945,0.5388448238372803,0.2885963022708893,0,2,8,17,3,3,-1,8,18,3,1,3,0.0018219229532405734,0.4336043000221252,0.58521968126297,0,2,10,13,2,6,-1,10,16,2,3,2,0.0146887395530939,0.5287361741065979,0.2870005965232849,0,2,7,13,6,3,-1,7,14,6,1,3,-0.0143879903480411,0.701944887638092,0.4647370874881744,0,2,17,3,3,6,-1,17,5,3,2,3,-0.0189866498112679,0.2986552119255066,0.5247011780738831,0,2,8,13,2,3,-1,8,14,2,1,3,0.0011527639580890536,0.4323473870754242,0.593166172504425,0,2,9,3,6,2,-1,11,3,2,2,3,0.0109336702153087,0.5286864042282104,0.3130319118499756,0,2,0,3,3,6,-1,0,5,3,2,3,-0.0149327302351594,0.2658419013023377,0.508407711982727,0,2,8,5,4,6,-1,8,7,4,2,3,-0.0002997053961735219,0.5463526844978333,0.374072402715683,0,2,5,5,3,2,-1,5,6,3,1,2,0.004167762119323015,0.4703496992588043,0.7435721755027771,0,2,10,1,3,4,-1,11,1,1,4,3,-0.00639053201302886,0.2069258987903595,0.5280538201332092,0,2,1,2,5,9,-1,1,5,5,3,3,0.004502960946410894,0.518264889717102,0.348354309797287,0,2,13,6,2,3,-1,13,7,2,1,3,-0.009204036556184292,0.680377721786499,0.4932360053062439,0,2,0,6,14,3,-1,7,6,7,3,2,0.0813272595405579,0.5058398842811584,0.2253051996231079,0,2,2,11,18,8,-1,2,15,18,4,2,-0.150792807340622,0.2963424921035767,0.5264679789543152,0,2,5,6,2,3,-1,5,7,2,1,3,0.0033179009333252907,0.4655495882034302,0.7072932124137878,0,3,10,6,4,2,-1,12,6,2,1,2,10,7,2,1,2,0.0007740280125290155,0.4780347943305969,0.5668237805366516,0,3,6,6,4,2,-1,6,6,2,1,2,8,7,2,1,2,0.0006819954141974449,0.4286996126174927,0.5722156763076782,0,2,10,1,3,4,-1,11,1,1,4,3,0.0053671570494771,0.5299307107925415,0.3114621937274933,0,2,7,1,2,7,-1,8,1,1,7,2,0.00009701866656541824,0.3674638867378235,0.5269461870193481,0,2,4,2,15,14,-1,4,9,15,7,2,-0.1253408938646317,0.2351492047309876,0.5245791077613831,0,2,8,7,3,2,-1,9,7,1,2,3,-0.005251626949757338,0.7115936875343323,0.4693767130374908,0,3,2,3,18,4,-1,11,3,9,2,2,2,5,9,2,2,-0.007834210991859436,0.4462651014328003,0.5409085750579834,0,2,9,7,2,2,-1,10,7,1,2,2,-0.001131006982177496,0.5945618748664856,0.4417662024497986,0,2,13,9,2,3,-1,13,9,1,3,2,0.0017601120052859187,0.5353249907493591,0.3973453044891357,0,2,5,2,6,2,-1,7,2,2,2,3,-0.00081581249833107,0.3760268092155457,0.5264726877212524,0,2,9,5,2,7,-1,9,5,1,7,2,-0.003868758911266923,0.6309912800788879,0.4749819934368134,0,2,5,9,2,3,-1,6,9,1,3,2,0.0015207129763439298,0.5230181813240051,0.3361223936080933,0,2,6,0,14,18,-1,6,9,14,9,2,0.545867383480072,0.5167139768600464,0.1172635033726692,0,2,2,16,6,3,-1,2,17,6,1,3,0.0156501904129982,0.4979439079761505,0.1393294930458069,0,2,9,7,3,6,-1,10,7,1,6,3,-0.0117318602278829,0.7129650712013245,0.4921196103096008,0,2,7,8,4,3,-1,7,9,4,1,3,-0.006176512222737074,0.2288102954626083,0.5049701929092407,0,2,7,12,6,3,-1,7,13,6,1,3,0.0022457661107182503,0.4632433950901032,0.6048725843429565,0,2,9,12,2,3,-1,9,13,2,1,3,-0.005191586911678314,0.6467421054840088,0.4602192938327789,0,2,7,12,6,2,-1,9,12,2,2,3,-0.0238278806209564,0.1482000946998596,0.5226079225540161,0,2,5,11,4,6,-1,5,14,4,3,2,0.0010284580057486892,0.5135489106178284,0.3375957012176514,0,2,11,12,7,2,-1,11,13,7,1,2,-0.0100788502022624,0.2740561068058014,0.5303567051887512,0,3,6,10,8,6,-1,6,10,4,3,2,10,13,4,3,2,0.002616893034428358,0.533267080783844,0.3972454071044922,0,2,11,10,3,4,-1,11,12,3,2,2,0.000543853675480932,0.5365604162216187,0.4063411951065064,0,2,9,16,2,3,-1,9,17,2,1,3,0.005351051222532988,0.4653759002685547,0.6889045834541321,0,2,13,3,1,9,-1,13,6,1,3,3,-0.0015274790348485112,0.5449501276016235,0.3624723851680756,0,2,1,13,14,6,-1,1,15,14,2,3,-0.0806244164705276,0.1656087040901184,0.5000287294387817,0,2,13,6,1,6,-1,13,9,1,3,2,0.0221920292824507,0.5132731199264526,0.2002808004617691,0,2,0,4,3,8,-1,1,4,1,8,3,0.007310063112527132,0.4617947936058044,0.6366536021232605,0,2,18,0,2,18,-1,18,0,1,18,2,-0.006406307220458984,0.5916250944137573,0.4867860972881317,0,2,2,3,6,2,-1,2,4,6,1,2,-0.0007641504053026438,0.388840913772583,0.5315797924995422,0,2,9,0,8,6,-1,9,2,8,2,3,0.0007673448999412358,0.4159064888954163,0.5605279803276062,0,2,6,6,1,6,-1,6,9,1,3,2,0.0006147450185380876,0.3089022040367127,0.5120148062705994,0,2,14,8,6,3,-1,14,9,6,1,3,-0.005010527092963457,0.3972199857234955,0.5207306146621704,0,2,0,0,2,18,-1,1,0,1,18,2,-0.008690913207828999,0.6257408261299133,0.4608575999736786,0,3,1,18,18,2,-1,10,18,9,1,2,1,19,9,1,2,-0.016391459852457,0.2085209935903549,0.5242266058921814,0,2,3,15,2,2,-1,3,16,2,1,2,0.00040973909199237823,0.5222427248954773,0.3780320882797241,0,2,8,14,5,3,-1,8,15,5,1,3,-0.002524228999391198,0.5803927183151245,0.4611890017986298,0,2,8,14,2,3,-1,8,15,2,1,3,0.0005094531225040555,0.4401271939277649,0.5846015810966492,0,2,12,3,3,3,-1,13,3,1,3,3,0.001965641975402832,0.5322325229644775,0.4184590876102448,0,2,7,5,6,2,-1,9,5,2,2,3,0.0005629889783449471,0.3741844892501831,0.5234565734863281,0,2,15,5,5,2,-1,15,6,5,1,2,-0.0006794679793529212,0.4631041884422302,0.5356478095054626,0,2,0,5,5,2,-1,0,6,5,1,2,0.007285634987056255,0.5044670104980469,0.2377564013004303,0,2,17,14,1,6,-1,17,17,1,3,2,-0.0174594894051552,0.7289121150970459,0.5050435066223145,0,2,2,9,9,3,-1,5,9,3,3,3,-0.0254217498004436,0.6667134761810303,0.4678100049495697,0,2,12,3,3,3,-1,13,3,1,3,3,-0.0015647639520466328,0.4391759037971497,0.532362699508667,0,2,0,0,4,18,-1,2,0,2,18,2,0.0114443600177765,0.4346440136432648,0.5680012106895447,0,2,17,6,1,3,-1,17,7,1,1,3,-0.0006735255010426044,0.44771409034729,0.5296812057495117,0,2,2,14,1,6,-1,2,17,1,3,2,0.009319420903921127,0.4740200042724609,0.7462607026100159,0,2,19,8,1,2,-1,19,9,1,1,2,0.00013328490604180843,0.536506175994873,0.475213497877121,0,2,5,3,3,3,-1,6,3,1,3,3,-0.007881579920649529,0.1752219051122665,0.5015255212783813,0,2,9,16,2,3,-1,9,17,2,1,3,-0.005798568017780781,0.7271236777305603,0.4896200895309448,0,2,2,6,1,3,-1,2,7,1,1,3,-0.0003892249951604754,0.4003908932209015,0.5344941020011902,0,3,12,4,8,2,-1,16,4,4,1,2,12,5,4,1,2,-0.0019288610201328993,0.5605612993240356,0.4803955852985382,0,3,0,4,8,2,-1,0,4,4,1,2,4,5,4,1,2,0.008421415463089943,0.4753246903419495,0.7623608708381653,0,2,2,16,18,4,-1,2,18,18,2,2,0.008165587671101093,0.5393261909484863,0.419164389371872,0,2,7,15,2,4,-1,7,17,2,2,2,0.00048280550981871784,0.4240800142288208,0.5399821996688843,0,2,4,0,14,3,-1,4,1,14,1,3,-0.002718663075938821,0.4244599938392639,0.5424923896789551,0,2,0,0,4,20,-1,2,0,2,20,2,-0.0125072300434113,0.5895841717720032,0.4550411105155945,0,3,12,4,4,8,-1,14,4,2,4,2,12,8,2,4,2,-0.0242865197360516,0.2647134959697723,0.518917977809906,0,3,6,7,2,2,-1,6,7,1,1,2,7,8,1,1,2,-0.0029676330741494894,0.734768271446228,0.4749749898910523,0,2,10,6,2,3,-1,10,7,2,1,3,-0.0125289997085929,0.2756049931049347,0.5177599787712097,0,2,8,7,3,2,-1,8,8,3,1,2,-0.0010104000102728605,0.3510560989379883,0.5144724249839783,0,2,8,2,6,12,-1,8,8,6,6,2,-0.0021348530426621437,0.5637925863265991,0.466731995344162,0,2,4,0,11,12,-1,4,4,11,4,3,0.0195642597973347,0.4614573121070862,0.6137639880180359,0,2,14,9,6,11,-1,16,9,2,11,3,-0.0971463471651077,0.2998378872871399,0.5193555951118469,0,2,0,14,4,3,-1,0,15,4,1,3,0.00450145686045289,0.5077884793281555,0.3045755922794342,0,2,9,10,2,3,-1,9,11,2,1,3,0.006370697170495987,0.486101895570755,0.6887500882148743,0,2,5,11,3,2,-1,5,12,3,1,2,-0.009072152897715569,0.1673395931720734,0.5017563104629517,0,2,9,15,3,3,-1,10,15,1,3,3,-0.005353720858693123,0.2692756950855255,0.524263322353363,0,2,8,8,3,4,-1,9,8,1,4,3,-0.0109328404068947,0.7183864116668701,0.4736028909683228,0,2,9,15,3,3,-1,10,15,1,3,3,0.008235607296228409,0.5223966836929321,0.2389862984418869,0,2,7,7,3,2,-1,8,7,1,2,3,-0.0010038160253316164,0.5719355940818787,0.4433943033218384,0,3,2,10,16,4,-1,10,10,8,2,2,2,12,8,2,2,0.004085912834852934,0.5472841858863831,0.4148836135864258,0,2,2,3,4,17,-1,4,3,2,17,2,0.1548541933298111,0.4973812103271484,0.0610615983605385,0,2,15,13,2,7,-1,15,13,1,7,2,0.00020897459762636572,0.4709174036979675,0.542388916015625,0,2,2,2,6,1,-1,5,2,3,1,2,0.0003331699117552489,0.4089626967906952,0.5300992131233215,0,2,5,2,12,4,-1,9,2,4,4,3,-0.0108134001493454,0.6104369759559631,0.4957334101200104,0,3,6,0,8,12,-1,6,0,4,6,2,10,6,4,6,2,0.0456560105085373,0.5069689154624939,0.2866660058498383,0,3,13,7,2,2,-1,14,7,1,1,2,13,8,1,1,2,0.0012569549726322293,0.484691709280014,0.631817102432251,0,2,0,12,20,6,-1,0,14,20,2,3,-0.120150700211525,0.0605261400341988,0.4980959892272949,0,2,14,7,2,3,-1,14,7,1,3,2,-0.00010533799650147557,0.5363109707832336,0.4708042144775391,0,2,0,8,9,12,-1,3,8,3,12,3,-0.2070319056510925,0.059660330414772,0.497909814119339,0,2,3,0,16,2,-1,3,0,8,2,2,0.00012909180077258497,0.4712977111339569,0.5377997756004333,0,2,6,15,3,3,-1,6,16,3,1,3,0.000388185289921239,0.4363538026809692,0.5534191131591797,0,2,8,15,6,3,-1,8,16,6,1,3,-0.0029243610333651304,0.5811185836791992,0.4825215935707092,0,2,0,10,1,6,-1,0,12,1,2,3,0.0008388233254663646,0.5311700105667114,0.403813898563385,0,2,10,9,4,3,-1,10,10,4,1,3,-0.0019061550265178084,0.3770701885223389,0.526001513004303,0,2,9,15,2,3,-1,9,16,2,1,3,0.00895143486559391,0.4766167998313904,0.7682183980941772,0,2,5,7,10,1,-1,5,7,5,1,2,0.0130834598094225,0.5264462828636169,0.3062222003936768,0,2,4,0,12,19,-1,10,0,6,19,2,-0.2115933001041412,0.6737198233604431,0.4695810079574585,0,3,0,6,20,6,-1,10,6,10,3,2,0,9,10,3,2,0.0031493250280618668,0.5644835233688354,0.4386953115463257,0,3,3,6,2,2,-1,3,6,1,1,2,4,7,1,1,2,0.00039754100725986063,0.4526061117649078,0.5895630121231079,0,3,15,6,2,2,-1,16,6,1,1,2,15,7,1,1,2,-0.0013814480043947697,0.6070582270622253,0.4942413866519928,0,3,3,6,2,2,-1,3,6,1,1,2,4,7,1,1,2,-0.0005812218878418207,0.5998213291168213,0.4508252143859863,0,2,14,4,1,12,-1,14,10,1,6,2,-0.002390532987192273,0.420558899641037,0.5223848223686218,0,3,2,5,16,10,-1,2,5,8,5,2,10,10,8,5,2,0.0272689294070005,0.5206447243690491,0.3563301861286163,0,2,9,17,3,2,-1,10,17,1,2,3,-0.0037658358924090862,0.3144704103469849,0.5218814015388489,0,2,1,4,2,2,-1,1,5,2,1,2,-0.0014903489500284195,0.338019609451294,0.5124437212944031,0,2,5,0,15,5,-1,10,0,5,5,3,-0.0174282304942608,0.5829960703849792,0.4919725954532623,0,2,0,0,15,5,-1,5,0,5,5,3,-0.0152780301868916,0.6163144707679749,0.4617887139320374,0,2,11,2,2,17,-1,11,2,1,17,2,0.0319956094026566,0.5166357159614563,0.171276405453682,0,2,7,2,2,17,-1,8,2,1,17,2,-0.003825671039521694,0.3408012092113495,0.5131387710571289,0,2,15,11,2,9,-1,15,11,1,9,2,-0.00851864367723465,0.6105518937110901,0.4997941851615906,0,2,3,11,2,9,-1,4,11,1,9,2,0.0009064162150025368,0.4327270984649658,0.5582311153411865,0,2,5,16,14,4,-1,5,16,7,4,2,0.0103448498994112,0.4855653047561646,0.5452420115470886,79.24907684326172,160,0,2,1,4,18,1,-1,7,4,6,1,3,0.007898182608187199,0.333252489566803,0.5946462154388428,0,3,13,7,6,4,-1,16,7,3,2,2,13,9,3,2,2,0.0016170160379260778,0.3490641117095947,0.5577868819236755,0,2,9,8,2,12,-1,9,12,2,4,3,-0.0005544974119402468,0.5542566180229187,0.3291530013084412,0,2,12,1,6,6,-1,12,3,6,2,3,0.001542898011393845,0.3612579107284546,0.5545979142189026,0,3,5,2,6,6,-1,5,2,3,3,2,8,5,3,3,2,-0.0010329450014978647,0.3530139029026032,0.5576140284538269,0,3,9,16,6,4,-1,12,16,3,2,2,9,18,3,2,2,0.0007769815856590867,0.3916778862476349,0.5645321011543274,0,2,1,2,18,3,-1,7,2,6,3,3,0.143203005194664,0.4667482078075409,0.7023633122444153,0,2,7,4,9,10,-1,7,9,9,5,2,-0.007386649027466774,0.3073684871196747,0.5289257764816284,0,2,5,9,4,4,-1,7,9,2,4,2,-0.0006293674232438207,0.562211811542511,0.4037049114704132,0,2,11,10,3,6,-1,11,13,3,3,2,0.0007889352855272591,0.5267661213874817,0.3557874858379364,0,2,7,11,5,3,-1,7,12,5,1,3,-0.0122280502691865,0.6668320894241333,0.4625549912452698,0,3,7,11,6,6,-1,10,11,3,3,2,7,14,3,3,2,0.0035420239437371492,0.5521438121795654,0.3869673013687134,0,2,0,0,10,9,-1,0,3,10,3,3,-0.0010585320414975286,0.3628678023815155,0.5320926904678345,0,2,13,14,1,6,-1,13,16,1,2,3,0.000014935660146875307,0.4632444977760315,0.5363323092460632,0,2,0,2,3,6,-1,0,4,3,2,3,0.005253770854324102,0.5132231712341309,0.3265708982944489,0,2,8,14,4,3,-1,8,15,4,1,3,-0.008233802393078804,0.6693689823150635,0.4774140119552612,0,2,6,14,1,6,-1,6,16,1,2,3,0.00002186681012972258,0.405386209487915,0.5457931160926819,0,2,9,15,2,3,-1,9,16,2,1,3,-0.0038150229956954718,0.645499587059021,0.4793178141117096,0,2,6,4,3,3,-1,7,4,1,3,3,0.0011105879675596952,0.5270407199859619,0.3529678881168366,0,2,9,0,11,3,-1,9,1,11,1,3,-0.005770768970251083,0.3803547024726868,0.5352957844734192,0,2,0,6,20,3,-1,0,7,20,1,3,-0.003015833906829357,0.533940315246582,0.3887133002281189,0,2,10,1,1,2,-1,10,2,1,1,2,-0.0008545368909835815,0.3564616143703461,0.5273603796958923,0,2,9,6,2,6,-1,10,6,1,6,2,0.0110505102202296,0.4671907126903534,0.6849737763404846,0,2,5,8,12,1,-1,9,8,4,1,3,0.0426058396697044,0.51514732837677,0.0702200904488564,0,2,3,8,12,1,-1,7,8,4,1,3,-0.0030781750101596117,0.3041661083698273,0.5152602195739746,0,2,9,7,3,5,-1,10,7,1,5,3,-0.005481572821736336,0.6430295705795288,0.4897229969501495,0,2,3,9,6,2,-1,6,9,3,2,2,0.003188186092302203,0.5307493209838867,0.3826209902763367,0,2,12,9,3,3,-1,12,10,3,1,3,0.00035947180003859103,0.4650047123432159,0.5421904921531677,0,2,7,0,6,1,-1,9,0,2,1,3,-0.004070503171533346,0.2849679887294769,0.5079116225242615,0,2,12,9,3,3,-1,12,10,3,1,3,-0.0145941702648997,0.2971645891666412,0.5128461718559265,0,2,7,10,2,1,-1,8,10,1,1,2,-0.00011947689927183092,0.563109815120697,0.4343082010746002,0,2,6,4,9,13,-1,9,4,3,13,3,-0.0006934464909136295,0.4403578042984009,0.5359959006309509,0,2,6,8,4,2,-1,6,9,4,1,2,0.000014834799912932795,0.3421008884906769,0.5164697766304016,0,2,16,2,4,6,-1,16,2,2,6,2,0.009029698558151722,0.4639343023300171,0.6114075183868408,0,2,0,17,6,3,-1,0,18,6,1,3,-0.008064081892371178,0.2820158898830414,0.5075494050979614,0,2,10,10,3,10,-1,10,15,3,5,2,0.0260621197521687,0.5208905935287476,0.2688778042793274,0,2,8,7,3,5,-1,9,7,1,5,3,0.0173146594315767,0.4663713872432709,0.6738539934158325,0,2,10,4,4,3,-1,10,4,2,3,2,0.0226666405797005,0.5209349989891052,0.2212723940610886,0,2,8,4,3,8,-1,9,4,1,8,3,-0.002196592977270484,0.6063101291656494,0.4538190066814423,0,2,6,6,9,13,-1,9,6,3,13,3,-0.009528247639536858,0.4635204970836639,0.5247430801391602,0,3,6,0,8,12,-1,6,0,4,6,2,10,6,4,6,2,0.00809436198323965,0.5289440155029297,0.3913882076740265,0,2,14,2,6,8,-1,16,2,2,8,3,-0.0728773325681686,0.7752001881599426,0.4990234971046448,0,2,6,0,3,6,-1,7,0,1,6,3,-0.006900952197611332,0.2428039014339447,0.5048090219497681,0,2,14,2,6,8,-1,16,2,2,8,3,-0.0113082397729158,0.5734364986419678,0.4842376112937927,0,2,0,5,6,6,-1,0,8,6,3,2,0.0596132017672062,0.5029836297035217,0.2524977028369904,0,3,9,12,6,2,-1,12,12,3,1,2,9,13,3,1,2,-0.0028624620754271746,0.6073045134544373,0.4898459911346436,0,2,8,17,3,2,-1,9,17,1,2,3,0.00447814492508769,0.5015289187431335,0.2220316976308823,0,3,11,6,2,2,-1,12,6,1,1,2,11,7,1,1,2,-0.001751324045471847,0.6614428758621216,0.4933868944644928,0,2,1,9,18,2,-1,7,9,6,2,3,0.0401634201407433,0.5180878043174744,0.3741044998168945,0,3,11,6,2,2,-1,12,6,1,1,2,11,7,1,1,2,0.0003476894926279783,0.4720416963100433,0.5818032026290894,0,2,3,4,12,8,-1,7,4,4,8,3,0.00265516503714025,0.3805010914802551,0.5221335887908936,0,2,13,11,5,3,-1,13,12,5,1,3,-0.008770627900958061,0.294416606426239,0.5231295228004456,0,2,9,10,2,3,-1,9,11,2,1,3,-0.005512209143489599,0.7346177101135254,0.4722816944122315,0,2,14,7,2,3,-1,14,7,1,3,2,0.0006867204210720956,0.5452876091003418,0.424241304397583,0,2,5,4,1,3,-1,5,5,1,1,3,0.0005601966986432672,0.439886212348938,0.5601285099983215,0,2,13,4,2,3,-1,13,5,2,1,3,0.0024143769405782223,0.4741686880588532,0.6136621832847595,0,2,5,4,2,3,-1,5,5,2,1,3,-0.0015680900542065501,0.604455292224884,0.4516409933567047,0,2,9,8,2,3,-1,9,9,2,1,3,-0.0036827491130679846,0.2452459037303925,0.5294982194900513,0,2,8,9,2,2,-1,8,10,2,1,2,-0.000294091907562688,0.3732838034629822,0.5251451134681702,0,2,15,14,1,4,-1,15,16,1,2,2,0.00042847759323194623,0.5498809814453125,0.4065535068511963,0,2,3,12,2,2,-1,3,13,2,1,2,-0.004881707020103931,0.2139908969402313,0.4999957084655762,0,3,12,15,2,2,-1,13,15,1,1,2,12,16,1,1,2,0.00027272020815871656,0.465028703212738,0.581342875957489,0,2,9,13,2,2,-1,9,14,2,1,2,0.00020947199664078653,0.4387486875057221,0.5572792887687683,0,2,4,11,14,9,-1,4,14,14,3,3,0.0485011897981167,0.5244972705841064,0.3212889134883881,0,2,7,13,4,3,-1,7,14,4,1,3,-0.004516641143709421,0.605681300163269,0.4545882046222687,0,2,15,14,1,4,-1,15,16,1,2,2,-0.0122916800901294,0.2040929049253464,0.5152214169502258,0,2,4,14,1,4,-1,4,16,1,2,2,0.0004854967992287129,0.5237604975700378,0.3739503026008606,0,2,14,0,6,13,-1,16,0,2,13,3,0.0305560491979122,0.4960533976554871,0.5938246250152588,0,3,4,1,2,12,-1,4,1,1,6,2,5,7,1,6,2,-0.00015105320198927075,0.5351303815841675,0.4145204126834869,0,3,11,14,6,6,-1,14,14,3,3,2,11,17,3,3,2,0.0024937440175563097,0.4693366885185242,0.5514941215515137,0,3,3,14,6,6,-1,3,14,3,3,2,6,17,3,3,2,-0.012382130138576,0.6791396737098694,0.4681667983531952,0,2,14,17,3,2,-1,14,18,3,1,2,-0.005133346188813448,0.3608739078044891,0.5229160189628601,0,2,3,17,3,2,-1,3,18,3,1,2,0.0005191927775740623,0.5300073027610779,0.3633613884449005,0,2,14,0,6,13,-1,16,0,2,13,3,0.1506042033433914,0.515731692314148,0.2211782038211823,0,2,0,0,6,13,-1,2,0,2,13,3,0.007714414969086647,0.4410496950149536,0.5776609182357788,0,2,10,10,7,6,-1,10,12,7,2,3,0.009444352239370346,0.5401855111122131,0.375665009021759,0,3,6,15,2,2,-1,6,15,1,1,2,7,16,1,1,2,0.00025006249779835343,0.4368270933628082,0.5607374906539917,0,3,6,11,8,6,-1,10,11,4,3,2,6,14,4,3,2,-0.003307715058326721,0.4244799017906189,0.551823079586029,0,3,7,6,2,2,-1,7,6,1,1,2,8,7,1,1,2,0.0007404891075566411,0.4496962130069733,0.5900576710700989,0,3,2,2,16,6,-1,10,2,8,3,2,2,5,8,3,2,0.0440920516848564,0.5293493270874023,0.3156355023384094,0,2,5,4,3,3,-1,5,5,3,1,3,0.0033639909233897924,0.4483296871185303,0.5848662257194519,0,2,11,7,3,10,-1,11,12,3,5,2,-0.003976007923483849,0.4559507071971893,0.5483639240264893,0,2,6,7,3,10,-1,6,12,3,5,2,0.0027716930489987135,0.534178614616394,0.3792484104633331,0,2,10,7,3,2,-1,11,7,1,2,3,-0.00024123019829858094,0.5667188763618469,0.4576973021030426,0,2,8,12,4,2,-1,8,13,4,1,2,0.0004942566738463938,0.4421244859695435,0.5628787279129028,0,2,10,1,1,3,-1,10,2,1,1,3,-0.0003887646889779717,0.4288370907306671,0.5391063094139099,0,3,1,2,4,18,-1,1,2,2,9,2,3,11,2,9,2,-0.0500488989055157,0.6899513006210327,0.4703742861747742,0,2,12,4,4,12,-1,12,10,4,6,2,-0.0366354808211327,0.2217779010534287,0.5191826224327087,0,2,0,0,1,6,-1,0,2,1,2,3,0.0024273579474538565,0.5136224031448364,0.3497397899627686,0,2,9,11,2,3,-1,9,12,2,1,3,0.001955803018063307,0.4826192855834961,0.640838086605072,0,2,8,7,4,3,-1,8,8,4,1,3,-0.0017494610510766506,0.3922835886478424,0.5272685289382935,0,2,10,7,3,2,-1,11,7,1,2,3,0.0139550799503922,0.507820188999176,0.8416504859924316,0,2,7,7,3,2,-1,8,7,1,2,3,-0.00021896739781368524,0.5520489811897278,0.4314234852790833,0,2,9,4,6,1,-1,11,4,2,1,3,-0.0015131309628486633,0.3934605121612549,0.5382571220397949,0,2,8,7,2,3,-1,9,7,1,3,2,-0.004362280014902353,0.7370628714561462,0.4736475944519043,0,3,12,7,8,6,-1,16,7,4,3,2,12,10,4,3,2,0.0651605874300003,0.5159279704093933,0.328159511089325,0,3,0,7,8,6,-1,0,7,4,3,2,4,10,4,3,2,-0.0023567399475723505,0.3672826886177063,0.5172886252403259,0,3,18,2,2,10,-1,19,2,1,5,2,18,7,1,5,2,0.0151466596871614,0.5031493902206421,0.6687604188919067,0,2,0,2,6,4,-1,3,2,3,4,2,-0.0228509604930878,0.676751971244812,0.4709596931934357,0,2,9,4,6,1,-1,11,4,2,1,3,0.004886765033006668,0.5257998108863831,0.4059878885746002,0,3,7,15,2,2,-1,7,15,1,1,2,8,16,1,1,2,0.0017619599821045995,0.4696272909641266,0.6688278913497925,0,2,11,13,1,6,-1,11,16,1,3,2,-0.0012942519970238209,0.4320712983608246,0.5344281792640686,0,2,8,13,1,6,-1,8,16,1,3,2,0.0109299495816231,0.4997706115245819,0.1637486070394516,0,2,14,3,2,1,-1,14,3,1,1,2,0.00002995848990394734,0.4282417893409729,0.5633224248886108,0,2,8,15,2,3,-1,8,16,2,1,3,-0.0065884361974895,0.677212119102478,0.4700526893138886,0,2,12,15,7,4,-1,12,17,7,2,2,0.0032527779694646597,0.531339704990387,0.4536148905754089,0,2,4,14,12,3,-1,4,15,12,1,3,-0.00404357397928834,0.5660061836242676,0.4413388967514038,0,2,10,3,3,2,-1,11,3,1,2,3,-0.0012523540062829852,0.3731913864612579,0.5356451869010925,0,2,4,12,2,2,-1,4,13,2,1,2,0.00019246719602961093,0.5189986228942871,0.3738811016082764,0,2,10,11,4,6,-1,10,14,4,3,2,-0.038589671254158,0.2956373989582062,0.51888108253479,0,3,7,13,2,2,-1,7,13,1,1,2,8,14,1,1,2,0.0001548987056594342,0.4347135126590729,0.5509533286094666,0,3,4,11,14,4,-1,11,11,7,2,2,4,13,7,2,2,-0.0337638482451439,0.3230330049991608,0.5195475816726685,0,2,1,18,18,2,-1,7,18,6,2,3,-0.008265706710517406,0.5975489020347595,0.4552114009857178,0,3,11,18,2,2,-1,12,18,1,1,2,11,19,1,1,2,0.000014481440302915871,0.4745678007602692,0.5497426986694336,0,3,7,18,2,2,-1,7,18,1,1,2,8,19,1,1,2,0.000014951299817766994,0.4324473142623901,0.5480644106864929,0,2,12,18,8,2,-1,12,19,8,1,2,-0.018741799518466,0.1580052971839905,0.517853319644928,0,2,7,14,6,2,-1,7,15,6,1,2,0.0017572239739820361,0.4517636895179749,0.5773764252662659,0,3,8,12,4,8,-1,10,12,2,4,2,8,16,2,4,2,-0.0031391119118779898,0.4149647951126099,0.5460842251777649,0,2,4,9,3,3,-1,4,10,3,1,3,0.00006665677938144654,0.4039090871810913,0.5293084979057312,0,2,7,10,6,2,-1,9,10,2,2,3,0.006774342153221369,0.4767651855945587,0.612195611000061,0,2,5,0,4,15,-1,7,0,2,15,2,-0.0073868161998689175,0.3586258888244629,0.5187280774116516,0,2,8,6,12,14,-1,12,6,4,14,3,0.0140409301966429,0.4712139964103699,0.5576155781745911,0,2,5,16,3,3,-1,5,17,3,1,3,-0.005525832995772362,0.2661027014255524,0.5039281249046326,0,2,8,1,12,19,-1,12,1,4,19,3,0.3868423998355866,0.5144339799880981,0.2525899112224579,0,2,3,0,3,2,-1,3,1,3,1,2,0.0001145924034062773,0.4284994900226593,0.5423371195793152,0,2,10,12,4,5,-1,10,12,2,5,2,-0.0184675697237253,0.3885835111141205,0.5213062167167664,0,2,6,12,4,5,-1,8,12,2,5,2,-0.0004590701137203723,0.541256308555603,0.4235909879207611,0,3,11,11,2,2,-1,12,11,1,1,2,11,12,1,1,2,0.0012527540093287826,0.4899305105209351,0.6624091267585754,0,2,0,2,3,6,-1,0,4,3,2,3,0.001491060946136713,0.5286778211593628,0.4040051996707916,0,3,11,11,2,2,-1,12,11,1,1,2,11,12,1,1,2,-0.0007543556275777519,0.6032990217208862,0.4795120060443878,0,2,7,6,4,10,-1,7,11,4,5,2,-0.0069478838704526424,0.408440113067627,0.5373504161834717,0,3,11,11,2,2,-1,12,11,1,1,2,11,12,1,1,2,0.0002809292054735124,0.4846062958240509,0.5759382247924805,0,2,2,13,5,2,-1,2,14,5,1,2,0.0009607371757738292,0.5164741277694702,0.3554979860782623,0,3,11,11,2,2,-1,12,11,1,1,2,11,12,1,1,2,-0.0002688392996788025,0.5677582025527954,0.4731765985488892,0,3,7,11,2,2,-1,7,11,1,1,2,8,12,1,1,2,0.0021599370520561934,0.4731487035751343,0.7070567011833191,0,2,14,13,3,3,-1,14,14,3,1,3,0.005623530130833387,0.5240243077278137,0.2781791985034943,0,2,3,13,3,3,-1,3,14,3,1,3,-0.005024399142712355,0.2837013900279999,0.5062304139137268,0,2,9,14,2,3,-1,9,15,2,1,3,-0.009761163964867592,0.7400717735290527,0.4934569001197815,0,2,8,7,3,3,-1,8,8,3,1,3,0.004151510074734688,0.5119131207466125,0.3407008051872253,0,2,13,5,3,3,-1,13,6,3,1,3,0.006246508099138737,0.4923788011074066,0.6579058766365051,0,2,0,9,5,3,-1,0,10,5,1,3,-0.007059747818857431,0.2434711009263992,0.503284215927124,0,2,13,5,3,3,-1,13,6,3,1,3,-0.0020587709732353687,0.590031087398529,0.469508707523346,0,3,9,12,2,8,-1,9,12,1,4,2,10,16,1,4,2,-0.0024146060459315777,0.3647317886352539,0.5189201831817627,0,3,11,7,2,2,-1,12,7,1,1,2,11,8,1,1,2,-0.0014817609917372465,0.6034948229789734,0.4940128028392792,0,2,0,16,6,4,-1,3,16,3,4,2,-0.0063016400672495365,0.5818989872932434,0.4560427963733673,0,2,10,6,2,3,-1,10,7,2,1,3,0.00347634288482368,0.5217475891113281,0.3483993113040924,0,2,9,5,2,6,-1,9,7,2,2,3,-0.0222508702427149,0.2360700070858002,0.5032082796096802,0,2,12,15,8,4,-1,12,15,4,4,2,-0.030612550675869,0.6499186754226685,0.4914919137954712,0,2,0,14,8,6,-1,4,14,4,6,2,0.013057479634881,0.4413323104381561,0.5683764219284058,0,2,9,0,3,2,-1,10,0,1,2,3,-0.0006009574281051755,0.4359731078147888,0.5333483219146729,0,2,4,15,4,2,-1,6,15,2,2,2,-0.0004151425091549754,0.550406277179718,0.4326060116291046,0,2,12,7,3,13,-1,13,7,1,13,3,-0.013776290230453,0.4064112901687622,0.5201548933982849,0,2,5,7,3,13,-1,6,7,1,13,3,-0.0322965085506439,0.0473519712686539,0.4977194964885712,0,2,9,6,3,9,-1,9,9,3,3,3,0.0535569787025452,0.4881733059883118,0.666693925857544,0,2,4,4,7,12,-1,4,10,7,6,2,0.008188954554498196,0.5400037169456482,0.4240820109844208,0,3,12,12,2,2,-1,13,12,1,1,2,12,13,1,1,2,0.00021055320394225419,0.4802047908306122,0.5563852787017822,0,3,6,12,2,2,-1,6,12,1,1,2,7,13,1,1,2,-0.00243827304802835,0.7387793064117432,0.4773685038089752,0,3,8,9,4,2,-1,10,9,2,1,2,8,10,2,1,2,0.003283557016402483,0.5288546085357666,0.3171291947364807,0,3,3,6,2,2,-1,3,6,1,1,2,4,7,1,1,2,0.00237295706756413,0.4750812947750092,0.7060170769691467,0,2,16,6,3,2,-1,16,7,3,1,2,-0.0014541699783876538,0.3811730146408081,0.533073902130127,87.69602966308594,177,0,2,0,7,19,4,-1,0,9,19,2,2,0.0557552389800549,0.4019156992435455,0.6806036829948425,0,2,10,2,10,1,-1,10,2,5,1,2,0.002473024884238839,0.3351148962974548,0.5965719819068909,0,2,9,4,2,12,-1,9,10,2,6,2,-0.00035031698644161224,0.5557708144187927,0.3482286930084229,0,2,12,18,4,1,-1,12,18,2,1,2,0.0005416763015091419,0.426085889339447,0.5693380832672119,0,3,1,7,6,4,-1,1,7,3,2,2,4,9,3,2,2,0.0007719367858953774,0.3494240045547485,0.5433688759803772,0,2,12,0,6,13,-1,14,0,2,13,3,-0.0015999219613149762,0.4028499126434326,0.5484359264373779,0,2,2,0,6,13,-1,4,0,2,13,3,-0.00011832080053864047,0.3806901872158051,0.5425465106964111,0,2,10,5,8,8,-1,10,9,8,4,2,0.0003290903114248067,0.262010008096695,0.5429521799087524,0,2,8,3,2,5,-1,9,3,1,5,2,0.0002951810893137008,0.379976898431778,0.5399264097213745,0,2,8,4,9,1,-1,11,4,3,1,3,0.00009046671038959175,0.4433645009994507,0.5440226197242737,0,2,3,4,9,1,-1,6,4,3,1,3,0.000015007190086180344,0.3719654977321625,0.5409119725227356,0,2,1,0,18,10,-1,7,0,6,10,3,0.1393561065196991,0.552539587020874,0.4479042887687683,0,2,7,17,5,3,-1,7,18,5,1,3,0.0016461990308016539,0.4264501035213471,0.5772169828414917,0,2,7,11,6,1,-1,9,11,2,1,3,0.0004998443182557821,0.4359526038169861,0.5685871243476868,0,2,2,2,3,2,-1,2,3,3,1,2,-0.001097128028050065,0.3390136957168579,0.5205408930778503,0,2,8,12,4,2,-1,8,13,4,1,2,0.0006691989256069064,0.4557456076145172,0.598065972328186,0,2,6,10,3,6,-1,6,13,3,3,2,0.0008647104259580374,0.5134841203689575,0.2944033145904541,0,2,11,4,2,4,-1,11,4,1,4,2,-0.0002718259929679334,0.3906578123569489,0.5377181172370911,0,2,7,4,2,4,-1,8,4,1,4,2,0.00003024949910468422,0.3679609894752502,0.5225688815116882,0,2,9,6,2,4,-1,9,6,1,4,2,-0.008522589690983295,0.7293102145195007,0.4892365038394928,0,2,6,13,8,3,-1,6,14,8,1,3,0.0016705560265108943,0.43453249335289,0.5696138143539429,0,2,9,15,3,4,-1,10,15,1,4,3,-0.0071433838456869125,0.2591280043125153,0.5225623846054077,0,2,9,2,2,17,-1,10,2,1,17,2,-0.0163193698972464,0.6922279000282288,0.4651575982570648,0,2,7,0,6,1,-1,9,0,2,1,3,0.004803426098078489,0.5352262854576111,0.3286302983760834,0,2,8,15,3,4,-1,9,15,1,4,3,-0.0075421929359436035,0.2040544003248215,0.5034546256065369,0,2,7,13,7,3,-1,7,14,7,1,3,-0.0143631100654602,0.6804888844490051,0.4889059066772461,0,2,8,16,3,3,-1,9,16,1,3,3,0.0008906358852982521,0.5310695767402649,0.3895480930805206,0,2,6,2,8,10,-1,6,7,8,5,2,-0.004406019113957882,0.5741562843322754,0.4372426867485046,0,2,2,5,8,8,-1,2,9,8,4,2,-0.0001886254030978307,0.2831785976886749,0.5098205208778381,0,2,14,16,2,2,-1,14,17,2,1,2,-0.0037979281041771173,0.3372507989406586,0.5246580243110657,0,2,4,16,2,2,-1,4,17,2,1,2,0.00014627049677073956,0.5306674242019653,0.391171008348465,0,2,10,11,4,6,-1,10,14,4,3,2,-0.000049164638767251745,0.5462496280670166,0.3942720890045166,0,2,6,11,4,6,-1,6,14,4,3,2,-0.0335825011134148,0.2157824039459229,0.5048211812973022,0,2,10,14,1,3,-1,10,15,1,1,3,-0.0035339309833943844,0.6465312242507935,0.4872696995735169,0,2,8,14,4,3,-1,8,15,4,1,3,0.005014411173760891,0.4617668092250824,0.6248074769973755,0,3,10,0,4,6,-1,12,0,2,3,2,10,3,2,3,2,0.0188173707574606,0.5220689177513123,0.2000052034854889,0,2,0,3,20,2,-1,0,4,20,1,2,-0.001343433978036046,0.4014537930488586,0.53016197681427,0,3,12,0,8,2,-1,16,0,4,1,2,12,1,4,1,2,0.001755796023644507,0.4794039130210877,0.5653169751167297,0,2,2,12,10,8,-1,2,16,10,4,2,-0.0956374630331993,0.2034195065498352,0.5006706714630127,0,3,17,7,2,10,-1,18,7,1,5,2,17,12,1,5,2,-0.0222412291914225,0.7672473192214966,0.5046340227127075,0,3,1,7,2,10,-1,1,7,1,5,2,2,12,1,5,2,-0.0155758196488023,0.7490342259407043,0.4755851030349731,0,2,15,10,3,6,-1,15,12,3,2,3,0.005359911825507879,0.5365303754806519,0.4004670977592468,0,2,4,4,6,2,-1,6,4,2,2,3,-0.0217634998261929,0.0740154981613159,0.4964174926280975,0,2,0,5,20,6,-1,0,7,20,2,3,-0.165615901350975,0.2859103083610535,0.5218086242675781,0,3,0,0,8,2,-1,0,0,4,1,2,4,1,4,1,2,0.0001646132004680112,0.4191615879535675,0.5380793213844299,0,2,1,0,18,4,-1,7,0,6,4,3,-0.008907750248908997,0.6273192763328552,0.4877404868602753,0,2,1,13,6,2,-1,1,14,6,1,2,0.0008634644909761846,0.5159940719604492,0.3671025931835175,0,2,10,8,3,4,-1,11,8,1,4,3,-0.0013751760125160217,0.5884376764297485,0.4579083919525147,0,2,6,1,6,1,-1,8,1,2,1,3,-0.0014081239933148026,0.3560509979724884,0.5139945149421692,0,2,8,14,4,3,-1,8,15,4,1,3,-0.003934288863092661,0.5994288921356201,0.466427206993103,0,2,1,6,18,2,-1,10,6,9,2,2,-0.0319669283926487,0.3345462083816528,0.5144183039665222,0,2,15,11,1,2,-1,15,12,1,1,2,-0.000015089280168467667,0.5582656264305115,0.441405713558197,0,2,6,5,1,2,-1,6,6,1,1,2,0.0005199447041377425,0.4623680114746094,0.6168993711471558,0,2,13,4,1,3,-1,13,5,1,1,3,-0.0034220460802316666,0.6557074785232544,0.4974805116653442,0,2,2,15,1,2,-1,2,16,1,1,2,0.00017723299970384687,0.5269501805305481,0.3901908099651337,0,2,12,4,4,3,-1,12,5,4,1,3,0.0015716759953647852,0.4633373022079468,0.5790457725524902,0,2,0,0,7,3,-1,0,1,7,1,3,-0.00890413299202919,0.2689608037471771,0.5053591132164001,0,2,9,12,6,2,-1,9,12,3,2,2,0.00040677518700249493,0.5456603169441223,0.4329898953437805,0,2,5,4,2,3,-1,5,5,2,1,3,0.0067604780197143555,0.4648993909358978,0.6689761877059937,0,2,18,4,2,3,-1,18,5,2,1,3,0.0029100088868290186,0.5309703946113586,0.3377839922904968,0,2,3,0,8,6,-1,3,2,8,2,3,0.0013885459629818797,0.4074738919734955,0.5349133014678955,0,3,0,2,20,6,-1,10,2,10,3,2,0,5,10,3,2,-0.0767642632126808,0.1992176026105881,0.522824227809906,0,2,4,7,2,4,-1,5,7,1,4,2,-0.00022688310127705336,0.5438501834869385,0.4253072142601013,0,2,3,10,15,2,-1,8,10,5,2,3,-0.006309415213763714,0.4259178936481476,0.5378909707069397,0,2,3,0,12,11,-1,9,0,6,11,2,-0.1100727990269661,0.6904156804084778,0.4721749126911163,0,2,13,0,2,6,-1,13,0,1,6,2,0.0002861965913325548,0.4524914920330048,0.5548306107521057,0,2,0,19,2,1,-1,1,19,1,1,2,0.00002942532955785282,0.5370373725891113,0.4236463904380798,0,3,16,10,4,10,-1,18,10,2,5,2,16,15,2,5,2,-0.0248865708708763,0.6423557996749878,0.4969303905963898,0,2,4,8,10,3,-1,4,9,10,1,3,0.0331488512456417,0.4988475143909454,0.1613811999559403,0,2,14,12,3,3,-1,14,13,3,1,3,0.0007849169196560979,0.541602611541748,0.4223009049892426,0,3,0,10,4,10,-1,0,10,2,5,2,2,15,2,5,2,0.004708718974143267,0.4576328992843628,0.6027557849884033,0,2,18,3,2,6,-1,18,5,2,2,3,0.0024144479539245367,0.530897319316864,0.4422498941421509,0,2,6,6,1,3,-1,6,7,1,1,3,0.0019523180089890957,0.4705634117126465,0.666332483291626,0,2,7,7,7,2,-1,7,8,7,1,2,0.0013031980488449335,0.4406126141548157,0.5526962280273438,0,2,0,3,2,6,-1,0,5,2,2,3,0.004473549779504538,0.5129023790359497,0.3301498889923096,0,2,11,1,3,1,-1,12,1,1,1,3,-0.002665286883711815,0.3135471045970917,0.5175036191940308,0,2,5,0,2,6,-1,6,0,1,6,2,0.0001366677024634555,0.4119370877742767,0.530687689781189,0,2,1,1,18,14,-1,7,1,6,14,3,-0.0171264503151178,0.6177806258201599,0.4836578965187073,0,2,4,6,8,3,-1,8,6,4,3,2,-0.0002660143072716892,0.3654330968856812,0.5169736742973328,0,2,9,12,6,2,-1,9,12,3,2,2,-0.022932380437851,0.349091500043869,0.5163992047309875,0,2,5,12,6,2,-1,8,12,3,2,2,0.0023316550068557262,0.5166299939155579,0.3709389865398407,0,2,10,7,3,5,-1,11,7,1,5,3,0.016925660893321,0.501473605632782,0.8053988218307495,0,2,7,7,3,5,-1,8,7,1,5,3,-0.008985882624983788,0.6470788717269897,0.465702086687088,0,2,13,0,3,10,-1,14,0,1,10,3,-0.0118746999651194,0.3246378898620606,0.5258755087852478,0,2,4,11,3,2,-1,4,12,3,1,2,0.00019350569345988333,0.5191941857337952,0.3839643895626068,0,2,17,3,3,6,-1,18,3,1,6,3,0.005871349014341831,0.4918133914470673,0.6187043190002441,0,2,1,8,18,10,-1,1,13,18,5,2,-0.2483879029750824,0.1836802959442139,0.4988150000572205,0,2,13,0,3,10,-1,14,0,1,10,3,0.0122560001909733,0.5227053761482239,0.3632029891014099,0,2,9,14,2,3,-1,9,15,2,1,3,0.0008399017970077693,0.4490250051021576,0.5774148106575012,0,2,16,3,3,7,-1,17,3,1,7,3,0.002540736924856901,0.4804787039756775,0.5858299136161804,0,2,4,0,3,10,-1,5,0,1,10,3,-0.0148224299773574,0.2521049976348877,0.5023537278175354,0,2,16,3,3,7,-1,17,3,1,7,3,-0.005797395948320627,0.5996695756912231,0.4853715002536774,0,2,0,9,1,2,-1,0,10,1,1,2,0.000726621481589973,0.5153716802597046,0.3671779930591583,0,2,18,1,2,10,-1,18,1,1,10,2,-0.0172325801104307,0.6621719002723694,0.4994656145572662,0,2,0,1,2,10,-1,1,1,1,10,2,0.007862408645451069,0.4633395075798035,0.6256101727485657,0,2,10,16,3,4,-1,11,16,1,4,3,-0.004734362009912729,0.3615573048591614,0.5281885266304016,0,2,2,8,3,3,-1,3,8,1,3,3,0.0008304847870022058,0.4442889094352722,0.5550957918167114,0,3,11,0,2,6,-1,12,0,1,3,2,11,3,1,3,2,0.00766021991148591,0.5162935256958008,0.2613354921340942,0,3,7,0,2,6,-1,7,0,1,3,2,8,3,1,3,2,-0.004104837775230408,0.2789632081985474,0.5019031763076782,0,2,16,3,3,7,-1,17,3,1,7,3,0.004851257894188166,0.4968984127044678,0.5661668181419373,0,2,1,3,3,7,-1,2,3,1,7,3,0.0009989645332098007,0.4445607960224152,0.5551813244819641,0,2,14,1,6,16,-1,16,1,2,16,3,-0.2702363133430481,0.0293882098048925,0.515131413936615,0,2,0,1,6,16,-1,2,1,2,16,3,-0.0130906803533435,0.5699399709701538,0.4447459876537323,0,3,2,0,16,8,-1,10,0,8,4,2,2,4,8,4,2,-0.009434279054403305,0.4305466115474701,0.5487895011901855,0,2,6,8,5,3,-1,6,9,5,1,3,-0.0015482039889320731,0.3680317103862763,0.512808084487915,0,2,9,7,3,3,-1,10,7,1,3,3,0.005374613218009472,0.4838916957378388,0.6101555824279785,0,2,8,8,4,3,-1,8,9,4,1,3,0.0015786769799888134,0.5325223207473755,0.4118548035621643,0,2,9,6,2,4,-1,9,6,1,4,2,0.003685605013743043,0.4810948073863983,0.6252303123474121,0,2,0,7,15,1,-1,5,7,5,1,3,0.009388701990246773,0.520022988319397,0.3629410862922669,0,2,8,2,7,9,-1,8,5,7,3,3,0.0127926301211119,0.4961709976196289,0.673801600933075,0,3,1,7,16,4,-1,1,7,8,2,2,9,9,8,2,2,-0.003366104094311595,0.4060279130935669,0.5283598899841309,0,2,6,12,8,2,-1,6,13,8,1,2,0.00039771420415490866,0.4674113988876343,0.5900775194168091,0,2,8,11,3,3,-1,8,12,3,1,3,0.0014868030557408929,0.4519116878509522,0.6082053780555725,0,3,4,5,14,10,-1,11,5,7,5,2,4,10,7,5,2,-0.0886867493391037,0.2807899117469788,0.5180991888046265,0,2,4,12,3,2,-1,4,13,3,1,2,-0.00007429611287079751,0.5295584201812744,0.408762514591217,0,2,9,11,6,1,-1,11,11,2,1,3,-0.000014932939848222304,0.5461400151252747,0.4538542926311493,0,2,4,9,7,6,-1,4,11,7,2,3,0.005916223861277103,0.5329161286354065,0.4192134141921997,0,2,7,10,6,3,-1,7,11,6,1,3,0.001114164013415575,0.4512017965316773,0.5706217288970947,0,2,9,11,2,2,-1,9,12,2,1,2,0.00008924936264520511,0.4577805995941162,0.5897638201713562,0,2,0,5,20,6,-1,0,7,20,2,3,0.0025319510605186224,0.5299603939056396,0.3357639014720917,0,2,6,4,6,1,-1,8,4,2,1,3,0.0124262003228068,0.4959059059619904,0.1346601992845535,0,2,9,11,6,1,-1,11,11,2,1,3,0.0283357501029968,0.5117079019546509,0.0006104363710619509,0,2,5,11,6,1,-1,7,11,2,1,3,0.006616588216274977,0.4736349880695343,0.7011628150939941,0,2,10,16,3,4,-1,11,16,1,4,3,0.008046876639127731,0.5216417908668518,0.3282819986343384,0,2,8,7,3,3,-1,9,7,1,3,3,-0.001119398046284914,0.5809860825538635,0.4563739001750946,0,2,2,12,16,8,-1,2,16,16,4,2,0.0132775902748108,0.5398362278938293,0.4103901088237763,0,2,0,15,15,2,-1,0,16,15,1,2,0.0004879473999608308,0.424928605556488,0.5410590767860413,0,2,15,4,5,6,-1,15,6,5,2,3,0.0112431701272726,0.526996374130249,0.3438215851783752,0,2,9,5,2,4,-1,10,5,1,4,2,-0.0008989666821435094,0.5633075833320618,0.4456613063812256,0,2,8,10,9,6,-1,8,12,9,2,3,0.006667715962976217,0.5312889218330383,0.4362679123878479,0,2,2,19,15,1,-1,7,19,5,1,3,0.0289472993463278,0.4701794981956482,0.657579779624939,0,2,10,16,3,4,-1,11,16,1,4,3,-0.0234000496566296,0,0.5137398838996887,0,2,0,15,20,4,-1,0,17,20,2,2,-0.0891170501708984,0.0237452797591686,0.4942430853843689,0,2,10,16,3,4,-1,11,16,1,4,3,-0.0140546001493931,0.3127323091030121,0.511751115322113,0,2,7,16,3,4,-1,8,16,1,4,3,0.008123939856886864,0.50090491771698,0.2520025968551636,0,2,9,16,3,3,-1,9,17,3,1,3,-0.004996465053409338,0.6387143731117249,0.4927811920642853,0,2,8,11,4,6,-1,8,14,4,3,2,0.0031253970228135586,0.5136849880218506,0.3680452108383179,0,2,9,6,2,12,-1,9,10,2,4,3,0.006766964215785265,0.5509843826293945,0.4363631904125214,0,2,8,17,4,3,-1,8,18,4,1,3,-0.002371144015341997,0.6162335276603699,0.4586946964263916,0,3,9,18,8,2,-1,13,18,4,1,2,9,19,4,1,2,-0.005352279171347618,0.6185457706451416,0.4920490980148315,0,2,1,18,8,2,-1,1,19,8,1,2,-0.0159688591957092,0.1382617950439453,0.4983252882957459,0,2,13,5,6,15,-1,15,5,2,15,3,0.004767606034874916,0.4688057899475098,0.5490046143531799,0,2,9,8,2,2,-1,9,9,2,1,2,-0.002471469109877944,0.2368514984846115,0.5003952980041504,0,2,9,5,2,3,-1,9,5,1,3,2,-0.0007103378884494305,0.5856394171714783,0.4721533060073853,0,2,1,5,6,15,-1,3,5,2,15,3,-0.1411755979061127,0.0869000628590584,0.4961591064929962,0,3,4,1,14,8,-1,11,1,7,4,2,4,5,7,4,2,0.1065180972218514,0.5138837099075317,0.1741005033254623,0,3,2,4,4,16,-1,2,4,2,8,2,4,12,2,8,2,-0.0527447499334812,0.7353636026382446,0.4772881865501404,0,2,12,4,3,12,-1,12,10,3,6,2,-0.00474317604675889,0.3884406089782715,0.5292701721191406,0,3,4,5,10,12,-1,4,5,5,6,2,9,11,5,6,2,0.0009967676596716046,0.5223492980003357,0.4003424048423767,0,2,9,14,2,3,-1,9,15,2,1,3,0.00802841316908598,0.4959106147289276,0.7212964296340942,0,2,5,4,2,3,-1,5,5,2,1,3,0.0008602585876360536,0.4444884061813355,0.55384761095047,0,3,12,2,4,10,-1,14,2,2,5,2,12,7,2,5,2,0.0009319150121882558,0.539837121963501,0.4163244068622589,0,2,6,4,7,3,-1,6,5,7,1,3,-0.002508206060156226,0.5854265093803406,0.456250011920929,0,3,2,0,18,2,-1,11,0,9,1,2,2,1,9,1,2,-0.0021378761157393456,0.4608069062232971,0.5280259251594543,0,3,0,0,18,2,-1,0,0,9,1,2,9,1,9,1,2,-0.002154604997485876,0.3791126906871796,0.5255997180938721,0,3,13,13,4,6,-1,15,13,2,3,2,13,16,2,3,2,-0.007621400989592075,0.5998609066009521,0.4952073991298676,0,3,3,13,4,6,-1,3,13,2,3,2,5,16,2,3,2,0.002205536002293229,0.4484206140041351,0.5588530898094177,0,2,10,12,2,6,-1,10,15,2,3,2,0.0012586950324475765,0.5450747013092041,0.4423840939998627,0,3,5,9,10,10,-1,5,9,5,5,2,10,14,5,5,2,-0.005092672072350979,0.4118275046348572,0.5263035893440247,0,3,11,4,4,2,-1,13,4,2,1,2,11,5,2,1,2,-0.0025095739401876926,0.5787907838821411,0.4998494982719421,0,2,7,12,6,8,-1,10,12,3,8,2,-0.0773275569081306,0.8397865891456604,0.481112003326416,0,3,12,2,4,10,-1,14,2,2,5,2,12,7,2,5,2,-0.041485819965601,0.240861102938652,0.5176993012428284,0,2,8,11,2,1,-1,9,11,1,1,2,0.00010355669655837119,0.4355360865592957,0.5417054295539856,0,2,10,5,1,12,-1,10,9,1,4,3,0.0013255809899419546,0.5453971028327942,0.4894095063209534,0,2,0,11,6,9,-1,3,11,3,9,2,-0.00805987324565649,0.5771024227142334,0.4577918946743012,0,3,12,2,4,10,-1,14,2,2,5,2,12,7,2,5,2,0.019058620557189,0.5169867873191833,0.3400475084781647,0,3,4,2,4,10,-1,4,2,2,5,2,6,7,2,5,2,-0.0350578911602497,0.2203243970870972,0.5000503063201904,0,3,11,4,4,2,-1,13,4,2,1,2,11,5,2,1,2,0.005729605909436941,0.5043408274650574,0.6597570776939392,0,2,0,14,6,3,-1,0,15,6,1,3,-0.0116483299061656,0.2186284959316254,0.4996652901172638,0,3,11,4,4,2,-1,13,4,2,1,2,11,5,2,1,2,0.0014544479781761765,0.5007681846618652,0.5503727793693542,0,2,6,1,3,2,-1,7,1,1,2,3,-0.00025030909455381334,0.4129841029644013,0.524167001247406,0,3,11,4,4,2,-1,13,4,2,1,2,11,5,2,1,2,-0.000829072727356106,0.541286826133728,0.4974496066570282,0,3,5,4,4,2,-1,5,4,2,1,2,7,5,2,1,2,0.0010862209601327777,0.460552990436554,0.5879228711128235,0,3,13,0,2,12,-1,14,0,1,6,2,13,6,1,6,2,0.0002000050008064136,0.5278854966163635,0.4705209136009216,0,2,6,0,3,10,-1,7,0,1,10,3,0.0029212920926511288,0.5129609704017639,0.375553697347641,0,2,3,0,17,8,-1,3,4,17,4,2,0.0253874007612467,0.4822691977024078,0.5790768265724182,0,2,0,4,20,4,-1,0,6,20,2,2,-0.00319684692658484,0.5248395204544067,0.3962840139865875,90.25334930419922,182,0,2,0,3,8,2,-1,4,3,4,2,2,0.005803173873573542,0.3498983979225159,0.596198320388794,0,2,8,11,4,3,-1,8,12,4,1,3,-0.009000306949019432,0.6816636919975281,0.4478552043437958,0,3,5,7,6,4,-1,5,7,3,2,2,8,9,3,2,2,-0.00115496595390141,0.5585706233978271,0.3578251004219055,0,2,8,3,4,9,-1,8,6,4,3,3,-0.0011069850297644734,0.5365036129951477,0.3050428032875061,0,2,8,15,1,4,-1,8,17,1,2,2,0.00010308309720130637,0.363909512758255,0.5344635844230652,0,2,4,5,12,7,-1,8,5,4,7,3,-0.005098483990877867,0.2859157025814056,0.5504264831542969,0,3,4,2,4,10,-1,4,2,2,5,2,6,7,2,5,2,0.0008257220033556223,0.5236523747444153,0.3476041853427887,0,2,3,0,17,2,-1,3,1,17,1,2,0.009978332556784153,0.4750322103500366,0.621964693069458,0,2,2,2,16,15,-1,2,7,16,5,3,-0.0374025292694569,0.334337592124939,0.527806282043457,0,2,15,2,5,2,-1,15,3,5,1,2,0.0048548257909715176,0.5192180871963501,0.3700444102287293,0,2,9,3,2,2,-1,10,3,1,2,2,-0.001866447040811181,0.2929843962192535,0.5091944932937622,0,2,4,5,16,15,-1,4,10,16,5,3,0.0168888904154301,0.3686845898628235,0.5431225895881653,0,2,7,13,5,6,-1,7,16,5,3,2,-0.005837262142449617,0.3632183969020844,0.5221335887908936,0,2,10,7,3,2,-1,11,7,1,2,3,-0.00147137395106256,0.5870683789253235,0.4700650870800018,0,2,8,3,3,1,-1,9,3,1,1,3,-0.0011522950371727347,0.3195894956588745,0.5140954256057739,0,2,9,16,3,3,-1,9,17,3,1,3,-0.004256030078977346,0.6301859021186829,0.4814921021461487,0,2,0,2,5,2,-1,0,3,5,1,2,-0.006737829186022282,0.1977048069238663,0.5025808215141296,0,2,12,5,4,3,-1,12,6,4,1,3,0.0113826701417565,0.495413213968277,0.6867045760154724,0,2,1,7,12,1,-1,5,7,4,1,3,0.005179470870643854,0.5164427757263184,0.3350647985935211,0,2,7,5,6,14,-1,7,12,6,7,2,-0.1174378991127014,0.2315246015787125,0.5234413743019104,0,3,0,0,8,10,-1,0,0,4,5,2,4,5,4,5,2,0.0287034492939711,0.4664297103881836,0.6722521185874939,0,2,9,1,3,2,-1,10,1,1,2,3,0.004823103081434965,0.5220875144004822,0.2723532915115356,0,2,8,1,3,2,-1,9,1,1,2,3,0.0026798530016094446,0.5079277157783508,0.2906948924064636,0,2,12,4,3,3,-1,12,5,3,1,3,0.008050408214330673,0.4885950982570648,0.6395021080970764,0,2,7,4,6,16,-1,7,12,6,8,2,0.004805495962500572,0.5197256803512573,0.365666389465332,0,2,12,4,3,3,-1,12,5,3,1,3,-0.0022420159075409174,0.6153467893600464,0.4763701856136322,0,2,2,3,2,6,-1,2,5,2,2,3,-0.0137577103450894,0.2637344896793366,0.5030903220176697,0,2,14,2,6,9,-1,14,5,6,3,3,-0.1033829972147942,0.2287521958351135,0.5182461142539978,0,2,5,4,3,3,-1,5,5,3,1,3,-0.009443208575248718,0.6953303813934326,0.4694949090480804,0,2,9,17,3,2,-1,10,17,1,2,3,0.0008027118165045977,0.5450655221939087,0.4268783926963806,0,2,5,5,2,3,-1,5,6,2,1,3,-0.004194566980004311,0.6091387867927551,0.4571642875671387,0,2,13,11,3,6,-1,13,13,3,2,3,0.0109422104433179,0.5241063237190247,0.3284547030925751,0,2,3,14,2,6,-1,3,17,2,3,2,-0.0005784106906503439,0.5387929081916809,0.4179368913173676,0,2,14,3,6,2,-1,14,4,6,1,2,-0.002088862005621195,0.4292691051959992,0.5301715731620789,0,2,0,8,16,2,-1,0,9,16,1,2,0.0032383969519287348,0.379234790802002,0.5220744013786316,0,2,14,3,6,2,-1,14,4,6,1,2,0.004907502792775631,0.5237283110618591,0.4126757979393005,0,2,0,0,5,6,-1,0,2,5,2,3,-0.0322779417037964,0.1947655975818634,0.4994502067565918,0,2,12,5,4,3,-1,12,6,4,1,3,-0.008971123024821281,0.6011285185813904,0.4929032027721405,0,2,4,11,3,6,-1,4,13,3,2,3,0.0153210898861289,0.5009753704071045,0.2039822041988373,0,2,12,5,4,3,-1,12,6,4,1,3,0.002085556974634528,0.4862189888954163,0.5721694827079773,0,2,9,5,1,3,-1,9,6,1,1,3,0.005061502102762461,0.5000218749046326,0.1801805943250656,0,2,12,5,4,3,-1,12,6,4,1,3,-0.0037174751050770283,0.5530117154121399,0.4897592961788178,0,2,6,6,8,12,-1,6,12,8,6,2,-0.0121705001220107,0.4178605973720551,0.5383723974227905,0,2,12,5,4,3,-1,12,6,4,1,3,0.004624839872121811,0.4997169971466065,0.5761327147483826,0,2,5,12,9,2,-1,8,12,3,2,3,-0.0002104042941937223,0.5331807136535645,0.4097681045532227,0,2,12,5,4,3,-1,12,6,4,1,3,-0.0146417804062366,0.5755925178527832,0.5051776170730591,0,2,4,5,4,3,-1,4,6,4,1,3,0.00331994891166687,0.4576976895332336,0.6031805872917175,0,2,6,6,9,2,-1,9,6,3,2,3,0.003723687957972288,0.4380396902561188,0.541588306427002,0,2,4,11,1,3,-1,4,12,1,1,3,0.0008295116131193936,0.5163031816482544,0.3702219128608704,0,2,14,12,6,6,-1,14,12,3,6,2,-0.0114084901288152,0.6072946786880493,0.4862565100193024,0,2,7,0,3,7,-1,8,0,1,7,3,-0.004532012157142162,0.3292475938796997,0.5088962912559509,0,2,9,8,3,3,-1,10,8,1,3,3,0.00512760179117322,0.4829767942428589,0.6122708916664124,0,2,8,8,3,3,-1,9,8,1,3,3,0.00985831581056118,0.4660679996013641,0.6556177139282227,0,2,5,10,11,3,-1,5,11,11,1,3,0.036985918879509,0.5204849243164062,0.1690472066402435,0,2,5,7,10,1,-1,10,7,5,1,2,0.004649116192013025,0.5167322158813477,0.3725225031375885,0,2,9,7,3,2,-1,10,7,1,2,3,-0.004266470205038786,0.6406493186950684,0.4987342953681946,0,2,8,7,3,2,-1,9,7,1,2,3,-0.0004795659042429179,0.5897293090820312,0.4464873969554901,0,2,11,9,4,2,-1,11,9,2,2,2,0.0036827160511165857,0.5441560745239258,0.347266286611557,0,2,5,9,4,2,-1,7,9,2,2,2,-0.0100598800927401,0.2143162935972214,0.500482976436615,0,2,14,10,2,4,-1,14,12,2,2,2,-0.0003036184061784297,0.538642406463623,0.4590323865413666,0,2,7,7,3,2,-1,8,7,1,2,3,-0.0014545479789376259,0.5751184225082397,0.4497095048427582,0,2,14,17,6,3,-1,14,18,6,1,3,0.0016515209572389722,0.5421937704086304,0.4238520860671997,0,3,4,5,12,12,-1,4,5,6,6,2,10,11,6,6,2,-0.007846863940358162,0.4077920913696289,0.5258157253265381,0,3,6,9,8,8,-1,10,9,4,4,2,6,13,4,4,2,-0.005125985015183687,0.422927588224411,0.5479453206062317,0,2,0,4,15,4,-1,5,4,5,4,3,-0.0368909612298012,0.6596375703811646,0.4674678146839142,0,2,13,2,4,1,-1,13,2,2,1,2,0.0002403563994448632,0.4251135885715485,0.5573202967643738,0,2,4,12,2,2,-1,4,13,2,1,2,-0.000015150169929256663,0.5259246826171875,0.4074114859104157,0,2,8,13,4,3,-1,8,14,4,1,3,0.0022108471021056175,0.4671722948551178,0.5886352062225342,0,2,9,13,2,3,-1,9,14,2,1,3,-0.0011568620102480054,0.5711066126823425,0.4487161934375763,0,2,13,11,2,3,-1,13,12,2,1,3,0.004999629221856594,0.5264198184013367,0.2898327112197876,0,3,7,12,4,4,-1,7,12,2,2,2,9,14,2,2,2,-0.0014656189596280456,0.3891738057136536,0.5197871923446655,0,3,10,11,2,2,-1,11,11,1,1,2,10,12,1,1,2,-0.0011975039960816503,0.5795872807502747,0.4927955865859985,0,2,8,17,3,2,-1,9,17,1,2,3,-0.0044954330660402775,0.2377603054046631,0.5012555122375488,0,3,10,11,2,2,-1,11,11,1,1,2,10,12,1,1,2,0.00014997160178609192,0.4876626133918762,0.5617607831954956,0,2,0,17,6,3,-1,0,18,6,1,3,0.002639150945469737,0.516808807849884,0.3765509128570557,0,3,10,11,2,2,-1,11,11,1,1,2,10,12,1,1,2,-0.0002936813107226044,0.5446649193763733,0.4874630868434906,0,3,8,11,2,2,-1,8,11,1,1,2,9,12,1,1,2,0.0014211760135367513,0.4687897861003876,0.669133186340332,0,2,12,5,8,4,-1,12,5,4,4,2,0.0794276371598244,0.5193443894386292,0.273294597864151,0,2,0,5,8,4,-1,4,5,4,4,2,0.0799375027418137,0.4971731007099152,0.1782083958387375,0,2,13,2,4,1,-1,13,2,2,1,2,0.0110892597585917,0.5165994763374329,0.3209475874900818,0,2,3,2,4,1,-1,5,2,2,1,2,0.00016560709627810866,0.4058471918106079,0.5307276248931885,0,3,10,0,4,2,-1,12,0,2,1,2,10,1,2,1,2,-0.0053354292176663876,0.3445056974887848,0.5158129930496216,0,2,7,12,3,1,-1,8,12,1,1,3,0.0011287260567769408,0.4594863057136536,0.6075533032417297,0,3,8,11,4,8,-1,10,11,2,4,2,8,15,2,4,2,-0.0219692196696997,0.1680400967597961,0.5228595733642578,0,2,9,9,2,2,-1,9,10,2,1,2,-0.00021775320055894554,0.3861596882343292,0.5215672850608826,0,2,3,18,15,2,-1,3,19,15,1,2,0.00020200149447191507,0.5517979264259338,0.4363039135932922,0,3,2,6,2,12,-1,2,6,1,6,2,3,12,1,6,2,-0.0217331498861313,0.7999460101127625,0.4789851009845734,0,2,9,8,2,3,-1,9,9,2,1,3,-0.0008439993252977729,0.4085975885391235,0.5374773144721985,0,2,7,10,3,2,-1,8,10,1,2,3,-0.00043895249837078154,0.5470405220985413,0.4366143047809601,0,2,11,11,3,1,-1,12,11,1,1,3,0.0015092400135472417,0.4988996982574463,0.5842149257659912,0,2,6,11,3,1,-1,7,11,1,1,3,-0.003554783994331956,0.6753690242767334,0.4721005856990814,0,3,9,2,4,2,-1,11,2,2,1,2,9,3,2,1,2,0.00048191400128416717,0.541585385799408,0.4357109069824219,0,2,4,12,2,3,-1,4,13,2,1,3,-0.00602643983438611,0.2258509993553162,0.499188095331192,0,2,2,1,18,3,-1,8,1,6,3,3,-0.0116681400686502,0.625655472278595,0.4927498996257782,0,2,5,1,4,14,-1,7,1,2,14,2,-0.0028718370012938976,0.3947784900665283,0.524580180644989,0,2,8,16,12,3,-1,8,16,6,3,2,0.0170511696487665,0.4752511084079742,0.5794224143028259,0,2,1,17,18,3,-1,7,17,6,3,3,-0.0133520802482963,0.6041104793548584,0.4544535875320435,0,2,9,14,2,6,-1,9,17,2,3,2,-0.0003930180100724101,0.4258275926113129,0.5544905066490173,0,2,9,12,1,8,-1,9,16,1,4,2,0.0030483349692076445,0.5233420133590698,0.3780272901058197,0,2,9,14,2,3,-1,9,15,2,1,3,-0.00435792887583375,0.6371889114379883,0.4838674068450928,0,2,9,6,2,12,-1,9,10,2,4,3,0.0056661018170416355,0.5374705791473389,0.4163666069507599,0,2,12,9,3,3,-1,12,10,3,1,3,0.00006067733920644969,0.4638795852661133,0.5311625003814697,0,2,0,1,4,8,-1,2,1,2,8,2,0.0367381609976292,0.4688656032085419,0.6466524004936218,0,3,9,1,6,2,-1,12,1,3,1,2,9,2,3,1,2,0.008652813732624054,0.5204318761825562,0.2188657969236374,0,2,1,3,12,14,-1,1,10,12,7,2,-0.1537135988473892,0.1630371958017349,0.4958840012550354,0,3,8,12,4,2,-1,10,12,2,1,2,8,13,2,1,2,-0.00041560421232134104,0.577445924282074,0.4696458876132965,0,3,1,9,10,2,-1,1,9,5,1,2,6,10,5,1,2,-0.0012640169588848948,0.3977175951004028,0.5217198133468628,0,2,8,15,4,3,-1,8,16,4,1,3,-0.003547334112226963,0.6046528220176697,0.480831503868103,0,2,6,8,8,3,-1,6,9,8,1,3,0.00003001906952704303,0.3996723890304565,0.5228201150894165,0,2,9,15,5,3,-1,9,16,5,1,3,0.00131130195222795,0.4712158143520355,0.5765997767448425,0,2,8,7,4,3,-1,8,8,4,1,3,-0.0013374709524214268,0.4109584987163544,0.5253170132637024,0,2,7,7,6,2,-1,7,8,6,1,2,0.0208767093718052,0.5202993750572205,0.1757981926202774,0,3,5,7,8,2,-1,5,7,4,1,2,9,8,4,1,2,-0.007549794856458902,0.6566609740257263,0.4694975018501282,0,2,12,9,3,3,-1,12,10,3,1,3,0.0241885501891375,0.5128673911094666,0.3370220959186554,0,2,4,7,4,2,-1,4,8,4,1,2,-0.002935882890596986,0.658078670501709,0.4694541096687317,0,2,14,2,6,9,-1,14,5,6,3,3,0.0575579293072224,0.5146445035934448,0.2775259912014008,0,2,4,9,3,3,-1,5,9,1,3,3,-0.0011343370424583554,0.3836601972579956,0.5192667245864868,0,2,12,9,3,3,-1,12,10,3,1,3,0.0168169997632504,0.5085592865943909,0.6177260875701904,0,2,0,2,6,9,-1,0,5,6,3,3,0.005053517874330282,0.5138763189315796,0.3684791922569275,0,2,17,3,3,6,-1,18,3,1,6,3,-0.004587471019476652,0.5989655256271362,0.4835202097892761,0,2,0,3,3,6,-1,1,3,1,6,3,0.001688246033154428,0.4509486854076386,0.5723056793212891,0,2,17,14,1,2,-1,17,15,1,1,2,-0.0016554000321775675,0.3496770858764648,0.5243319272994995,0,2,4,9,4,3,-1,6,9,2,3,2,-0.0193738006055355,0.1120536997914314,0.496871292591095,0,2,12,9,3,3,-1,12,10,3,1,3,0.0103744501248002,0.5148196816444397,0.4395213127136231,0,2,5,9,3,3,-1,5,10,3,1,3,0.00014973050565458834,0.4084999859333038,0.526988685131073,0,3,9,5,6,8,-1,12,5,3,4,2,9,9,3,4,2,-0.042981930077076,0.6394104957580566,0.501850426197052,0,3,5,5,6,8,-1,5,5,3,4,2,8,9,3,4,2,0.008306593634188175,0.470755398273468,0.6698353290557861,0,2,16,1,4,6,-1,16,4,4,3,2,-0.0041285790503025055,0.4541369080543518,0.5323647260665894,0,2,1,0,6,20,-1,3,0,2,20,3,0.0017399420030415058,0.433396190404892,0.5439866185188293,0,2,12,11,3,2,-1,13,11,1,2,3,0.00011739750334527344,0.4579687118530273,0.5543426275253296,0,2,5,11,3,2,-1,6,11,1,2,3,0.00018585780344437808,0.4324643909931183,0.5426754951477051,0,2,9,4,6,1,-1,11,4,2,1,3,0.005558769218623638,0.525722086429596,0.3550611138343811,0,2,0,0,8,3,-1,4,0,4,3,2,-0.007985156029462814,0.6043018102645874,0.4630635976791382,0,2,15,0,2,5,-1,15,0,1,5,2,0.0006059412262402475,0.4598254859447479,0.55331951379776,0,2,4,1,3,2,-1,5,1,1,2,3,-0.0002298304025316611,0.4130752086639404,0.5322461128234863,0,2,7,0,6,15,-1,9,0,2,15,3,0.0004374021082185209,0.4043039977550507,0.5409289002418518,0,2,6,11,3,1,-1,7,11,1,1,3,0.0002948202018160373,0.4494963884353638,0.5628852248191833,0,2,12,0,3,4,-1,13,0,1,4,3,0.0103126596659422,0.5177510976791382,0.2704316973686218,0,2,5,4,6,1,-1,7,4,2,1,3,-0.007724110968410969,0.1988019049167633,0.4980553984642029,0,2,12,7,3,2,-1,12,8,3,1,2,-0.004679720848798752,0.6644750237464905,0.5018296241760254,0,2,0,1,4,6,-1,0,4,4,3,2,-0.005075545981526375,0.3898304998874664,0.5185269117355347,0,2,12,7,3,2,-1,12,8,3,1,2,0.00224797404371202,0.4801808893680573,0.5660336017608643,0,2,2,16,3,3,-1,2,17,3,1,3,0.0008332700817845762,0.5210919976234436,0.3957188129425049,0,3,13,8,6,10,-1,16,8,3,5,2,13,13,3,5,2,-0.0412793308496475,0.6154541969299316,0.5007054209709167,0,2,0,9,5,2,-1,0,10,5,1,2,-0.0005093018990010023,0.3975942134857178,0.5228403806686401,0,3,12,11,2,2,-1,13,11,1,1,2,12,12,1,1,2,0.0012568780221045017,0.4979138076305389,0.5939183235168457,0,2,3,15,3,3,-1,3,16,3,1,3,0.008004849776625633,0.4984497129917145,0.1633366048336029,0,2,12,7,3,2,-1,12,8,3,1,2,-0.0011879300000146031,0.5904964804649353,0.4942624866962433,0,2,5,7,3,2,-1,5,8,3,1,2,0.0006194895249791443,0.4199557900428772,0.5328726172447205,0,2,9,5,9,9,-1,9,8,9,3,3,0.006682985927909613,0.5418602824211121,0.490588903427124,0,2,5,0,3,7,-1,6,0,1,7,3,-0.0037062340416014194,0.3725939095020294,0.5138000249862671,0,2,5,2,12,5,-1,9,2,4,5,3,-0.0397394113242626,0.6478961110115051,0.5050346851348877,0,3,6,11,2,2,-1,6,11,1,1,2,7,12,1,1,2,0.0014085009461268783,0.4682339131832123,0.6377884149551392,0,2,15,15,3,2,-1,15,16,3,1,2,0.0003932268882635981,0.5458530187606812,0.415048211812973,0,2,2,15,3,2,-1,2,16,3,1,2,-0.0018979819724336267,0.3690159916877747,0.5149704217910767,0,3,14,12,6,8,-1,17,12,3,4,2,14,16,3,4,2,-0.0139704402536154,0.6050562858581543,0.4811357855796814,0,2,2,8,15,6,-1,7,8,5,6,3,-0.1010081991553307,0.2017080038785934,0.4992361962795258,0,2,2,2,18,17,-1,8,2,6,17,3,-0.0173469204455614,0.5713148713111877,0.4899486005306244,0,2,5,1,4,1,-1,7,1,2,1,2,0.000156197595060803,0.4215388894081116,0.5392642021179199,0,2,5,2,12,5,-1,9,2,4,5,3,0.1343892961740494,0.5136151909828186,0.3767612874507904,0,2,3,2,12,5,-1,7,2,4,5,3,-0.0245822407305241,0.7027357816696167,0.4747906923294067,0,3,4,9,12,4,-1,10,9,6,2,2,4,11,6,2,2,-0.0038553720805794,0.4317409098148346,0.5427716970443726,0,3,5,15,6,2,-1,5,15,3,1,2,8,16,3,1,2,-0.002316524973139167,0.594269871711731,0.4618647992610931,0,2,10,14,2,3,-1,10,15,2,1,3,-0.004851812031120062,0.6191568970680237,0.4884895086288452,0,3,0,13,20,2,-1,0,13,10,1,2,10,14,10,1,2,0.002469993894919753,0.5256664752960205,0.4017199873924255,0,3,4,9,12,8,-1,10,9,6,4,2,4,13,6,4,2,0.0454969592392445,0.5237867832183838,0.2685773968696594,0,2,8,13,3,6,-1,8,16,3,3,2,-0.0203195996582508,0.213044598698616,0.4979738891124725,0,2,10,12,2,2,-1,10,13,2,1,2,0.0002699499891605228,0.481404185295105,0.5543122291564941,0,3,9,12,2,2,-1,9,12,1,1,2,10,13,1,1,2,-0.0018232699949294329,0.6482579708099365,0.4709989130496979,0,3,4,11,14,4,-1,11,11,7,2,2,4,13,7,2,2,-0.006301579065620899,0.4581927955150604,0.5306236147880554,0,2,8,5,4,2,-1,8,6,4,1,2,-0.0002413949987385422,0.5232086777687073,0.4051763117313385,0,2,10,10,6,3,-1,12,10,2,3,3,-0.001033036969602108,0.5556201934814453,0.4789193868637085,0,2,2,14,1,2,-1,2,15,1,1,2,0.0001804116036510095,0.5229442715644836,0.4011810123920441,0,3,13,8,6,12,-1,16,8,3,6,2,13,14,3,6,2,-0.0614078603684902,0.62986820936203,0.5010703206062317,0,3,1,8,6,12,-1,1,8,3,6,2,4,14,3,6,2,-0.0695439130067825,0.7228280901908875,0.4773184061050415,0,2,10,0,6,10,-1,12,0,2,10,3,-0.0705426633358002,0.2269513010978699,0.5182529091835022,0,3,5,11,8,4,-1,5,11,4,2,2,9,13,4,2,2,0.0024423799477517605,0.5237097144126892,0.4098151028156281,0,3,10,16,8,4,-1,14,16,4,2,2,10,18,4,2,2,0.0015494349645450711,0.4773750901222229,0.5468043088912964,0,2,7,7,6,6,-1,9,7,2,6,3,-0.0239142198115587,0.7146975994110107,0.4783824980258942,0,2,10,2,4,10,-1,10,2,2,10,2,-0.0124536901712418,0.2635296881198883,0.5241122841835022,0,2,6,1,4,9,-1,8,1,2,9,2,-0.00020760179904755205,0.3623757064342499,0.5113608837127686,0,2,12,19,2,1,-1,12,19,1,1,2,0.000029781080229440704,0.4705932140350342,0.5432801842689514,104.74919891357422,211,0,2,1,2,4,9,-1,3,2,2,9,2,0.0117727499455214,0.3860518932342529,0.6421167254447937,0,2,7,5,6,4,-1,9,5,2,4,3,0.0270375702530146,0.4385654926300049,0.675403892993927,0,2,9,4,2,4,-1,9,6,2,2,2,-0.00003641950024757534,0.5487101078033447,0.34233158826828,0,2,14,5,2,8,-1,14,9,2,4,2,0.001999540952965617,0.3230532109737396,0.5400317907333374,0,2,7,6,5,12,-1,7,12,5,6,2,0.0045278300531208515,0.5091639757156372,0.2935043871402741,0,2,14,6,2,6,-1,14,9,2,3,2,0.00047890920541249216,0.4178153872489929,0.5344064235687256,0,2,4,6,2,6,-1,4,9,2,3,2,0.0011720920447260141,0.2899182140827179,0.5132070779800415,0,3,8,15,10,4,-1,13,15,5,2,2,8,17,5,2,2,0.0009530570241622627,0.428012490272522,0.5560845136642456,0,2,6,18,2,2,-1,7,18,1,2,2,0.000015099150004971307,0.4044871926307678,0.5404760241508484,0,2,11,3,6,2,-1,11,4,6,1,2,-0.0006081790197640657,0.4271768927574158,0.5503466129302979,0,2,2,0,16,6,-1,2,2,16,2,3,0.003322452073916793,0.3962723910808563,0.5369734764099121,0,2,11,3,6,2,-1,11,4,6,1,2,-0.0011037490330636501,0.4727177917957306,0.5237749814987183,0,2,4,11,10,3,-1,4,12,10,1,3,-0.0014350269921123981,0.5603008270263672,0.4223509132862091,0,2,11,3,6,2,-1,11,4,6,1,2,0.0020767399109899998,0.5225917100906372,0.4732725918292999,0,2,3,3,6,2,-1,3,4,6,1,2,-0.00016412809782195836,0.3999075889587402,0.5432739853858948,0,2,16,0,4,7,-1,16,0,2,7,2,0.008830243721604347,0.4678385853767395,0.6027327179908752,0,2,0,14,9,6,-1,0,16,9,2,3,-0.0105520701035857,0.3493967056274414,0.5213974714279175,0,2,9,16,3,3,-1,9,17,3,1,3,-0.00227316003292799,0.6185818910598755,0.4749062955379486,0,2,4,6,6,2,-1,6,6,2,2,3,-0.0008478633244521916,0.5285341143608093,0.3843482136726379,0,2,15,11,1,3,-1,15,12,1,1,3,0.0012081359745934606,0.536064088344574,0.3447335958480835,0,2,5,5,2,3,-1,5,6,2,1,3,0.002651273040100932,0.4558292031288147,0.6193962097167969,0,2,10,9,2,2,-1,10,10,2,1,2,-0.0011012479662895203,0.368023008108139,0.5327628254890442,0,2,3,1,4,3,-1,5,1,2,3,2,0.0004956151824444532,0.396059513092041,0.5274940729141235,0,2,16,0,4,7,-1,16,0,2,7,2,-0.0439017713069916,0.7020444869995117,0.4992839097976685,0,2,0,0,20,1,-1,10,0,10,1,2,0.0346903502941132,0.5049164295196533,0.276660293340683,0,2,15,11,1,3,-1,15,12,1,1,3,-0.002744219033047557,0.2672632932662964,0.5274971127510071,0,2,0,4,3,4,-1,1,4,1,4,3,0.003331658896058798,0.4579482972621918,0.6001101732254028,0,2,16,3,3,6,-1,16,5,3,2,3,-0.0200445707887411,0.3171594142913818,0.523571789264679,0,2,1,3,3,6,-1,1,5,3,2,3,0.0013492030557245016,0.5265362858772278,0.4034324884414673,0,3,6,2,12,6,-1,12,2,6,3,2,6,5,6,3,2,0.0029702018946409225,0.5332456827163696,0.4571984112262726,0,2,8,10,4,3,-1,8,11,4,1,3,0.006303998176008463,0.4593310952186585,0.6034635901451111,0,3,4,2,14,6,-1,11,2,7,3,2,4,5,7,3,2,-0.0129365902394056,0.4437963962554932,0.5372971296310425,0,2,9,11,2,3,-1,9,12,2,1,3,0.004014872945845127,0.4680323898792267,0.6437833905220032,0,2,15,13,2,3,-1,15,14,2,1,3,-0.002640167949721217,0.3709631860256195,0.5314332842826843,0,2,8,12,4,3,-1,8,13,4,1,3,0.0139184398576617,0.4723555147647858,0.713080883026123,0,2,15,11,1,3,-1,15,12,1,1,3,-0.00045087869511917233,0.4492394030094147,0.5370404124259949,0,2,7,13,5,2,-1,7,14,5,1,2,0.00025384349282830954,0.4406864047050476,0.5514402985572815,0,2,7,12,6,3,-1,7,13,6,1,3,0.002271000063046813,0.4682416915893555,0.5967984199523926,0,2,5,11,4,4,-1,5,13,4,2,2,0.002412077970802784,0.5079392194747925,0.3018598854541779,0,2,11,4,3,3,-1,12,4,1,3,3,-0.00003602567085181363,0.560103714466095,0.4471096992492676,0,2,6,4,3,3,-1,7,4,1,3,3,-0.0074905529618263245,0.2207535058259964,0.4989944100379944,0,2,16,5,3,6,-1,17,5,1,6,3,-0.017513120546937,0.6531215906143188,0.5017648935317993,0,2,3,6,12,7,-1,7,6,4,7,3,0.1428163051605225,0.4967963099479675,0.1482062041759491,0,2,16,5,3,6,-1,17,5,1,6,3,0.005534526892006397,0.4898946881294251,0.5954223871231079,0,2,3,13,2,3,-1,3,14,2,1,3,-0.0009632359142415226,0.3927116990089417,0.519607424736023,0,2,16,5,3,6,-1,17,5,1,6,3,-0.0020370010752230883,0.5613325238227844,0.4884858131408691,0,2,1,5,3,6,-1,2,5,1,6,3,0.0016614829655736685,0.4472880065441132,0.5578880906105042,0,2,1,9,18,1,-1,7,9,6,1,3,-0.0031188090797513723,0.3840532898902893,0.5397477746009827,0,2,0,9,8,7,-1,4,9,4,7,2,-0.006400061771273613,0.5843983888626099,0.4533218145370483,0,2,12,11,8,2,-1,12,12,8,1,2,0.0003131960111204535,0.5439221858978271,0.4234727919101715,0,2,0,11,8,2,-1,0,12,8,1,2,-0.0182220991700888,0.1288464963436127,0.4958404898643494,0,2,9,13,2,3,-1,9,14,2,1,3,0.008796924725174904,0.49512979388237,0.7153480052947998,0,3,4,10,12,4,-1,4,10,6,2,2,10,12,6,2,2,-0.004239507019519806,0.3946599960327148,0.5194936990737915,0,2,9,3,3,7,-1,10,3,1,7,3,0.009708627127110958,0.4897503852844238,0.6064900159835815,0,2,7,2,3,5,-1,8,2,1,5,3,-0.003993417136371136,0.3245440125465393,0.5060828924179077,0,3,9,12,4,6,-1,11,12,2,3,2,9,15,2,3,2,-0.0167850591242313,0.1581953018903732,0.5203778743743896,0,2,8,7,3,6,-1,9,7,1,6,3,0.018272090703249,0.4680935144424439,0.6626979112625122,0,2,15,4,4,2,-1,15,5,4,1,2,0.00568728381767869,0.5211697816848755,0.3512184917926788,0,2,8,7,3,3,-1,9,7,1,3,3,-0.0010739039862528443,0.5768386125564575,0.4529845118522644,0,2,14,2,6,4,-1,14,4,6,2,2,-0.00370938703417778,0.4507763087749481,0.5313581228256226,0,2,7,16,6,1,-1,9,16,2,1,3,-0.0002111070934915915,0.5460820198059082,0.4333376884460449,0,2,15,13,2,3,-1,15,14,2,1,3,0.0010670139454305172,0.5371856093406677,0.4078390896320343,0,2,8,7,3,10,-1,9,7,1,10,3,0.0035943021066486835,0.4471287131309509,0.5643836259841919,0,2,11,10,2,6,-1,11,12,2,2,3,-0.005177603103220463,0.4499393105506897,0.5280330181121826,0,2,6,10,4,1,-1,8,10,2,1,2,-0.00025414369883947074,0.5516173243522644,0.4407708048820496,0,2,10,9,2,2,-1,10,10,2,1,2,0.006352256052196026,0.5194190144538879,0.2465227991342545,0,2,8,9,2,2,-1,8,10,2,1,2,-0.00044205080484971404,0.3830705881118774,0.5139682292938232,0,3,12,7,2,2,-1,13,7,1,1,2,12,8,1,1,2,0.0007448872784152627,0.4891090989112854,0.5974786877632141,0,3,5,7,2,2,-1,5,7,1,1,2,6,8,1,1,2,-0.0035116379149258137,0.7413681745529175,0.4768764972686768,0,2,13,0,3,14,-1,14,0,1,14,3,-0.0125409103929996,0.3648819029331207,0.5252826809883118,0,2,4,0,3,14,-1,5,0,1,14,3,0.009493185207247734,0.5100492835044861,0.362958699464798,0,2,13,4,3,14,-1,14,4,1,14,3,0.0129611501470208,0.5232442021369934,0.4333561062812805,0,2,9,14,2,3,-1,9,15,2,1,3,0.004720944911241531,0.4648149013519287,0.6331052780151367,0,2,8,14,4,3,-1,8,15,4,1,3,-0.0023119079414755106,0.5930309891700745,0.4531058073043823,0,2,4,2,3,16,-1,5,2,1,16,3,-0.002826229901984334,0.3870477974414825,0.5257101058959961,0,2,7,2,8,10,-1,7,7,8,5,2,-0.0014311339473351836,0.552250325679779,0.4561854898929596,0,2,6,14,7,3,-1,6,15,7,1,3,0.0019378310535103083,0.4546220898628235,0.5736966729164124,0,3,9,2,10,12,-1,14,2,5,6,2,9,8,5,6,2,0.00026343559147790074,0.5345739126205444,0.4571875035762787,0,2,6,7,8,2,-1,6,8,8,1,2,0.0007825752254575491,0.3967815935611725,0.5220187902450562,0,2,8,13,4,6,-1,8,16,4,3,2,-0.0195504408329725,0.282964289188385,0.5243508219718933,0,2,6,6,1,3,-1,6,7,1,1,3,0.00043914958951063454,0.4590066969394684,0.589909017086029,0,2,16,2,4,6,-1,16,4,4,2,3,0.0214520003646612,0.523141086101532,0.2855378985404968,0,3,6,6,4,2,-1,6,6,2,1,2,8,7,2,1,2,0.0005897358059883118,0.4397256970405579,0.550642192363739,0,2,16,2,4,6,-1,16,4,4,2,3,-0.0261576101183891,0.3135079145431519,0.5189175009727478,0,2,0,2,4,6,-1,0,4,4,2,3,-0.0139598604291677,0.3213272988796234,0.5040717720985413,0,2,9,6,2,6,-1,9,6,1,6,2,-0.006369901821017265,0.6387544870376587,0.4849506914615631,0,2,3,4,6,10,-1,3,9,6,5,2,-0.008561382070183754,0.2759132087230682,0.5032019019126892,0,2,9,5,2,6,-1,9,5,1,6,2,0.000966229010373354,0.4685640931129456,0.5834879279136658,0,2,3,13,2,3,-1,3,14,2,1,3,0.0007655026856809855,0.5175207257270813,0.389642208814621,0,2,13,13,3,2,-1,13,14,3,1,2,-0.008183334022760391,0.2069136947393417,0.5208122134208679,0,3,2,16,10,4,-1,2,16,5,2,2,7,18,5,2,2,-0.009397693909704685,0.6134091019630432,0.4641222953796387,0,3,5,6,10,6,-1,10,6,5,3,2,5,9,5,3,2,0.004802898038178682,0.5454108119010925,0.439521998167038,0,2,7,14,1,3,-1,7,15,1,1,3,-0.003568056970834732,0.6344485282897949,0.4681093990802765,0,2,14,16,6,3,-1,14,17,6,1,3,0.0040733120404183865,0.5292683243751526,0.4015620052814484,0,2,5,4,3,3,-1,5,5,3,1,3,0.0012568129459396005,0.4392988085746765,0.5452824831008911,0,2,7,4,10,3,-1,7,5,10,1,3,-0.0029065010603517294,0.5898832082748413,0.4863379895687103,0,2,0,4,5,4,-1,0,6,5,2,2,-0.00244093406945467,0.4069364964962006,0.5247421860694885,0,2,13,11,3,9,-1,13,14,3,3,3,0.0248307008296251,0.5182725787162781,0.3682524859905243,0,2,4,11,3,9,-1,4,14,3,3,3,-0.0488540083169937,0.1307577937841415,0.496128112077713,0,2,9,7,2,1,-1,9,7,1,1,2,-0.001611037994734943,0.6421005725860596,0.4872662127017975,0,2,5,0,6,17,-1,7,0,2,17,3,-0.0970094799995422,0.0477693490684032,0.495098888874054,0,2,10,3,6,3,-1,10,3,3,3,2,0.0011209240183234215,0.4616267085075378,0.5354745984077454,0,2,2,2,15,4,-1,7,2,5,4,3,-0.001306409016251564,0.626185417175293,0.4638805985450745,0,3,8,2,8,2,-1,12,2,4,1,2,8,3,4,1,2,0.00045771620352752507,0.5384417772293091,0.4646640121936798,0,2,8,1,3,6,-1,8,3,3,2,3,-0.0006314995116554201,0.3804047107696533,0.51302570104599,0,2,9,17,2,2,-1,9,18,2,1,2,0.0001450597046641633,0.4554310142993927,0.5664461851119995,0,2,0,0,2,14,-1,1,0,1,14,2,-0.0164745505899191,0.6596958041191101,0.4715859889984131,0,2,12,0,7,3,-1,12,1,7,1,3,0.0133695797994733,0.519546627998352,0.3035964965820313,0,2,1,14,1,2,-1,1,15,1,1,2,0.00010271780047332868,0.522917628288269,0.4107066094875336,0,3,14,12,2,8,-1,15,12,1,4,2,14,16,1,4,2,-0.0055311559699475765,0.6352887749671936,0.4960907101631165,0,2,1,0,7,3,-1,1,1,7,1,3,-0.0026187049224972725,0.3824546039104462,0.5140984058380127,0,3,14,12,2,8,-1,15,12,1,4,2,14,16,1,4,2,0.005083426833152771,0.4950439929962158,0.6220818758010864,0,3,6,0,8,12,-1,6,0,4,6,2,10,6,4,6,2,0.0798181593418121,0.4952335953712463,0.1322475969791412,0,2,6,1,8,9,-1,6,4,8,3,3,-0.0992265865206718,0.7542728781700134,0.5008416771888733,0,2,5,2,2,2,-1,5,3,2,1,2,-0.0006517401780001819,0.3699302971363068,0.5130121111869812,0,3,13,14,6,6,-1,16,14,3,3,2,13,17,3,3,2,-0.018996849656105,0.6689178943634033,0.4921202957630158,0,3,0,17,20,2,-1,0,17,10,1,2,10,18,10,1,2,0.0173468999564648,0.4983300864696503,0.1859198063611984,0,3,10,3,2,6,-1,11,3,1,3,2,10,6,1,3,2,0.0005508210160769522,0.4574424028396606,0.5522121787071228,0,2,5,12,6,2,-1,8,12,3,2,2,0.002005605027079582,0.5131744742393494,0.3856469988822937,0,2,10,7,6,13,-1,10,7,3,13,2,-0.007768819108605385,0.4361700117588043,0.5434309244155884,0,2,5,15,10,5,-1,10,15,5,5,2,0.0508782789111137,0.4682720899581909,0.6840639710426331,0,2,10,4,4,10,-1,10,4,2,10,2,-0.0022901780903339386,0.4329245090484619,0.5306099057197571,0,2,5,7,2,1,-1,6,7,1,1,2,-0.00015715380141045898,0.5370057225227356,0.4378164112567902,0,2,10,3,6,7,-1,10,3,3,7,2,0.1051924005150795,0.5137274265289307,0.0673614665865898,0,2,4,3,6,7,-1,7,3,3,7,2,0.002719891956076026,0.4112060964107513,0.5255665183067322,0,2,1,7,18,5,-1,7,7,6,5,3,0.0483377799391747,0.5404623746871948,0.4438967108726502,0,2,3,17,4,3,-1,5,17,2,3,2,0.0009570376132614911,0.4355969130992889,0.5399510860443115,0,3,8,14,12,6,-1,14,14,6,3,2,8,17,6,3,2,-0.0253712590783834,0.5995175242424011,0.5031024813652039,0,3,0,13,20,4,-1,0,13,10,2,2,10,15,10,2,2,0.0524579510092735,0.4950287938117981,0.1398351043462753,0,3,4,5,14,2,-1,11,5,7,1,2,4,6,7,1,2,-0.0123656298965216,0.639729917049408,0.496410608291626,0,3,1,2,10,12,-1,1,2,5,6,2,6,8,5,6,2,-0.1458971947431564,0.1001669988036156,0.494632214307785,0,2,6,1,14,3,-1,6,2,14,1,3,-0.0159086007624865,0.3312329947948456,0.5208340883255005,0,2,8,16,2,3,-1,8,17,2,1,3,0.00039486068999394774,0.4406363964080811,0.5426102876663208,0,2,9,17,3,2,-1,10,17,1,2,3,-0.0052454001270234585,0.2799589931964874,0.5189967155456543,0,3,5,15,4,2,-1,5,15,2,1,2,7,16,2,1,2,-0.005042179953306913,0.6987580060958862,0.4752142131328583,0,2,10,15,1,3,-1,10,16,1,1,3,0.0029812189750373363,0.4983288943767548,0.6307479739189148,0,3,8,16,4,4,-1,8,16,2,2,2,10,18,2,2,2,-0.007288430817425251,0.298233300447464,0.5026869773864746,0,2,6,11,8,6,-1,6,14,8,3,2,0.0015094350092113018,0.5308442115783691,0.3832970857620239,0,2,2,13,5,2,-1,2,14,5,1,2,-0.009334079921245575,0.2037964016199112,0.4969817101955414,0,3,13,14,6,6,-1,16,14,3,3,2,13,17,3,3,2,0.0286671407520771,0.5025696754455566,0.6928027272224426,0,2,1,9,18,4,-1,7,9,6,4,3,0.1701968014240265,0.4960052967071533,0.1476442962884903,0,3,13,14,6,6,-1,16,14,3,3,2,13,17,3,3,2,-0.003261447884142399,0.5603063702583313,0.4826056063175201,0,2,0,2,1,6,-1,0,4,1,2,3,0.0005576927796937525,0.5205562114715576,0.4129633009433746,0,2,5,0,15,20,-1,5,10,15,10,2,0.3625833988189697,0.5221652984619141,0.3768612146377564,0,3,1,14,6,6,-1,1,14,3,3,2,4,17,3,3,2,-0.0116151301190257,0.6022682785987854,0.4637489914894104,0,3,8,14,4,6,-1,10,14,2,3,2,8,17,2,3,2,-0.004079519771039486,0.4070447087287903,0.5337479114532471,0,2,7,11,2,1,-1,8,11,1,1,2,0.0005720430053770542,0.4601835012435913,0.5900393128395081,0,2,9,17,3,2,-1,10,17,1,2,3,0.000675433489959687,0.5398252010345459,0.4345428943634033,0,2,8,17,3,2,-1,9,17,1,2,3,0.0006329569732770324,0.5201563239097595,0.4051358997821808,0,3,12,14,4,6,-1,14,14,2,3,2,12,17,2,3,2,0.00124353205319494,0.4642387926578522,0.5547441244125366,0,3,4,14,4,6,-1,4,14,2,3,2,6,17,2,3,2,-0.004736385773867369,0.6198567152023315,0.4672552049160004,0,3,13,14,2,6,-1,14,14,1,3,2,13,17,1,3,2,-0.006465846206992865,0.6837332844734192,0.5019000768661499,0,3,5,14,2,6,-1,5,14,1,3,2,6,17,1,3,2,0.000350173213519156,0.4344803094863892,0.5363622903823853,0,2,7,0,6,12,-1,7,4,6,4,3,0.00015754920605104417,0.4760079085826874,0.5732020735740662,0,2,0,7,12,2,-1,4,7,4,2,3,0.009977436624467373,0.5090985894203186,0.3635039925575256,0,2,10,3,3,13,-1,11,3,1,13,3,-0.0004146452993154526,0.5570064783096313,0.4593802094459534,0,2,7,3,3,13,-1,8,3,1,13,3,-0.00035888899583369493,0.5356845855712891,0.4339134991168976,0,2,10,8,6,3,-1,10,9,6,1,3,0.0004046325047966093,0.4439803063869476,0.5436776876449585,0,2,3,11,3,2,-1,4,11,1,2,3,-0.0008218478760682046,0.4042294919490814,0.5176299214363098,0,3,13,12,6,8,-1,16,12,3,4,2,13,16,3,4,2,0.005946741905063391,0.4927651882171631,0.5633779764175415,0,2,7,6,6,5,-1,9,6,2,5,3,-0.0217533893883228,0.8006293773651123,0.480084091424942,0,2,17,11,2,7,-1,17,11,1,7,2,-0.0145403798669577,0.3946054875850678,0.5182222723960876,0,2,3,13,8,2,-1,7,13,4,2,2,-0.0405107699334621,0.0213249903172255,0.4935792982578278,0,2,6,9,8,3,-1,6,10,8,1,3,-0.0005845826817676425,0.4012795984745026,0.5314025282859802,0,2,4,3,4,3,-1,4,4,4,1,3,0.005515180062502623,0.4642418920993805,0.5896260738372803,0,2,11,3,4,3,-1,11,4,4,1,3,-0.006062622182071209,0.6502159237861633,0.5016477704048157,0,2,1,4,17,12,-1,1,8,17,4,3,0.0945358425378799,0.5264708995819092,0.4126827120780945,0,2,11,3,4,3,-1,11,4,4,1,3,0.004731505177915096,0.4879199862480164,0.5892447829246521,0,2,4,8,6,3,-1,4,9,6,1,3,-0.0005257147131487727,0.391728013753891,0.5189412832260132,0,2,12,3,5,3,-1,12,4,5,1,3,-0.002546404954046011,0.5837599039077759,0.498570591211319,0,2,1,11,2,7,-1,2,11,1,7,2,-0.0260756891220808,0.1261983960866928,0.4955821931362152,0,3,15,12,2,8,-1,16,12,1,4,2,15,16,1,4,2,-0.00547797093167901,0.5722513794898987,0.5010265707969666,0,2,4,8,11,3,-1,4,9,11,1,3,0.005133774131536484,0.527326226234436,0.4226376116275787,0,3,9,13,6,2,-1,12,13,3,1,2,9,14,3,1,2,0.000479449809063226,0.4450066983699799,0.5819587111473083,0,2,6,13,4,3,-1,6,14,4,1,3,-0.0021114079281687737,0.5757653117179871,0.451171487569809,0,2,9,12,3,3,-1,10,12,1,3,3,-0.0131799904629588,0.1884381026029587,0.5160734057426453,0,2,5,3,3,3,-1,5,4,3,1,3,-0.004796809982508421,0.6589789986610413,0.4736118912696838,0,2,9,4,2,3,-1,9,5,2,1,3,0.0067483168095350266,0.5259429812431335,0.3356395065784454,0,2,0,2,16,3,-1,0,3,16,1,3,0.0014623369788751006,0.5355271100997925,0.4264092147350311,0,3,15,12,2,8,-1,16,12,1,4,2,15,16,1,4,2,0.004764515906572342,0.5034406781196594,0.5786827802658081,0,3,3,12,2,8,-1,3,12,1,4,2,4,16,1,4,2,0.0068066660314798355,0.475660502910614,0.6677829027175903,0,2,14,13,3,6,-1,14,15,3,2,3,0.0036608621012419462,0.5369611978530884,0.4311546981334686,0,2,3,13,3,6,-1,3,15,3,2,3,0.0214496403932571,0.4968641996383667,0.1888816058635712,0,3,6,5,10,2,-1,11,5,5,1,2,6,6,5,1,2,0.004167890176177025,0.4930733144283295,0.5815368890762329,0,2,2,14,14,6,-1,2,17,14,3,2,0.008646756410598755,0.5205205082893372,0.4132595062255859,0,2,10,14,1,3,-1,10,15,1,1,3,-0.0003611407882999629,0.5483555197715759,0.4800927937030792,0,3,4,16,2,2,-1,4,16,1,1,2,5,17,1,1,2,0.0010808729566633701,0.4689902067184448,0.6041421294212341,0,2,10,6,2,3,-1,10,7,2,1,3,0.005771995987743139,0.5171142220497131,0.3053277134895325,0,3,0,17,20,2,-1,0,17,10,1,2,10,18,10,1,2,0.001572077046148479,0.5219978094100952,0.4178803861141205,0,2,13,6,1,3,-1,13,7,1,1,3,-0.0019307859474793077,0.5860369801521301,0.4812920093536377,0,2,8,13,3,2,-1,9,13,1,2,3,-0.007892627269029617,0.1749276965856552,0.497173398733139,0,2,12,2,3,3,-1,13,2,1,3,3,-0.002222467912361026,0.434258908033371,0.521284818649292,0,3,3,18,2,2,-1,3,18,1,1,2,4,19,1,1,2,0.0019011989934369922,0.4765186905860901,0.689205527305603,0,2,9,16,3,4,-1,10,16,1,4,3,0.0027576119173318148,0.5262191295623779,0.4337486028671265,0,2,6,6,1,3,-1,6,7,1,1,3,0.005178744904696941,0.4804069101810455,0.7843729257583618,0,2,13,1,5,2,-1,13,2,5,1,2,-0.0009027334162965417,0.412084698677063,0.5353423953056335,0,3,7,14,6,2,-1,7,14,3,1,2,10,15,3,1,2,0.005179795902222395,0.4740372896194458,0.6425960063934326,0,2,11,3,3,4,-1,12,3,1,4,3,-0.0101140001788735,0.2468792051076889,0.5175017714500427,0,2,1,13,12,6,-1,5,13,4,6,3,-0.0186170600354671,0.5756294131278992,0.4628978967666626,0,2,14,11,5,2,-1,14,12,5,1,2,0.0059225959703326225,0.5169625878334045,0.3214271068572998,0,3,2,15,14,4,-1,2,15,7,2,2,9,17,7,2,2,-0.006294507998973131,0.3872014880180359,0.5141636729240417,0,3,3,7,14,2,-1,10,7,7,1,2,3,8,7,1,2,0.0065353019163012505,0.4853048920631409,0.6310489773750305,0,2,1,11,4,2,-1,1,12,4,1,2,0.0010878399480134249,0.5117315053939819,0.3723258972167969,0,2,14,0,6,14,-1,16,0,2,14,3,-0.0225422400981188,0.5692740082740784,0.4887112975120544,0,2,4,11,1,3,-1,4,12,1,1,3,-0.003006566083058715,0.2556012868881226,0.5003992915153503,0,2,14,0,6,14,-1,16,0,2,14,3,0.007474127225577831,0.4810872972011566,0.5675926804542542,0,2,1,10,3,7,-1,2,10,1,7,3,0.0261623207479715,0.4971194863319397,0.1777237057685852,0,2,8,12,9,2,-1,8,13,9,1,2,0.0009435273823328316,0.4940010905265808,0.549125075340271,0,2,0,6,20,1,-1,10,6,10,1,2,0.0333632417023182,0.5007612109184265,0.2790724039077759,0,2,8,4,4,4,-1,8,4,2,4,2,-0.0151186501607299,0.7059578895568848,0.4973031878471375,0,2,0,0,2,2,-1,0,1,2,1,2,0.0009864894673228264,0.5128620266914368,0.3776761889457703,105.76110076904297,213,0,2,5,3,10,9,-1,5,6,10,3,3,-0.0951507985591888,0.6470757126808167,0.4017286896705627,0,2,15,2,4,10,-1,15,2,2,10,2,0.006270234007388353,0.399982213973999,0.574644923210144,0,2,8,2,2,7,-1,9,2,1,7,2,0.000300180894555524,0.355877012014389,0.5538809895515442,0,2,7,4,12,1,-1,11,4,4,1,3,0.0011757409665733576,0.425653487443924,0.5382617712020874,0,2,3,4,9,1,-1,6,4,3,1,3,0.00004423526843311265,0.3682908117771149,0.5589926838874817,0,2,15,10,1,4,-1,15,12,1,2,2,-0.000029936920327600092,0.5452470183372498,0.4020367860794067,0,2,4,10,6,4,-1,7,10,3,4,2,0.003007319988682866,0.5239058136940002,0.3317843973636627,0,2,15,9,1,6,-1,15,12,1,3,2,-0.0105138896033168,0.4320689141750336,0.5307983756065369,0,2,7,17,6,3,-1,7,18,6,1,3,0.008347682654857635,0.4504637122154236,0.6453298926353455,0,3,14,3,2,16,-1,15,3,1,8,2,14,11,1,8,2,-0.0031492270063608885,0.4313425123691559,0.5370525121688843,0,2,4,9,1,6,-1,4,12,1,3,2,-0.00001443564997316571,0.5326603055000305,0.381797194480896,0,2,12,1,5,2,-1,12,2,5,1,2,-0.00042855090578086674,0.430516391992569,0.5382009744644165,0,3,6,18,4,2,-1,6,18,2,1,2,8,19,2,1,2,0.00015062429883982986,0.4235970973968506,0.5544965267181396,0,3,2,4,16,10,-1,10,4,8,5,2,2,9,8,5,2,0.0715598315000534,0.5303059816360474,0.2678802907466888,0,2,6,5,1,10,-1,6,10,1,5,2,0.0008409518050029874,0.3557108938694,0.5205433964729309,0,2,4,8,15,2,-1,9,8,5,2,3,0.0629865005612373,0.5225362777709961,0.2861376106739044,0,2,1,8,15,2,-1,6,8,5,2,3,-0.0033798629883676767,0.3624185919761658,0.5201697945594788,0,2,9,5,3,6,-1,9,7,3,2,3,-0.00011810739670181647,0.547447681427002,0.3959893882274628,0,2,5,7,8,2,-1,9,7,4,2,2,-0.0005450560129247606,0.3740422129631043,0.5215715765953064,0,2,9,11,2,3,-1,9,12,2,1,3,-0.0018454910023137927,0.5893052220344543,0.4584448933601379,0,2,1,0,16,3,-1,1,1,16,1,3,-0.0004383237101137638,0.4084582030773163,0.5385351181030273,0,2,11,2,7,2,-1,11,3,7,1,2,-0.002400083001703024,0.377745509147644,0.5293580293655396,0,2,5,1,10,18,-1,5,7,10,6,3,-0.0987957417964935,0.2963612079620361,0.5070089101791382,0,2,17,4,3,2,-1,18,4,1,2,3,0.0031798239797353745,0.4877632856369019,0.6726443767547607,0,2,8,13,1,3,-1,8,14,1,1,3,0.00032406419632025063,0.4366911053657532,0.5561109781265259,0,2,3,14,14,6,-1,3,16,14,2,3,-0.0325472503900528,0.31281578540802,0.5308616161346436,0,2,0,2,3,4,-1,1,2,1,4,3,-0.007756113074719906,0.6560224890708923,0.4639872014522553,0,2,12,1,5,2,-1,12,2,5,1,2,0.0160272493958473,0.5172680020332336,0.3141897916793823,0,2,3,1,5,2,-1,3,2,5,1,2,0.00000710023505234858,0.4084446132183075,0.5336294770240784,0,2,10,13,2,3,-1,10,14,2,1,3,0.007342280820012093,0.4966922104358673,0.660346508026123,0,2,8,13,2,3,-1,8,14,2,1,3,-0.0016970280557870865,0.5908237099647522,0.4500182867050171,0,2,14,12,2,3,-1,14,13,2,1,3,0.0024118260480463505,0.5315160751342773,0.3599720895290375,0,2,7,2,2,3,-1,7,3,2,1,3,-0.005530093796551228,0.2334040999412537,0.4996814131736755,0,3,5,6,10,4,-1,10,6,5,2,2,5,8,5,2,2,-0.0026478730142116547,0.5880935788154602,0.4684734046459198,0,2,9,13,1,6,-1,9,16,1,3,2,0.0112956296652555,0.4983777105808258,0.1884590983390808,0,3,10,12,2,2,-1,11,12,1,1,2,10,13,1,1,2,-0.000669528788421303,0.5872138142585754,0.4799019992351532,0,2,4,12,2,3,-1,4,13,2,1,3,0.0014410680159926414,0.5131189227104187,0.350101113319397,0,2,14,4,6,6,-1,14,6,6,2,3,0.0024637870956212282,0.5339372158050537,0.4117639064788818,0,2,8,17,2,3,-1,8,18,2,1,3,0.0003311451873742044,0.4313383102416992,0.5398246049880981,0,2,16,4,4,6,-1,16,6,4,2,3,-0.0335572697222233,0.26753368973732,0.5179154872894287,0,2,0,4,4,6,-1,0,6,4,2,3,0.0185394193977118,0.4973869919776917,0.2317177057266235,0,2,14,6,2,3,-1,14,6,1,3,2,-0.00029698139405809343,0.552970826625824,0.4643664062023163,0,2,4,9,8,1,-1,8,9,4,1,2,-0.0004557725915219635,0.5629584193229675,0.4469191133975983,0,2,8,12,4,3,-1,8,13,4,1,3,-0.0101589802652597,0.6706212759017944,0.4925918877124786,0,2,5,12,10,6,-1,5,14,10,2,3,-0.000022413829356082715,0.5239421725273132,0.3912901878356934,0,2,11,12,1,2,-1,11,13,1,1,2,0.00007203496352303773,0.4799438118934631,0.5501788854598999,0,2,8,15,4,2,-1,8,16,4,1,2,-0.006926720961928368,0.6930009722709656,0.4698084890842438,0,3,6,9,8,8,-1,10,9,4,4,2,6,13,4,4,2,-0.007699783891439438,0.409962385892868,0.5480883121490479,0,3,7,12,4,6,-1,7,12,2,3,2,9,15,2,3,2,-0.007313054986298084,0.3283475935459137,0.5057886242866516,0,2,10,11,3,1,-1,11,11,1,1,3,0.0019650589674711227,0.4978047013282776,0.6398249864578247,0,3,9,7,2,10,-1,9,7,1,5,2,10,12,1,5,2,0.007164760027080774,0.4661160111427307,0.6222137212753296,0,2,8,0,6,6,-1,10,0,2,6,3,-0.0240786392241716,0.2334644943475723,0.5222162008285522,0,2,3,11,2,6,-1,3,13,2,2,3,-0.0210279691964388,0.1183653995394707,0.4938226044178009,0,2,16,12,1,2,-1,16,13,1,1,2,0.00036017020465806127,0.5325019955635071,0.4116711020469666,0,3,1,14,6,6,-1,1,14,3,3,2,4,17,3,3,2,-0.0172197297215462,0.6278762221336365,0.4664269089698792,0,2,13,1,3,6,-1,14,1,1,6,3,-0.007867214269936085,0.3403415083885193,0.5249736905097961,0,2,8,8,2,2,-1,8,9,2,1,2,-0.000447773898486048,0.3610411882400513,0.5086259245872498,0,2,9,9,3,3,-1,10,9,1,3,3,0.005548601038753986,0.4884265959262848,0.6203498244285583,0,2,8,7,3,3,-1,8,8,3,1,3,-0.00694611482322216,0.262593001127243,0.5011097192764282,0,2,14,0,2,3,-1,14,0,1,3,2,0.00013569870498031378,0.4340794980525971,0.5628312230110168,0,2,1,0,18,9,-1,7,0,6,9,3,-0.0458802506327629,0.6507998704910278,0.4696274995803833,0,2,11,5,4,15,-1,11,5,2,15,2,-0.0215825606137514,0.3826502859592438,0.5287616848945618,0,2,5,5,4,15,-1,7,5,2,15,2,-0.0202095396816731,0.3233368098735809,0.5074477195739746,0,2,14,0,2,3,-1,14,0,1,3,2,0.005849671084433794,0.5177603960037231,0.4489670991897583,0,2,4,0,2,3,-1,5,0,1,3,2,-0.00005747637987951748,0.4020850956439972,0.5246363878250122,0,3,11,12,2,2,-1,12,12,1,1,2,11,13,1,1,2,-0.001151310047134757,0.6315072178840637,0.490515410900116,0,3,7,12,2,2,-1,7,12,1,1,2,8,13,1,1,2,0.0019862831104546785,0.4702459871768951,0.6497151255607605,0,2,12,0,3,4,-1,13,0,1,4,3,-0.005271951202303171,0.3650383949279785,0.5227652788162231,0,2,4,11,3,3,-1,4,12,3,1,3,0.0012662699446082115,0.5166100859642029,0.387761801481247,0,2,12,7,4,2,-1,12,8,4,1,2,-0.006291944067925215,0.737589418888092,0.5023847818374634,0,2,8,10,3,2,-1,9,10,1,2,3,0.000673601112794131,0.4423226118087769,0.5495585799217224,0,2,9,9,3,2,-1,10,9,1,2,3,-0.0010523450328037143,0.5976396203041077,0.4859583079814911,0,2,8,9,3,2,-1,9,9,1,2,3,-0.00044216238893568516,0.5955939292907715,0.4398930966854096,0,2,12,0,3,4,-1,13,0,1,4,3,0.0011747940443456173,0.5349888205528259,0.4605058133602142,0,2,5,0,3,4,-1,6,0,1,4,3,0.005245743785053492,0.5049191117286682,0.2941577136516571,0,3,4,14,12,4,-1,10,14,6,2,2,4,16,6,2,2,-0.0245397202670574,0.2550177872180939,0.5218586921691895,0,2,8,13,2,3,-1,8,14,2,1,3,0.0007379304151982069,0.4424861073493958,0.5490816235542297,0,2,10,10,3,8,-1,10,14,3,4,2,0.0014233799884095788,0.5319514274597168,0.4081355929374695,0,3,8,10,4,8,-1,8,10,2,4,2,10,14,2,4,2,-0.0024149110540747643,0.4087659120559692,0.5238950252532959,0,2,10,8,3,1,-1,11,8,1,1,3,-0.0012165299849584699,0.567457914352417,0.4908052980899811,0,2,9,12,1,6,-1,9,15,1,3,2,-0.0012438809499144554,0.4129425883293152,0.5256118178367615,0,2,10,8,3,1,-1,11,8,1,1,3,0.006194273941218853,0.5060194134712219,0.7313653230667114,0,2,7,8,3,1,-1,8,8,1,1,3,-0.0016607169527560472,0.5979632139205933,0.4596369862556458,0,2,5,2,15,14,-1,5,9,15,7,2,-0.0273162592202425,0.4174365103244782,0.5308842062950134,0,3,2,1,2,10,-1,2,1,1,5,2,3,6,1,5,2,-0.00158455700147897,0.56158047914505,0.4519486129283905,0,2,14,14,2,3,-1,14,15,2,1,3,-0.0015514739789068699,0.4076187014579773,0.5360785126686096,0,2,2,7,3,3,-1,3,7,1,3,3,0.0003844655875582248,0.4347293972969055,0.5430442094802856,0,2,17,4,3,3,-1,17,5,3,1,3,-0.0146722598001361,0.1659304946660996,0.5146093964576721,0,2,0,4,3,3,-1,0,5,3,1,3,0.008160888217389584,0.4961819052696228,0.1884745955467224,0,3,13,5,6,2,-1,16,5,3,1,2,13,6,3,1,2,0.0011121659772470593,0.4868263900279999,0.6093816161155701,0,2,4,19,12,1,-1,8,19,4,1,3,-0.007260377053171396,0.6284325122833252,0.4690375924110413,0,2,12,12,2,4,-1,12,14,2,2,2,-0.00024046430189628154,0.5575000047683716,0.4046044051647186,0,2,3,15,1,3,-1,3,16,1,1,3,-0.00023348190006799996,0.4115762114524841,0.5252848267555237,0,2,11,16,6,4,-1,11,16,3,4,2,0.005573648028075695,0.4730072915554047,0.5690100789070129,0,2,2,10,3,10,-1,3,10,1,10,3,0.0306237693876028,0.4971886873245239,0.1740095019340515,0,2,12,8,2,4,-1,12,8,1,4,2,0.0009207479888573289,0.5372117757797241,0.4354872107505798,0,2,6,8,2,4,-1,7,8,1,4,2,-0.00004355073906481266,0.5366883873939514,0.4347316920757294,0,2,10,14,2,3,-1,10,14,1,3,2,-0.006645271088927984,0.3435518145561218,0.516053318977356,0,2,5,1,10,3,-1,10,1,5,3,2,0.0432219989597797,0.4766792058944702,0.7293652892112732,0,2,10,7,3,2,-1,11,7,1,2,3,0.0022331769578158855,0.5029315948486328,0.5633171200752258,0,2,5,6,9,2,-1,8,6,3,2,3,0.0031829739455133677,0.4016092121601105,0.5192136764526367,0,2,9,8,2,2,-1,9,9,2,1,2,-0.00018027749320026487,0.4088315963745117,0.5417919754981995,0,3,2,11,16,6,-1,2,11,8,3,2,10,14,8,3,2,-0.0052934689447283745,0.407567709684372,0.5243561863899231,0,3,12,7,2,2,-1,13,7,1,1,2,12,8,1,1,2,0.0012750959722325206,0.4913282990455627,0.6387010812759399,0,2,9,5,2,3,-1,9,6,2,1,3,0.004338532220572233,0.5031672120094299,0.2947346866130829,0,2,9,7,3,2,-1,10,7,1,2,3,0.00852507445961237,0.4949789047241211,0.6308869123458862,0,2,5,1,8,12,-1,5,7,8,6,2,-0.0009426635224372149,0.5328366756439209,0.4285649955272675,0,2,13,5,2,2,-1,13,6,2,1,2,0.0013609660090878606,0.4991525113582611,0.5941501259803772,0,2,5,5,2,2,-1,5,6,2,1,2,0.0004478250921238214,0.4573504030704498,0.5854480862617493,0,2,12,4,3,3,-1,12,5,3,1,3,0.001336005050688982,0.4604358971118927,0.584905207157135,0,2,4,14,2,3,-1,4,15,2,1,3,-0.0006096754805184901,0.3969388902187347,0.522942304611206,0,2,12,4,3,3,-1,12,5,3,1,3,-0.002365678083151579,0.5808320045471191,0.4898357093334198,0,2,5,4,3,3,-1,5,5,3,1,3,0.001073434017598629,0.435121089220047,0.5470039248466492,0,3,9,14,2,6,-1,10,14,1,3,2,9,17,1,3,2,0.0021923359017819166,0.535506010055542,0.3842903971672058,0,2,8,14,3,2,-1,9,14,1,2,3,0.005496861878782511,0.5018138885498047,0.2827191948890686,0,2,9,5,6,6,-1,11,5,2,6,3,-0.0753688216209412,0.1225076019763947,0.5148826837539673,0,2,5,5,6,6,-1,7,5,2,6,3,0.0251344703137875,0.4731766879558563,0.702544629573822,0,2,13,13,1,2,-1,13,14,1,1,2,-0.00002935859993158374,0.5430532097816467,0.465608686208725,0,2,0,2,10,2,-1,0,3,10,1,2,-0.0005835591000504792,0.4031040072441101,0.5190119743347168,0,2,13,13,1,2,-1,13,14,1,1,2,-0.0026639450807124376,0.4308126866817474,0.5161771178245544,0,3,5,7,2,2,-1,5,7,1,1,2,6,8,1,1,2,-0.0013804089976474643,0.621982991695404,0.4695515930652618,0,2,13,5,2,7,-1,13,5,1,7,2,0.0012313219485804439,0.5379363894462585,0.4425831139087677,0,2,6,13,1,2,-1,6,14,1,1,2,-0.000014644179827882908,0.5281640291213989,0.4222503006458283,0,2,11,0,3,7,-1,12,0,1,7,3,-0.0128188095986843,0.2582092881202698,0.5179932713508606,0,3,0,3,2,16,-1,0,3,1,8,2,1,11,1,8,2,0.0228521898388863,0.4778693020343781,0.7609264254570007,0,2,11,0,3,7,-1,12,0,1,7,3,0.0008230597013607621,0.5340992212295532,0.4671724140644074,0,2,6,0,3,7,-1,7,0,1,7,3,0.0127701200544834,0.4965761005878449,0.1472366005182266,0,2,11,16,8,4,-1,11,16,4,4,2,-0.0500515103340149,0.641499400138855,0.5016592144966125,0,2,1,16,8,4,-1,5,16,4,4,2,0.0157752707600594,0.4522320032119751,0.5685362219810486,0,2,13,5,2,7,-1,13,5,1,7,2,-0.0185016207396984,0.2764748930931091,0.5137959122657776,0,2,5,5,2,7,-1,6,5,1,7,2,0.0024626250378787518,0.5141941905021667,0.3795408010482788,0,2,18,6,2,14,-1,18,13,2,7,2,0.0629161670804024,0.5060648918151855,0.658043384552002,0,2,6,10,3,4,-1,6,12,3,2,2,-0.000021648500478477217,0.5195388197898865,0.401988685131073,0,2,14,7,1,2,-1,14,8,1,1,2,0.0021180990152060986,0.4962365031242371,0.5954458713531494,0,3,0,1,18,6,-1,0,1,9,3,2,9,4,9,3,2,-0.0166348908096552,0.3757933080196381,0.517544686794281,0,2,14,7,1,2,-1,14,8,1,1,2,-0.002889947034418583,0.6624013781547546,0.5057178735733032,0,2,0,6,2,14,-1,0,13,2,7,2,0.076783262193203,0.4795796871185303,0.8047714829444885,0,2,17,0,3,12,-1,18,0,1,12,3,0.003917067777365446,0.4937882125377655,0.5719941854476929,0,2,0,6,18,3,-1,0,7,18,1,3,-0.0726706013083458,0.0538945607841015,0.4943903982639313,0,2,6,0,14,16,-1,6,8,14,8,2,0.5403950214385986,0.5129774212837219,0.1143338978290558,0,2,0,0,3,12,-1,1,0,1,12,3,0.0029510019812732935,0.4528343975543976,0.5698574185371399,0,2,13,0,3,7,-1,14,0,1,7,3,0.0034508369863033295,0.5357726812362671,0.4218730926513672,0,2,5,7,1,2,-1,5,8,1,1,2,-0.0004207793972454965,0.5916172862052917,0.4637925922870636,0,2,14,4,6,6,-1,14,6,6,2,3,0.0033051050268113613,0.5273385047912598,0.438204288482666,0,2,5,7,7,2,-1,5,8,7,1,2,0.0004773506079800427,0.4046528041362763,0.5181884765625,0,2,8,6,6,9,-1,8,9,6,3,3,-0.0259285103529692,0.7452235817909241,0.5089386105537415,0,2,5,4,6,1,-1,7,4,2,1,3,-0.002972979098558426,0.3295435905456543,0.5058795213699341,0,3,13,0,6,4,-1,16,0,3,2,2,13,2,3,2,2,0.005850832909345627,0.4857144057750702,0.5793024897575378,0,2,1,2,18,12,-1,1,6,18,4,3,-0.0459675192832947,0.4312731027603149,0.5380653142929077,0,2,3,2,17,12,-1,3,6,17,4,3,0.1558596044778824,0.5196170210838318,0.1684713959693909,0,2,5,14,7,3,-1,5,15,7,1,3,0.0151648297905922,0.4735757112503052,0.6735026836395264,0,2,10,14,1,3,-1,10,15,1,1,3,-0.0010604249546304345,0.5822926759719849,0.4775702953338623,0,2,3,14,3,3,-1,3,15,3,1,3,0.006647629197686911,0.4999198913574219,0.231953501701355,0,2,14,4,6,6,-1,14,6,6,2,3,-0.0122311301529408,0.4750893115997315,0.5262982249259949,0,2,0,4,6,6,-1,0,6,6,2,3,0.005652888212352991,0.5069767832756042,0.3561818897724152,0,2,12,5,4,3,-1,12,6,4,1,3,0.0012977829901501536,0.4875693917274475,0.5619062781333923,0,2,4,5,4,3,-1,4,6,4,1,3,0.0107815898954868,0.4750770032405853,0.6782308220863342,0,2,18,0,2,6,-1,18,2,2,2,3,0.002865477930754423,0.5305461883544922,0.4290736019611359,0,2,8,1,4,9,-1,10,1,2,9,2,0.0028663428965955973,0.4518479108810425,0.5539351105690002,0,2,6,6,8,2,-1,6,6,4,2,2,-0.005198332015424967,0.4149119853973389,0.5434188842773438,0,3,6,5,4,2,-1,6,5,2,1,2,8,6,2,1,2,0.005373999010771513,0.471789687871933,0.6507657170295715,0,2,10,5,2,3,-1,10,6,2,1,3,-0.0146415298804641,0.2172164022922516,0.5161777138710022,0,2,9,5,1,3,-1,9,6,1,1,3,-0.000015042580344015732,0.533738374710083,0.4298836886882782,0,2,9,10,2,2,-1,9,11,2,1,2,-0.0001187566012958996,0.4604594111442566,0.5582447052001953,0,2,0,8,4,3,-1,0,9,4,1,3,0.0169955305755138,0.4945895075798035,0.0738800764083862,0,2,6,0,8,6,-1,6,3,8,3,2,-0.0350959412753582,0.70055091381073,0.4977591037750244,0,3,1,0,6,4,-1,1,0,3,2,2,4,2,3,2,2,0.0024217350874096155,0.4466265141963959,0.5477694272994995,0,2,13,0,3,7,-1,14,0,1,7,3,-0.0009634033776819706,0.4714098870754242,0.5313338041305542,0,2,9,16,2,2,-1,9,17,2,1,2,0.00016391130338888615,0.4331546127796173,0.5342242121696472,0,2,11,4,6,10,-1,11,9,6,5,2,-0.0211414601653814,0.2644700109958649,0.5204498767852783,0,2,0,10,19,2,-1,0,11,19,1,2,0.0008777520270086825,0.5208349823951721,0.4152742922306061,0,2,9,5,8,9,-1,9,8,8,3,3,-0.0279439203441143,0.6344125270843506,0.5018811821937561,0,2,4,0,3,7,-1,5,0,1,7,3,0.006729737855494022,0.5050438046455383,0.3500863909721375,0,3,8,6,4,12,-1,10,6,2,6,2,8,12,2,6,2,0.0232810396701097,0.4966318011283875,0.6968677043914795,0,2,0,2,6,4,-1,0,4,6,2,2,-0.0116449799388647,0.3300260007381439,0.5049629807472229,0,2,8,15,4,3,-1,8,16,4,1,3,0.0157643090933561,0.4991598129272461,0.7321153879165649,0,2,8,0,3,7,-1,9,0,1,7,3,-0.001361147966235876,0.3911735117435455,0.5160670876502991,0,2,9,5,3,4,-1,10,5,1,4,3,-0.0008152233785949647,0.5628911256790161,0.49497190117836,0,2,8,5,3,4,-1,9,5,1,4,3,-0.0006006627227179706,0.585359513759613,0.4550595879554749,0,2,7,6,6,1,-1,9,6,2,1,3,0.0004971551825292408,0.4271470010280609,0.5443599224090576,0,3,7,14,4,4,-1,7,14,2,2,2,9,16,2,2,2,0.0023475370835512877,0.5143110752105713,0.3887656927108765,0,3,13,14,4,6,-1,15,14,2,3,2,13,17,2,3,2,-0.008926156908273697,0.6044502258300781,0.497172087430954,0,2,7,8,1,8,-1,7,12,1,4,2,-0.013919910416007,0.2583160996437073,0.5000367760658264,0,3,16,0,2,8,-1,17,0,1,4,2,16,4,1,4,2,0.0010209949687123299,0.4857374131679535,0.5560358166694641,0,3,2,0,2,8,-1,2,0,1,4,2,3,4,1,4,2,-0.0027441629208624363,0.5936884880065918,0.464577704668045,0,2,6,1,14,3,-1,6,2,14,1,3,-0.0162001308053732,0.3163014948368073,0.5193495154380798,0,2,7,9,3,10,-1,7,14,3,5,2,0.004333198070526123,0.5061224102973938,0.3458878993988037,0,2,9,14,2,2,-1,9,15,2,1,2,0.0005849793087691069,0.4779017865657806,0.5870177745819092,0,2,7,7,6,8,-1,7,11,6,4,2,-0.0022466450463980436,0.4297851026058197,0.5374773144721985,0,2,9,7,3,6,-1,9,10,3,3,2,0.0023146099410951138,0.5438671708106995,0.4640969932079315,0,2,7,13,3,3,-1,7,14,3,1,3,0.008767912164330482,0.472689300775528,0.6771789789199829,0,2,9,9,2,2,-1,9,10,2,1,2,-0.00022448020172305405,0.4229173064231873,0.5428048968315125,0,2,0,1,18,2,-1,6,1,6,2,3,-0.007433602120727301,0.6098880767822266,0.4683673977851868,0,2,7,1,6,14,-1,7,8,6,7,2,-0.0023189240600913763,0.5689436793327332,0.4424242079257965,0,2,1,9,18,1,-1,7,9,6,1,3,-0.0021042178850620985,0.3762221038341522,0.5187087059020996,0,2,9,7,2,2,-1,9,7,1,2,2,0.000460348412161693,0.4699405133724213,0.5771207213401794,0,2,9,3,2,9,-1,10,3,1,9,2,0.0010547629790380597,0.4465216994285584,0.5601701736450195,0,2,18,14,2,3,-1,18,15,2,1,3,0.0008714881842024624,0.544980525970459,0.3914709091186523,0,2,7,11,3,1,-1,8,11,1,1,3,0.00033364820410497487,0.4564009010791779,0.5645738840103149,0,2,10,8,3,4,-1,11,8,1,4,3,-0.0014853250468149781,0.5747377872467041,0.4692778885364533,0,2,7,14,3,6,-1,8,14,1,6,3,0.0030251620337367058,0.5166196823120117,0.3762814104557037,0,2,10,8,3,4,-1,11,8,1,4,3,0.005028074141591787,0.5002111792564392,0.6151527166366577,0,2,7,8,3,4,-1,8,8,1,4,3,-0.0005816451157443225,0.5394598245620728,0.4390751123428345,0,2,7,9,6,9,-1,7,12,6,3,3,0.0451415292918682,0.5188326835632324,0.206303596496582,0,2,0,14,2,3,-1,0,15,2,1,3,-0.001079562003724277,0.3904685080051422,0.5137907266616821,0,2,11,12,1,2,-1,11,13,1,1,2,0.00015995999274309725,0.4895322918891907,0.5427504181861877,0,2,4,3,8,3,-1,8,3,4,3,2,-0.0193592701107264,0.6975228786468506,0.4773507118225098,0,2,0,4,20,6,-1,0,4,10,6,2,0.207255095243454,0.5233635902404785,0.3034991919994354,0,2,9,14,1,3,-1,9,15,1,1,3,-0.00041953290929086506,0.5419396758079529,0.4460186064243317,0,2,8,14,4,3,-1,8,15,4,1,3,0.0022582069505006075,0.4815764129161835,0.6027408838272095,0,2,0,15,14,4,-1,0,17,14,2,2,-0.0067811207845807076,0.3980278968811035,0.5183305740356445,0,2,1,14,18,6,-1,1,17,18,3,2,0.0111543098464608,0.543123185634613,0.4188759922981262,0,3,0,0,10,6,-1,0,0,5,3,2,5,3,5,3,2,0.0431624315679073,0.4738228023052216,0.6522961258888245]);
    tracking.ViolaJones.classifiers.eye = new Float64Array([20,20,-1.4562760591506958,6,0,2,0,8,20,12,-1,0,14,20,6,2,0.129639595746994,-0.7730420827865601,0.6835014820098877,0,2,9,1,4,15,-1,9,6,4,5,3,-0.0463268086314201,0.5735275149345398,-0.4909768998622894,0,2,6,10,9,2,-1,9,10,3,2,3,-0.0161730907857418,0.6025434136390686,-0.3161070942878723,0,2,7,0,10,9,-1,7,3,10,3,3,-0.0458288416266441,0.6417754888534546,-0.1554504036903381,0,2,12,2,2,18,-1,12,8,2,6,3,-0.0537596195936203,0.5421931743621826,-0.2048082947731018,0,2,8,6,8,6,-1,8,9,8,3,2,0.0341711901128292,-0.2338819056749344,0.4841090142726898,-1.2550230026245117,12,0,2,2,0,17,18,-1,2,6,17,6,3,-0.2172762006521225,0.7109889984130859,-0.5936073064804077,0,2,10,10,1,8,-1,10,14,1,4,2,0.0120719699189067,-0.2824048101902008,0.5901355147361755,0,2,7,10,9,2,-1,10,10,3,2,3,-0.0178541392087936,0.5313752293586731,-0.2275896072387695,0,2,5,1,6,6,-1,5,3,6,2,3,0.0223336108028889,-0.1755609959363937,0.633561372756958,0,2,3,1,15,9,-1,3,4,15,3,3,-0.091420017182827,0.6156309247016907,-0.1689953058958054,0,2,6,3,9,6,-1,6,5,9,2,3,0.028973650187254,-0.1225007995963097,0.7440117001533508,0,2,8,17,6,3,-1,10,17,2,3,3,0.007820346392691135,0.1697437018156052,-0.6544165015220642,0,2,9,10,9,1,-1,12,10,3,1,3,0.0203404892235994,-0.1255664974451065,0.8271045088768005,0,2,1,7,6,11,-1,3,7,2,11,3,-0.0119261499494314,0.3860568106174469,-0.2099234014749527,0,2,9,18,3,1,-1,10,18,1,1,3,-0.000972811016254127,-0.6376119256019592,0.129523903131485,0,2,16,16,1,2,-1,16,17,1,1,2,0.000018322050891583785,-0.3463147878646851,0.2292426973581314,0,2,9,17,6,3,-1,11,17,2,3,3,-0.008085441775619984,-0.6366580128669739,0.1307865977287293,-1.372818946838379,9,0,2,8,0,5,18,-1,8,6,5,6,3,-0.1181226968765259,0.6784452199935913,-0.5004578232765198,0,2,6,7,9,7,-1,9,7,3,7,3,-0.0343327596783638,0.6718636155128479,-0.3574487864971161,0,2,14,6,6,10,-1,16,6,2,10,3,-0.0215307995676994,0.7222070097923279,-0.1819241940975189,0,2,9,8,9,5,-1,12,8,3,5,3,-0.0219099707901478,0.6652938723564148,-0.2751022875308991,0,2,3,7,9,6,-1,6,7,3,6,3,-0.0287135392427444,0.6995570063591003,-0.1961558014154434,0,2,1,7,6,6,-1,3,7,2,6,3,-0.0114674801006913,0.5926734805107117,-0.2209735065698624,0,2,16,0,4,18,-1,16,6,4,6,3,-0.0226111691445112,0.3448306918144226,-0.3837955892086029,0,2,0,17,3,3,-1,0,18,3,1,3,-0.0019308089977130294,-0.794457197189331,0.1562865972518921,0,2,16,0,2,1,-1,17,0,1,1,2,0.00005641991083393805,-0.3089601099491119,0.3543108999729157,-1.2879480123519897,16,0,2,0,8,20,12,-1,0,14,20,6,2,0.1988652050495148,-0.5286070108413696,0.3553672134876251,0,2,6,6,9,8,-1,9,6,3,8,3,-0.0360089391469955,0.4210968911647797,-0.393489807844162,0,2,5,3,12,9,-1,5,6,12,3,3,-0.0775698497891426,0.4799154102802277,-0.2512216866016388,0,2,4,16,1,2,-1,4,17,1,1,2,0.00008263085328508168,-0.3847548961639404,0.318492203950882,0,2,18,10,2,1,-1,19,10,1,1,2,0.00032773229759186506,-0.2642731964588165,0.3254724144935608,0,2,9,8,6,5,-1,11,8,2,5,3,-0.0185748506337404,0.4673658907413483,-0.1506727039813995,0,2,0,0,2,1,-1,1,0,1,1,2,-0.00007000876212259755,0.2931315004825592,-0.2536509931087494,0,2,6,8,6,6,-1,8,8,2,6,3,-0.0185521300882101,0.4627366065979004,-0.1314805001020432,0,2,11,7,6,7,-1,13,7,2,7,3,-0.0130304200574756,0.4162721931934357,-0.1775148957967758,0,2,19,14,1,2,-1,19,15,1,1,2,0.00006569414108525962,-0.2803510129451752,0.2668074071407318,0,2,6,17,1,2,-1,6,18,1,1,2,0.00017005260451696813,-0.2702724933624268,0.2398165017366409,0,2,14,7,2,7,-1,15,7,1,7,2,-0.0033129199873656034,0.4441143870353699,-0.1442888975143433,0,2,6,8,2,4,-1,7,8,1,4,2,0.0017583490116521716,-0.1612619012594223,0.4294076859951019,0,2,5,8,12,6,-1,5,10,12,2,3,-0.0251947492361069,0.4068729877471924,-0.1820258051156998,0,2,2,17,1,3,-1,2,18,1,1,3,0.0014031709870323539,0.0847597867250443,-0.8001856803894043,0,2,6,7,3,6,-1,7,7,1,6,3,-0.007399172987788916,0.5576609969139099,-0.1184315979480743,-1.2179850339889526,23,0,2,6,7,9,12,-1,9,7,3,12,3,-0.0299430806189775,0.3581081032752991,-0.3848763108253479,0,2,6,2,11,12,-1,6,6,11,4,3,-0.1256738007068634,0.3931693136692047,-0.3001225888729096,0,2,1,12,5,8,-1,1,16,5,4,2,0.0053635272197425365,-0.4390861988067627,0.1925701051950455,0,2,14,7,6,7,-1,16,7,2,7,3,-0.008097182027995586,0.399066686630249,-0.2340787053108215,0,2,10,8,6,6,-1,12,8,2,6,3,-0.0165979098528624,0.4209528863430023,-0.2267484068870544,0,2,16,18,4,2,-1,16,19,4,1,2,-0.0020199299324303865,-0.7415673136711121,0.1260118931531906,0,2,18,17,2,3,-1,18,18,2,1,3,-0.0015202340437099338,-0.7615460157394409,0.0863736122846603,0,2,9,7,3,7,-1,10,7,1,7,3,-0.004966394044458866,0.4218223989009857,-0.1790491938591003,0,2,5,6,6,8,-1,7,6,2,8,3,-0.0192076005041599,0.4689489901065826,-0.1437875032424927,0,2,2,6,6,11,-1,4,6,2,11,3,-0.0122226802632213,0.3284207880496979,-0.218021497130394,0,2,8,10,12,8,-1,8,14,12,4,2,0.0575486682355404,-0.3676880896091461,0.2435711026191711,0,2,7,17,6,3,-1,9,17,2,3,3,-0.00957940798252821,-0.7224506735801697,0.0636645630002022,0,2,10,9,3,3,-1,11,9,1,3,3,-0.002954574069008231,0.358464390039444,-0.1669632941484451,0,2,8,8,3,6,-1,9,8,1,6,3,-0.004201799165457487,0.390948086977005,-0.1204179003834724,0,2,7,0,6,5,-1,9,0,2,5,3,-0.0136249903589487,-0.5876771807670593,0.0884047299623489,0,2,6,17,1,3,-1,6,18,1,1,3,0.00006285311246756464,-0.2634845972061157,0.2141927927732468,0,2,0,18,4,2,-1,0,19,4,1,2,-0.0026782939676195383,-0.7839016914367676,0.0805269628763199,0,2,4,1,11,9,-1,4,4,11,3,3,-0.0705971792340279,0.414692610502243,-0.1398995965719223,0,2,3,1,14,9,-1,3,4,14,3,3,0.0920936465263367,-0.1305518001317978,0.5043578147888184,0,2,0,9,6,4,-1,2,9,2,4,3,-0.008800438605248928,0.3660975098609924,-0.1403664946556091,0,2,18,13,1,2,-1,18,14,1,1,2,0.0000750809776945971,-0.2970443964004517,0.207029402256012,0,2,13,5,3,11,-1,14,5,1,11,3,-0.002987045096233487,0.3561570048332214,-0.1544596999883652,0,3,0,18,8,2,-1,0,18,4,1,2,4,19,4,1,2,-0.002644150983542204,-0.5435351729393005,0.1029511019587517,-1.2905240058898926,27,0,2,5,8,12,5,-1,9,8,4,5,3,-0.0478624701499939,0.4152823984622955,-0.3418582081794739,0,2,4,7,11,10,-1,4,12,11,5,2,0.087350532412529,-0.3874978125095367,0.2420420050621033,0,2,14,9,6,4,-1,16,9,2,4,3,-0.0168494991958141,0.5308247804641724,-0.1728291064500809,0,2,0,7,6,8,-1,3,7,3,8,2,-0.0288700293749571,0.3584350943565369,-0.2240259051322937,0,2,0,16,3,3,-1,0,17,3,1,3,0.00256793899461627,0.1499049961566925,-0.6560940742492676,0,2,7,11,12,1,-1,11,11,4,1,3,-0.0241166595369577,0.5588967800140381,-0.148102805018425,0,2,4,8,9,4,-1,7,8,3,4,3,-0.0328266583383083,0.4646868109703064,-0.1078552976250649,0,2,5,16,6,4,-1,7,16,2,4,3,-0.0152330603450537,-0.7395442724227905,0.056236881762743,0,2,18,17,1,3,-1,18,18,1,1,3,-0.0003020951116923243,-0.4554882049560547,0.0970698371529579,0,2,18,17,1,3,-1,18,18,1,1,3,0.0007536510820500553,0.0951472967863083,-0.5489501953125,0,3,4,9,4,10,-1,4,9,2,5,2,6,14,2,5,2,-0.0106389503926039,0.4091297090053558,-0.1230840981006622,0,2,4,8,6,4,-1,6,8,2,4,3,-0.007521783001720905,0.4028914868831635,-0.1604878008365631,0,2,10,2,2,18,-1,10,8,2,6,3,-0.1067709997296333,0.6175932288169861,-0.0730911865830421,0,3,0,5,8,6,-1,0,5,4,3,2,4,8,4,3,2,0.0162569191306829,-0.1310368031263351,0.3745365142822266,0,2,6,0,6,5,-1,8,0,2,5,3,-0.020679360255599,-0.71402907371521,0.0523900091648102,0,2,18,0,2,14,-1,18,7,2,7,2,0.0170523691922426,0.1282286047935486,-0.3108068108558655,0,2,8,18,4,2,-1,10,18,2,2,2,-0.0057122060097754,-0.605565071105957,0.0818847566843033,0,2,1,17,6,3,-1,1,18,6,1,3,0.000020851430235779844,-0.2681298851966858,0.1445384025573731,0,2,11,8,3,5,-1,12,8,1,5,3,0.007928443141281605,-0.078795351088047,0.5676258206367493,0,2,11,8,3,4,-1,12,8,1,4,3,-0.0025217379443347454,0.3706862926483154,-0.1362057030200958,0,2,11,0,6,5,-1,13,0,2,5,3,-0.0224261991679668,-0.6870499849319458,0.0510628595948219,0,2,1,7,6,7,-1,3,7,2,7,3,-0.007645144127309322,0.2349222004413605,-0.1790595948696137,0,2,0,13,1,3,-1,0,14,1,1,3,-0.0011175329564139247,-0.5986905097961426,0.0743244364857674,0,2,3,2,9,6,-1,3,4,9,2,3,0.0192127898335457,-0.1570255011320114,0.2973746955394745,0,2,8,6,9,2,-1,8,7,9,1,2,0.00562934298068285,-0.0997690185904503,0.4213027060031891,0,2,0,14,3,6,-1,0,16,3,2,3,-0.00956718623638153,-0.6085879802703857,0.0735062584280968,0,2,1,11,6,4,-1,3,11,2,4,3,0.0112179601565003,-0.103208102285862,0.4190984964370728,-1.160048007965088,28,0,2,6,9,9,3,-1,9,9,3,3,3,-0.0174864400178194,0.3130728006362915,-0.3368118107318878,0,2,6,0,9,6,-1,6,2,9,2,3,0.0307146497070789,-0.1876619011163712,0.5378080010414124,0,2,8,5,6,6,-1,8,7,6,2,3,-0.0221887193620205,0.3663788139820099,-0.1612481027841568,0,2,1,12,2,1,-1,2,12,1,1,2,-0.000050700771680567414,0.2124571055173874,-0.2844462096691132,0,2,10,10,6,2,-1,12,10,2,2,3,-0.007017042022198439,0.3954311013221741,-0.1317359060049057,0,2,13,8,6,6,-1,15,8,2,6,3,-0.00685636093840003,0.3037385940551758,-0.2065781950950623,0,2,6,16,6,4,-1,8,16,2,4,3,-0.0141292596235871,-0.7650300860404968,0.0982131883502007,0,2,8,0,9,9,-1,8,3,9,3,3,-0.047915481030941,0.483073890209198,-0.1300680935382843,0,2,18,17,1,3,-1,18,18,1,1,3,0.000047032979637151584,-0.2521657049655914,0.2438668012619019,0,2,18,17,1,3,-1,18,18,1,1,3,0.0010221180273219943,0.0688576027750969,-0.6586114168167114,0,2,7,10,3,3,-1,8,10,1,3,3,-0.002605610992759466,0.4294202923774719,-0.1302246004343033,0,3,9,14,2,2,-1,9,14,1,1,2,10,15,1,1,2,0.00005450534081319347,-0.1928862035274506,0.2895849943161011,0,3,9,14,2,2,-1,9,14,1,1,2,10,15,1,1,2,-0.00006672115705441684,0.3029071092605591,-0.1985436975955963,0,2,0,8,19,12,-1,0,14,19,6,2,0.2628143131732941,-0.2329394072294235,0.2369246035814285,0,2,7,6,9,14,-1,10,6,3,14,3,-0.0235696695744991,0.1940104067325592,-0.2848461866378784,0,2,13,8,3,4,-1,14,8,1,4,3,-0.003912017215043306,0.5537897944450378,-0.0956656783819199,0,2,4,17,1,3,-1,4,18,1,1,3,0.00005078879985376261,-0.239126592874527,0.217994898557663,0,2,4,9,6,3,-1,6,9,2,3,3,-0.007873201742768288,0.4069742858409882,-0.1276804059743881,0,2,2,18,5,2,-1,2,19,5,1,2,-0.0016778609715402126,-0.5774465799331665,0.0973247885704041,0,3,7,8,2,2,-1,7,8,1,1,2,8,9,1,1,2,-0.0002683243073988706,0.2902188003063202,-0.1683126986026764,0,3,7,8,2,2,-1,7,8,1,1,2,8,9,1,1,2,0.00007868718239478767,-0.1955157071352005,0.2772096991539002,0,2,5,10,13,2,-1,5,11,13,1,2,0.0129535002633929,-0.0968383178114891,0.4032387137413025,0,2,10,8,1,9,-1,10,11,1,3,3,-0.0130439596250653,0.4719856977462769,-0.0892875492572784,0,3,15,8,2,12,-1,15,8,1,6,2,16,14,1,6,2,0.0030261781066656113,-0.1362338066101074,0.3068627119064331,0,2,4,0,3,5,-1,5,0,1,5,3,-0.006043803878128529,-0.779541015625,0.0573163107037544,0,2,12,6,3,7,-1,13,6,1,7,3,-0.0022507249377667904,0.3087705969810486,-0.1500630974769592,0,2,7,16,6,4,-1,9,16,2,4,3,0.0158268101513386,0.0645518898963928,-0.7245556712150574,0,2,9,16,2,1,-1,10,16,1,1,2,0.00006586450763279572,-0.1759884059429169,0.2321038991212845,-1.2257250547409058,36,0,2,6,10,9,2,-1,9,10,3,2,3,-0.0278548691421747,0.4551844894886017,-0.1809991002082825,0,2,0,6,15,14,-1,0,13,15,7,2,0.1289504021406174,-0.5256553292274475,0.1618890017271042,0,2,9,1,5,6,-1,9,3,5,2,3,0.0244031809270382,-0.1497496068477631,0.4235737919807434,0,2,3,9,3,4,-1,4,9,1,4,3,-0.0024458570405840874,0.3294866979122162,-0.1744769066572189,0,2,5,7,3,6,-1,6,7,1,6,3,-0.0035336529836058617,0.4742664098739624,-0.0736183598637581,0,2,17,16,1,2,-1,17,17,1,1,2,0.00005135815081303008,-0.3042193055152893,0.1563327014446259,0,2,9,8,6,12,-1,11,8,2,12,3,-0.0162256807088852,0.2300218045711517,-0.2035982012748718,0,2,6,10,6,1,-1,8,10,2,1,3,-0.004600700922310352,0.4045926928520203,-0.1348544061183929,0,2,7,17,9,3,-1,10,17,3,3,3,-0.0219289995729923,-0.6872448921203613,0.0806842669844627,0,2,14,18,6,2,-1,14,19,6,1,2,-0.002897121012210846,-0.6961960792541504,0.0485452190041542,0,2,9,5,3,14,-1,10,5,1,14,3,-0.0044074649922549725,0.2516626119613648,-0.1623664945363998,0,2,8,16,9,4,-1,11,16,3,4,3,0.0284371692687273,0.0603942610323429,-0.6674445867538452,0,2,0,0,4,14,-1,0,7,4,7,2,0.0832128822803497,0.0643579214811325,-0.5362604260444641,0,2,8,1,6,3,-1,10,1,2,3,3,-0.0124193299561739,-0.708168625831604,0.0575266107916832,0,2,6,8,3,4,-1,7,8,1,4,3,-0.004699259996414185,0.5125433206558228,-0.0873508006334305,0,2,4,8,3,4,-1,5,8,1,4,3,-0.0007802580948919058,0.266876608133316,-0.1796150952577591,0,2,5,1,6,5,-1,7,1,2,5,3,-0.0197243392467499,-0.6756373047828674,0.0729419067502022,0,2,1,18,1,2,-1,1,19,1,1,2,0.001026925048790872,0.0539193190634251,-0.5554018020629883,0,2,7,0,6,6,-1,7,2,6,2,3,-0.0259571895003319,0.5636252760887146,-0.0718983933329582,0,2,0,18,4,2,-1,0,19,4,1,2,-0.0012552699772641063,-0.5034663081169128,0.0896914526820183,0,2,12,3,8,12,-1,12,7,8,4,3,-0.0499705784022808,0.1768511980772018,-0.2230195999145508,0,2,12,9,3,4,-1,13,9,1,4,3,-0.002989961067214608,0.391224205493927,-0.1014975011348724,0,2,12,8,3,5,-1,13,8,1,5,3,0.004854684229940176,-0.1177017986774445,0.4219093918800354,0,2,16,0,2,1,-1,17,0,1,1,2,0.0001044886012095958,-0.1733397990465164,0.223444402217865,0,2,5,17,1,3,-1,5,18,1,1,3,0.00005968926052446477,-0.2340963035821915,0.1655824035406113,0,2,10,2,3,6,-1,10,4,3,2,3,-0.0134239196777344,0.4302381873130798,-0.0997236520051956,0,2,4,17,2,3,-1,4,18,2,1,3,0.002258199965581298,0.0727209895849228,-0.5750101804733276,0,2,12,7,1,9,-1,12,10,1,3,3,-0.0125462803989649,0.3618457913398743,-0.1145701035857201,0,2,7,6,3,9,-1,8,6,1,9,3,-0.002870576921850443,0.2821053862571716,-0.1236755028367043,0,2,17,13,3,6,-1,17,15,3,2,3,0.0197856407612562,0.0478767491877079,-0.806662380695343,0,2,7,7,3,8,-1,8,7,1,8,3,0.004758893046528101,-0.1092538982629776,0.3374697864055634,0,2,5,0,3,5,-1,6,0,1,5,3,-0.006997426971793175,-0.8029593825340271,0.0457067005336285,0,2,4,6,9,8,-1,7,6,3,8,3,-0.0130334803834558,0.18680439889431,-0.176889106631279,0,2,2,9,3,3,-1,3,9,1,3,3,-0.0013742579612880945,0.2772547900676727,-0.1280900985002518,0,2,16,18,4,2,-1,16,19,4,1,2,0.0027657810132950544,0.0907589420676231,-0.4259473979473114,0,2,17,10,3,10,-1,17,15,3,5,2,0.0002894184144679457,-0.388163298368454,0.089267797768116,-1.2863140106201172,47,0,2,8,9,6,4,-1,10,9,2,4,3,-0.0144692296162248,0.3750782907009125,-0.2492828965187073,0,2,5,2,10,12,-1,5,6,10,4,3,-0.1331762969493866,0.3016637861728668,-0.2241407036781311,0,2,6,9,6,3,-1,8,9,2,3,3,-0.010132160037756,0.3698559105396271,-0.1785001009702683,0,2,11,7,3,7,-1,12,7,1,7,3,-0.007851118221879005,0.4608676135540009,-0.1293139010667801,0,2,12,8,6,4,-1,14,8,2,4,3,-0.0142958397045732,0.4484142959117889,-0.1022624000906944,0,2,14,8,6,5,-1,16,8,2,5,3,-0.005960694048553705,0.279279887676239,-0.1532382965087891,0,2,12,12,2,4,-1,12,14,2,2,2,0.010932769626379,-0.1514174044132233,0.3988964855670929,0,2,3,15,1,2,-1,3,16,1,1,2,0.000050430990086169913,-0.2268157005310059,0.2164438962936401,0,2,12,7,3,4,-1,13,7,1,4,3,-0.0058431681245565414,0.4542014896869659,-0.1258715987205505,0,2,10,0,6,6,-1,12,0,2,6,3,-0.0223462097346783,-0.6269019246101379,0.0824031233787537,0,2,10,6,3,8,-1,11,6,1,8,3,-0.00488366698846221,0.2635925114154816,-0.1468663066625595,0,2,16,17,1,2,-1,16,18,1,1,2,0.00007550600275862962,-0.2450702041387558,0.1667888015508652,0,2,16,16,1,3,-1,16,17,1,1,3,-0.0004902699729427695,-0.426499605178833,0.0899735614657402,0,2,11,11,1,2,-1,11,12,1,1,2,0.0014861579984426498,-0.1204025000333786,0.3009765148162842,0,2,3,7,6,9,-1,5,7,2,9,3,-0.0119883399456739,0.278524786233902,-0.122443400323391,0,2,4,18,9,1,-1,7,18,3,1,3,0.0105022396892309,0.0404527597129345,-0.7405040860176086,0,2,0,11,4,9,-1,0,14,4,3,3,-0.0309630092233419,-0.6284269094467163,0.048013761639595,0,2,9,17,6,3,-1,11,17,2,3,3,0.0114145204424858,0.0394052118062973,-0.7167412042617798,0,2,7,8,6,12,-1,9,8,2,12,3,-0.0123370001092553,0.1994132995605469,-0.1927430033683777,0,2,6,8,3,4,-1,7,8,1,4,3,-0.005994226783514023,0.5131816267967224,-0.0616580583155155,0,2,3,17,1,3,-1,3,18,1,1,3,-0.0011923230485990644,-0.72605299949646,0.0506527200341225,0,2,11,9,6,4,-1,13,9,2,4,3,-0.0074582789093256,0.2960307896137238,-0.1175478994846344,0,2,6,1,3,2,-1,7,1,1,2,3,0.0027877509128302336,0.0450687110424042,-0.6953541040420532,0,2,1,0,2,1,-1,2,0,1,1,2,-0.0002250320976600051,0.200472503900528,-0.1577524989843369,0,3,1,0,2,14,-1,1,0,1,7,2,2,7,1,7,2,-0.005036788992583752,0.292998194694519,-0.1170049980282784,0,2,5,5,11,8,-1,5,9,11,4,2,0.0747421607375145,-0.1139231994748116,0.3025662004947662,0,2,9,3,5,6,-1,9,5,5,2,3,0.0202555190771818,-0.1051589027047157,0.4067046046257019,0,2,7,9,5,10,-1,7,14,5,5,2,0.0442145094275475,-0.2763164043426514,0.1236386969685555,0,2,15,10,2,2,-1,16,10,1,2,2,-0.0008725955849513412,0.2435503005981445,-0.1330094933509827,0,2,0,18,8,2,-1,0,19,8,1,2,-0.0024453739169985056,-0.5386617183685303,0.062510646879673,0,2,7,17,1,3,-1,7,18,1,1,3,0.0000827253534225747,-0.2077220976352692,0.1627043932676315,0,2,7,2,11,6,-1,7,4,11,2,3,-0.036627110093832,0.3656840920448303,-0.0903302803635597,0,2,8,3,9,3,-1,8,4,9,1,3,0.0030996399000287056,-0.1318302005529404,0.2535429894924164,0,2,0,9,2,2,-1,0,10,2,1,2,-0.0024709280114620924,-0.5685349702835083,0.0535054318606853,0,2,0,5,3,6,-1,0,7,3,2,3,-0.0141146704554558,-0.4859901070594788,0.0584852509200573,0,3,6,7,2,2,-1,6,7,1,1,2,7,8,1,1,2,0.0008453726186417043,-0.0800936371088028,0.4026564955711365,0,2,7,6,3,6,-1,8,6,1,6,3,-0.007109863217920065,0.4470323920249939,-0.0629474371671677,0,2,12,1,6,4,-1,14,1,2,4,3,-0.0191259607672691,-0.6642286777496338,0.0498227700591087,0,2,9,11,6,8,-1,11,11,2,8,3,-0.005077301058918238,0.1737940013408661,-0.168505996465683,0,2,17,15,3,3,-1,17,16,3,1,3,-0.002919828984886408,-0.6011028289794922,0.0574279390275478,0,2,6,6,3,9,-1,6,9,3,3,3,-0.0249021500349045,0.233979806303978,-0.1181845963001251,0,3,0,5,8,6,-1,0,5,4,3,2,4,8,4,3,2,0.02014777995646,-0.0894598215818405,0.3602440059185028,0,2,0,6,1,3,-1,0,7,1,1,3,0.001759764039888978,0.0494584403932095,-0.6310262084007263,0,2,17,0,2,6,-1,18,0,1,6,2,0.0013812039978802204,-0.1521805971860886,0.1897173970937729,0,2,10,17,6,3,-1,12,17,2,3,3,-0.0109045403078198,-0.5809738039970398,0.0448627285659313,0,3,13,15,2,2,-1,13,15,1,1,2,14,16,1,1,2,0.00007515717879869044,-0.1377734988927841,0.1954316049814224,0,2,4,0,12,3,-1,4,1,12,1,3,0.003864977043122053,-0.1030222997069359,0.2537496984004974,-1.1189440488815308,48,0,2,5,3,10,9,-1,5,6,10,3,3,-0.102158896625042,0.4168125987052918,-0.1665562987327576,0,2,7,7,9,7,-1,10,7,3,7,3,-0.051939819008112,0.3302395045757294,-0.2071571052074432,0,2,5,8,9,6,-1,8,8,3,6,3,-0.0427177809178829,0.2609373033046722,-0.1601389050483704,0,2,0,16,6,2,-1,0,17,6,1,2,0.00043890418601222336,-0.3475053012371063,0.1391891986131668,0,2,12,6,7,14,-1,12,13,7,7,2,0.0242643896490335,-0.4255205988883972,0.1357838064432144,0,2,13,7,6,8,-1,15,7,2,8,3,-0.0238205995410681,0.3174980878829956,-0.1665204018354416,0,2,2,10,6,3,-1,4,10,2,3,3,-0.007051818072795868,0.3094717860221863,-0.1333830058574677,0,2,18,17,1,3,-1,18,18,1,1,3,-0.0006851715734228492,-0.6008226275444031,0.0877470001578331,0,2,7,1,6,2,-1,7,2,6,1,2,0.0053705149330198765,-0.1231144964694977,0.3833355009555817,0,2,6,0,6,4,-1,6,2,6,2,2,-0.0134035395458341,0.3387736976146698,-0.1014048978686333,0,2,8,18,6,2,-1,10,18,2,2,3,-0.006685636006295681,-0.6119359731674194,0.0477402210235596,0,2,7,6,5,2,-1,7,7,5,1,2,-0.0042887418530881405,0.2527579069137573,-0.1443451046943665,0,2,6,7,3,6,-1,7,7,1,6,3,-0.0108767496421933,0.5477573275566101,-0.0594554804265499,0,3,18,18,2,2,-1,18,18,1,1,2,19,19,1,1,2,0.0003788264002650976,0.0834103003144264,-0.4422636926174164,0,2,16,8,3,7,-1,17,8,1,7,3,-0.002455014968290925,0.2333099991083145,-0.1396448016166687,0,2,0,16,2,3,-1,0,17,2,1,3,0.0012721839593723416,0.0604802891612053,-0.4945608973503113,0,2,5,19,6,1,-1,7,19,2,1,3,-0.004893315955996513,-0.6683326959609985,0.0462184995412827,0,2,9,5,6,6,-1,9,7,6,2,3,0.0264499895274639,-0.0732353627681732,0.4442596137523651,0,2,0,10,2,4,-1,0,12,2,2,2,-0.003370607038959861,-0.4246433973312378,0.0686765611171722,0,2,0,9,4,3,-1,2,9,2,3,2,-0.0029559480026364326,0.1621803939342499,-0.1822299957275391,0,2,1,10,6,9,-1,3,10,2,9,3,0.0306199099868536,-0.0586433410644531,0.532636284828186,0,2,9,0,6,2,-1,11,0,2,2,3,-0.009576590731739998,-0.6056268215179443,0.0533459894359112,0,2,14,1,2,1,-1,15,1,1,1,2,0.00006637249316554517,-0.1668083965778351,0.1928416043519974,0,2,0,8,1,4,-1,0,10,1,2,2,0.005097595043480396,0.0441195107996464,-0.574588418006897,0,3,15,6,2,2,-1,15,6,1,1,2,16,7,1,1,2,0.0003711271856445819,-0.1108639985322952,0.2310539036989212,0,2,7,5,3,6,-1,8,5,1,6,3,-0.008660758845508099,0.4045628905296326,-0.062446091324091,0,2,19,17,1,3,-1,19,18,1,1,3,0.0008748915861360729,0.0648751482367516,-0.4487104117870331,0,2,7,10,3,1,-1,8,10,1,1,3,0.0011120870476588607,-0.09386146068573,0.3045391142368317,0,2,12,1,6,6,-1,14,1,2,6,3,-0.0238378196954727,-0.5888742804527283,0.0466594211757183,0,2,15,5,2,1,-1,16,5,1,1,2,0.00022272899514064193,-0.1489859968423843,0.1770195066928864,0,2,8,2,7,4,-1,8,4,7,2,2,0.0244674701243639,-0.0557896010577679,0.4920830130577087,0,2,4,0,14,15,-1,4,5,14,5,3,-0.1423932015895844,0.1519200056791306,-0.1877889931201935,0,2,7,8,6,6,-1,9,8,2,6,3,-0.0201231203973293,0.2178010046482086,-0.1208190023899078,0,2,11,17,1,3,-1,11,18,1,1,3,0.00011513679783092812,-0.1685658991336823,0.1645192950963974,0,3,12,16,2,4,-1,12,16,1,2,2,13,18,1,2,2,-0.0027556740678846836,-0.6944203972816467,0.039449468255043,0,2,10,13,2,1,-1,11,13,1,1,2,-0.00007584391278214753,0.1894136965274811,-0.151838406920433,0,2,11,8,3,3,-1,12,8,1,3,3,-0.0070697711780667305,0.4706459939479828,-0.0579276196658611,0,2,2,0,6,8,-1,4,0,2,8,3,-0.0373931787908077,-0.7589244842529297,0.0341160483658314,0,3,3,5,6,6,-1,3,5,3,3,2,6,8,3,3,2,-0.0159956105053425,0.3067046999931335,-0.0875255763530731,0,2,10,8,3,3,-1,11,8,1,3,3,-0.003118399064987898,0.2619537115097046,-0.0912148877978325,0,2,5,17,4,2,-1,5,18,4,1,2,0.001065136049874127,-0.1742756068706513,0.1527764052152634,0,2,8,16,5,2,-1,8,17,5,1,2,-0.0016029420075938106,0.3561263084411621,-0.0766299962997437,0,2,0,4,3,3,-1,0,5,3,1,3,0.004361990839242935,0.04935697093606,-0.5922877192497253,0,2,6,3,6,2,-1,8,3,2,2,3,-0.0107799097895622,-0.6392217874526978,0.0332045406103134,0,2,4,4,9,3,-1,7,4,3,3,3,-0.004359086975455284,0.1610738933086395,-0.1522132009267807,0,2,0,13,1,4,-1,0,15,1,2,2,0.007459606975317001,0.0331729613244534,-0.7500774264335632,0,2,0,17,8,3,-1,0,18,8,1,3,0.008138544857501984,0.0263252798467875,-0.7173116207122803,0,2,6,1,11,6,-1,6,3,11,2,3,-0.0333384908735752,0.3353661000728607,-0.070803590118885,-1.1418989896774292,55,0,2,4,10,6,2,-1,6,10,2,2,3,0.0195539798587561,-0.1043972000479698,0.5312895178794861,0,2,10,8,1,12,-1,10,14,1,6,2,0.0221229195594788,-0.2474727034568787,0.2084725052118301,0,2,5,8,3,4,-1,6,8,1,4,3,-0.004182938951998949,0.3828943967819214,-0.1471157968044281,0,2,0,17,1,3,-1,0,18,1,1,3,-0.0008638172876089811,-0.6263288855552673,0.1199325993657112,0,2,0,17,1,3,-1,0,18,1,1,3,0.0007995861233212054,0.0925734713673592,-0.5516883134841919,0,2,13,8,3,4,-1,14,8,1,4,3,0.009152757003903389,-0.0729298070073128,0.5551251173019409,0,2,1,5,5,4,-1,1,7,5,2,2,-0.003938868176192045,0.2019603997468948,-0.2091203927993774,0,2,18,14,1,2,-1,18,15,1,1,2,0.00014613410166930407,-0.278618186712265,0.1381741017103195,0,2,13,8,2,4,-1,14,8,1,4,2,-0.0031691689509898424,0.3668589890003204,-0.0763082429766655,0,2,10,6,6,8,-1,12,6,2,8,3,-0.0221893899142742,0.39096599817276,-0.1097154021263123,0,2,8,6,6,10,-1,10,6,2,10,3,-0.007452360820025206,0.1283859014511108,-0.2415986955165863,0,2,17,16,1,3,-1,17,17,1,1,3,0.000779970025178045,0.0719780698418617,-0.4397650063037872,0,2,1,7,2,10,-1,2,7,1,10,2,-0.004678363911807537,0.2156984955072403,-0.1420592069625855,0,2,5,9,6,3,-1,7,9,2,3,3,-0.0151886399835348,0.364587813615799,-0.08267592638731,0,2,0,8,5,12,-1,0,14,5,6,2,0.0050619798712432384,-0.3438040912151337,0.0920682325959206,0,2,0,11,1,3,-1,0,12,1,1,3,-0.0017351920250803232,-0.6172549724578857,0.0492144785821438,0,2,6,16,6,4,-1,8,16,2,4,3,-0.012423450127244,-0.5855895280838013,0.0461126007139683,0,2,0,6,2,6,-1,0,8,2,2,3,-0.0130314296111465,-0.5971078872680664,0.0406724587082863,0,2,11,18,2,1,-1,12,18,1,1,2,-0.0012369629694148898,-0.6833416819572449,0.0331561788916588,0,2,5,1,9,2,-1,5,2,9,1,2,0.006102210842072964,-0.0947292372584343,0.3010224103927612,0,2,0,0,1,2,-1,0,1,1,1,2,0.0006695284973829985,0.0818168669939041,-0.351960301399231,0,2,15,9,3,3,-1,16,9,1,3,3,-0.001797058037482202,0.2371897995471954,-0.1176870986819267,0,2,18,16,1,3,-1,18,17,1,1,3,-0.0007107452838681638,-0.4476378858089447,0.0576824806630611,0,2,11,10,6,1,-1,13,10,2,1,3,-0.005912647116929293,0.4342541098594666,-0.0668685734272003,0,2,1,3,4,4,-1,3,3,2,4,2,-0.003313214983791113,0.181500107049942,-0.1418032050132752,0,2,11,2,1,18,-1,11,8,1,6,3,-0.0608146600425243,0.4722171127796173,-0.0614106394350529,0,2,9,1,5,12,-1,9,5,5,4,3,-0.0967141836881638,0.2768316864967346,-0.0944900363683701,0,2,12,0,8,1,-1,16,0,4,1,2,0.003907355014234781,-0.1227853000164032,0.2105740010738373,0,2,8,6,3,10,-1,9,6,1,10,3,-0.009043186902999878,0.3564156889915466,-0.0778062269091606,0,2,19,2,1,6,-1,19,4,1,2,3,-0.004880003165453672,-0.4103479087352753,0.0696943774819374,0,2,18,6,2,2,-1,18,7,2,1,2,-0.00435474282130599,-0.7301788926124573,0.0366551503539085,0,2,7,7,3,4,-1,8,7,1,4,3,-0.009650062769651413,0.5518112778663635,-0.0531680807471275,0,2,5,0,6,5,-1,7,0,2,5,3,-0.0173973105847836,-0.5708423256874084,0.0502140894532204,0,2,0,3,7,3,-1,0,4,7,1,3,-0.006830432917922735,-0.4618028104305267,0.0502026900649071,0,2,1,6,2,1,-1,2,6,1,1,2,0.00033255619928240776,-0.0953627303242683,0.2598375976085663,0,3,4,8,2,10,-1,4,8,1,5,2,5,13,1,5,2,-0.0023100529797375202,0.2287247031927109,-0.1053353026509285,0,3,2,18,18,2,-1,2,18,9,1,2,11,19,9,1,2,-0.0075426651164889336,-0.5699051022529602,0.0488634593784809,0,3,2,7,4,4,-1,2,7,2,2,2,4,9,2,2,2,-0.0052723060362041,0.3514518141746521,-0.0823901072144508,0,2,17,3,3,4,-1,18,3,1,4,3,-0.004857896827161312,-0.6041762232780457,0.0445394404232502,0,3,16,9,2,8,-1,16,9,1,4,2,17,13,1,4,2,0.001586731057614088,-0.1034090965986252,0.2328201979398727,0,2,15,7,1,6,-1,15,9,1,2,3,-0.004742781165987253,0.284902811050415,-0.0980904996395111,0,2,14,2,2,2,-1,14,3,2,1,2,-0.0013515240279957652,0.2309643030166626,-0.113618403673172,0,2,17,0,2,3,-1,17,1,2,1,3,0.0022526069078594446,0.0644783228635788,-0.4220589101314545,0,3,16,18,2,2,-1,16,18,1,1,2,17,19,1,1,2,-0.0003803865984082222,-0.3807620108127594,0.0600432902574539,0,2,10,4,4,3,-1,10,5,4,1,3,0.004904392175376415,-0.076104998588562,0.3323217034339905,0,2,0,2,8,6,-1,4,2,4,6,2,-0.009096967056393623,0.1428779065608978,-0.1688780039548874,0,2,7,14,6,6,-1,7,16,6,2,3,-0.0069317929446697235,0.2725540995597839,-0.0928795635700226,0,2,11,15,2,2,-1,11,16,2,1,2,0.0011471060570329428,-0.1527305990457535,0.1970240026712418,0,2,7,1,9,4,-1,10,1,3,4,3,-0.0376628898084164,-0.5932043790817261,0.0407386012375355,0,2,9,7,3,7,-1,10,7,1,7,3,-0.006816557142883539,0.2549408972263336,-0.0940819606184959,0,3,6,17,2,2,-1,6,17,1,1,2,7,18,1,1,2,0.0006620556232519448,0.0467957183718681,-0.4845437109470367,0,2,4,6,3,9,-1,5,6,1,9,3,-0.004220255184918642,0.2468214929103851,-0.0946739763021469,0,2,0,10,19,10,-1,0,15,19,5,2,-0.0689865127205849,-0.6651480197906494,0.0359263904392719,0,2,5,17,6,1,-1,7,17,2,1,3,0.006170760840177536,0.0258333198726177,-0.7268627285957336,0,2,0,12,6,3,-1,3,12,3,3,2,0.0105362497270107,-0.0818289965391159,0.2976079881191254,-1.1255199909210205,32,0,2,2,5,18,5,-1,8,5,6,5,3,-0.0627587288618088,0.2789908051490784,-0.2965610921382904,0,2,1,15,6,4,-1,1,17,6,2,2,0.003451647935435176,-0.3463588058948517,0.2090384066104889,0,2,14,10,6,6,-1,16,10,2,6,3,-0.007869948633015156,0.2414488941431046,-0.1920557022094727,0,2,0,14,4,3,-1,0,15,4,1,3,-0.0034624869003891945,-0.5915178060531616,0.1248644962906838,0,2,1,7,6,11,-1,3,7,2,11,3,-0.009481876157224178,0.1839154064655304,-0.2485826015472412,0,2,13,17,7,2,-1,13,18,7,1,2,0.00023226840130519122,-0.3304725885391235,0.1099926009774208,0,2,0,14,2,3,-1,0,15,2,1,3,0.0018101120367646217,0.0987440124154091,-0.4963478147983551,0,2,0,0,6,2,-1,3,0,3,2,2,-0.005442243069410324,0.2934441864490509,-0.1309475004673004,0,2,0,1,6,3,-1,3,1,3,3,2,0.007414812222123146,-0.1476269960403442,0.3327716886997223,0,2,0,8,2,6,-1,0,10,2,2,3,-0.0155651401728392,-0.6840490102767944,0.0998726934194565,0,3,1,2,6,14,-1,1,2,3,7,2,4,9,3,7,2,0.0287205204367638,-0.148332804441452,0.3090257942676544,0,3,17,5,2,2,-1,17,5,1,1,2,18,6,1,1,2,0.00009668739221524447,-0.1743104010820389,0.2140295952558518,0,2,11,10,9,4,-1,14,10,3,4,3,0.0523710586130619,-0.0701568573713303,0.4922299087047577,0,2,2,9,12,4,-1,6,9,4,4,3,-0.0864856913685799,0.5075724720954895,-0.0752942115068436,0,2,7,10,12,2,-1,11,10,4,2,3,-0.0421698689460754,0.4568096101284027,-0.0902199000120163,0,2,2,13,1,2,-1,2,14,1,1,2,0.000045369830331765115,-0.2653827965259552,0.1618953943252564,0,2,16,7,4,3,-1,16,8,4,1,3,0.0052918000146746635,0.0748901516199112,-0.540546715259552,0,2,19,16,1,3,-1,19,17,1,1,3,-0.0007551165181212127,-0.4926199018955231,0.0587239488959312,0,2,18,11,1,2,-1,18,12,1,1,2,0.00007510813884437084,-0.2143210023641586,0.1407776027917862,0,3,12,7,8,2,-1,12,7,4,1,2,16,8,4,1,2,0.004998120944947004,-0.0905473381280899,0.3571606874465942,0,2,14,9,2,4,-1,15,9,1,4,2,-0.0014929979806765914,0.2562345862388611,-0.1422906965017319,0,3,14,2,6,4,-1,14,2,3,2,2,17,4,3,2,2,0.0027239411137998104,-0.1564925014972687,0.2108871042728424,0,2,14,0,6,1,-1,17,0,3,1,2,0.002221832051873207,-0.1507298946380615,0.2680186927318573,0,2,3,12,2,1,-1,4,12,1,1,2,-0.0007399307214654982,0.2954699099063873,-0.1069239005446434,0,2,17,2,3,1,-1,18,2,1,1,3,0.0020113459322601557,0.0506143495440483,-0.7168337106704712,0,2,1,16,18,2,-1,7,16,6,2,3,0.0114528704434633,-0.1271906942129135,0.241527795791626,0,2,2,19,8,1,-1,6,19,4,1,2,-0.0010782170575112104,0.2481300979852676,-0.1346119940280914,0,2,1,17,4,3,-1,1,18,4,1,3,0.00334176910109818,0.0535783097147942,-0.5227416753768921,0,2,19,13,1,2,-1,19,14,1,1,2,0.00006939865124877542,-0.2169874012470245,0.1281217932701111,0,3,9,16,10,4,-1,9,16,5,2,2,14,18,5,2,2,-0.0040982551872730255,0.2440188974142075,-0.1157058998942375,0,3,12,9,2,4,-1,12,9,1,2,2,13,11,1,2,2,-0.0016289720078930259,0.2826147079467773,-0.1065946966409683,0,2,19,11,1,9,-1,19,14,1,3,3,0.0139848599210382,0.0427158996462822,-0.7364631295204163,-1.1729990243911743,30,0,2,6,6,14,14,-1,6,13,14,7,2,0.164165198802948,-0.4896030128002167,0.1760770976543427,0,2,2,17,4,2,-1,2,18,4,1,2,0.0008341306238435209,-0.2822043001651764,0.2419957965612412,0,2,0,2,1,3,-1,0,3,1,1,3,-0.0017193210078403354,-0.714858889579773,0.0861622169613838,0,2,0,12,1,3,-1,0,13,1,1,3,-0.001565495040267706,-0.7297238111495972,0.0940706729888916,0,2,15,15,4,4,-1,15,17,4,2,2,0.0019124479731544852,-0.3118715882301331,0.1814339011907578,0,2,2,5,18,7,-1,8,5,6,7,3,-0.1351236999034882,0.2957729995250702,-0.2217925041913986,0,2,1,16,5,3,-1,1,17,5,1,3,-0.004030054900795221,-0.6659513711929321,0.0854310169816017,0,2,0,4,2,3,-1,0,5,2,1,3,-0.002864046022295952,-0.6208636164665222,0.0531060211360455,0,2,0,6,2,6,-1,1,6,1,6,2,-0.0014065420255064964,0.2234628945589066,-0.2021100968122482,0,2,16,14,4,3,-1,16,15,4,1,3,-0.0035820449702441692,-0.5403040051460266,0.0682136192917824,0,3,0,0,10,6,-1,0,0,5,3,2,5,3,5,3,2,0.04154447093606,-0.0652158409357071,0.6210923194885254,0,2,2,2,3,6,-1,3,2,1,6,3,-0.009170955047011375,-0.75553297996521,0.0526404492557049,0,2,2,0,3,10,-1,3,0,1,10,3,0.006155273877084255,0.0909394025802612,-0.4424613118171692,0,2,5,5,2,2,-1,5,6,2,1,2,-0.0010043520014733076,0.242923304438591,-0.1866979002952576,0,2,12,6,4,4,-1,12,8,4,2,2,0.0115198297426105,-0.1176315024495125,0.3672345876693726,0,2,13,5,7,3,-1,13,6,7,1,3,-0.008904073387384415,-0.4893133044242859,0.1089702025055885,0,2,10,13,1,2,-1,10,14,1,1,2,0.0005397367058321834,-0.2185039967298508,0.1848998963832855,0,2,16,16,4,2,-1,18,16,2,2,2,0.0013727260520681739,-0.1507291048765183,0.2917312979698181,0,2,16,12,4,7,-1,18,12,2,7,2,-0.0108073903247714,0.4289745092391968,-0.1028013974428177,0,2,16,17,1,3,-1,16,18,1,1,3,0.0012670770520344377,0.0741921588778496,-0.6420825123786926,0,2,19,9,1,3,-1,19,10,1,1,3,0.002299112966284156,0.0471002794802189,-0.723352313041687,0,2,18,7,2,6,-1,19,7,1,6,2,0.002718751085922122,-0.1708686947822571,0.235135093331337,0,2,8,1,3,4,-1,9,1,1,4,3,-0.006661918014287949,-0.7897542715072632,0.0450846701860428,0,2,14,0,6,9,-1,16,0,2,9,3,-0.0482666492462158,-0.6957991719245911,0.0419760793447495,0,2,4,2,10,2,-1,9,2,5,2,2,0.0152146900072694,-0.1081828027963638,0.3646062016487122,0,3,2,12,8,4,-1,2,12,4,2,2,6,14,4,2,2,-0.006008013151586056,0.309709906578064,-0.1135921031236649,0,2,0,4,7,3,-1,0,5,7,1,3,0.006612715777009726,0.0806653425097466,-0.4665853083133698,0,2,14,14,3,3,-1,15,14,1,3,3,-0.007960701361298561,-0.8720194101333618,0.0367745906114578,0,2,0,3,4,3,-1,2,3,2,3,2,0.003884719917550683,-0.11666289716959,0.3307026922702789,0,2,1,0,2,7,-1,2,0,1,7,2,-0.001098881009966135,0.2387257069349289,-0.1765675991773605,-1.036829948425293,44,0,2,15,16,4,4,-1,15,18,4,2,2,0.0035903379321098328,-0.2368807941675186,0.2463164031505585,0,2,5,8,12,4,-1,5,10,12,2,2,0.006481593009084463,-0.3137362003326416,0.1867575943470001,0,2,3,17,1,2,-1,3,18,1,1,2,0.00007304840255528688,-0.2764435112476349,0.1649623960256577,0,2,6,1,3,4,-1,7,1,1,4,3,-0.00385146401822567,-0.5601450800895691,0.1129473969340324,0,2,6,2,3,4,-1,7,2,1,4,3,0.003858821000903845,0.0398489981889725,-0.5807185769081116,0,2,6,8,9,12,-1,9,8,3,12,3,-0.0246512200683355,0.1675501018762589,-0.2534367144107819,0,2,8,1,8,6,-1,8,3,8,2,3,0.0472455210983753,-0.1066208034753799,0.3945198059082031,0,2,14,2,6,3,-1,17,2,3,3,2,0.00659646512940526,-0.1774425059556961,0.2728019058704376,0,2,0,6,1,3,-1,0,7,1,1,3,-0.0013177490327507257,-0.5427265167236328,0.0486065894365311,0,2,10,0,10,2,-1,15,0,5,2,2,-0.005026170983910561,0.2439424991607666,-0.1314364969730377,0,2,11,0,3,2,-1,12,0,1,2,3,0.003463276894763112,0.0690493434667587,-0.7033624053001404,0,2,3,19,10,1,-1,8,19,5,1,2,0.0021692588925361633,-0.1328946053981781,0.2209852933883667,0,2,0,4,7,16,-1,0,12,7,8,2,0.0293958708643913,-0.2853052020072937,0.1354399025440216,0,2,2,16,1,3,-1,2,17,1,1,3,-0.0009618144831620157,-0.580413818359375,0.0374506488442421,0,2,7,8,12,6,-1,11,8,4,6,3,-0.1082099974155426,0.3946728110313416,-0.078655943274498,0,2,14,9,6,7,-1,16,9,2,7,3,-0.0180248692631722,0.2735562920570374,-0.1341529935598373,0,2,12,17,6,1,-1,14,17,2,1,3,0.006250984035432339,0.023388059809804,-0.8008859157562256,0,2,16,1,3,1,-1,17,1,1,1,3,-0.0016088379779830575,-0.5676252245903015,0.0412156693637371,0,3,0,17,8,2,-1,0,17,4,1,2,4,18,4,1,2,0.0007756475242786109,-0.1489126980304718,0.1908618062734604,0,2,17,0,2,1,-1,18,0,1,1,2,0.00008712233830010518,-0.155575305223465,0.194282203912735,0,2,4,15,6,5,-1,6,15,2,5,3,-0.0207553207874298,-0.6300653219223022,0.0361343808472157,0,2,7,2,8,2,-1,7,3,8,1,2,-0.0062931738793849945,0.2560924887657166,-0.1058826968073845,0,2,4,1,8,4,-1,4,3,8,2,2,0.0108441496267915,-0.1012485027313232,0.3032212853431702,0,2,5,19,2,1,-1,6,19,1,1,2,-0.00006375277735060081,0.1911157965660095,-0.1384923011064529,0,2,5,19,2,1,-1,6,19,1,1,2,0.00006648096314165741,-0.1520525068044663,0.2170630991458893,0,2,16,17,1,3,-1,16,18,1,1,3,0.0013560829684138298,0.0494317896664143,-0.6427984237670898,0,2,0,11,2,3,-1,1,11,1,3,2,-0.0009066255879588425,0.1798201054334641,-0.1404460966587067,0,2,0,19,4,1,-1,2,19,2,1,2,0.0010473709553480148,-0.1093354970216751,0.242659404873848,0,2,0,18,4,2,-1,2,18,2,2,2,-0.0010243969736620784,0.2716268002986908,-0.1182091981172562,0,2,2,17,1,3,-1,2,18,1,1,3,-0.0012024149764329195,-0.701511025428772,0.0394898988306522,0,2,5,7,11,2,-1,5,8,11,1,2,0.007691164966672659,-0.0922189131379128,0.3104628920555115,0,2,9,2,4,10,-1,9,7,4,5,2,-0.139665499329567,0.6897938847541809,-0.0397061184048653,0,2,0,2,4,3,-1,0,3,4,1,3,0.0021276050247251987,0.0972776114940643,-0.2884179949760437,0,2,10,19,10,1,-1,15,19,5,1,2,-0.0027594310231506824,0.2416867017745972,-0.1127782016992569,0,2,11,17,8,3,-1,15,17,4,3,2,0.005223613232374191,-0.1143027991056442,0.2425678074359894,0,2,8,19,3,1,-1,9,19,1,1,3,-0.0012590440455824137,-0.5967938899993896,0.0476639606058598,0,2,14,0,3,4,-1,15,0,1,4,3,-0.0037192099262028933,-0.464141309261322,0.0528476908802986,0,2,10,6,4,3,-1,10,7,4,1,3,0.005969615187495947,-0.0732442885637283,0.3874309062957764,0,2,0,8,3,2,-1,0,9,3,1,2,-0.005177672021090984,-0.7419322729110718,0.0404967106878757,0,2,7,12,3,6,-1,7,14,3,2,3,0.005003510043025017,-0.1388880014419556,0.1876762062311173,0,2,1,18,1,2,-1,1,19,1,1,2,-0.0005201345775276423,-0.5494061708450317,0.0494178496301174,0,2,0,12,4,4,-1,2,12,2,4,2,0.00531687680631876,-0.0824829787015915,0.3174056112766266,0,2,1,8,6,7,-1,3,8,2,7,3,-0.0147745897993445,0.2081609964370728,-0.1211555972695351,0,2,0,8,4,5,-1,2,8,2,5,2,-0.0414164513349533,-0.8243780732154846,0.0333291888237,-1.0492420196533203,53,0,2,19,16,1,3,-1,19,17,1,1,3,0.0009096252033486962,0.0845799669623375,-0.5611841082572937,0,2,1,5,18,6,-1,7,5,6,6,3,-0.0561397895216942,0.1534174978733063,-0.2696731984615326,0,2,2,15,4,2,-1,2,16,4,1,2,0.0010292009683325887,-0.2048998028039932,0.2015317976474762,0,2,18,6,2,11,-1,19,6,1,11,2,0.00287830107845366,-0.1735114008188248,0.2129794955253601,0,2,0,12,2,6,-1,0,14,2,2,3,-0.0074144392274320126,-0.5962486863136292,0.0470779500901699,0,2,12,5,3,2,-1,12,6,3,1,2,-0.0014831849839538336,0.1902461051940918,-0.1598639041185379,0,2,1,3,2,3,-1,1,4,2,1,3,0.0045968941412866116,0.0314471311867237,-0.6869434118270874,0,2,16,14,4,4,-1,16,16,4,2,2,0.0024255330208688974,-0.23609359562397,0.1103610992431641,0,2,6,8,12,5,-1,10,8,4,5,3,-0.0849505662918091,0.2310716062784195,-0.1377653032541275,0,2,13,7,2,7,-1,14,7,1,7,2,-0.005014568101614714,0.3867610991001129,-0.0562173798680305,0,2,1,8,2,6,-1,2,8,1,6,2,-0.002148206112906337,0.1819159984588623,-0.1761569976806641,0,2,15,0,3,7,-1,16,0,1,7,3,-0.0103967702016234,-0.7535138130187988,0.0240919701755047,0,2,4,2,6,2,-1,6,2,2,2,3,-0.0134667502716184,-0.7211886048316956,0.0349493697285652,0,2,0,9,20,9,-1,0,12,20,3,3,-0.0844354778528214,-0.3379263877868652,0.0711138173937798,0,2,10,14,2,2,-1,10,15,2,1,2,0.00247714901342988,-0.1176510974764824,0.225419893860817,0,2,6,5,10,4,-1,6,7,10,2,2,0.015828050673008,-0.0695362165570259,0.313953697681427,0,2,6,1,5,9,-1,6,4,5,3,3,0.0649169832468033,-0.0750435888767242,0.4067733883857727,0,3,16,18,2,2,-1,16,18,1,1,2,17,19,1,1,2,0.00029652469675056636,0.0739533603191376,-0.3454400897026062,0,2,0,14,2,4,-1,0,16,2,2,2,0.001312952022999525,-0.1690943986177445,0.1525837033987045,0,2,10,8,2,5,-1,11,8,1,5,2,-0.0058032129891216755,0.3526014983654022,-0.0834440663456917,0,2,3,7,12,7,-1,7,7,4,7,3,-0.1479167938232422,0.4300465881824493,-0.0573099292814732,0,2,0,0,6,6,-1,3,0,3,6,2,-0.016584150493145,0.2343268990516663,-0.1090764030814171,0,2,1,0,4,4,-1,3,0,2,4,2,0.003018327057361603,-0.1360093951225281,0.264092892408371,0,2,0,0,6,8,-1,2,0,2,8,3,-0.0364719182252884,-0.628097414970398,0.0435451082885265,0,2,0,0,2,1,-1,1,0,1,1,2,-0.00007311922672670335,0.1647063046693802,-0.1646378040313721,0,2,0,0,3,3,-1,0,1,3,1,3,-0.003671945072710514,-0.4742136001586914,0.0485869199037552,0,2,5,4,2,4,-1,5,6,2,2,2,-0.004015117883682251,0.1822218000888825,-0.1409751027822495,0,2,2,10,9,1,-1,5,10,3,1,3,0.0199480205774307,-0.0697876587510109,0.3670746088027954,0,2,1,17,1,3,-1,1,18,1,1,3,0.0007669943734072149,0.0557292997837067,-0.4458543062210083,0,2,0,17,2,3,-1,0,18,2,1,3,-0.0011806039838120341,-0.4687662124633789,0.0489022210240364,0,2,0,15,16,3,-1,8,15,8,3,2,0.0158473495393991,-0.1212020963430405,0.2056653052568436,0,2,0,5,4,1,-1,2,5,2,1,2,-0.0011985700111836195,0.2026209980249405,-0.1282382011413574,0,2,1,0,6,20,-1,3,0,2,20,3,-0.1096495985984802,-0.8661919236183167,0.0303518492728472,0,3,2,5,4,6,-1,2,5,2,3,2,4,8,2,3,2,-0.009253260679543018,0.2934311926364899,-0.0853619500994682,0,2,9,16,6,3,-1,11,16,2,3,3,0.0146865304559469,0.0327986218035221,-0.7755656242370605,0,2,11,17,6,1,-1,14,17,3,1,2,-0.0013514430029317737,0.244269996881485,-0.1150325015187264,0,2,3,17,15,2,-1,8,17,5,2,3,-0.004372809082269669,0.2168767005205154,-0.1398448050022125,0,2,18,0,2,3,-1,18,1,2,1,3,0.0034263390116393566,0.0456142202019691,-0.545677125453949,0,2,13,1,7,4,-1,13,3,7,2,2,-0.0038404068909585476,0.149495005607605,-0.1506250947713852,0,3,13,6,4,4,-1,13,6,2,2,2,15,8,2,2,2,0.0037988980766385794,-0.0873016268014908,0.2548153102397919,0,2,17,6,3,4,-1,17,8,3,2,2,-0.0020094281062483788,0.1725907027721405,-0.1428847014904022,0,2,14,9,2,2,-1,15,9,1,2,2,-0.002437070943415165,0.2684809863567352,-0.0818982198834419,0,2,17,17,1,3,-1,17,18,1,1,3,0.001048539998009801,0.0461132600903511,-0.4724327921867371,0,2,3,19,8,1,-1,7,19,4,1,2,0.00174607802182436,-0.1103043034672737,0.2037972956895828,0,2,0,9,3,6,-1,0,12,3,3,2,0.005860862787812948,-0.1561965942382813,0.1592743992805481,0,2,4,7,15,5,-1,9,7,5,5,3,-0.0277249794453382,0.1134911999106407,-0.2188514024019241,0,2,6,9,9,5,-1,9,9,3,5,3,0.0470806397497654,-0.0416887290775776,0.5363004803657532,0,2,8,1,6,2,-1,10,1,2,2,3,-0.007928377017378807,-0.5359513163566589,0.0442375093698502,0,2,4,0,12,2,-1,10,0,6,2,2,-0.0128805404528975,0.2323794960975647,-0.102462500333786,0,2,7,0,10,3,-1,12,0,5,3,2,0.0236047692596912,-0.0882914364337921,0.3056105971336365,0,2,5,0,9,6,-1,5,2,9,2,3,0.0159022007137537,-0.1223810985684395,0.1784912049770355,0,2,8,3,6,4,-1,8,5,6,2,2,0.007993949577212334,-0.0837290063500404,0.3231959044933319,0,2,17,4,2,3,-1,17,5,2,1,3,0.005710086785256863,0.038479208946228,-0.6813815236091614,-1.1122100353240967,51,0,2,5,2,4,3,-1,5,3,4,1,3,0.002248072065412998,-0.1641687005758286,0.4164853096008301,0,2,5,9,2,6,-1,6,9,1,6,2,0.004581355024129152,-0.1246595978736877,0.4038512110710144,0,2,14,10,2,6,-1,15,10,1,6,2,-0.0016073239967226982,0.260824590921402,-0.202825203537941,0,2,7,4,3,3,-1,7,5,3,1,3,0.0025205370038747787,-0.1055722981691361,0.3666911125183106,0,3,12,4,8,2,-1,12,4,4,1,2,16,5,4,1,2,0.0024119189474731684,-0.1387760043144226,0.2995991110801697,0,2,15,8,1,6,-1,15,10,1,2,3,0.005715617910027504,-0.0776834636926651,0.4848192036151886,0,2,4,17,11,3,-1,4,18,11,1,3,0.0031093840952962637,-0.1122900024056435,0.2921550869941711,0,2,3,0,16,20,-1,3,10,16,10,2,-0.0868366286158562,-0.367796003818512,0.0725972428917885,0,2,12,4,4,6,-1,12,6,4,2,3,0.0052652182057499886,-0.1089029014110565,0.3179126083850861,0,2,11,0,6,6,-1,13,0,2,6,3,-0.0199135299772024,-0.5337343811988831,0.0705857127904892,0,3,13,1,6,4,-1,13,1,3,2,2,16,3,3,2,2,0.00382978399284184,-0.135759100317955,0.2278887927532196,0,2,11,0,6,4,-1,13,0,2,4,3,0.0104318596422672,0.0887979120016098,-0.4795897006988525,0,2,8,6,6,9,-1,10,6,2,9,3,-0.0200404394418001,0.1574553996324539,-0.1777157038450241,0,2,7,0,3,4,-1,8,0,1,4,3,-0.005296729039400816,-0.6843491792678833,0.0356714613735676,0,3,0,17,14,2,-1,0,17,7,1,2,7,18,7,1,2,-0.0021624139044433832,0.2831803858280182,-0.098511278629303,0,3,6,18,2,2,-1,6,18,1,1,2,7,19,1,1,2,-0.00035464888787828386,-0.3707734048366547,0.0809329524636269,0,2,18,17,1,3,-1,18,18,1,1,3,-0.00018152060511056334,-0.322070300579071,0.0775510594248772,0,3,17,18,2,2,-1,17,18,1,1,2,18,19,1,1,2,-0.000275630212854594,-0.3244127929210663,0.0879494771361351,0,2,5,7,1,9,-1,5,10,1,3,3,0.006382381077855825,-0.0889247134327888,0.3172721862792969,0,2,5,3,6,4,-1,7,3,2,4,3,0.0111509095877409,0.0710198432207108,-0.4049403965473175,0,3,1,9,6,2,-1,1,9,3,1,2,4,10,3,1,2,-0.0010593760525807738,0.2605066895484924,-0.1176564022898674,0,2,6,9,2,3,-1,7,9,1,3,2,0.002390648005530238,-0.0843886211514473,0.3123055100440979,0,2,6,8,6,12,-1,8,8,2,12,3,-0.0110007496550679,0.1915224939584732,-0.1521002054214478,0,3,4,18,2,2,-1,4,18,1,1,2,5,19,1,1,2,-0.00024643228971399367,-0.3176515996456146,0.0865822583436966,0,2,9,1,6,6,-1,9,3,6,2,3,0.0230532698333263,-0.1008976027369499,0.2576929032802582,0,2,6,17,6,2,-1,6,18,6,1,2,-0.0022135660983622074,0.4568921029567719,-0.0524047911167145,0,2,3,18,16,2,-1,3,19,16,1,2,-0.000971397093962878,-0.3551838099956513,0.0800943821668625,0,2,3,0,3,11,-1,4,0,1,11,3,0.0015676229959353805,0.1009142026305199,-0.2160304039716721,0,2,13,18,3,1,-1,14,18,1,1,3,0.0007546080159954727,0.0578961782157421,-0.4046111106872559,0,2,6,0,9,6,-1,6,2,9,2,3,-0.0206989701837301,0.3154363036155701,-0.0807130485773087,0,3,1,2,12,4,-1,1,2,6,2,2,7,4,6,2,2,-0.0206199400126934,0.271816611289978,-0.0763586163520813,0,2,3,3,6,4,-1,5,3,2,4,3,0.0216111298650503,0.0394934490323067,-0.5942965149879456,0,2,12,0,8,1,-1,16,0,4,1,2,0.006567674223333597,-0.0983536690473557,0.2364927977323532,0,2,9,0,6,2,-1,11,0,2,2,3,-0.008843479678034782,-0.5252342820167542,0.0430999211966991,0,2,3,3,12,1,-1,9,3,6,1,2,-0.009426074102520943,0.2466513067483902,-0.0941307172179222,0,3,2,7,6,2,-1,2,7,3,1,2,5,8,3,1,2,-0.001983023015782237,0.2674370110034943,-0.0900693163275719,0,2,0,8,4,6,-1,0,10,4,2,3,-0.001735839992761612,0.1594001948833466,-0.157894104719162,0,2,9,6,3,7,-1,10,6,1,7,3,-0.0135138696059585,0.4079233109951019,-0.0642231181263924,0,2,9,6,6,13,-1,11,6,2,13,3,-0.0193940103054047,0.1801564991474152,-0.1373140066862106,0,2,11,12,6,1,-1,13,12,2,1,3,-0.003268477041274309,0.2908039093017578,-0.0801619067788124,0,2,18,9,2,6,-1,18,12,2,3,2,0.00041773589327931404,-0.2141298055648804,0.1127343997359276,0,2,17,2,3,9,-1,18,2,1,9,3,-0.007635111920535564,-0.4536595940589905,0.0546250604093075,0,3,13,8,4,6,-1,13,8,2,3,2,15,11,2,3,2,-0.008365297690033913,0.2647292017936707,-0.0943341106176376,0,2,4,2,12,6,-1,10,2,6,6,2,0.027768449857831,-0.1013671010732651,0.2074397951364517,0,2,4,14,16,6,-1,12,14,8,6,2,-0.0548912286758423,0.2884030938148499,-0.075312040746212,0,2,6,19,10,1,-1,11,19,5,1,2,0.002579333959147334,-0.1108852997422218,0.2172496020793915,0,2,6,17,1,3,-1,6,18,1,1,3,0.00006619651685468853,-0.1887210011482239,0.1444068998098373,0,2,4,14,10,3,-1,4,15,10,1,3,0.005090725142508745,-0.0776012316346169,0.2939837872982025,0,2,6,0,12,12,-1,6,4,12,4,3,-0.1044425964355469,0.2013310939073563,-0.1090397015213966,0,3,5,7,4,2,-1,5,7,2,1,2,7,8,2,1,2,-0.0006727309082634747,0.1794590055942535,-0.1202367022633553,0,2,17,5,3,2,-1,18,5,1,2,3,0.0032412849832326174,0.0406881310045719,-0.5460057258605957,-1.2529590129852295,44,0,2,8,13,6,3,-1,8,14,6,1,3,0.005296532064676285,-0.1215452998876572,0.6442037224769592,0,2,8,13,5,3,-1,8,14,5,1,3,-0.002532626036554575,0.5123322010040283,-0.111082598567009,0,2,13,2,1,18,-1,13,11,1,9,2,-0.0029183230362832546,-0.5061542987823486,0.1150197982788086,0,2,6,10,9,2,-1,9,10,3,2,3,-0.0236923396587372,0.3716728091239929,-0.1467268019914627,0,2,11,0,7,4,-1,11,2,7,2,2,0.0201774705201387,-0.1738884001970291,0.4775949120521545,0,2,1,0,6,8,-1,3,0,2,8,3,-0.021723210811615,-0.4388009011745453,0.1357689946889877,0,2,9,15,3,3,-1,9,16,3,1,3,0.0028369780629873276,-0.1251206994056702,0.4678902924060822,0,2,9,17,9,3,-1,9,18,9,1,3,0.002714842092245817,-0.0880188569426537,0.3686651885509491,0,2,12,12,3,3,-1,12,13,3,1,3,0.003262568963691592,-0.0853353068232536,0.5164473056793213,0,2,4,1,3,5,-1,5,1,1,5,3,-0.0035618850961327553,-0.445039302110672,0.0917381718754768,0,2,10,14,2,3,-1,10,15,2,1,3,0.001922774943523109,-0.1107731014490128,0.3941699862480164,0,3,18,17,2,2,-1,18,17,1,1,2,19,18,1,1,2,-0.0003511196991894394,-0.3777570128440857,0.1216617003083229,0,3,18,18,2,2,-1,18,18,1,1,2,19,19,1,1,2,0.0001912177976919338,0.0748160183429718,-0.4076710045337677,0,3,18,18,2,2,-1,18,18,1,1,2,19,19,1,1,2,-0.00026525629800744355,-0.3315171897411346,0.1129112020134926,0,2,4,10,9,1,-1,7,10,3,1,3,0.0200867000967264,-0.0615981183946133,0.5612881779670715,0,2,3,9,6,5,-1,5,9,2,5,3,0.0367832481861115,-0.0602513886988163,0.5219249129295349,0,2,18,8,1,12,-1,18,14,1,6,2,0.0013941619545221329,-0.3550305068492889,0.1086302027106285,0,3,0,2,8,6,-1,0,2,4,3,2,4,5,4,3,2,-0.0151816699653864,0.2273965030908585,-0.1625299006700516,0,2,9,4,3,3,-1,9,5,3,1,3,0.0046796840615570545,-0.0575350411236286,0.4812423884868622,0,3,3,18,2,2,-1,3,18,1,1,2,4,19,1,1,2,-0.00017988319450523704,-0.3058767020702362,0.1086815968155861,0,2,6,4,4,3,-1,6,5,4,1,3,-0.0035850999411195517,0.3859694004058838,-0.0921940729022026,0,3,16,7,4,2,-1,16,7,2,1,2,18,8,2,1,2,0.001079336041584611,-0.1119038984179497,0.31125208735466,0,2,5,17,1,3,-1,5,18,1,1,3,0.00007328580250032246,-0.2023991048336029,0.155866801738739,0,2,2,0,15,20,-1,2,10,15,10,2,0.1367873996496201,-0.2167285978794098,0.1442039012908936,0,3,8,11,6,4,-1,8,11,3,2,2,11,13,3,2,2,-0.0117292599752545,0.4350377023220062,-0.0748865306377411,0,2,8,16,4,3,-1,8,17,4,1,3,0.003923084121197462,-0.0502893291413784,0.5883116126060486,0,3,8,18,2,2,-1,8,18,1,1,2,9,19,1,1,2,-0.0002981912111863494,-0.3823240101337433,0.0924511328339577,0,2,2,16,13,3,-1,2,17,13,1,3,-0.004799277056008577,0.4848878979682922,-0.0731365233659744,0,3,16,16,2,2,-1,16,16,1,1,2,17,17,1,1,2,-0.0003015589027199894,-0.3575735986232758,0.1058188006281853,0,2,8,1,6,3,-1,10,1,2,3,3,0.0103907696902752,0.0529204681515694,-0.5724965929985046,0,3,16,7,2,2,-1,16,7,1,1,2,17,8,1,1,2,-0.0009448804194107652,0.449668288230896,-0.0830755233764648,0,3,14,7,4,2,-1,14,7,2,1,2,16,8,2,1,2,0.0012651870492845774,-0.0966954380273819,0.3130227029323578,0,2,4,0,14,1,-1,11,0,7,1,2,0.0170945394784212,-0.081248976290226,0.3611383140087128,0,3,10,4,8,2,-1,10,4,4,1,2,14,5,4,1,2,0.002597335958853364,-0.1133835017681122,0.2223394960165024,0,2,8,2,3,2,-1,9,2,1,2,3,0.0014527440071105957,0.0697504431009293,-0.3672071099281311,0,2,12,11,6,3,-1,12,12,6,1,3,0.00476386584341526,-0.0657889619469643,0.383285403251648,0,2,1,5,1,4,-1,1,7,1,2,2,-0.006250108126550913,-0.7075446844100952,0.038350198417902,0,2,1,1,1,18,-1,1,7,1,6,3,-0.003176532918587327,0.1375540047883987,-0.2324002981185913,0,2,11,13,3,2,-1,11,14,3,1,2,0.003219116944819689,-0.1293545067310333,0.2273788005113602,0,3,0,1,12,2,-1,0,1,6,1,2,6,2,6,1,2,-0.005636557936668396,0.380671501159668,-0.0672468394041061,0,3,10,18,2,2,-1,10,18,1,1,2,11,19,1,1,2,-0.00023844049428589642,-0.3112238049507141,0.0838383585214615,0,3,4,5,4,4,-1,4,5,2,2,2,6,7,2,2,2,-0.004101756028831005,0.2606728076934815,-0.1044974029064179,0,2,6,7,1,3,-1,6,8,1,1,3,0.0013336989795789123,-0.0582501403987408,0.4768244028091431,0,2,14,10,6,2,-1,16,10,2,2,3,-0.0012090239906683564,0.148345097899437,-0.1732946932315826,-1.118873953819275,72,0,2,16,8,3,6,-1,17,8,1,6,3,-0.003176093101501465,0.3333333134651184,-0.166423499584198,0,2,4,10,6,2,-1,6,10,2,2,3,0.0248580798506737,-0.0727288722991943,0.5667458176612854,0,2,6,5,3,7,-1,7,5,1,7,3,-0.007759728003293276,0.4625856876373291,-0.0931121781468391,0,2,0,13,6,6,-1,0,16,6,3,2,0.007823902182281017,-0.2741461098194122,0.1324304938316345,0,2,12,5,1,9,-1,12,8,1,3,3,-0.010948839597404,0.2234548032283783,-0.1496544927358627,0,2,5,9,3,3,-1,6,9,1,3,3,-0.0034349008928984404,0.3872498869895935,-0.0661217272281647,0,2,7,5,6,13,-1,9,5,2,13,3,-0.0311562903225422,0.2407827973365784,-0.1140690967440605,0,2,19,8,1,10,-1,19,13,1,5,2,0.001110051991418004,-0.2820797860622406,0.1327542960643768,0,2,11,18,6,1,-1,13,18,2,1,3,0.003176274010911584,0.0345859304070473,-0.5137431025505066,0,2,9,7,6,12,-1,11,7,2,12,3,-0.0279774591326714,0.2392677962779999,-0.1325591951608658,0,2,12,7,6,6,-1,14,7,2,6,3,-0.0230979397892952,0.3901962041854858,-0.0784780085086823,0,2,15,8,3,4,-1,16,8,1,4,3,-0.003973193001002073,0.3069106936454773,-0.0706014037132263,0,2,6,11,4,2,-1,6,12,4,1,2,0.003033574903383851,-0.1400219053030014,0.191348597407341,0,2,1,6,6,8,-1,3,6,2,8,3,-0.0108443703502417,0.1654873043298721,-0.1565777957439423,0,2,11,15,6,5,-1,13,15,2,5,3,-0.0181505102664232,-0.6324359178543091,0.0395618192851543,0,2,15,17,4,2,-1,15,18,4,1,2,0.0007105229888111353,-0.1851557046175003,0.1340880990028381,0,2,13,11,6,1,-1,15,11,2,1,3,0.0108933402225375,-0.0267302300781012,0.6097180247306824,0,3,5,18,2,2,-1,5,18,1,1,2,6,19,1,1,2,-0.0002878090017475188,-0.3006514012813568,0.0731714591383934,0,3,4,8,4,4,-1,4,8,2,2,2,6,10,2,2,2,-0.0035855069290846586,0.2621760964393616,-0.0797140970826149,0,2,11,7,9,3,-1,11,8,9,1,3,-0.0197592806071043,-0.5903922915458679,0.0406989715993404,0,3,0,3,10,4,-1,0,3,5,2,2,5,5,5,2,2,-0.010845210403204,0.1636455953121185,-0.1258606016635895,0,2,7,18,6,1,-1,9,18,2,1,3,-0.004318309016525745,-0.5747488141059875,0.0376443117856979,0,2,0,8,3,3,-1,0,9,3,1,3,0.0014913700288161635,0.0609134696424007,-0.3022292852401733,0,3,0,0,6,8,-1,0,0,3,4,2,3,4,3,4,2,0.0156756993383169,-0.0731459110975266,0.2937945127487183,0,2,7,6,3,8,-1,8,6,1,8,3,-0.0110335601493716,0.393188089132309,-0.0470843203365803,0,2,13,7,7,3,-1,13,8,7,1,3,0.008855575695633888,0.0376013815402985,-0.4910849034786224,0,2,3,3,2,2,-1,3,4,2,1,2,-0.0008966567111201584,0.1795202046632767,-0.1108623966574669,0,2,0,3,3,3,-1,0,4,3,1,3,-0.0030592409893870354,-0.4442946016788483,0.0510054305195808,0,2,9,3,5,2,-1,9,4,5,1,2,0.006320117972791195,-0.0528410896658897,0.3719710111618042,0,2,6,5,9,4,-1,9,5,3,4,3,0.020682830363512,0.0576671697199345,-0.3690159916877747,0,2,3,10,12,3,-1,7,10,4,3,3,0.0998226627707481,-0.037377018481493,0.5816559195518494,0,2,8,7,3,6,-1,9,7,1,6,3,-0.006585422903299332,0.2850944101810455,-0.0609780699014664,0,2,5,5,6,5,-1,8,5,3,5,2,-0.0609003007411957,-0.5103176832199097,0.0377874001860619,0,2,0,5,2,3,-1,0,6,2,1,3,-0.0029991709161549807,-0.4794301092624664,0.0388338901102543,0,2,9,7,3,4,-1,10,7,1,4,3,-0.009890643879771233,0.4060907959938049,-0.047869648784399,0,2,1,0,6,15,-1,3,0,2,15,3,-0.0826889276504517,-0.7067118287086487,0.0274877492338419,0,2,15,1,3,5,-1,16,1,1,5,3,0.00500603998079896,0.028208440169692,-0.5290969014167786,0,2,9,2,3,10,-1,10,2,1,10,3,0.006169503089040518,-0.0545548610389233,0.3283798098564148,0,2,8,8,6,12,-1,10,8,2,12,3,-0.0033914761152118444,0.0921176671981812,-0.2163711041212082,0,2,16,4,3,4,-1,16,6,3,2,2,-0.0026131230406463146,0.1365101933479309,-0.1378113031387329,0,3,16,7,2,2,-1,16,7,1,1,2,17,8,1,1,2,0.0008049065945670009,-0.0686371102929115,0.3358106911182404,0,2,13,0,6,9,-1,13,3,6,3,3,-0.0381065085530281,0.2944543063640595,-0.068239226937294,0,2,7,17,1,3,-1,7,18,1,1,3,0.00007245079905260354,-0.167501300573349,0.1217823028564453,0,2,12,1,4,2,-1,12,2,4,1,2,0.0015837959945201874,-0.0920428484678268,0.213489904999733,0,2,17,3,1,3,-1,17,4,1,1,3,0.0012924340553581715,0.0629172325134277,-0.3617450892925263,0,2,0,16,9,3,-1,0,17,9,1,3,0.00991467759013176,0.0195340607315302,-0.8101503849029541,0,3,3,6,2,4,-1,3,6,1,2,2,4,8,1,2,2,-0.0017086310544982553,0.2552523910999298,-0.0682294592261314,0,2,13,18,3,1,-1,14,18,1,1,3,0.002184439916163683,0.0233140494674444,-0.8429678082466125,0,2,0,18,4,2,-1,2,18,2,2,2,-0.003424433059990406,0.2721368968486786,-0.0763952285051346,0,2,1,19,2,1,-1,2,19,1,1,2,0.00027591470279730856,-0.1074284017086029,0.2288897037506104,0,2,0,18,4,2,-1,0,19,4,1,2,-0.0006000517751090229,-0.2985421121120453,0.0634797364473343,0,2,2,17,1,3,-1,2,18,1,1,3,-0.00025001438916660845,-0.2717896997928619,0.0696150064468384,0,2,4,8,3,5,-1,5,8,1,5,3,0.006875139195472002,-0.0571858994662762,0.3669595122337341,0,2,2,1,6,7,-1,4,1,2,7,3,0.0127619002014399,0.0679556876420975,-0.2853415012359619,0,3,3,6,2,8,-1,3,6,1,4,2,4,10,1,4,2,-0.0014752789866179228,0.2068066000938416,-0.1005939021706581,0,2,4,5,11,10,-1,4,10,11,5,2,0.1213881969451904,-0.0971267968416214,0.1978961974382401,0,2,0,13,20,2,-1,10,13,10,2,2,-0.0500812791287899,0.2841717898845673,-0.0678799971938133,0,2,1,13,16,3,-1,9,13,8,3,2,0.0314549505710602,-0.0894686728715897,0.2129842042922974,0,3,16,4,4,4,-1,16,4,2,2,2,18,6,2,2,2,0.0018878319533541799,-0.1165644004940987,0.166635200381279,0,3,16,0,4,12,-1,16,0,2,6,2,18,6,2,6,2,-0.005721196066588163,0.2370214015245438,-0.0907766073942184,0,2,14,15,3,1,-1,15,15,1,1,3,-0.00018076719425152987,0.1795192956924439,-0.1079348027706146,0,2,3,4,12,10,-1,3,9,12,5,2,-0.1976184993982315,0.4567429125308991,-0.0404801592230797,0,3,9,18,2,2,-1,9,18,1,1,2,10,19,1,1,2,-0.00023846809926908463,-0.2373300939798355,0.0759221613407135,0,3,9,18,2,2,-1,9,18,1,1,2,10,19,1,1,2,0.00021540730085689574,0.0816880166530609,-0.2868503034114838,0,3,13,4,2,14,-1,13,4,1,7,2,14,11,1,7,2,0.0101630901917815,-0.0412500202655792,0.4803834855556488,0,2,4,2,6,4,-1,7,2,3,4,2,-0.007218487095087767,0.1745858043432236,-0.1014650017023087,0,3,0,0,18,20,-1,0,0,9,10,2,9,10,9,10,2,0.2426317036151886,0.05342648178339,-0.3231852948665619,0,2,15,11,1,2,-1,15,12,1,1,2,0.0006930410163477063,-0.1149917989969254,0.1479393988847733,0,3,16,10,2,4,-1,16,10,1,2,2,17,12,1,2,2,0.003547519911080599,-0.0394249781966209,0.5312618017196655,0,3,18,17,2,2,-1,18,17,1,1,2,19,18,1,1,2,0.00021403690334409475,0.0697538331151009,-0.2731958031654358,0,2,9,17,1,2,-1,9,18,1,1,2,-0.0005711946287192404,0.3436990082263947,-0.0576990097761154,0,2,8,4,9,6,-1,11,4,3,6,3,-0.006629006937146187,0.1175848990678787,-0.1502013951539993,-1.088881015777588,66,0,2,6,9,9,10,-1,9,9,3,10,3,-0.0265134498476982,0.2056864053010941,-0.2647390067577362,0,2,5,0,5,4,-1,5,2,5,2,2,0.00977274589240551,-0.111928403377533,0.325705498456955,0,2,5,7,11,4,-1,5,9,11,2,2,0.0322903506457806,-0.0985747575759888,0.3177917003631592,0,2,2,4,2,14,-1,3,4,1,14,2,-0.00281032407656312,0.1521389931440353,-0.1968640983104706,0,2,8,6,3,5,-1,9,6,1,5,3,-0.0109914299100637,0.5140765905380249,-0.0437072105705738,0,2,8,4,3,9,-1,9,4,1,9,3,0.006313383113592863,-0.0927810221910477,0.3470247089862824,0,2,0,8,20,6,-1,0,10,20,2,3,0.0871059820055962,0.030053649097681,-0.8281481862068176,0,2,14,16,6,1,-1,17,16,3,1,2,0.0011799359926953912,-0.1292842030525208,0.2064612060785294,0,2,17,18,2,2,-1,17,19,2,1,2,-0.0009305689018219709,-0.5002143979072571,0.0936669930815697,0,2,8,17,6,3,-1,10,17,2,3,3,-0.0136871701106429,-0.793581485748291,-0.006673363968729973,0,2,4,1,9,15,-1,7,1,3,15,3,-0.0759174525737762,0.3046964108943939,-0.0796558931469917,0,2,11,5,3,12,-1,12,5,1,12,3,-0.0028559709899127483,0.2096146047115326,-0.1273255050182343,0,2,0,15,4,3,-1,0,16,4,1,3,-0.004023151006549597,-0.6581727862358093,0.0506836399435997,0,2,0,0,15,1,-1,5,0,5,1,3,0.0175580400973558,-0.0853826925158501,0.3617455959320068,0,2,6,0,6,4,-1,8,0,2,4,3,0.0219882391393185,0.062943696975708,-0.7089633941650391,0,2,2,0,9,3,-1,5,0,3,3,3,-0.002859958913177252,0.1468378007411957,-0.1646597981452942,0,2,13,6,3,7,-1,14,6,1,7,3,-0.0100308498367667,0.4957993924617767,-0.0271883402019739,0,2,7,6,4,2,-1,7,7,4,1,2,-0.006956032942980528,0.2797777950763702,-0.0779533311724663,0,2,6,18,6,1,-1,8,18,2,1,3,-0.0038356808945536613,-0.58163982629776,0.0357399396598339,0,2,18,6,2,2,-1,18,7,2,1,2,-0.0032647319603711367,-0.4994508028030396,0.0469864904880524,0,2,6,4,7,3,-1,6,5,7,1,3,-0.007841235026717186,0.34532830119133,-0.0688104033470154,0,2,12,7,3,1,-1,13,7,1,1,3,-0.00008171811350621283,0.1504171043634415,-0.1414667963981628,0,3,15,1,2,10,-1,15,1,1,5,2,16,6,1,5,2,-0.0032448628917336464,0.227245107293129,-0.0928602069616318,0,2,0,18,2,2,-1,0,19,2,1,2,-0.0007856115116737783,-0.4431901872158051,0.0578124411404133,0,2,19,4,1,8,-1,19,8,1,4,2,-0.0006247424753382802,0.1395238935947418,-0.1466871947050095,0,2,1,17,1,3,-1,1,18,1,1,3,-0.0003294294874649495,-0.2990157008171082,0.0760667398571968,0,3,0,15,6,4,-1,0,15,3,2,2,3,17,3,2,2,0.0012605739757418633,-0.1612560003995895,0.1395380049943924,0,2,19,0,1,18,-1,19,6,1,6,3,-0.0516670197248459,-0.5314283967018127,0.0407195203006268,0,2,10,2,6,2,-1,12,2,2,2,3,-0.0152856195345521,-0.7820637822151184,0.0271837692707777,0,2,2,8,12,2,-1,6,8,4,2,3,0.0690298229455948,-0.0364270210266113,0.7110251784324646,0,2,16,0,4,1,-1,18,0,2,1,2,0.001452274969778955,-0.0968905165791512,0.2166842073202133,0,2,8,4,2,6,-1,8,7,2,3,2,-0.0024765590205788612,0.1164531037211418,-0.1822797954082489,0,2,14,5,2,10,-1,15,5,1,10,2,-0.0015134819550439715,0.1786397993564606,-0.1221496984362602,0,2,13,4,2,2,-1,13,5,2,1,2,-0.0015099470037966967,0.1808623969554901,-0.1144606992602348,0,2,11,1,3,6,-1,11,3,3,2,3,-0.006705462001264095,0.2510659992694855,-0.0918714627623558,0,2,6,9,12,2,-1,10,9,4,2,3,-0.014075200073421,0.1370750963687897,-0.173335000872612,0,2,9,16,4,2,-1,9,17,4,1,2,-0.0022400720044970512,0.4009298086166382,-0.0475768782198429,0,2,5,14,15,4,-1,5,16,15,2,2,0.0197823699563742,-0.1904035061597824,0.1492341011762619,0,2,18,16,2,2,-1,18,17,2,1,2,0.002600287087261677,0.0469717681407928,-0.4330765902996063,0,3,16,18,2,2,-1,16,18,1,1,2,17,19,1,1,2,-0.0005344562814570963,-0.4374423027038574,0.0415201894938946,0,2,6,4,3,8,-1,7,4,1,8,3,-0.0174665097147226,0.6581817269325256,-0.0344474911689758,0,2,5,9,3,1,-1,6,9,1,1,3,-0.00204255897551775,0.3965792953968048,-0.044052429497242,0,2,0,8,1,6,-1,0,10,1,2,3,0.0026661779265850782,0.0587709583342075,-0.3280636966228485,0,2,11,2,9,6,-1,14,2,3,6,3,-0.0559823699295521,-0.5173547267913818,0.0357918404042721,0,2,12,2,6,4,-1,14,2,2,4,3,-0.0015066330088302493,0.1512386947870255,-0.1252018064260483,0,2,1,7,2,4,-1,1,9,2,2,2,-0.0114723695442081,-0.6293053030967712,0.0347043313086033,0,2,13,1,6,4,-1,13,3,6,2,2,0.0234096292406321,-0.0580633506178856,0.3866822123527527,0,3,4,10,2,10,-1,4,10,1,5,2,5,15,1,5,2,-0.002324372995644808,0.1875409930944443,-0.0983946695923805,0,2,2,16,9,3,-1,5,16,3,3,3,-0.0290392991155386,-0.5448690056800842,0.0409263409674168,0,2,1,2,3,9,-1,2,2,1,9,3,-0.014474649913609,-0.6724839210510254,0.0231288503855467,0,2,19,7,1,4,-1,19,9,1,2,2,-0.005208609160035849,-0.4327144026756287,0.0437806509435177,0,3,14,11,6,8,-1,14,11,3,4,2,17,15,3,4,2,0.004938289988785982,-0.1087862029671669,0.1934258937835693,0,3,15,12,4,6,-1,15,12,2,3,2,17,15,2,3,2,-0.004319393076002598,0.2408093065023422,-0.1038080006837845,0,3,16,15,2,2,-1,16,15,1,1,2,17,16,1,1,2,0.0002370566944591701,-0.087349072098732,0.2046623975038528,0,3,17,16,2,2,-1,17,16,1,1,2,18,17,1,1,2,0.0004785807977896184,0.0456245802342892,-0.3885467052459717,0,3,17,16,2,2,-1,17,16,1,1,2,18,17,1,1,2,-0.0008534283842891455,-0.550779402256012,0.0358258895576,0,3,2,3,2,2,-1,2,3,1,1,2,3,4,1,1,2,0.00005477212107507512,-0.1122523993253708,0.1750351935625076,0,2,10,10,3,3,-1,11,10,1,3,3,-0.0038445889949798584,0.2452670037746429,-0.0811325684189796,0,2,5,9,7,8,-1,5,13,7,4,2,-0.0401284582912922,-0.6312270760536194,0.0269726701080799,0,3,7,16,2,2,-1,7,16,1,1,2,8,17,1,1,2,-0.0001788636000128463,0.1985509991645813,-0.1033368036150932,0,3,7,16,2,2,-1,7,16,1,1,2,8,17,1,1,2,0.00017668239888735116,-0.0913590118288994,0.1984872072935104,0,2,9,8,10,3,-1,14,8,5,3,2,0.0727633833885193,0.0500755794346333,-0.3385263085365295,0,3,6,7,4,8,-1,6,7,2,4,2,8,11,2,4,2,0.0101816300302744,-0.0932299792766571,0.2005959004163742,0,2,1,6,4,3,-1,1,7,4,1,3,0.0024409969337284565,0.0646366328001022,-0.2692174017429352,0,2,6,10,6,10,-1,8,10,2,10,3,-0.003622748889029026,0.1316989064216614,-0.1251484006643295,0,2,4,6,3,6,-1,5,6,1,6,3,-0.0013635610230267048,0.1635046005249023,-0.106659397482872,-1.0408929586410522,69,0,3,3,10,4,4,-1,3,10,2,2,2,5,12,2,2,2,-0.009699116460978985,0.6112532019615173,-0.0662253126502037,0,3,3,10,4,4,-1,3,10,2,2,2,5,12,2,2,2,-0.009642653167247772,-1,0.0027699959464371204,0,3,3,10,4,4,-1,3,10,2,2,2,5,12,2,2,2,-0.009638186544179916,1,-0.00029904270195402205,0,2,14,8,2,6,-1,15,8,1,6,2,-0.004255393985658884,0.2846438884735107,-0.1554012000560761,0,3,3,10,4,4,-1,3,10,2,2,2,5,12,2,2,2,-0.009622352197766304,-1,0.0439991801977158,0,3,3,10,4,4,-1,3,10,2,2,2,5,12,2,2,2,-0.009123124182224274,0.8686934113502502,-0.0027267890982329845,0,2,12,4,3,9,-1,13,4,1,9,3,-0.008624043315649033,0.4535248875617981,-0.0860713794827461,0,2,12,3,1,12,-1,12,7,1,4,3,-0.008932414464652538,0.1337555944919586,-0.2601251900196075,0,2,2,0,18,1,-1,8,0,6,1,3,-0.0142078101634979,0.3207764029502869,-0.0972264111042023,0,3,10,0,10,6,-1,10,0,5,3,2,15,3,5,3,2,0.0259110108017921,-0.1296408027410507,0.2621864974498749,0,2,18,16,2,2,-1,18,17,2,1,2,0.00020531509653665125,-0.1240428015589714,0.2106295973062515,0,3,3,5,4,2,-1,3,5,2,1,2,5,6,2,1,2,-0.000054795680625829846,0.1197429969906807,-0.2320127934217453,0,2,11,8,3,3,-1,12,8,1,3,3,0.006855519954115152,-0.0632761269807816,0.4104425013065338,0,2,11,7,3,5,-1,12,7,1,5,3,-0.0122530404478312,0.5488333106040955,-0.0397311002016068,0,2,3,19,15,1,-1,8,19,5,1,3,-0.0039058770053088665,0.2419098019599915,-0.0970960110425949,0,2,8,13,3,2,-1,8,14,3,1,2,0.0027560980524867773,-0.1256967931985855,0.1945665031671524,0,3,2,12,8,4,-1,2,12,4,2,2,6,14,4,2,2,-0.0077662160620093346,0.2976570129394531,-0.0968181565403938,0,3,16,16,2,2,-1,16,16,1,1,2,17,17,1,1,2,0.00038997188676148653,0.0621884018182755,-0.4204089939594269,0,2,7,0,3,2,-1,8,0,1,2,3,0.0033579880837351084,0.0474981404840946,-0.6321688294410706,0,2,6,7,2,5,-1,7,7,1,5,2,-0.0167455393821001,0.7109813094139099,-0.0391573496162891,0,2,18,0,2,17,-1,19,0,1,17,2,-0.0065409899689257145,-0.3504317104816437,0.0706169530749321,0,2,16,16,1,3,-1,16,17,1,1,3,0.0003001634031534195,0.091902457177639,-0.2461867034435272,0,2,14,8,3,7,-1,15,8,1,7,3,0.0149189904332161,-0.0519094504415989,0.5663604140281677,0,3,10,17,2,2,-1,10,17,1,1,2,11,18,1,1,2,0.00048153079114854336,0.064659558236599,-0.3659060895442963,0,2,4,9,1,3,-1,4,10,1,1,3,-0.00030211321427486837,0.1792656928300858,-0.1141066029667854,0,2,18,10,2,3,-1,18,11,2,1,3,0.0003852141962852329,0.1034561991691589,-0.2007246017456055,0,2,12,1,3,10,-1,13,1,1,10,3,0.008083713240921497,-0.0660734623670578,0.3028424978256226,0,2,8,12,9,1,-1,11,12,3,1,3,-0.0228049699217081,0.5296235084533691,-0.0401189997792244,0,3,5,18,2,2,-1,5,18,1,1,2,6,19,1,1,2,0.00019440450705587864,0.0818548202514648,-0.2466336041688919,0,2,19,6,1,9,-1,19,9,1,3,3,-0.0128480903804302,-0.3497331142425537,0.0569162294268608,0,3,4,7,2,4,-1,4,7,1,2,2,5,9,1,2,2,-0.001093729049898684,0.2336868047714233,-0.0916048064827919,0,2,1,4,6,14,-1,3,4,2,14,3,0.0010032650316134095,0.1185218021273613,-0.1846919059753418,0,2,10,5,9,3,-1,13,5,3,3,3,-0.0446884296834469,-0.6436246037483215,0.0303632691502571,0,2,18,7,2,6,-1,18,9,2,2,3,0.00816575437784195,0.0436746589839458,-0.4300208985805512,0,2,5,6,2,7,-1,6,6,1,7,2,-0.0117178102955222,0.4178147912025452,-0.0482336990535259,0,2,10,4,6,8,-1,13,4,3,8,2,0.0842771306633949,0.053461279720068,-0.379521906375885,0,2,0,8,2,9,-1,0,11,2,3,3,0.0142118399962783,0.0449009388685226,-0.4298149943351746,0,2,0,7,5,3,-1,0,8,5,1,3,0.001502834027633071,0.0822276398539543,-0.2470639944076538,0,2,8,1,7,2,-1,8,2,7,1,2,0.0100035797804594,-0.057221669703722,0.3460937142372131,0,2,7,5,3,5,-1,8,5,1,5,3,-0.009070632047951221,0.450580894947052,-0.0427953191101551,0,2,19,2,1,2,-1,19,3,1,1,2,-0.0003314162022434175,0.1833691000938416,-0.1075994968414307,0,2,6,7,10,11,-1,11,7,5,11,2,0.19723279774189,-0.030363829806447,0.6642342805862427,0,2,9,19,6,1,-1,11,19,2,1,3,-0.007125880103558302,-0.8922504782676697,0.0256699901074171,0,2,3,0,12,1,-1,7,0,4,1,3,0.00869213417172432,-0.0707643702626228,0.2821052968502045,0,2,4,1,6,5,-1,6,1,2,5,3,0.008926212787628174,0.0710782334208488,-0.3023256063461304,0,2,6,12,12,6,-1,10,12,4,6,3,0.0572860091924667,0.0509741306304932,-0.3919695019721985,0,2,16,13,2,3,-1,16,14,2,1,3,0.0037920880131423473,0.0338419415056705,-0.510162889957428,0,2,7,14,4,2,-1,7,15,4,1,2,-0.0014508679741993546,0.3087914884090424,-0.063845083117485,0,2,7,14,2,2,-1,7,15,2,1,2,0.00098390132188797,-0.1302956938743591,0.1460441052913666,0,3,3,10,2,4,-1,3,10,1,2,2,4,12,1,2,2,-0.0017221809830516577,0.2915700972080231,-0.0685495585203171,0,2,0,3,2,6,-1,0,5,2,2,3,0.0109482500702143,0.0343514084815979,-0.4770225882530212,0,3,1,10,2,2,-1,1,10,1,1,2,2,11,1,1,2,-0.00001717630948405713,0.1605526953935623,-0.1169084012508392,0,2,16,4,4,3,-1,16,5,4,1,3,-0.005488420836627483,-0.4341588914394379,0.0461062416434288,0,3,5,10,2,4,-1,5,10,1,2,2,6,12,1,2,2,-0.0030975250992923975,0.3794333934783936,-0.05686055123806,0,2,5,11,13,2,-1,5,12,13,1,2,0.006418208125978708,-0.1585821062326431,0.1233541965484619,0,2,10,2,3,11,-1,11,2,1,11,3,0.0118312397971749,-0.0409292913973331,0.458789587020874,0,2,10,2,4,4,-1,10,4,4,2,2,0.013540499843657,-0.0537255592644215,0.3505612015724182,0,2,8,8,6,2,-1,10,8,2,2,3,-0.002593215089291334,0.1101052016019821,-0.1675221025943756,0,2,11,2,3,3,-1,12,2,1,3,3,0.0016856270376592875,0.0665743574500084,-0.3083502054214478,0,3,6,18,14,2,-1,6,18,7,1,2,13,19,7,1,2,0.002652469091117382,0.0663184821605682,-0.2786133885383606,0,2,17,7,1,12,-1,17,11,1,4,3,-0.007734172977507114,0.1971835941076279,-0.1078291982412338,0,2,10,5,10,3,-1,10,6,10,1,3,0.005094427149742842,0.0853374898433685,-0.2484700977802277,0,2,6,1,3,3,-1,7,1,1,3,3,-0.0029162371065467596,-0.4747635126113892,0.033566489815712,0,2,13,8,3,1,-1,14,8,1,1,3,0.0030121419113129377,-0.0475753806531429,0.4258680045604706,0,2,10,14,2,6,-1,10,16,2,2,3,0.0031694869976490736,-0.1051945015788078,0.1716345995664597,0,2,4,1,12,14,-1,8,1,4,14,3,0.2232756018638611,-0.0143702095374465,0.9248365163803101,0,2,14,1,6,14,-1,16,1,2,14,3,-0.0955850481987,-0.7420663833618164,0.0278189703822136,0,3,3,16,2,2,-1,3,16,1,1,2,4,17,1,1,2,0.00003477372956695035,-0.1276578009128571,0.129266694188118,0,2,0,16,2,2,-1,0,17,2,1,2,0.00007245977030834183,-0.1651857942342758,0.1003680974245071,-1.0566600561141968,59,0,3,15,6,4,6,-1,15,6,2,3,2,17,9,2,3,2,-0.006577827036380768,0.3381525874137878,-0.1528190970420837,0,2,12,5,2,2,-1,12,6,2,1,2,-0.0010922809597104788,0.2228236943483353,-0.1930849999189377,0,2,7,6,6,13,-1,9,6,2,13,3,-0.0297595895826817,0.2595987021923065,-0.1540940999984741,0,2,1,9,6,5,-1,3,9,2,5,3,-0.0131475403904915,0.1903381049633026,-0.1654399931430817,0,2,0,5,3,4,-1,0,7,3,2,2,-0.0014396329643204808,0.200717106461525,-0.1233894005417824,0,3,4,1,16,2,-1,4,1,8,1,2,12,2,8,1,2,-0.0035928250290453434,0.2398552000522614,-0.129221498966217,0,3,1,18,4,2,-1,1,18,2,1,2,3,19,2,1,2,-0.0015314699849113822,-0.4901489913463593,0.102750301361084,0,2,7,7,3,4,-1,8,7,1,4,3,-0.0062372139655053616,0.31214639544487,-0.114056296646595,0,2,3,4,9,3,-1,6,4,3,3,3,-0.033364649862051,-0.4952087998390198,0.0513284504413605,0,2,4,6,6,10,-1,6,6,2,10,3,-0.0228276997804642,0.3255882859230042,-0.0650893077254295,0,2,9,0,8,10,-1,13,0,4,10,2,-0.0861990973353386,-0.6764633059501648,0.0269856993108988,0,2,8,0,8,1,-1,12,0,4,1,2,-0.002106598112732172,0.2245243042707443,-0.1261022984981537,0,3,6,2,8,16,-1,6,2,4,8,2,10,10,4,8,2,0.0391201488673687,0.1132939979434013,-0.2686063051223755,0,3,14,10,2,10,-1,14,10,1,5,2,15,15,1,5,2,0.0035082739777863026,-0.1135995984077454,0.2564977109432221,0,2,12,11,1,2,-1,12,12,1,1,2,0.0005928989849053323,-0.1494296938180924,0.164098396897316,0,2,16,0,3,8,-1,17,0,1,8,3,0.0007176685030572116,0.0999056920409203,-0.2196796983480454,0,2,14,0,6,10,-1,17,0,3,10,2,-0.0218036007136106,-0.3171172142028809,0.082889586687088,0,2,16,0,3,5,-1,17,0,1,5,3,-0.003296277951449156,-0.3804872930049896,0.0608193799853325,0,2,4,5,11,2,-1,4,6,11,1,2,0.0024196270387619734,-0.0960130169987679,0.2854058146476746,0,2,1,0,2,1,-1,2,0,1,1,2,-0.00044187481398694217,0.2212793976068497,-0.0974349081516266,0,2,0,0,2,3,-1,0,1,2,1,3,0.0034523929934948683,0.0375531204044819,-0.5796905159950256,0,2,11,6,6,11,-1,13,6,2,11,3,-0.0218346007168293,0.295621395111084,-0.0800483003258705,0,2,14,0,3,1,-1,15,0,1,1,3,-0.00021309500152710825,0.2281450927257538,-0.1011418998241425,0,2,19,7,1,2,-1,19,8,1,1,2,-0.0016166249988600612,-0.5054119825363159,0.0447645410895348,0,2,17,0,3,9,-1,18,0,1,9,3,0.007595960982143879,0.0459865406155586,-0.4119768142700195,0,2,12,7,3,4,-1,13,7,1,4,3,0.003860180964693427,-0.0865631699562073,0.2480999976396561,0,3,0,1,14,2,-1,0,1,7,1,2,7,2,7,1,2,0.006062223110347986,-0.0755573734641075,0.2843326032161713,0,2,3,1,3,2,-1,4,1,1,2,3,-0.0017097420059144497,-0.3529582023620606,0.0584104992449284,0,2,4,0,15,2,-1,9,0,5,2,3,0.0165155790746212,-0.0804869532585144,0.2353743016719818,0,2,10,2,6,1,-1,12,2,2,1,3,0.004846510011702776,0.041895218193531,-0.4844304919242859,0,2,9,4,6,11,-1,11,4,2,11,3,-0.0311671700328588,0.1919230967760086,-0.1026815995573998,0,2,2,16,2,4,-1,2,18,2,2,2,0.0006189228151924908,-0.210857704281807,0.0938869267702103,0,2,6,17,6,3,-1,8,17,2,3,3,0.0119463102892041,0.0390961691737175,-0.6224862933158875,0,2,7,9,6,2,-1,9,9,2,2,3,-0.0075677200220525265,0.1593683958053589,-0.1225078031420708,0,2,6,8,9,2,-1,9,8,3,2,3,-0.0537474118173122,-0.5562217831611633,0.0411900095641613,0,3,6,6,2,10,-1,6,6,1,5,2,7,11,1,5,2,0.0155135300010443,-0.0398268811404705,0.6240072846412659,0,2,0,11,2,3,-1,0,12,2,1,3,0.0015246650436893106,0.0701386779546738,-0.3078907132148743,0,2,11,15,4,1,-1,13,15,2,1,2,-0.0004831510013900697,0.178876593708992,-0.109586201608181,0,2,6,17,1,2,-1,6,18,1,1,2,0.0027374739293009043,0.0274785906076431,-0.8848956823348999,0,2,0,0,6,20,-1,2,0,2,20,3,-0.0657877177000046,-0.4643214046955109,0.0350371487438679,0,2,3,10,2,2,-1,4,10,1,2,2,0.0012409730115905404,-0.0964792370796204,0.2877922058105469,0,2,4,7,3,5,-1,5,7,1,5,3,0.0008139880956150591,0.1151171997189522,-0.1676616072654724,0,2,3,12,6,2,-1,5,12,2,2,3,0.0239018201828003,-0.0326031893491745,0.6001734733581543,0,2,6,15,7,4,-1,6,17,7,2,2,0.0275566000491381,-0.0661373436450958,0.2999447882175446,0,3,17,16,2,2,-1,17,16,1,1,2,18,17,1,1,2,-0.00038070970913395286,-0.3388118147850037,0.0644507706165314,0,2,15,1,3,16,-1,16,1,1,16,3,-0.0013335429830476642,0.1458866000175476,-0.1321762055158615,0,2,6,16,6,3,-1,8,16,2,3,3,-0.009350799024105072,-0.5117782950401306,0.0349694713950157,0,2,15,14,3,2,-1,15,15,3,1,2,0.00762152299284935,0.0232495293021202,-0.6961941123008728,0,2,12,16,1,2,-1,12,17,1,1,2,-0.00005340786083252169,0.2372737973928452,-0.0869107097387314,0,3,0,2,4,4,-1,0,2,2,2,2,2,4,2,2,2,-0.0015332329785451293,0.192284107208252,-0.1042239964008331,0,3,1,1,6,4,-1,1,1,3,2,2,4,3,3,2,2,0.004313589073717594,-0.0962195470929146,0.2560121119022369,0,2,1,18,1,2,-1,1,19,1,1,2,-0.000230428806389682,-0.3156475126743317,0.0588385984301567,0,2,4,7,2,3,-1,4,8,2,1,3,-0.007841182872653008,-0.6634092926979065,0.0245009995996952,0,2,1,0,9,14,-1,1,7,9,7,2,0.1710374057292938,0.033831499516964,-0.4561594128608704,0,3,4,9,2,6,-1,4,9,1,3,2,5,12,1,3,2,-0.001601114054210484,0.2157489061355591,-0.0836225301027298,0,2,3,9,4,3,-1,5,9,2,3,2,-0.0105357803404331,0.2455231994390488,-0.0823844894766808,0,2,0,9,2,4,-1,0,11,2,2,2,-0.005835163872689009,-0.4780732989311218,0.0440862216055393,0,2,16,6,3,10,-1,17,6,1,10,3,-0.0187061093747616,-0.6002402901649475,0.0214100405573845,0,2,16,11,2,1,-1,17,11,1,1,2,-0.0009330743923783302,0.2432359009981155,-0.0741657167673111,-0.9769343137741089,88,0,2,5,7,4,4,-1,5,9,4,2,2,0.0106462296098471,-0.1386138945817947,0.2649407088756561,0,2,10,11,9,2,-1,13,11,3,2,3,0.0352982692420483,-0.075821727514267,0.3902106881141663,0,3,15,10,2,2,-1,15,10,1,1,2,16,11,1,1,2,0.0007563838735222816,-0.095521442592144,0.2906199991703033,0,2,10,6,6,14,-1,10,13,6,7,2,0.092497706413269,-0.2770423889160156,0.0794747024774551,0,2,14,7,3,5,-1,15,7,1,5,3,-0.002934087999165058,0.2298953980207443,-0.0785500109195709,0,2,6,11,12,3,-1,10,11,4,3,3,-0.0865358486771584,0.4774481058120728,-0.006823122035712004,0,2,17,16,1,2,-1,17,17,1,1,2,0.000054699288739357144,-0.2264260947704315,0.0881921127438545,0,2,8,5,5,4,-1,8,7,5,2,2,-0.0365925207734108,0.2735387086868286,-0.0986067429184914,0,2,11,6,4,2,-1,11,7,4,1,2,0.0026469118893146515,-0.0440839789807796,0.3144528865814209,0,3,3,4,8,2,-1,3,4,4,1,2,7,5,4,1,2,-0.004427181091159582,0.2382272928953171,-0.0867842733860016,0,2,0,8,6,6,-1,2,8,2,6,3,-0.005188248120248318,0.1504276990890503,-0.1267210990190506,0,2,7,4,6,2,-1,7,5,6,1,2,0.004553040023893118,-0.0559450201690197,0.3650163114070892,0,2,7,3,6,3,-1,9,3,2,3,3,0.0145624103024602,0.0363977700471878,-0.5355919003486633,0,2,2,17,3,3,-1,2,18,3,1,3,0.00006867756746942177,-0.1747962981462479,0.1106870993971825,0,2,3,10,6,1,-1,5,10,2,1,3,-0.005974490195512772,0.3107787072658539,-0.0665302276611328,0,2,7,2,6,2,-1,9,2,2,2,3,-0.0058691250160336494,-0.3190149068832398,0.063931830227375,0,2,4,11,9,1,-1,7,11,3,1,3,-0.0111403102055192,0.2436479032039642,-0.0809351801872253,0,2,7,7,11,12,-1,7,13,11,6,2,-0.0586435310542583,-0.7608326077461243,0.0308096297085285,0,2,3,2,3,4,-1,4,2,1,4,3,-0.0046097282320261,-0.45315021276474,0.0298790596425533,0,2,9,7,9,3,-1,12,7,3,3,3,-0.00930321030318737,0.1451337933540344,-0.1103316992521286,0,3,15,11,2,6,-1,15,11,1,3,2,16,14,1,3,2,0.0013253629440441728,-0.0976989567279816,0.196464404463768,0,2,0,5,5,3,-1,0,6,5,1,3,0.004980076104402542,0.0336480811238289,-0.3979220986366272,0,2,8,1,6,12,-1,10,1,2,12,3,-0.007654216140508652,0.090841993689537,-0.1596754938364029,0,2,3,7,15,13,-1,8,7,5,13,3,-0.3892059028148651,-0.6657109260559082,0.0190288294106722,0,2,0,9,9,9,-1,0,12,9,3,3,-0.1001966968178749,-0.5755926966667175,0.0242827795445919,0,2,16,0,3,8,-1,17,0,1,8,3,0.0007354121189564466,0.0879198014736176,-0.161953404545784,0,2,16,2,4,2,-1,18,2,2,2,2,-0.0034802639856934547,0.2606449127197266,-0.0602008104324341,0,2,13,0,6,5,-1,16,0,3,5,2,0.008400042541325092,-0.1097972989082336,0.1570730954408646,0,2,15,1,3,2,-1,16,1,1,2,3,0.0023786011151969433,0.0360582396388054,-0.4727719128131867,0,2,11,8,3,2,-1,12,8,1,2,3,0.007383168209344149,-0.0357563607394695,0.4949859082698822,0,3,1,8,2,12,-1,1,8,1,6,2,2,14,1,6,2,0.003211562056094408,-0.1012556031346321,0.1574798971414566,0,2,0,1,6,12,-1,2,1,2,12,3,-0.0782096683979034,-0.7662708163261414,0.0229658298194408,0,2,19,17,1,3,-1,19,18,1,1,3,0.00005330398926162161,-0.1341435015201569,0.1111491993069649,0,2,11,3,3,10,-1,12,3,1,10,3,-0.009641915559768677,0.2506802976131439,-0.0666081383824348,0,2,8,1,9,8,-1,11,1,3,8,3,-0.0710926726460457,-0.4005681872367859,0.0402977913618088,0,3,18,16,2,2,-1,18,16,1,1,2,19,17,1,1,2,0.00035171560011804104,0.041861180216074,-0.3296119868755341,0,3,18,16,2,2,-1,18,16,1,1,2,19,17,1,1,2,-0.0003345815057400614,-0.2602983117103577,0.0678927376866341,0,2,6,13,2,6,-1,6,15,2,2,3,-0.0041451421566307545,0.2396769970655441,-0.0720933377742767,0,2,9,14,2,2,-1,9,15,2,1,2,0.003175450023263693,-0.0712352693080902,0.241284504532814,0,3,14,10,2,4,-1,14,10,1,2,2,15,12,1,2,2,-0.005518449004739523,0.5032023787498474,-0.0296866800636053,0,3,0,15,2,2,-1,0,15,1,1,2,1,16,1,1,2,-0.00030242869979701936,0.2487905025482178,-0.0567585788667202,0,3,6,7,2,2,-1,6,7,1,1,2,7,8,1,1,2,-0.0013125919504091144,0.3174780011177063,-0.0418458618223667,0,3,11,18,2,2,-1,11,18,1,1,2,12,19,1,1,2,-0.00027123570907860994,-0.2704207003116608,0.0568289905786514,0,3,0,0,6,4,-1,0,0,3,2,2,3,2,3,2,2,-0.007324177771806717,0.2755667865276337,-0.0542529709637165,0,2,4,1,6,6,-1,6,1,2,6,3,-0.0168517101556063,-0.3485291004180908,0.0453689992427826,0,2,15,13,5,4,-1,15,15,5,2,2,0.0299021005630493,0.0316210798919201,-0.4311437010765076,0,2,7,17,6,1,-1,9,17,2,1,3,0.0028902660124003887,0.0380299612879753,-0.3702709972858429,0,2,16,19,4,1,-1,18,19,2,1,2,-0.0019242949783802032,0.2480027973651886,-0.059333298355341,0,2,16,16,4,4,-1,18,16,2,4,2,0.004935414995998144,-0.0830684006214142,0.2204380929470062,0,2,7,8,9,4,-1,10,8,3,4,3,0.0820756033062935,-0.0194134395569563,0.6908928751945496,0,3,16,18,2,2,-1,16,18,1,1,2,17,19,1,1,2,-0.0002469948958605528,-0.2466056942939758,0.0647764503955841,0,3,2,9,2,4,-1,2,9,1,2,2,3,11,1,2,2,-0.0018365769647061825,0.2883616089820862,-0.0533904582262039,0,3,0,3,8,4,-1,0,3,4,2,2,4,5,4,2,2,-0.004955381155014038,0.1274082958698273,-0.1255941987037659,0,2,0,1,8,1,-1,4,1,4,1,2,-0.008308662101626396,0.2347811013460159,-0.07167649269104,0,2,0,5,8,9,-1,4,5,4,9,2,-0.1087991967797279,-0.2599223852157593,0.0586897395551205,0,2,7,18,6,2,-1,9,18,2,2,3,-0.009678645059466362,-0.707204282283783,0.0187492594122887,0,2,0,4,1,12,-1,0,8,1,4,3,-0.0271368306130171,-0.5838422775268555,0.021684130653739,0,2,19,13,1,6,-1,19,15,1,2,3,-0.006538977846503258,-0.5974891185760498,0.0214803107082844,0,2,2,8,6,8,-1,4,8,2,8,3,-0.0120956301689148,0.1326903998851776,-0.099722720682621,0,2,0,0,9,17,-1,3,0,3,17,3,-0.1677609980106354,-0.5665506720542908,0.0321230888366699,0,2,7,9,6,8,-1,9,9,2,8,3,-0.0132625503465533,0.1149559020996094,-0.1173838973045349,0,2,5,10,9,4,-1,8,10,3,4,3,0.076744519174099,-0.0314132310450077,0.5993549227714539,0,2,5,0,8,3,-1,5,1,8,1,3,0.005078522954136133,-0.0529119409620762,0.2334239929914475,0,3,16,6,4,4,-1,16,6,2,2,2,18,8,2,2,2,0.0031800279393792152,-0.0777343884110451,0.1765290945768356,0,3,17,4,2,8,-1,17,4,1,4,2,18,8,1,4,2,-0.0017729829996824265,0.1959162950515747,-0.0797521993517876,0,2,2,16,1,3,-1,2,17,1,1,3,-0.00048560940194875,-0.2880037128925324,0.0490471199154854,0,2,2,16,1,3,-1,2,17,1,1,3,0.00036554320831783116,0.0679228976368904,-0.2249943017959595,0,2,11,0,1,3,-1,11,1,1,1,3,-0.0002693867136258632,0.1658217012882233,-0.0897440984845161,0,2,11,2,9,7,-1,14,2,3,7,3,0.0786842331290245,0.0260816793888807,-0.5569373965263367,0,2,10,2,3,6,-1,11,2,1,6,3,-0.0007377481088042259,0.1403687000274658,-0.1180030032992363,0,2,5,9,15,2,-1,5,10,15,1,2,0.0239578299224377,0.0304707400500774,-0.4615997970104218,0,2,8,16,6,2,-1,8,17,6,1,2,-0.001623908057808876,0.2632707953453064,-0.0567653700709343,0,3,9,16,10,2,-1,9,16,5,1,2,14,17,5,1,2,-0.0009081974858418107,0.1546245962381363,-0.1108706966042519,0,3,9,17,2,2,-1,9,17,1,1,2,10,18,1,1,2,0.0003980624896939844,0.0556303709745407,-0.2833195924758911,0,3,10,15,6,4,-1,10,15,3,2,2,13,17,3,2,2,0.002050644950941205,-0.0916048362851143,0.1758553981781006,0,2,4,5,15,12,-1,9,5,5,12,3,0.0267425496131182,0.062003031373024,-0.2448700070381165,0,2,11,13,2,3,-1,11,14,2,1,3,-0.0021497008856385946,0.2944929897785187,-0.0532181486487389,0,2,8,13,7,3,-1,8,14,7,1,3,0.005667165853083134,-0.0642982423305511,0.249056801199913,0,2,1,12,1,2,-1,1,13,1,1,2,0.00006831790233263746,-0.1681963056325913,0.0965485796332359,0,3,16,18,2,2,-1,16,18,1,1,2,17,19,1,1,2,0.0001760043960530311,0.0653080120682716,-0.2426788061857224,0,2,1,19,18,1,-1,7,19,6,1,3,0.004186160862445831,-0.0979885831475258,0.1805288940668106,0,2,1,17,6,1,-1,4,17,3,1,2,-0.0021808340679854155,0.192312702536583,-0.0941239297389984,0,2,1,3,1,12,-1,1,9,1,6,2,0.021730400621891,0.0355785116553307,-0.4508853852748871,0,2,0,9,3,6,-1,0,11,3,2,3,-0.0147802699357271,-0.4392701089382172,0.0317355915904045,0,2,5,4,3,10,-1,6,4,1,10,3,-0.0036145891062915325,0.1981147974729538,-0.0777014195919037,0,2,6,17,2,1,-1,7,17,1,1,2,0.0018892709631472826,0.0199624393135309,-0.7204172015190125,0,2,1,0,6,12,-1,3,0,2,12,3,-0.0013822480104863644,0.0984669476747513,-0.1488108038902283,0,2,4,7,9,2,-1,7,7,3,2,3,-0.0039505911991000175,0.1159323006868362,-0.1279197037220001,-1.012935996055603,58,0,2,6,11,9,1,-1,9,11,3,1,3,-0.0193955395370722,0.474747508764267,-0.1172109022736549,0,2,17,10,2,10,-1,17,15,2,5,2,0.013118919916451,-0.255521297454834,0.1637880057096481,0,3,4,10,2,10,-1,4,10,1,5,2,5,15,1,5,2,-0.0005160680157132447,0.1945261955261231,-0.17448890209198,0,2,12,3,3,12,-1,13,3,1,12,3,-0.0131841599941254,0.441814512014389,-0.0900487527251244,0,3,15,3,4,6,-1,15,3,2,3,2,17,6,2,3,2,0.0034657081123441458,-0.1347709000110626,0.1805634051561356,0,2,12,8,3,3,-1,13,8,1,3,3,0.006298020016402006,-0.0541649796068668,0.3603338003158569,0,2,4,14,2,4,-1,4,16,2,2,2,0.0016879989998415112,-0.1999794989824295,0.1202159970998764,0,2,6,16,1,3,-1,6,17,1,1,3,0.00036039709812030196,0.1052414029836655,-0.2411606013774872,0,2,1,1,2,3,-1,2,1,1,3,2,-0.001527684973552823,0.2813552916049957,-0.0689648166298866,0,2,0,2,4,1,-1,2,2,2,1,2,0.00350335706025362,-0.0825195834040642,0.4071359038352966,0,2,8,17,12,3,-1,12,17,4,3,3,-0.004733716137707233,0.1972700953483582,-0.117101401090622,0,2,9,16,6,4,-1,11,16,2,4,3,-0.0115571497008204,-0.5606111288070679,0.0681709572672844,0,2,4,6,3,6,-1,4,9,3,3,2,-0.0274457205086946,0.4971862137317658,-0.0623801499605179,0,2,6,2,12,9,-1,6,5,12,3,3,-0.0528257787227631,0.169212207198143,-0.1309355050325394,0,3,6,0,14,20,-1,6,0,7,10,2,13,10,7,10,2,-0.2984969913959503,-0.6464967131614685,0.0400768183171749,0,3,15,16,2,2,-1,15,16,1,1,2,16,17,1,1,2,-0.00026307269581593573,0.2512794137001038,-0.0894948393106461,0,3,15,16,2,2,-1,15,16,1,1,2,16,17,1,1,2,0.00023261709429789335,-0.0868439897894859,0.2383197993040085,0,2,19,8,1,3,-1,19,9,1,1,3,0.00023631360090803355,0.1155446022748947,-0.189363494515419,0,2,13,4,1,2,-1,13,5,1,1,2,0.0020742209162563086,-0.0485948510468006,0.5748599171638489,0,2,0,4,4,2,-1,0,5,4,1,2,-0.007030888926237822,-0.5412080883979797,0.0487437509000301,0,2,19,5,1,6,-1,19,7,1,2,3,0.00826522707939148,0.0264945197850466,-0.6172845959663391,0,2,16,0,2,1,-1,17,0,1,1,2,0.0002004276029765606,-0.1176863014698029,0.1633386015892029,0,2,13,1,1,3,-1,13,2,1,1,3,0.0016470040427520871,-0.0599549189209938,0.3517970144748688,0,2,17,17,1,3,-1,17,18,1,1,3,-0.0003564253856893629,-0.344202995300293,0.0649482533335686,0,3,5,4,8,8,-1,5,4,4,4,2,9,8,4,4,2,-0.0309358704835176,0.1997970044612885,-0.0976936966180801,0,3,1,2,2,2,-1,1,2,1,1,2,2,3,1,1,2,-0.0006357877282425761,-0.3148139119148254,0.0594250410795212,0,3,0,0,8,6,-1,0,0,4,3,2,4,3,4,3,2,-0.0118621801957488,0.2004369050264359,-0.0894475430250168,0,2,6,3,4,2,-1,6,4,4,1,2,0.007150893099606037,-0.0390060618519783,0.5332716107368469,0,2,1,0,3,3,-1,1,1,3,1,3,-0.0020059191156178713,-0.2846972048282623,0.0707236081361771,0,2,6,1,7,2,-1,6,2,7,1,2,0.0036412389017641544,-0.1066031977534294,0.2494480013847351,0,2,2,6,12,6,-1,6,6,4,6,3,-0.1346742957830429,0.4991008043289185,-0.0403322204947472,0,2,1,16,9,2,-1,4,16,3,2,3,-0.002254765946418047,0.1685169041156769,-0.1111928001046181,0,2,7,15,6,4,-1,9,15,2,4,3,0.004384228959679604,0.0861394926905632,-0.2743177115917206,0,2,6,15,12,1,-1,12,15,6,1,2,-0.007336116861552,0.2487521022558212,-0.0959191620349884,0,2,17,17,1,3,-1,17,18,1,1,3,0.0006466691265814006,0.0674315765500069,-0.3375408053398132,0,3,17,15,2,2,-1,17,15,1,1,2,18,16,1,1,2,0.0002298376930411905,-0.0839030519127846,0.24584099650383,0,2,3,13,3,3,-1,3,14,3,1,3,0.006703907158225775,0.0290793292224407,-0.6905593872070312,0,2,10,17,1,3,-1,10,18,1,1,3,0.00005073488864582032,-0.1569671928882599,0.1196542978286743,0,2,4,0,14,8,-1,11,0,7,8,2,-0.2033555954694748,-0.6950634717941284,0.0275075193494558,0,2,2,0,12,2,-1,6,0,4,2,3,0.009493941441178322,-0.0874493718147278,0.2396833002567291,0,2,2,0,4,3,-1,4,0,2,3,2,-0.002405524021014571,0.2115096002817154,-0.1314893066883087,0,2,13,1,1,2,-1,13,2,1,1,2,-0.00011342419747961685,0.1523378938436508,-0.1272590011358261,0,2,7,5,3,6,-1,8,5,1,6,3,0.0149922100827098,-0.0341279692947865,0.506240725517273,0,3,18,2,2,2,-1,18,2,1,1,2,19,3,1,1,2,0.0007406820077449083,0.0487647503614426,-0.4022532105445862,0,2,15,1,2,14,-1,16,1,1,14,2,-0.004245944786816835,0.2155476063489914,-0.0871269926428795,0,3,15,6,2,2,-1,15,6,1,1,2,16,7,1,1,2,0.0006865510949864984,-0.0754187181591988,0.2640590965747833,0,2,3,1,6,3,-1,5,1,2,3,3,-0.0167514607310295,-0.6772903203964233,0.0329187288880348,0,3,7,16,2,2,-1,7,16,1,1,2,8,17,1,1,2,-0.00026301678735762835,0.2272586971521378,-0.0905348733067513,0,3,5,17,2,2,-1,5,17,1,1,2,6,18,1,1,2,0.0004339861043263227,0.0558943785727024,-0.3559266924858093,0,2,9,10,6,10,-1,11,10,2,10,3,-0.0201501492410898,0.1916276067495346,-0.0949299708008766,0,2,10,17,6,3,-1,12,17,2,3,3,-0.0144521296024323,-0.6851034164428711,0.0254221707582474,0,2,14,5,2,10,-1,14,10,2,5,2,-0.0211497396230698,0.3753319084644318,-0.0514965802431107,0,2,11,12,6,2,-1,11,13,6,1,2,0.0211377702653408,0.0290830805897713,-0.8943036794662476,0,2,8,1,1,3,-1,8,2,1,1,3,0.0011524349683895707,-0.0696949362754822,0.2729980051517487,0,3,12,15,2,2,-1,12,15,1,1,2,13,16,1,1,2,-0.00019070580310653895,0.1822811961174011,-0.0983670726418495,0,3,6,8,6,4,-1,6,8,3,2,2,9,10,3,2,2,-0.0363496318459511,-0.8369309902191162,0.0250557605177164,0,2,7,5,3,5,-1,8,5,1,5,3,-0.009063207544386387,0.4146350026130676,-0.0544134490191936,0,2,0,5,7,3,-1,0,6,7,1,3,-0.0020535490475594997,-0.1975031048059464,0.1050689965486527,-0.9774749279022217,93,0,2,7,9,6,6,-1,9,9,2,6,3,-0.0227170195430517,0.2428855001926422,-0.1474552005529404,0,2,5,7,8,8,-1,5,11,8,4,2,0.0255059506744146,-0.2855173945426941,0.1083720996975899,0,3,4,9,2,6,-1,4,9,1,3,2,5,12,1,3,2,-0.0026640091091394424,0.2927573025226593,-0.1037271022796631,0,2,10,11,6,1,-1,12,11,2,1,3,-0.003811528906226158,0.2142689973115921,-0.1381113976240158,0,2,13,6,6,11,-1,15,6,2,11,3,-0.0167326908558607,0.2655026018619537,-0.0439113304018974,0,3,8,17,2,2,-1,8,17,1,1,2,9,18,1,1,2,0.0004927701083943248,0.02110455930233,-0.4297136068344116,0,2,4,12,12,1,-1,8,12,4,1,3,-0.0366911105811596,0.5399242043495178,-0.0436488017439842,0,2,11,17,3,2,-1,11,18,3,1,2,0.0012615970335900784,-0.1293386965990067,0.1663877069950104,0,2,8,17,6,1,-1,10,17,2,1,3,-0.008410685695707798,-0.9469841122627258,0.0214658491313457,0,2,4,1,14,6,-1,4,3,14,2,3,0.0649027228355408,-0.0717277601361275,0.2661347985267639,0,2,14,2,2,12,-1,14,8,2,6,2,0.0303050000220537,-0.0827824920415878,0.2769432067871094,0,2,12,13,3,2,-1,12,14,3,1,2,0.0025875340215861797,-0.1296616941690445,0.1775663048028946,0,2,6,1,6,1,-1,8,1,2,1,3,-0.00702404510229826,-0.6424317955970764,0.0399432107806206,0,2,10,6,6,1,-1,12,6,2,1,3,-0.0010099769569933414,0.1417661011219025,-0.1165997013449669,0,2,3,19,2,1,-1,4,19,1,1,2,-0.00004117907155887224,0.1568766981363297,-0.1112734004855156,0,3,18,16,2,2,-1,18,16,1,1,2,19,17,1,1,2,-0.0004729315114673227,-0.3355455994606018,0.0459777303040028,0,2,16,11,3,7,-1,17,11,1,7,3,-0.0017178079579025507,0.1695290952920914,-0.1057806983590126,0,2,19,5,1,6,-1,19,8,1,3,2,-0.0133331697434187,-0.5825781226158142,0.0309784300625324,0,2,9,8,4,3,-1,9,9,4,1,3,-0.0018783430568873882,0.1426687985658646,-0.111312597990036,0,3,16,8,4,4,-1,16,8,2,2,2,18,10,2,2,2,-0.006576598156243563,0.2756136059761047,-0.0531003288924694,0,3,2,8,2,2,-1,2,8,1,1,2,3,9,1,1,2,-0.00007721038127783686,0.1324024051427841,-0.111677996814251,0,3,3,5,6,4,-1,3,5,3,2,2,6,7,3,2,2,0.0219685398042202,-0.0269681606441736,0.5006716847419739,0,3,2,3,8,16,-1,2,3,4,8,2,6,11,4,8,2,-0.027445750311017,-0.240867406129837,0.0604782700538635,0,2,17,17,1,3,-1,17,18,1,1,3,0.00007830584945622832,-0.1333488970994949,0.1012346968054771,0,2,7,2,8,11,-1,11,2,4,11,2,0.0701906830072403,-0.0548637807369232,0.2480994015932083,0,2,13,3,6,14,-1,16,3,3,14,2,-0.0719021335244179,-0.3784669041633606,0.0422109998762608,0,2,0,9,18,2,-1,6,9,6,2,3,-0.1078097969293594,-0.3748658895492554,0.0428334400057793,0,2,6,10,14,3,-1,6,11,14,1,3,0.0014364200178533792,0.0804763585329056,-0.1726378947496414,0,2,10,9,9,3,-1,13,9,3,3,3,0.068289190530777,-0.0355957895517349,0.4076131880283356,0,3,3,5,4,6,-1,3,5,2,3,2,5,8,2,3,2,-0.00680371792986989,0.1923379004001617,-0.0823680236935616,0,2,3,7,3,7,-1,4,7,1,7,3,-0.0005619348958134651,0.1305712014436722,-0.1435514986515045,0,2,2,8,11,6,-1,2,10,11,2,3,-0.0582766495645046,-0.3012543916702271,0.0528196506202221,0,2,8,9,6,3,-1,8,10,6,1,3,-0.006120571866631508,0.2204390019178391,-0.0756917521357536,0,2,3,3,3,11,-1,4,3,1,11,3,-0.0135943097993732,-0.3904936015605927,0.0418571084737778,0,2,0,19,6,1,-1,3,19,3,1,2,0.0013626200379803777,-0.0953634232282639,0.1497032046318054,0,2,18,18,1,2,-1,18,19,1,1,2,-0.0001507421984570101,-0.2394558042287827,0.0647983327507973,0,3,8,0,12,6,-1,8,0,6,3,2,14,3,6,3,2,-0.077414259314537,0.5594198107719421,-0.0245168805122375,0,2,19,5,1,3,-1,19,6,1,1,3,0.0009211787255480886,0.0549288615584373,-0.2793481051921845,0,2,5,8,2,1,-1,6,8,1,1,2,0.001025078003294766,-0.0621673092246056,0.249763697385788,0,2,13,11,2,1,-1,14,11,1,1,2,-0.000811747508123517,0.2343793958425522,-0.0657258108258247,0,2,3,6,15,13,-1,8,6,5,13,3,0.0834310203790665,0.0509548000991344,-0.3102098107337952,0,2,4,3,6,2,-1,6,3,2,2,3,-0.009201445616781712,-0.3924253880977631,0.0329269506037235,0,2,0,18,1,2,-1,0,19,1,1,2,-0.00029086650465615094,-0.3103975057601929,0.0497118197381496,0,2,7,8,2,6,-1,8,8,1,6,2,0.00775768980383873,-0.0440407507121563,0.3643135130405426,0,2,3,0,6,19,-1,5,0,2,19,3,-0.1246609017252922,-0.819570779800415,0.0191506408154964,0,2,3,1,6,5,-1,5,1,2,5,3,0.0132425501942635,0.0389888398349285,-0.3323068022727966,0,2,17,14,3,6,-1,17,16,3,2,3,-0.006677012890577316,-0.357901394367218,0.0404602102935314,0,2,17,13,2,6,-1,18,13,1,6,2,-0.0027479929849505424,0.2525390088558197,-0.0564278215169907,0,2,17,18,2,2,-1,18,18,1,2,2,0.0008265965152531862,-0.07198865711689,0.2278047949075699,0,2,11,14,9,4,-1,14,14,3,4,3,-0.0501534007489681,-0.630364716053009,0.027462050318718,0,3,15,8,4,6,-1,15,8,2,3,2,17,11,2,3,2,0.007420314941555262,-0.0666107162833214,0.2778733968734741,0,2,1,16,1,3,-1,1,17,1,1,3,-0.0006795178051106632,-0.3632706105709076,0.0427954308688641,0,2,7,0,3,14,-1,8,0,1,14,3,-0.0019305750029161572,0.1419623047113419,-0.1075998023152351,0,2,12,0,2,1,-1,13,0,1,1,2,-0.0003813267103396356,0.2159176021814346,-0.0702026635408401,0,2,7,9,6,5,-1,10,9,3,5,2,-0.0709903463721275,0.4526660144329071,-0.0407504811882973,0,2,15,5,4,9,-1,17,5,2,9,2,-0.0533680804073811,-0.6767405867576599,0.0192883405834436,0,2,11,0,6,6,-1,13,0,2,6,3,-0.0200648494064808,-0.4336543083190918,0.0318532884120941,0,3,16,15,2,2,-1,16,15,1,1,2,17,16,1,1,2,0.001197636011056602,-0.0265598706901073,0.5079718232154846,0,3,16,15,2,2,-1,16,15,1,1,2,17,16,1,1,2,-0.0002269730030093342,0.1801259964704514,-0.0836065486073494,0,2,13,2,2,18,-1,13,11,2,9,2,0.0152626996859908,-0.2023892998695374,0.067422017455101,0,2,8,4,8,10,-1,8,9,8,5,2,-0.2081176936626434,0.6694386005401611,-0.0224521104246378,0,2,8,3,2,3,-1,8,4,2,1,3,0.001551436958834529,-0.0751218423247337,0.17326919734478,0,2,11,1,6,9,-1,11,4,6,3,3,-0.0529240109026432,0.2499251961708069,-0.0628791674971581,0,2,15,4,5,6,-1,15,6,5,2,3,-0.0216488502919674,-0.2919428050518036,0.0526144914329052,0,3,12,18,2,2,-1,12,18,1,1,2,13,19,1,1,2,-0.00022905069636180997,-0.2211730033159256,0.0631683394312859,0,2,1,17,1,3,-1,1,18,1,1,3,0.00005017007060814649,-0.1151070967316628,0.1161144003272057,0,2,12,19,2,1,-1,13,19,1,1,2,-0.0001641606941120699,0.1587152034044266,-0.0826006010174751,0,2,8,10,6,6,-1,10,10,2,6,3,-0.0120032895356417,0.1221809014678001,-0.112296998500824,0,2,14,2,6,5,-1,16,2,2,5,3,-0.0177841000258923,-0.3507278859615326,0.0313419215381145,0,2,9,5,2,6,-1,9,7,2,2,3,-0.006345758214592934,0.1307806968688965,-0.1057441011071205,0,2,1,15,2,2,-1,2,15,1,2,2,-0.0007952324231155217,0.1720467060804367,-0.086001992225647,0,2,18,17,1,3,-1,18,18,1,1,3,-0.00031029590172693133,-0.2843317091464996,0.0518171191215515,0,2,10,14,4,6,-1,10,16,4,2,3,-0.0170537102967501,0.3924242854118347,-0.0401432700455189,0,2,9,7,3,2,-1,10,7,1,2,3,0.004650495946407318,-0.031837560236454,0.4123769998550415,0,3,6,9,6,2,-1,6,9,3,1,2,9,10,3,1,2,-0.0103587601333857,-0.5699319839477539,0.0292483791708946,0,2,0,2,1,12,-1,0,6,1,4,3,-0.0221962407231331,-0.4560528993606567,0.0262859892100096,0,2,4,0,15,1,-1,9,0,5,1,3,-0.0070536029525101185,0.1599832028150559,-0.091594859957695,0,3,9,0,8,2,-1,9,0,4,1,2,13,1,4,1,2,-0.0005709429970011115,-0.1407632976770401,0.1028741970658302,0,2,12,2,8,1,-1,16,2,4,1,2,-0.0022152599412947893,0.1659359931945801,-0.0852739885449409,0,2,7,1,10,6,-1,7,3,10,2,3,-0.0280848909169436,0.2702234089374542,-0.0558738112449646,0,2,18,6,2,3,-1,18,7,2,1,3,0.0021515151020139456,0.0424728915095329,-0.3200584948062897,0,3,4,12,2,2,-1,4,12,1,1,2,5,13,1,1,2,-0.00029733829433098435,0.1617716997861862,-0.0851155892014503,0,2,6,6,6,2,-1,8,6,2,2,3,-0.0166947804391384,-0.4285877048969269,0.0305416099727154,0,2,0,9,9,6,-1,3,9,3,6,3,0.1198299005627632,-0.0162772908806801,0.7984678149223328,0,2,17,18,2,2,-1,18,18,1,2,2,-0.000354994204826653,0.1593593955039978,-0.0832728818058968,0,2,11,2,6,16,-1,13,2,2,16,3,-0.0182262696325779,0.1952728033065796,-0.0739398896694183,0,2,2,4,15,13,-1,7,4,5,13,3,-0.00040238600922748446,0.0791018083691597,-0.2080612927675247,0,2,16,2,3,10,-1,17,2,1,10,3,0.0004089206049684435,0.1003663018345833,-0.1512821018695831,0,2,6,10,2,1,-1,7,10,1,1,2,0.0009536811267025769,-0.0730116665363312,0.2175202071666718,0,2,1,1,18,16,-1,10,1,9,16,2,0.4308179914951325,-0.0274506993591785,0.570615828037262,0,2,14,4,3,15,-1,15,4,1,15,3,0.0005356483161449432,0.1158754006028175,-0.1279056072235107,0,2,19,13,1,2,-1,19,14,1,1,2,0.00002443073026370257,-0.1681662946939468,0.0804499834775925,0,2,2,6,5,8,-1,2,10,5,4,2,-0.0553456507623196,0.4533894956111908,-0.0312227793037891]);
    tracking.ViolaJones.classifiers.mouth = new Float64Array([25,15,-1.4372119903564453,13,0,2,0,0,14,9,-1,0,3,14,3,3,-0.1192855015397072,0.7854182124137878,-0.4541360139846802,0,2,17,1,8,14,-1,17,8,8,7,2,-0.0641647726297379,-0.7407680749893188,0.265203595161438,0,2,7,3,11,6,-1,7,5,11,2,3,0.0910761803388596,-0.2063370943069458,0.8400946259498596,0,2,5,2,15,6,-1,5,4,15,2,3,-0.1129330024123192,0.8284121751785278,-0.1866362988948822,0,2,6,4,11,6,-1,6,6,11,2,3,-0.0741933435201645,0.8354660272598267,-0.1527701020240784,0,2,17,1,6,3,-1,19,1,2,3,3,0.000021404659491963685,-0.0716945603489876,0.1858334988355637,0,2,5,0,15,6,-1,5,2,15,2,3,-0.0996975302696228,0.6870458126068115,-0.1721730977296829,0,2,7,3,13,6,-1,7,5,13,2,3,-0.0900413617491722,0.7310237884521484,-0.1368771940469742,0,2,5,3,6,5,-1,8,3,3,5,2,0.0002513831132091582,-0.3469826877117157,0.3647777140140533,0,2,21,14,4,1,-1,21,14,2,1,2,0.000016144449546118267,-0.3085466027259827,0.2320024073123932,0,2,0,3,3,12,-1,0,7,3,4,3,0.00001936390981427394,-0.381985604763031,0.2404107004404068,0,2,22,10,3,4,-1,22,11,3,2,2,0.006967364810407162,0.0545878112316132,-0.748706579208374,0,2,0,10,3,4,-1,0,11,3,2,2,-0.004718930926173925,-0.7476686835289001,0.1205869019031525,-1.541659951210022,13,0,2,5,0,15,8,-1,5,2,15,4,2,-0.1006335020065308,0.7848083972930908,-0.3866829872131348,0,2,20,0,5,9,-1,20,3,5,3,3,-0.0366767607629299,0.545323371887207,-0.401267796754837,0,2,6,2,13,4,-1,6,4,13,2,2,0.0815562233328819,-0.1315398067235947,0.808495819568634,0,2,7,2,15,6,-1,7,4,15,2,3,-0.10641860216856,0.6782389879226685,-0.2083356976509094,0,2,2,3,4,12,-1,2,9,4,6,2,0.0156307406723499,-0.3749788105487824,0.3150509893894196,0,2,6,1,14,6,-1,6,3,14,2,3,0.0711290463805199,-0.15573850274086,0.7050542831420898,0,2,8,3,9,6,-1,8,5,9,2,3,0.0736639127135277,-0.1547683030366898,0.6715884804725647,0,2,21,0,4,6,-1,21,3,4,3,2,-0.00010592950275167823,0.1365388035774231,-0.2670182883739471,0,2,1,12,1,3,-1,1,13,1,1,3,-0.001923952018842101,-0.7261438965797424,0.136457696557045,0,2,23,12,1,3,-1,23,13,1,1,3,0.002305730013176799,0.0706136971712112,-0.6423184275627136,0,2,1,12,1,3,-1,1,13,1,1,3,0.0018073299434036016,0.1355642974376679,-0.7050786018371582,0,2,7,7,11,8,-1,7,9,11,4,2,-0.0664333626627922,0.6158788204193115,-0.1400263011455536,0,2,8,4,9,6,-1,8,6,9,2,3,-0.0689277201890945,0.6765924096107483,-0.1224988028407097,-1.532431960105896,29,0,2,1,0,15,9,-1,1,3,15,3,3,-0.182265505194664,0.5961514711380005,-0.3195483088493347,0,2,9,0,11,15,-1,9,5,11,5,3,0.2893281877040863,-0.0240151602774858,0.3762707114219666,0,2,0,8,3,4,-1,0,9,3,2,2,-0.00424566213041544,-0.7117397785186768,0.1214720010757446,0,2,7,9,12,6,-1,7,12,12,3,2,0.0545681491494179,-0.1822118014097214,0.4597271978855133,0,2,0,5,2,6,-1,0,7,2,2,3,-0.0044434829615056515,-0.5354676842689514,0.1655835956335068,0,2,14,0,2,11,-1,14,0,1,11,2,-0.0204923897981644,-0.8770608901977539,-0.0151639897376299,0,2,0,9,2,6,-1,0,11,2,2,3,-0.004800747148692608,-0.5431423187255859,0.1356130987405777,0,3,1,0,24,12,-1,13,0,12,6,2,1,6,12,6,2,0.1226660013198853,0.112447202205658,-0.657440185546875,0,2,0,0,3,4,-1,0,2,3,2,2,-0.00005525497908820398,0.1536739021539688,-0.3841981887817383,0,2,7,3,14,6,-1,7,5,14,2,3,-0.1131860986351967,0.4927195906639099,-0.1094276010990143,0,2,5,3,15,4,-1,5,5,15,2,2,0.0792956873774529,-0.164746105670929,0.4720517992973328,0,2,8,13,12,1,-1,12,13,4,1,3,0.0148729300126433,0.0740143731236458,-0.5926275849342346,0,2,2,3,12,6,-1,8,3,6,6,2,0.0538397915661335,-0.2111544013023377,0.3537890911102295,1,2,21,2,4,9,-1,21,2,2,9,2,-0.0759592726826668,0.5931801795959473,-0.1090068966150284,0,2,6,2,13,6,-1,6,4,13,2,3,0.1158166006207466,-0.0984905213117599,0.5940334796905518,0,2,5,3,15,2,-1,5,4,15,1,2,-0.0160826407372952,0.3794195055961609,-0.165405198931694,0,2,0,11,5,3,-1,0,12,5,1,3,0.0067254770547151566,0.0937571078538895,-0.7060937881469727,0,2,14,0,11,14,-1,14,7,11,7,2,-0.0611884109675884,-0.4381029903888702,0.0796229690313339,1,2,2,10,4,1,-1,3,11,2,1,2,-0.005515203811228275,-0.7019357085227966,0.0781789273023605,0,3,1,0,24,12,-1,13,0,12,6,2,1,6,12,6,2,-0.1988534033298492,-0.6726130843162537,0.0560497716069222,0,3,0,4,6,6,-1,0,4,3,3,2,3,7,3,3,2,0.0194473192095757,-0.1165110021829605,0.4151527881622315,1,2,23,9,1,4,-1,22,10,1,2,2,-0.004670621827244759,-0.6090158820152283,0.1049979999661446,1,2,2,9,4,1,-1,3,10,2,1,2,0.0040827528573572636,0.0689968466758728,-0.5490871071815491,0,3,16,4,8,10,-1,20,4,4,5,2,16,9,4,5,2,-0.0201979596167803,0.2884930074214935,-0.1804888993501663,0,2,8,7,9,6,-1,8,9,9,2,3,0.0504430681467056,-0.0897706300020218,0.4609920978546143,0,2,11,12,4,3,-1,12,12,2,3,2,-0.005013956222683191,-0.4820869863033295,0.0588099807500839,0,2,0,0,3,3,-1,0,1,3,1,3,0.008574193343520164,0.0568646714091301,-0.5979083180427551,0,2,11,9,14,2,-1,11,9,7,2,2,-0.0121624497696757,0.1446305960416794,-0.1168325990438461,0,2,9,13,4,1,-1,10,13,2,1,2,-0.0019329390488564968,-0.5450860857963562,0.060978390276432,-1.4849940538406372,34,0,2,0,0,8,6,-1,0,3,8,3,2,-0.0320550985634327,0.4280030131340027,-0.4258942902088165,0,2,5,1,15,6,-1,5,3,15,2,3,-0.1231034025549889,0.5121241807937622,-0.2055584937334061,0,2,0,7,4,3,-1,0,8,4,1,3,-0.005858825985342264,-0.7101820707321167,0.1075906008481979,0,2,3,3,20,6,-1,8,3,10,6,2,0.0977141335606575,-0.1477957963943481,0.45711749792099,0,2,0,6,24,5,-1,6,6,12,5,2,-0.0527394600212574,0.3743767142295837,-0.2183827012777329,0,2,8,5,9,6,-1,8,7,9,2,3,0.0584189109504223,-0.1386294066905975,0.4993282854557037,0,2,5,2,14,4,-1,5,4,14,2,2,0.0887569189071655,-0.1315895020961762,0.6216561794281006,0,2,22,8,3,6,-1,22,10,3,2,3,0.0145876696333289,0.0915696695446968,-0.5815675258636475,0,3,3,9,18,2,-1,3,9,9,1,2,12,10,9,1,2,0.1044600009918213,0.005274035967886448,-56644.51953125,0,2,22,8,3,6,-1,22,10,3,2,3,-0.008432278409600258,-0.4866046011447907,0.0979617610573769,0,3,0,0,24,6,-1,0,0,12,3,2,12,3,12,3,2,0.040655929595232,0.1391579061746597,-0.3656015992164612,0,2,14,11,4,4,-1,15,11,2,4,2,0.006336689926683903,0.064174547791481,-0.6245471239089966,0,2,5,5,15,2,-1,5,6,15,1,2,0.0158455893397331,-0.1791914999485016,0.2889905869960785,0,2,5,4,15,6,-1,5,6,15,2,3,-0.0746863335371017,0.5424023270606995,-0.1314727962017059,0,2,0,7,2,3,-1,0,8,2,1,3,0.004769525025039911,0.0965340435504913,-0.6561154723167419,0,2,6,6,13,6,-1,6,8,13,2,3,-0.0535226687788963,0.4636800885200501,-0.135343000292778,0,2,0,11,6,3,-1,0,12,6,1,3,-0.006364875007420778,-0.6624563932418823,0.0684857368469238,0,2,11,0,14,14,-1,11,7,14,7,2,-0.2447337061166763,-0.8181337118148804,0.0450799688696861,0,2,7,13,4,1,-1,8,13,2,1,2,-0.0024634969886392355,-0.7681804895401001,0.0495845898985863,0,2,6,9,13,6,-1,6,11,13,2,3,-0.0358034893870354,0.3749603927135468,-0.1447928994894028,0,2,0,9,4,4,-1,0,10,4,2,2,-0.005672052968293428,-0.6127536296844482,0.0935847163200378,0,2,21,0,4,6,-1,21,3,4,3,2,-0.0132687101140618,0.286378413438797,-0.255188912153244,0,2,0,12,6,3,-1,0,13,6,1,3,-0.006251893937587738,-0.5896773934364319,0.067711167037487,0,2,16,11,4,3,-1,17,11,2,3,2,0.007309257052838802,0.0272198095917702,-0.5714861154556274,0,3,0,7,10,8,-1,0,7,5,4,2,5,11,5,4,2,0.0258194394409657,-0.132600799202919,0.305025190114975,1,2,22,2,3,8,-1,22,2,3,4,2,-0.0211078803986311,0.1200629025697708,-0.1475265026092529,0,2,1,3,16,4,-1,9,3,8,4,2,0.0408483408391476,-0.1736883074045181,0.253044605255127,0,3,1,13,24,2,-1,13,13,12,1,2,1,14,12,1,2,-0.0179475992918015,-0.7117617130279541,0.0583698004484177,0,2,5,5,4,10,-1,6,5,2,10,2,-0.0138895902782679,-0.6778132915496826,0.04356300085783,1,2,13,7,2,6,-1,11,9,2,2,3,-0.009848898276686668,0.1479212939739227,-0.0897465273737907,0,2,8,9,8,6,-1,8,12,8,3,2,-0.0659847036004066,0.5683801770210266,-0.0681742578744888,0,2,24,7,1,4,-1,24,8,1,2,2,-0.0018370660254731774,-0.4986937940120697,0.0779643580317497,0,2,5,7,15,6,-1,5,9,15,2,3,-0.0277651809155941,0.2679949104785919,-0.1382624953985214,0,2,21,8,4,3,-1,21,9,4,1,3,0.00998893566429615,0.0445619411766529,-0.7317379117012024,-1.5437099933624268,42,0,2,5,2,15,4,-1,5,3,15,2,2,-0.0456383489072323,0.6275423169136047,-0.2494937032461166,0,2,6,4,15,3,-1,6,5,15,1,3,-0.031067680567503,0.6427816152572632,-0.1671900004148483,0,3,0,3,2,12,-1,0,3,1,6,2,1,9,1,6,2,0.00301934196613729,-0.2399346977472305,0.3676818013191223,0,2,7,3,11,4,-1,7,4,11,2,2,0.0315676406025887,-0.1147691980004311,0.5750172734260559,0,2,0,0,6,6,-1,0,3,6,3,2,-0.006414634175598621,0.2154625058174133,-0.3768770098686218,0,2,24,3,1,12,-1,24,7,1,4,3,-0.005701086018234491,-0.4533824026584625,0.0946888476610184,0,3,0,0,24,12,-1,0,0,12,6,2,12,6,12,6,2,0.1890300065279007,0.0801155269145966,-0.7184885144233704,0,3,1,1,24,14,-1,13,1,12,7,2,1,8,12,7,2,0.1293978989124298,0.1093719005584717,-0.5197048783302307,1,2,5,3,8,4,-1,5,3,8,2,2,-0.0657683908939362,0.5003104209899902,-0.1238735020160675,1,2,24,9,1,4,-1,23,10,1,2,2,-0.0040884059853851795,-0.5118011236190796,0.0594223700463772,0,2,7,7,11,8,-1,7,9,11,4,2,-0.0306642707437277,0.2964648902416229,-0.1741248071193695,1,2,24,9,1,4,-1,23,10,1,2,2,0.0027700960636138916,0.0846907272934914,-0.4009515047073364,0,2,0,6,1,9,-1,0,9,1,3,3,-0.0062402039766311646,-0.5560923218727112,0.0800850465893745,0,2,8,2,9,3,-1,8,3,9,1,3,0.010515259578824,-0.1309404969215393,0.3612711131572723,0,2,9,4,7,4,-1,9,5,7,2,2,0.0181792695075274,-0.124518096446991,0.3556562960147858,0,2,22,0,3,2,-1,22,1,3,1,2,0.005303769838064909,0.0638220235705376,-0.6178466081619263,0,2,0,0,13,14,-1,0,7,13,7,2,-0.1947806030511856,-0.7228901982307434,0.0475768186151981,0,2,21,9,4,4,-1,21,10,4,2,2,0.007223042193800211,0.0453382283449173,-0.5460836291313171,0,2,0,9,4,4,-1,0,10,4,2,2,0.005037583876401186,0.080446831882,-0.4817472100257874,1,2,22,9,1,4,-1,21,10,1,2,2,-0.00719348294660449,-0.5018991827964783,0.0128700295463204,1,2,3,9,4,1,-1,4,10,2,1,2,-0.004494159948080778,-0.5862709879875183,0.0634675025939941,0,3,15,3,10,12,-1,20,3,5,6,2,15,9,5,6,2,0.0874131396412849,-0.0676202401518822,0.4797031879425049,0,3,0,8,14,6,-1,0,8,7,3,2,7,11,7,3,2,-0.0377015694975853,0.3913342952728272,-0.0978809297084808,1,2,23,10,1,4,-1,22,11,1,2,2,0.0030070370994508266,0.0484924912452698,-0.2472224980592728,0,3,0,3,10,12,-1,0,3,5,6,2,5,9,5,6,2,0.0974098667502403,-0.0669010728597641,0.5813519954681396,1,2,23,0,2,1,-1,23,0,1,1,2,-0.004016656894236803,-0.5456554293632507,0.0363924615085125,0,2,8,3,9,3,-1,8,4,9,1,3,0.0104924896731973,-0.1087466031312943,0.3253425061702728,0,2,7,5,11,4,-1,7,6,11,2,2,0.024965999647975,-0.1137896031141281,0.3056510984897614,0,2,2,7,20,8,-1,12,7,10,8,2,0.1301030069589615,-0.1220476999878883,0.303536593914032,0,2,12,5,9,8,-1,15,5,3,8,3,-0.0843720883131027,-0.6943122148513794,0.0178856607526541,1,2,2,0,1,2,-1,2,0,1,1,2,-0.002926785033196211,-0.5401834845542908,0.0564073212444782,1,2,21,3,4,4,-1,22,4,2,4,2,-0.0206745099276304,0.4180921018123627,-0.0685340464115143,0,2,4,5,9,8,-1,7,5,3,8,3,-0.05145063996315,-0.6289098262786865,0.0529876984655857,1,2,22,10,3,2,-1,22,10,3,1,2,-0.008926119655370712,-0.4644356071949005,0.023655079305172,0,2,0,5,24,5,-1,6,5,12,5,2,-0.0830484703183174,0.3304196894168854,-0.093869760632515,0,2,9,7,7,3,-1,9,8,7,1,3,0.0113369999453425,-0.0979600325226784,0.3484053015708923,0,2,2,0,20,9,-1,7,0,10,9,2,0.0827779024839401,-0.1159391030669212,0.2680957913398743,0,2,11,2,8,9,-1,13,2,4,9,2,-0.0478848814964294,-0.6079211235046387,0.0222362894564867,1,2,1,8,4,1,-1,2,9,2,1,2,-0.003858269890770316,-0.4688901007175446,0.0554540418088436,0,3,19,5,6,10,-1,22,5,3,5,2,19,10,3,5,2,-0.0334531292319298,0.4192667901515961,-0.0631088465452194,0,3,0,5,6,10,-1,0,5,3,5,2,3,10,3,5,2,0.0126036396250129,-0.1227632984519005,0.2175220996141434,0,2,10,10,9,2,-1,13,10,3,2,3,0.0262600891292095,0.0162896700203419,-0.5688759088516235,-1.5637760162353516,64,0,2,5,2,15,2,-1,5,3,15,1,2,-0.019779309630394,0.447209507226944,-0.2573797106742859,0,2,21,4,4,3,-1,21,4,2,3,2,-0.009199723601341248,0.4397894144058228,-0.1382309943437576,0,2,1,5,15,4,-1,1,6,15,2,2,0.0222425796091557,-0.1761150062084198,0.3406811952590942,0,3,21,5,4,10,-1,23,5,2,5,2,21,10,2,5,2,0.005365055054426193,-0.1087490990757942,0.1631094068288803,0,2,0,0,21,8,-1,7,0,7,8,3,0.7425013780593872,0.00046233131433837116,-1417.2740478515625,0,2,5,0,15,6,-1,5,2,15,2,3,-0.1289999037981033,0.4220936894416809,-0.1264209002256393,0,2,2,2,21,3,-1,9,2,7,3,3,0.4214023947715759,0.003029906889423728,1207.18701171875,0,2,6,3,15,6,-1,6,5,15,2,3,-0.1431712061166763,0.5070012211799622,-0.1091170981526375,0,3,0,5,4,10,-1,0,5,2,5,2,2,10,2,5,2,0.004436612129211426,-0.2218814045190811,0.2446105927228928,1,2,22,10,1,4,-1,21,11,1,2,2,0.003017731010913849,0.1072233989834786,-0.3470205068588257,0,2,0,7,3,4,-1,0,8,3,2,2,-0.004822094924747944,-0.6534119248390198,0.0803434476256371,0,2,1,3,24,3,-1,7,3,12,3,2,0.0362788289785385,-0.220707505941391,0.2242490947246552,0,2,0,0,24,13,-1,6,0,12,13,2,-0.1675994992256165,0.4059072136878967,-0.1054169982671738,0,2,5,3,15,4,-1,5,4,15,2,2,-0.0509919412434101,0.3452283143997192,-0.1206474006175995,0,2,5,4,14,3,-1,5,5,14,1,3,0.0161635298281908,-0.1465175002813339,0.3696750998497009,1,2,23,8,2,4,-1,22,9,2,2,2,0.00832686759531498,0.0642398297786713,-0.5490669012069702,1,2,2,8,4,2,-1,3,9,2,2,2,-0.007261487189680338,-0.6105815768241882,0.0538330897688866,0,2,9,8,9,6,-1,9,10,9,2,3,-0.0427855290472507,0.3435507118701935,-0.1058441996574402,0,2,0,0,11,14,-1,0,7,11,7,2,-0.0558885596692562,-0.4213463068008423,0.0855342373251915,0,3,1,0,24,12,-1,13,0,12,6,2,1,6,12,6,2,0.1077039018273354,0.0796676799654961,-0.5105268955230713,0,2,0,0,3,4,-1,0,2,3,2,2,-0.000048622798203723505,0.1164970993995667,-0.3022361099720001,0,2,7,2,15,4,-1,7,3,15,2,2,0.0272718109190464,-0.0831976532936096,0.3410704135894775,1,2,2,10,4,1,-1,3,11,2,1,2,0.002794212894514203,0.0836139172315598,-0.4521746933460236,0,2,21,11,4,4,-1,21,12,4,2,2,-0.005964955780655146,-0.5814967751502991,0.0588471181690693,0,3,1,7,12,8,-1,1,7,6,4,2,7,11,6,4,2,-0.0364551208913326,0.2987614870071411,-0.116396501660347,0,2,7,8,11,6,-1,7,11,11,3,2,0.0560359284281731,-0.1189749017357826,0.349049985408783,0,2,0,13,2,2,-1,0,14,2,1,2,0.0019068910041823983,0.0623399801552296,-0.5222734212875366,0,2,10,3,8,6,-1,12,3,4,6,2,-0.0314803011715412,-0.5988280177116394,0.0221100505441427,0,2,7,3,8,6,-1,9,3,4,6,2,-0.0291779898107052,-0.7628328204154968,0.037851981818676,0,2,22,6,3,3,-1,22,7,3,1,3,0.009344181977212429,0.0293787997215986,-0.5464184880256653,0,2,0,5,5,6,-1,0,7,5,2,3,0.0012941689928993583,-0.2152619063854218,0.1293071061372757,0,2,8,7,9,6,-1,8,9,9,2,3,0.0399527512490749,-0.0815632417798042,0.3440327942371368,0,2,2,0,20,13,-1,12,0,10,13,2,0.2579689919948578,-0.0829713121056557,0.2971759140491486,0,3,19,3,6,4,-1,22,3,3,2,2,19,5,3,2,2,0.008397597819566727,-0.1235759034752846,0.3130742907524109,0,2,3,8,12,3,-1,9,8,6,3,2,-0.0210481006652117,0.2553890943527222,-0.1077592000365257,1,2,22,3,2,5,-1,22,3,1,5,2,0.0184192396700382,-0.0348858311772347,0.4613004922866821,0,2,6,7,8,8,-1,8,7,4,8,2,-0.0335993207991123,-0.6385626196861267,0.0432357601821423,1,2,20,0,3,1,-1,21,1,1,1,3,-0.005936917848885059,-0.3381235003471375,0.0261388104408979,1,2,5,0,1,3,-1,4,1,1,1,3,0.007424450945109129,0.041649479418993,-0.601313591003418,1,2,22,11,1,3,-1,21,12,1,1,3,-0.003834150033071637,-0.3147934973239899,0.0227260906249285,0,2,1,4,4,3,-1,3,4,2,3,2,0.00592639297246933,-0.0845179632306099,0.2986125946044922,0,3,19,4,6,8,-1,22,4,3,4,2,19,8,3,4,2,-0.0194444190710783,0.2213757932186127,-0.0513583682477474,0,3,0,4,8,8,-1,0,4,4,4,2,4,8,4,4,2,0.0187752693891525,-0.1223364025354385,0.2647691071033478,1,2,22,11,1,3,-1,21,12,1,1,3,0.006485750898718834,0.0205634497106075,-0.5246906280517578,0,3,0,1,24,14,-1,0,1,12,7,2,12,8,12,7,2,-0.2598725855350494,-0.6570193767547607,0.0345496907830238,0,2,23,8,2,4,-1,23,9,2,2,2,-0.005815083160996437,-0.6595460772514343,0.0302442405372858,0,2,5,3,15,4,-1,5,4,15,2,2,-0.0261219404637814,0.187040701508522,-0.1252924054861069,0,2,8,1,9,3,-1,8,2,9,1,3,-0.0057821800000965595,0.2328509986400604,-0.1182496026158333,0,2,0,8,2,4,-1,0,9,2,2,2,-0.002959564095363021,-0.4579938054084778,0.0564655400812626,0,2,18,10,7,2,-1,18,11,7,1,2,-0.0120882000774145,-0.5189349055290222,0.0244996603578329,0,2,6,11,12,4,-1,6,12,12,2,2,-0.008810916915535927,0.2570025026798248,-0.0927671566605568,0,2,14,0,6,15,-1,16,0,2,15,3,-0.0459428504109383,-0.447971910238266,0.0299462303519249,0,2,0,10,7,2,-1,0,11,7,1,2,-0.0100041404366493,-0.6149634122848511,0.0364212691783905,0,3,15,5,6,6,-1,18,5,3,3,2,15,8,3,3,2,-0.0116753997281194,0.117287702858448,-0.0613474808633327,0,2,5,0,6,15,-1,7,0,2,15,3,-0.0524668507277966,-0.7613652944564819,0.0306894704699516,0,2,8,7,9,4,-1,8,8,9,2,2,0.0182263404130936,-0.0854801833629608,0.2695373892784119,0,2,7,6,10,6,-1,7,8,10,2,3,-0.0452684201300144,0.3264470100402832,-0.0773756429553032,1,2,19,11,1,3,-1,18,12,1,1,3,-0.008142688311636448,-0.4582937955856323,0.009397351182997227,1,2,6,11,3,1,-1,7,12,1,1,3,-0.005334928166121244,-0.5775498151779175,0.0352523885667324,0,2,16,10,4,1,-1,16,10,2,1,2,-0.0010754769900813699,0.1434753984212875,-0.1015762984752655,0,2,0,0,1,2,-1,0,1,1,1,2,-0.0035198600962758064,-0.6082041263580322,0.0328880697488785,0,2,8,1,9,3,-1,8,2,9,1,3,0.0112483501434326,-0.0905500426888466,0.2323783040046692,0,2,0,6,5,3,-1,0,7,5,1,3,-0.0119920196011662,-0.5705332159996033,0.0367036312818527,1,2,21,8,1,4,-1,20,9,1,2,2,-0.012105530127883,-0.708626925945282,0.004459870047867298,-1.5267670154571533,57,0,2,5,1,15,6,-1,5,3,15,2,3,-0.1112890988588333,0.5214446783065796,-0.2762526869773865,0,3,23,0,2,2,-1,24,0,1,1,2,23,1,1,1,2,-0.003131008008494973,-0.6073393225669861,0.0243980996310711,0,2,3,3,15,6,-1,3,5,15,2,3,-0.09750135242939,0.5489286780357361,-0.1652427017688751,0,2,19,0,6,9,-1,19,3,6,3,3,-0.0652247071266174,0.3402006924152374,-0.2693930864334106,0,2,5,2,15,6,-1,5,4,15,2,3,0.1191802993416786,-0.1123576015233994,0.63959801197052,0,2,17,3,8,3,-1,17,4,8,1,3,-0.0140629801899195,0.3342761993408203,-0.1284538954496384,1,2,4,3,8,4,-1,4,3,8,2,2,-0.056402500718832,0.3790628910064697,-0.1554156988859177,0,2,16,4,6,2,-1,16,5,6,1,2,0.00717424089089036,-0.1133088991045952,0.1825089007616043,0,3,0,0,24,12,-1,0,0,12,6,2,12,6,12,6,2,0.1259752959012985,0.0945485532283783,-0.485344409942627,1,2,22,10,3,2,-1,22,10,3,1,2,0.0059177991934120655,0.0701321363449097,-0.5377039909362793,1,2,6,3,6,6,-1,4,5,6,2,3,-0.0439277403056622,0.395074188709259,-0.1080185994505882,1,2,14,4,9,1,-1,17,7,3,1,3,-0.009831470437347889,0.0959606170654297,-0.0468075983226299,1,2,3,10,2,3,-1,3,10,1,3,2,0.005635340232402086,0.0943416282534599,-0.5247716903686523,1,2,20,8,5,2,-1,20,8,5,1,2,-0.0115382801741362,-0.5154880285263062,0.0138055300340056,0,3,0,9,16,6,-1,0,9,8,3,2,8,12,8,3,2,0.0286462493240833,-0.1382701992988586,0.275043785572052,0,2,6,2,13,3,-1,6,3,13,1,3,0.0138679798692465,-0.1203586980700493,0.3521435856819153,0,2,0,1,3,4,-1,0,3,3,2,2,-0.0004046937101520598,0.1522637009620667,-0.2590084075927734,0,2,8,0,9,12,-1,8,6,9,6,2,-0.1594581007957459,-0.6391854882240295,0.0514649897813797,1,2,4,0,1,2,-1,4,0,1,1,2,-0.0027928699273616076,-0.5840150713920593,0.0542793795466423,0,2,5,3,15,3,-1,5,4,15,1,3,0.0183532107621431,-0.1051151007413864,0.3529815971851349,1,2,3,10,2,3,-1,3,10,1,3,2,-0.00518105598166585,-0.4741767942905426,0.0798512324690819,0,3,19,4,6,4,-1,22,4,3,2,2,19,6,3,2,2,0.009232129901647568,-0.0759327188134193,0.1852813959121704,0,3,0,3,8,4,-1,0,3,4,2,2,4,5,4,2,2,0.0121171101927757,-0.1117528975009918,0.285363495349884,0,2,19,10,5,3,-1,19,11,5,1,3,-0.007261281833052635,-0.5885108709335327,0.0526883192360401,0,2,1,10,5,3,-1,1,11,5,1,3,0.005613490007817745,0.0474684908986092,-0.5394589900970459,0,2,12,1,13,14,-1,12,8,13,7,2,-0.1945167928934097,-0.5634222030639648,0.0302108898758888,0,2,0,1,13,14,-1,0,8,13,7,2,0.355094313621521,0.0630894526839256,-0.4980587959289551,0,3,11,3,6,12,-1,14,3,3,6,2,11,9,3,6,2,0.0331119708716869,0.034632470458746,-0.5246484875679016,0,3,9,5,6,10,-1,9,5,3,5,2,12,10,3,5,2,0.0342818088829517,0.0431439802050591,-0.6470713019371033,0,2,20,8,5,4,-1,20,9,5,2,2,-0.007825661450624466,-0.4688000977039337,0.0402393713593483,0,2,0,8,5,4,-1,0,9,5,2,2,0.0111560495570302,0.0401505008339882,-0.609553873538971,0,2,8,9,9,3,-1,8,10,9,1,3,0.0113630602136254,-0.0827489867806435,0.3811689019203186,0,2,7,10,6,4,-1,9,10,2,4,3,0.020405100658536,0.0425756387412548,-0.7467774152755737,0,2,6,6,14,4,-1,6,7,14,2,2,0.019111629575491,-0.123919703066349,0.2226520031690598,0,2,9,6,5,4,-1,9,7,5,2,2,-0.0073364898562431335,0.3034206926822662,-0.0926956906914711,0,2,22,5,3,6,-1,22,7,3,2,3,-0.008653892204165459,-0.3351745009422302,0.0585405789315701,0,2,0,5,3,6,-1,0,7,3,2,3,0.0347895994782448,0.0337578095495701,-0.7483453154563904,0,2,17,1,5,4,-1,17,2,5,2,2,-0.0174188297241926,0.2445363998413086,-0.0698786973953247,0,2,3,1,6,4,-1,3,2,6,2,2,0.003511907998472452,-0.1277886927127838,0.2403315007686615,0,2,21,14,4,1,-1,21,14,2,1,2,0.0005066979792900383,-0.1169779002666473,0.1439380049705505,1,2,4,8,3,2,-1,5,9,1,2,3,-0.005951274186372757,-0.5078160762786865,0.0478522293269634,0,2,14,2,4,7,-1,14,2,2,7,2,0.0503778010606766,0.002928252099081874,-0.7751696109771729,0,2,7,2,4,7,-1,9,2,2,7,2,0.003886251011863351,-0.1550420969724655,0.1570920050144196,0,2,9,3,8,5,-1,11,3,4,5,2,0.0385116301476955,0.0230970401316881,-0.6291617155075073,0,2,5,10,15,1,-1,10,10,5,1,3,-0.0055746049620211124,0.1807070970535278,-0.1298052966594696,0,2,2,6,21,9,-1,9,6,7,9,3,0.1266476064920425,-0.0865593999624252,0.2957325875759125,0,2,0,4,6,6,-1,0,6,6,2,3,0.005412611179053783,-0.152832493185997,0.1662916988134384,0,2,1,12,24,3,-1,7,12,12,3,2,-0.0361530818045139,0.2797313034534454,-0.1039886027574539,0,2,6,7,6,2,-1,6,8,6,1,2,0.007167399860918522,-0.0945642217993736,0.2778528034687042,1,2,13,8,2,4,-1,13,8,2,2,2,-0.006779035087674856,0.1679068058729172,-0.0839543119072914,0,2,8,6,8,5,-1,10,6,4,5,2,-0.029867609962821,-0.7236117124557495,0.0346310697495937,0,2,11,5,6,4,-1,11,6,6,2,2,0.006526551209390163,-0.1173760965466499,0.1346033960580826,0,2,0,14,4,1,-1,2,14,2,1,2,0.0000340809601766523,-0.1753176003694534,0.1322204023599625,0,2,16,2,4,13,-1,17,2,2,13,2,-0.0176294595003128,-0.5160853862762451,0.0253861900418997,0,2,0,7,1,4,-1,0,8,1,2,2,-0.0015446309698745608,-0.4142186045646668,0.0513300895690918,0,2,24,0,1,2,-1,24,1,1,1,2,0.0011520429980009794,0.0366159491240978,-0.3692800998687744,0,2,0,5,2,4,-1,1,5,1,4,2,-0.002961277961730957,0.2446188032627106,-0.0842714235186577,-1.4507639408111572,64,0,2,0,1,8,4,-1,0,3,8,2,2,-0.0141031695529819,0.2699790894985199,-0.3928318023681641,0,3,15,11,10,4,-1,20,11,5,2,2,15,13,5,2,2,0.005471440032124519,-0.2269169986248016,0.2749052047729492,0,2,7,5,11,3,-1,7,6,11,1,3,0.0166354794055223,-0.1547908037900925,0.322420209646225,0,2,21,4,4,3,-1,21,4,2,3,2,-0.008447717875242233,0.3320780992507935,-0.1249654963612557,0,2,0,5,4,1,-1,2,5,2,1,2,-0.0024904569145292044,0.2900204956531525,-0.1460298001766205,0,2,7,3,12,4,-1,7,4,12,2,2,0.0282104406505823,-0.0831937119364738,0.4805397987365723,0,2,8,6,7,3,-1,8,7,7,1,3,0.009317990392446518,-0.1692426949739456,0.3482030928134918,0,2,16,0,9,14,-1,16,7,9,7,2,-0.0579102896153927,-0.5040398836135864,0.0840934887528419,0,3,0,0,24,6,-1,0,0,12,3,2,12,3,12,3,2,0.0882126465439796,0.073309987783432,-0.4883395135402679,0,2,23,13,2,1,-1,23,13,1,1,2,0.000060974380176048726,-0.1594507992267609,0.147327795624733,0,3,0,13,24,2,-1,0,13,12,1,2,12,14,12,1,2,-0.0142063600942492,-0.6365684866905212,0.0507153607904911,0,2,19,12,5,3,-1,19,13,5,1,3,-0.007718190085142851,-0.6330028772354126,0.0328688994050026,0,2,9,7,7,4,-1,9,8,7,2,2,0.0120071703568101,-0.1254525035619736,0.2893699109554291,1,2,14,0,4,7,-1,14,0,2,7,2,0.0707826167345047,0.0305656604468822,-0.5666698217391968,1,2,11,0,7,4,-1,11,0,7,2,2,-0.050412330776453,-0.5089793801307678,0.0710048824548721,0,2,9,4,14,2,-1,9,5,14,1,2,0.0220727995038033,-0.1444841027259827,0.2781184911727905,0,2,3,2,15,4,-1,3,3,15,2,2,0.0147649403661489,-0.1283989995718002,0.3290185928344727,0,2,19,12,5,3,-1,19,13,5,1,3,0.0068206568248569965,0.0654795467853546,-0.5463265776634216,0,3,0,11,8,4,-1,0,11,4,2,2,4,13,4,2,2,0.0020179790444672108,-0.2028342932462692,0.167965903878212,0,2,7,9,11,6,-1,7,11,11,2,3,0.0250812191516161,-0.1104943975806236,0.3191860020160675,0,2,0,11,7,4,-1,0,12,7,2,2,0.008939135819673538,0.0734132081270218,-0.553839921951294,0,2,20,0,5,2,-1,20,1,5,1,2,-0.00046396959805861115,0.1123031005263329,-0.169712707400322,1,2,5,10,3,2,-1,6,11,1,2,3,-0.008560219779610634,-0.7347347736358643,0.0417169481515884,0,3,17,4,8,10,-1,21,4,4,5,2,17,9,4,5,2,-0.0389347188174725,0.2292626947164536,-0.0792299434542656,0,2,5,3,15,2,-1,5,4,15,1,2,-0.0215415991842747,0.3007172048091888,-0.1152340024709702,0,2,16,4,5,2,-1,16,5,5,1,2,0.0049337721429765224,-0.1002838015556335,0.1348572969436646,0,3,1,0,22,10,-1,1,0,11,5,2,12,5,11,5,2,0.1615066975355148,0.0588171891868114,-0.5656744837760925,0,2,20,0,5,2,-1,20,1,5,1,2,-0.0123260198161006,-0.2823328077793121,0.0187596306204796,0,2,0,0,5,2,-1,0,1,5,1,2,0.0052987951785326,0.0524063482880592,-0.5719032287597656,0,3,10,1,6,12,-1,13,1,3,6,2,10,7,3,6,2,0.0289043206721544,0.047710869461298,-0.4854584038257599,0,2,0,0,1,8,-1,0,4,1,4,2,0.0155697297304869,0.0493178516626358,-0.5100051760673523,0,2,6,0,13,6,-1,6,2,13,2,3,-0.093812070786953,0.2564809024333954,-0.1057069003582001,1,2,4,3,4,4,-1,3,4,4,2,2,-0.0286933295428753,0.5247043967247009,-0.05095025151968,0,2,20,8,5,3,-1,20,9,5,1,3,0.0072301640175282955,0.0583653002977371,-0.4894312024116516,0,3,7,13,2,2,-1,7,13,1,1,2,8,14,1,1,2,0.00008266483928309754,-0.143721804022789,0.1820268929004669,0,3,16,13,2,2,-1,17,13,1,1,2,16,14,1,1,2,0.001524175051599741,0.0201267991214991,-0.3884589970111847,0,3,7,13,2,2,-1,7,13,1,1,2,8,14,1,1,2,-0.00006551230762852356,0.2280354052782059,-0.1581206023693085,0,2,19,5,6,1,-1,21,5,2,1,3,0.0024175599683076143,-0.0890450775623322,0.2839250862598419,0,2,0,8,6,6,-1,0,10,6,2,3,0.0343084894120693,0.0391304790973663,-0.626339316368103,0,2,6,8,13,4,-1,6,9,13,2,2,0.0127667998895049,-0.0984294191002846,0.2857427895069122,0,2,3,10,8,1,-1,7,10,4,1,2,-0.0027450299821794033,0.2090786993503571,-0.1267945021390915,0,2,16,11,4,4,-1,17,11,2,4,2,-0.007062985096126795,-0.4784719944000244,0.0229746792465448,0,2,5,6,15,2,-1,5,7,15,1,2,0.0109674101695418,-0.1310741007328033,0.1712857037782669,0,2,3,1,20,10,-1,3,1,10,10,2,-0.1530689001083374,0.2361073046922684,-0.096540167927742,0,2,2,4,3,3,-1,2,5,3,1,3,0.002167609054595232,-0.1028804033994675,0.2537584006786346,0,2,16,11,4,4,-1,17,11,2,4,2,0.0107051497325301,0.0160892698913813,-0.5868526101112366,0,2,5,11,4,4,-1,6,11,2,4,2,-0.006114291958510876,-0.6146798133850098,0.034404631704092,0,3,17,4,8,10,-1,21,4,4,5,2,17,9,4,5,2,-0.0160057693719864,0.0954133197665215,-0.0657811686396599,0,2,0,8,5,3,-1,0,9,5,1,3,0.008554169908165932,0.042579360306263,-0.5490341186523438,0,2,23,13,2,1,-1,23,13,1,1,2,-0.00005574294118559919,0.1505846977233887,-0.0978325977921486,0,2,0,13,2,1,-1,1,13,1,1,2,0.00004988848013454117,-0.1522217988967896,0.1464709937572479,0,2,10,1,7,3,-1,10,2,7,1,3,0.00939861312508583,-0.0793018564581871,0.2222844958305359,0,3,0,3,8,12,-1,0,3,4,6,2,4,9,4,6,2,-0.0445945896208286,0.3217073082923889,-0.0712599530816078,0,2,6,0,16,11,-1,6,0,8,11,2,0.2763071060180664,-0.0312894396483898,0.4636780917644501,0,2,2,0,21,3,-1,9,0,7,3,3,-0.0459242798388004,0.2685551047325134,-0.0946981832385063,1,2,23,1,2,12,-1,23,1,2,6,2,0.0328284502029419,0.0420088581740856,-0.1909179985523224,1,2,2,0,1,2,-1,2,0,1,1,2,0.005841621197760105,0.0443820804357529,-0.5017232894897461,0,2,15,0,6,3,-1,17,0,2,3,3,0.0253127701580524,0.007676819805055857,-0.4524691104888916,0,2,8,9,6,4,-1,10,9,2,4,3,-0.0206803791224957,-0.708233118057251,0.02775271050632,0,2,20,5,5,6,-1,20,7,5,2,3,0.0019456259906291962,-0.1725641041994095,0.0885240733623505,0,3,0,4,24,8,-1,0,4,12,4,2,12,8,12,4,2,0.1318278014659882,0.0378756709396839,-0.5236573815345764,1,2,22,10,1,4,-1,21,11,1,2,2,-0.004844982177019119,-0.3831801116466522,0.0295521095395088,0,2,7,0,11,3,-1,7,1,11,1,3,0.005329558160156012,-0.1172816008329392,0.1712217032909393,0,2,6,0,13,4,-1,6,1,13,2,2,-0.035328458994627,0.3731549978256226,-0.0650273412466049,-1.3936280012130737,77,0,2,7,11,11,4,-1,7,13,11,2,2,0.0136478496715426,-0.2802368998527527,0.3575335144996643,0,3,21,3,4,12,-1,23,3,2,6,2,21,9,2,6,2,0.0123078199103475,-0.1484645009040833,0.2714886069297791,0,2,2,4,21,6,-1,9,6,7,2,9,0.4659403860569,-0.0705008506774902,0.5868018865585327,0,3,23,3,2,10,-1,24,3,1,5,2,23,8,1,5,2,0.001569333951920271,-0.1150237023830414,0.1375536024570465,0,3,0,3,2,10,-1,0,3,1,5,2,1,8,1,5,2,0.002517673885449767,-0.1778890937566757,0.2172407060861588,1,2,24,10,1,4,-1,23,11,1,2,2,0.004529970232397318,0.0458603501319885,-0.5376703143119812,1,2,1,10,4,1,-1,2,11,2,1,2,0.004029551055282354,0.0599071383476257,-0.5803095102310181,0,2,8,10,9,4,-1,8,11,9,2,2,0.009028165601193905,-0.088961161673069,0.3474006950855255,0,2,5,8,13,6,-1,5,11,13,3,2,-0.0710994601249695,0.4003205001354218,-0.0876752585172653,0,2,5,0,15,4,-1,5,2,15,2,2,-0.0905078798532486,0.3202385008335114,-0.1107280030846596,0,2,1,0,22,15,-1,12,0,11,15,2,0.3949914872646332,-0.0544822700321674,0.4376561045646668,0,2,10,14,8,1,-1,12,14,4,1,2,0.0060021281242370605,0.0412968583405018,-0.6277515888214111,0,2,1,3,8,4,-1,1,4,8,2,2,-0.0126753300428391,0.1864306032657623,-0.158659502863884,0,2,15,13,1,2,-1,15,14,1,1,2,0.0005252318806014955,-0.0737809464335442,0.1131825000047684,0,2,5,2,15,6,-1,5,4,15,2,3,0.151985302567482,-0.0698502063751221,0.5526459217071533,1,2,23,12,2,1,-1,23,12,1,1,2,-0.005917444825172424,-0.4224376976490021,0.0234292708337307,1,2,2,12,1,2,-1,2,12,1,1,2,0.0005108569748699665,-0.1782114058732987,0.1747542023658752,0,2,8,13,9,2,-1,11,13,3,2,3,-0.0286266505718231,-0.7806789875030518,0.0430335216224194,0,2,8,0,8,2,-1,8,1,8,1,2,0.0032388539984822273,-0.1174874976277351,0.2301342934370041,0,2,20,12,4,3,-1,20,13,4,1,3,-0.0068310899659991264,-0.5170273780822754,0.0224770605564117,0,3,3,0,18,10,-1,3,0,9,5,2,12,5,9,5,2,-0.1381812989711762,-0.6718307137489319,0.0339458398520947,0,2,10,12,6,3,-1,12,12,2,3,3,0.0129029303789139,0.0190411508083344,-0.4739249050617218,0,2,0,0,1,8,-1,0,2,1,4,2,0.0063398052006959915,0.0412811301648617,-0.5821130871772766,0,2,22,5,3,4,-1,22,6,3,2,2,0.00008406751294387504,-0.2301639020442963,0.124085396528244,0,2,0,5,4,4,-1,0,6,4,2,2,0.0172388590872288,0.0539665818214417,-0.5818564891815186,0,3,6,0,14,10,-1,13,0,7,5,2,6,5,7,5,2,-0.0786773264408112,-0.4061115086078644,0.056923508644104,0,2,1,12,4,3,-1,1,13,4,1,3,0.005585959181189537,0.0368424393236637,-0.5646867752075195,0,3,20,7,2,2,-1,21,7,1,1,2,20,8,1,1,2,-0.0006132239941507578,0.1785047054290772,-0.0668883100152016,0,3,3,7,2,2,-1,3,7,1,1,2,4,8,1,1,2,0.0007940084906294942,-0.0783978328108788,0.3054557144641876,0,2,22,6,3,4,-1,22,7,3,2,2,0.012827199883759,0.0404374599456787,-0.6479570865631104,0,2,9,6,7,3,-1,9,7,7,1,3,0.0119779799133539,-0.0993791595101357,0.2267276048660278,0,2,11,6,4,2,-1,11,7,4,1,2,-0.00493787694722414,0.270632803440094,-0.0839221030473709,0,2,0,6,5,4,-1,0,7,5,2,2,0.0203377306461334,0.040057111531496,-0.6170961260795593,0,2,5,3,15,6,-1,5,5,15,2,3,-0.1582631021738052,0.371801108121872,-0.0776448771357536,0,2,4,4,5,2,-1,4,5,5,1,2,0.004515057895332575,-0.1424572020769119,0.1946897059679031,0,2,11,12,6,3,-1,13,12,2,3,3,-0.0179421696811914,-0.7258480787277222,0.0292347799986601,1,2,3,0,1,3,-1,2,1,1,1,3,0.005215315148234367,0.0460041500627995,-0.4536756873130798,0,2,7,11,12,2,-1,11,11,4,2,3,-0.007786383852362633,0.1746426969766617,-0.1098980978131294,0,2,0,8,4,4,-1,0,9,4,2,2,0.009413344785571098,0.0346476286649704,-0.5983666181564331,0,2,8,7,9,3,-1,8,8,9,1,3,0.00762187410145998,-0.1057026013731957,0.2037336975336075,0,2,8,8,9,6,-1,8,10,9,2,3,0.0216018799692392,-0.0909303426742554,0.2887038886547089,0,2,20,11,5,4,-1,20,12,5,2,2,-0.0118230897933245,-0.6303614974021912,0.0240826196968555,0,2,7,5,8,3,-1,9,5,4,3,2,-0.020232979208231,-0.7420278787612915,0.0235212203115225,0,3,16,0,2,2,-1,17,0,1,1,2,16,1,1,1,2,0.0006451014778576791,-0.0552557893097401,0.1650166064500809,0,2,0,11,5,4,-1,0,12,5,2,2,-0.008187602274119854,-0.5770931839942932,0.0352346412837505,0,3,16,0,2,2,-1,17,0,1,1,2,16,1,1,1,2,-0.00045044958824291825,0.1859780997037888,-0.08243677765131,0,2,5,9,6,6,-1,7,9,2,6,3,-0.0273097790777683,-0.7204548716545105,0.0276838503777981,0,3,14,10,10,4,-1,19,10,5,2,2,14,12,5,2,2,0.007305101957172155,-0.0758159905672073,0.1228180006146431,0,2,6,6,3,1,-1,7,6,1,1,3,0.0007211818010546267,-0.0847066268324852,0.2212305068969727,0,2,16,6,3,2,-1,17,6,1,2,3,-0.0005579470889642835,0.092200443148613,-0.0512673109769821,0,2,6,6,3,2,-1,7,6,1,2,3,-0.0012906070332974195,0.236485093832016,-0.085636742413044,1,2,13,3,8,4,-1,12,4,8,2,2,-0.0234409496188164,-0.341759204864502,0.0303556900471449,1,2,2,0,1,2,-1,2,0,1,1,2,0.00006700373342027888,-0.1778312027454376,0.1098366007208824,1,2,21,0,2,1,-1,21,0,1,1,2,-0.0020913260523229837,-0.3296548128128052,0.0488219298422337,1,2,4,0,1,2,-1,4,0,1,1,2,0.005288336891680956,0.047602079808712,-0.4229690134525299,1,2,13,1,8,6,-1,11,3,8,2,3,0.1046722009778023,0.0145577099174261,-0.5163959860801697,1,2,12,3,4,8,-1,13,4,2,8,2,0.0410936884582043,0.0255694594234228,-0.6734575033187866,0,2,3,0,20,15,-1,3,0,10,15,2,0.4545299112796783,-0.0473212711513042,0.4647259116172791,0,2,9,0,7,3,-1,9,1,7,1,3,-0.004420027136802673,0.2172905951738358,-0.0805237367749214,0,2,12,1,5,2,-1,12,2,5,1,2,-0.0033253689762204885,0.1196364015340805,-0.084737166762352,0,2,6,1,13,3,-1,6,2,13,1,3,0.0152236903086305,-0.0892436280846596,0.2284111976623535,0,3,14,3,10,12,-1,19,3,5,6,2,14,9,5,6,2,-0.0312239099293947,0.1464260965585709,-0.1012998968362808,0,2,1,6,21,6,-1,8,6,7,6,3,-0.0729675367474556,0.1977909952402115,-0.0998045280575752,0,2,12,0,10,12,-1,12,0,5,12,2,0.0434687100350857,-0.0738932862877846,0.1571179032325745,0,2,7,8,11,3,-1,7,9,11,1,3,0.007742725778371096,-0.090792253613472,0.244967594742775,0,2,2,5,22,10,-1,2,5,11,10,2,-0.0834884494543076,0.1732859015464783,-0.1288128942251205,0,2,5,4,15,4,-1,5,6,15,2,2,0.0421115085482597,-0.1475321054458618,0.1373448967933655,0,2,7,1,15,6,-1,7,3,15,2,3,0.0966737270355225,-0.0551961399614811,0.3563303947448731,0,2,0,8,2,6,-1,0,10,2,2,3,-0.008899398148059845,-0.5261930823326111,0.0388906002044678,0,2,5,1,15,4,-1,5,2,15,2,2,-0.0238508302718401,0.1924559026956558,-0.1050153970718384,0,3,7,8,2,2,-1,7,8,1,1,2,8,9,1,1,2,-0.000749021302908659,0.2476740926504135,-0.073859728872776,0,2,11,9,9,2,-1,14,9,3,2,3,-0.0230488497763872,-0.5220348238945007,0.0295383799821138,0,3,7,8,2,2,-1,7,8,1,1,2,8,9,1,1,2,0.0005792090087197721,-0.080705501139164,0.2493984997272492,0,2,17,10,8,4,-1,17,11,8,2,2,-0.0254354309290648,-0.6520490050315857,0.0163280703127384,0,2,0,10,8,4,-1,0,11,8,2,2,0.01763916015625,0.0246949195861816,-0.6850522756576538,0,2,16,11,6,4,-1,18,11,2,4,3,0.0205357391387224,0.0165182203054428,-0.4285225868225098,0,2,0,13,24,1,-1,6,13,12,1,2,0.0111132804304361,-0.0871591791510582,0.2062001973390579,-1.3217060565948486,73,0,3,0,9,10,6,-1,0,9,5,3,2,5,12,5,3,2,0.0140618495643139,-0.2737283110618591,0.4017829895019531,0,3,13,5,10,10,-1,18,5,5,5,2,13,10,5,5,2,-0.0334245301783085,0.3433864116668701,-0.1524070948362351,0,2,0,4,4,2,-1,2,4,2,2,2,-0.003398272907361388,0.3046114146709442,-0.2162856012582779,0,3,13,5,12,10,-1,19,5,6,5,2,13,10,6,5,2,0.0673939511179924,-0.0539562106132507,0.3304964005947113,0,3,0,5,12,10,-1,0,5,6,5,2,6,10,6,5,2,-0.0515447482466698,0.3804036974906921,-0.1334261000156403,0,2,11,11,3,4,-1,11,13,3,2,2,0.0036630779504776,-0.1760202944278717,0.2139966934919357,1,2,5,8,2,5,-1,5,8,1,5,2,0.007883662357926369,0.0570616200566292,-0.5150743126869202,0,2,4,14,18,1,-1,4,14,9,1,2,-0.008948004804551601,0.2230996936559677,-0.1190536990761757,0,2,1,0,1,6,-1,1,3,1,3,2,-0.0005576058756560087,0.0999659672379494,-0.2558285892009735,0,2,8,9,9,4,-1,8,10,9,2,2,0.009538939222693443,-0.0655315071344376,0.3246265947818756,0,2,0,9,5,4,-1,0,10,5,2,2,0.007790413219481707,0.0450260303914547,-0.6068859100341797,0,2,19,5,6,2,-1,21,5,2,2,3,0.004069277085363865,-0.0624743513762951,0.1570695042610169,0,2,0,5,6,2,-1,2,5,2,2,3,0.0031110940035432577,-0.0744680091738701,0.2600801885128021,0,2,13,9,6,3,-1,15,9,2,3,3,0.0156514495611191,0.0255663506686687,-0.5172523260116577,0,2,2,3,21,9,-1,9,3,7,9,3,0.2044613063335419,-0.0763430967926979,0.332390695810318,0,2,11,9,10,2,-1,11,9,5,2,2,-0.0101691596210003,0.1606681048870087,-0.1091597974300385,0,3,0,0,24,14,-1,0,0,12,7,2,12,7,12,7,2,0.1894780993461609,0.0538599416613579,-0.5398759841918945,0,2,5,2,15,6,-1,5,4,15,2,3,-0.14792400598526,0.2385465949773789,-0.1132820993661881,0,2,2,0,16,11,-1,10,0,8,11,2,-0.1483031064271927,0.3646511137485504,-0.0753156766295433,0,2,5,0,15,6,-1,5,2,15,2,3,-0.132553294301033,0.2919555902481079,-0.0949441567063332,0,2,10,5,5,4,-1,10,6,5,2,2,-0.0163901709020138,0.3920511901378632,-0.0685021281242371,0,2,23,0,2,3,-1,23,1,2,1,3,-0.006324097979813814,-0.6633772253990173,0.0337768010795116,0,2,0,0,6,3,-1,0,1,6,1,3,0.0147409504279494,0.0431423708796501,-0.5016931891441345,0,2,10,5,15,2,-1,10,6,15,1,2,0.0171020403504372,-0.1739968061447144,0.2036074995994568,0,3,0,4,6,4,-1,0,4,3,2,2,3,6,3,2,2,-0.007523206062614918,0.2614240050315857,-0.0894730314612389,1,2,21,7,2,4,-1,20,8,2,2,2,0.008089945651590824,0.0491316393017769,-0.3869245946407318,1,2,4,7,4,2,-1,5,8,2,2,2,-0.0111914901062846,-0.7151393890380859,0.0292793400585651,0,2,24,13,1,2,-1,24,14,1,1,2,-0.00006485549238277599,0.1147895976901054,-0.1195824965834618,0,2,2,0,4,15,-1,3,0,2,15,2,0.0263162907212973,0.0260859299451113,-0.8071029186248779,1,2,21,0,4,1,-1,22,1,2,1,2,-0.0132494196295738,-0.321144312620163,0.0075486088171601295,1,2,4,0,1,4,-1,3,1,1,2,2,0.006218059919774532,0.0555592402815819,-0.4065248966217041,0,3,1,1,24,14,-1,13,1,12,7,2,1,8,12,7,2,0.1724980026483536,0.0407503582537174,-0.5056337714195251,0,2,6,9,6,6,-1,8,9,2,6,3,-0.0216798391193151,-0.6235452890396118,0.0264780297875404,0,2,5,3,15,4,-1,10,3,5,4,3,0.0167031493037939,-0.1379484981298447,0.1374935954809189,0,2,0,0,20,10,-1,5,0,10,10,2,-0.0904578119516373,0.2364515066146851,-0.0822857320308685,0,3,19,3,6,12,-1,22,3,3,6,2,19,9,3,6,2,-0.0319220200181007,0.2578540146350861,-0.0472433306276798,0,2,3,2,7,2,-1,3,3,7,1,2,-0.0107858600094914,0.1915684044361115,-0.1092626005411148,0,3,19,3,6,12,-1,22,3,3,6,2,19,9,3,6,2,0.0153568601235747,-0.0915980264544487,0.1492947041988373,0,3,0,3,6,12,-1,0,3,3,6,2,3,9,3,6,2,-0.0298386197537184,0.3693186044692993,-0.0698615685105324,0,2,19,14,6,1,-1,19,14,3,1,2,0.0015088700456544757,-0.0684053674340248,0.1167493984103203,0,2,4,2,6,13,-1,6,2,2,13,3,-0.0391593612730503,-0.5139203071594238,0.037696298211813,0,2,17,14,8,1,-1,19,14,4,1,2,0.009695762768387794,0.0178152993321419,-0.4685910940170288,0,2,0,14,8,1,-1,2,14,4,1,2,0.0007268316112458706,-0.13107830286026,0.157490000128746,1,2,23,11,2,2,-1,23,11,2,1,2,0.003989457152783871,0.0452235005795956,-0.4237715899944305,1,2,2,11,2,2,-1,2,11,1,2,2,-0.005160097032785416,-0.5150998830795288,0.03480564057827,0,2,8,4,9,4,-1,8,5,9,2,2,-0.0237389300018549,0.2213699966669083,-0.0842292308807373,0,2,8,4,9,3,-1,8,5,9,1,3,0.0145637700334191,-0.0898087024688721,0.2186468988656998,0,3,22,6,2,4,-1,23,6,1,2,2,22,8,1,2,2,0.0007284965831786394,-0.0709035396575928,0.1204996034502983,0,2,7,3,6,8,-1,9,3,2,8,3,-0.031149860471487,-0.6067348122596741,0.0294798705726862,0,2,22,4,3,4,-1,22,5,3,2,2,0.0167685598134995,0.0236525908112526,-0.4164066910743713,1,2,3,9,4,2,-1,4,10,2,2,2,-0.008903334848582745,-0.5536022186279297,0.0302125699818134,0,3,17,7,2,2,-1,18,7,1,1,2,17,8,1,1,2,0.0005396113265305758,-0.0588473901152611,0.1531303972005844,0,2,9,11,6,1,-1,11,11,2,1,3,-0.008388601243495941,-0.7052780985832214,0.0250979401171207,0,3,17,7,2,2,-1,18,7,1,1,2,17,8,1,1,2,-0.00034085000515915453,0.177186906337738,-0.1048467978835106,0,2,0,7,2,4,-1,0,8,2,2,2,0.006182800978422165,0.0330388285219669,-0.4948574900627136,0,2,20,5,5,6,-1,20,7,5,2,3,0.0008270256803371012,-0.1844830960035324,0.0777885988354683,0,3,6,7,2,2,-1,6,7,1,1,2,7,8,1,1,2,-0.0006098083104006946,0.1959578990936279,-0.0837520435452461,0,3,17,7,2,2,-1,18,7,1,1,2,17,8,1,1,2,0.00012273030006326735,-0.0814708098769188,0.1209300011396408,0,3,6,7,2,2,-1,6,7,1,1,2,7,8,1,1,2,0.00046565610682591796,-0.0953319519758224,0.2288299947977066,0,2,15,0,4,9,-1,16,0,2,9,2,-0.0216477997601032,-0.69338059425354,0.0170615408569574,0,3,5,1,14,14,-1,5,1,7,7,2,12,8,7,7,2,0.0595006607472897,0.0526031702756882,-0.2782197892665863,0,2,15,0,4,9,-1,16,0,2,9,2,0.025365199893713,0.00899545382708311,-0.6383489966392517,0,2,0,7,5,3,-1,0,8,5,1,3,-0.0039667091332376,-0.3175272047519684,0.0470112897455692,1,2,21,2,3,4,-1,22,3,1,4,3,0.008278477936983109,-0.0544440597295761,0.2219938933849335,0,2,6,0,4,15,-1,7,0,2,15,2,-0.0221254508942366,-0.6738150715827942,0.0225456394255161,1,2,21,2,3,4,-1,22,3,1,4,3,-0.0180159192532301,0.1972057968378067,-0.0419279783964157,1,2,4,2,4,3,-1,3,3,4,1,3,0.008442623540759087,-0.0605471916496754,0.2649214863777161,1,2,13,5,3,7,-1,14,6,1,7,3,-0.0325668416917324,-0.7107285857200623,0.0118406098335981,0,2,4,10,15,1,-1,9,10,5,1,3,-0.004765549208968878,0.1384397000074387,-0.1150531992316246,0,2,12,6,10,9,-1,12,6,5,9,2,0.056936290115118,-0.0613397099077702,0.2665694057941437,0,2,1,1,22,14,-1,12,1,11,14,2,0.1374146044254303,-0.1139679029583931,0.1789363026618958,0,2,11,8,3,2,-1,11,9,3,1,2,0.003412300953641534,-0.0668940767645836,0.259561687707901,0,2,2,5,11,2,-1,2,6,11,1,2,0.0116290198639035,-0.1346206963062286,0.1518495976924896,-1.4393190145492554,102,1,2,4,1,10,4,-1,3,2,10,2,2,-0.0302658006548882,0.3809668123722076,-0.133776992559433,0,2,5,1,15,6,-1,5,3,15,2,3,-0.1888993978500366,0.3472220003604889,-0.1143490970134735,0,3,0,9,6,6,-1,0,9,3,3,2,3,12,3,3,2,0.004475660156458616,-0.1779001951217651,0.1983720064163208,0,2,19,3,5,2,-1,19,4,5,1,2,-0.0092559102922678,0.2553296089172363,-0.0956856831908226,0,3,2,10,14,4,-1,2,10,7,2,2,9,12,7,2,2,0.0103751895949245,-0.1290100961923599,0.2047273963689804,0,2,1,3,24,8,-1,9,3,8,8,3,0.2527360022068024,-0.0779134780168533,0.341371089220047,0,2,0,8,2,6,-1,0,10,2,2,3,0.007995231077075005,0.119166798889637,-0.4138369858264923,0,2,23,14,2,1,-1,23,14,1,1,2,0.000066510503529571,-0.2305306047201157,0.1328932046890259,0,3,0,4,6,4,-1,0,4,3,2,2,3,6,3,2,2,0.0104297399520874,-0.0622061118483543,0.2935121059417725,0,2,3,13,21,1,-1,10,13,7,1,3,-0.009451309219002724,0.1671503931283951,-0.1161310002207756,0,3,0,0,24,14,-1,0,0,12,7,2,12,7,12,7,2,-0.138630598783493,-0.4514685869216919,0.0725729763507843,0,2,24,0,1,10,-1,24,5,1,5,2,-0.0154232997447252,-0.4277118146419525,0.0248409193009138,1,2,4,11,2,2,-1,4,11,1,2,2,-0.006578299216926098,-0.6540787816047668,0.0402618311345577,0,2,23,14,2,1,-1,23,14,1,1,2,-0.000068917557655368,0.2068260014057159,-0.1195247992873192,0,2,0,14,2,1,-1,1,14,1,1,2,0.00007141628884710371,-0.1625899970531464,0.1518989056348801,0,2,7,2,11,6,-1,7,4,11,2,3,0.1354866027832031,-0.0504554286599159,0.4712490141391754,1,2,2,2,2,2,-1,2,2,1,2,2,0.001128623029217124,-0.1934940963983536,0.149202898144722,0,2,24,0,1,10,-1,24,5,1,5,2,0.0376871302723885,-0.0006513047264888883,-0.5566216707229614,0,2,0,0,1,10,-1,0,5,1,5,2,-0.0177724994719028,-0.5733047127723694,0.0462512709200382,0,2,12,11,6,2,-1,14,11,2,2,3,-0.0141524598002434,-0.7905998826026917,0.0153570203110576,0,2,2,0,20,2,-1,7,0,10,2,2,-0.019447410479188,0.2123239040374756,-0.1021943986415863,0,2,10,0,10,4,-1,10,0,5,4,2,0.012915019877255,-0.0788644626736641,0.1457864940166473,0,2,0,0,20,1,-1,10,0,10,1,2,0.007728312164545059,-0.1338106989860535,0.2055318057537079,0,2,8,4,10,3,-1,8,5,10,1,3,-0.0264210291206837,0.272904098033905,-0.0841038301587105,0,2,9,6,7,6,-1,9,8,7,2,3,-0.0216425806283951,0.2165616005659103,-0.0997976064682007,0,2,8,5,9,3,-1,8,6,9,1,3,-0.0186041705310345,0.3167817890644074,-0.0684646219015121,1,2,6,0,1,3,-1,5,1,1,1,3,0.007918447256088257,0.038932591676712,-0.5849621891975403,0,2,24,0,1,4,-1,24,2,1,2,2,-0.00009086877980735153,0.1183537989854813,-0.2693997025489807,0,2,9,10,2,1,-1,10,10,1,1,2,-0.00006327161099761724,0.1483621001243591,-0.1414014995098114,1,2,22,10,1,4,-1,21,11,1,2,2,0.003012385917827487,0.0475597009062767,-0.3168076872825623,0,2,4,0,6,5,-1,6,0,2,5,3,0.0202028602361679,0.0363369397819042,-0.4958786964416504,0,3,17,3,8,12,-1,21,3,4,6,2,17,9,4,6,2,0.0681129470467567,-0.0636018067598343,0.3745648860931397,0,3,0,3,8,12,-1,0,3,4,6,2,4,9,4,6,2,-0.0613449215888977,0.3703984022140503,-0.0626903176307678,0,3,10,3,6,10,-1,13,3,3,5,2,10,8,3,5,2,-0.0239223092794418,-0.3475331962108612,0.0568292401731014,1,2,3,10,4,1,-1,4,11,2,1,2,0.004427940119057894,0.0318974405527115,-0.5085908770561218,1,2,16,2,9,4,-1,16,2,9,2,2,-0.0923664569854736,-0.4889659881591797,0.009993869811296463,1,2,9,2,4,9,-1,9,2,2,9,2,-0.003187831025570631,0.0857494324445724,-0.2382344007492065,0,2,20,9,3,3,-1,20,10,3,1,3,0.006260529160499573,0.0244128108024597,-0.5500137209892273,0,2,6,1,13,4,-1,6,2,13,2,2,0.0217170491814613,-0.084798701107502,0.2182479947805405,0,2,10,4,5,4,-1,10,5,5,2,2,0.0102959601208568,-0.1032914966344833,0.1945870965719223,0,2,0,5,3,3,-1,0,6,3,1,3,0.0121496301144362,0.0322238989174366,-0.5932865738868713,0,2,21,5,4,4,-1,21,6,4,2,2,0.0191168300807476,0.0309407506138086,-0.4538871943950653,0,2,0,5,4,4,-1,0,6,4,2,2,0.0007106770062819123,-0.1545806974172592,0.1262297928333283,0,2,8,9,9,6,-1,8,11,9,2,3,-0.029427420347929,0.2070481926202774,-0.0861818864941597,1,2,4,11,3,1,-1,5,12,1,1,3,-0.003706746967509389,-0.5155926942825317,0.0383589081466198,0,2,23,14,2,1,-1,23,14,1,1,2,0.000060146670875838026,-0.102361798286438,0.0884054377675056,0,2,0,14,2,1,-1,1,14,1,1,2,-0.00006871361256344244,0.1984436959028244,-0.0994443595409393,0,2,11,1,4,14,-1,11,8,4,7,2,-0.0848333984613419,-0.3900933861732483,0.0397581607103348,1,2,4,0,2,3,-1,3,1,2,1,3,0.0115453395992517,0.0299104899168015,-0.5021548867225647,0,2,24,12,1,2,-1,24,13,1,1,2,0.001272176974453032,0.0357883498072624,-0.3856284022331238,0,2,0,1,14,14,-1,0,8,14,7,2,0.378940612077713,0.0429151207208633,-0.3726823925971985,0,2,13,0,6,15,-1,15,0,2,15,3,0.0587286688387394,0.0175066608935595,-0.7129334807395935,0,2,0,1,1,4,-1,0,3,1,2,2,-0.00007266741886269301,0.0852374136447906,-0.1796067953109741,0,2,24,13,1,2,-1,24,14,1,1,2,-0.0025661939289420843,-0.4941900074481964,0.0211067497730255,0,2,0,13,1,2,-1,0,14,1,1,2,-0.00006254477193579078,0.1260727941989899,-0.1358107030391693,0,2,23,11,2,4,-1,23,12,2,2,2,-0.0033382088877260685,-0.342547595500946,0.0313290804624558,0,2,0,11,2,4,-1,0,12,2,2,2,0.004003258887678385,0.0353341810405254,-0.4785414040088654,0,3,16,10,2,2,-1,17,10,1,1,2,16,11,1,1,2,0.00007872544665588066,-0.0865093916654587,0.1098069027066231,0,3,7,10,2,2,-1,7,10,1,1,2,8,11,1,1,2,0.0003541138139553368,-0.0866223275661469,0.1815810948610306,0,3,1,0,24,6,-1,13,0,12,3,2,1,3,12,3,2,-0.100329302251339,-0.4118100106716156,0.0407990105450153,0,2,6,1,6,12,-1,8,1,2,12,3,0.0457341782748699,0.0250630006194115,-0.5801063179969788,0,2,19,6,6,3,-1,19,7,6,1,3,0.014357109554112,0.0273739993572235,-0.3111906945705414,0,2,5,6,7,2,-1,5,7,7,1,2,0.004282395821064711,-0.1212206035852432,0.1300680041313171,0,2,9,6,7,4,-1,9,7,7,2,2,-0.0191692691296339,0.3547115027904511,-0.0586979016661644,0,2,0,6,6,3,-1,0,7,6,1,3,0.0203719399869442,0.0270470399409533,-0.6216102838516235,0,2,6,8,13,4,-1,6,9,13,2,2,-0.0119816595688462,0.1762886941432953,-0.094315692782402,0,3,7,10,2,2,-1,7,10,1,1,2,8,11,1,1,2,-0.00009427832264918834,0.1507049947977066,-0.1071290969848633,0,2,12,11,6,2,-1,14,11,2,2,3,0.0101822800934315,0.016143349930644,-0.3503915071487427,0,3,6,0,12,10,-1,6,0,6,5,2,12,5,6,5,2,-0.0520590804517269,-0.312146008014679,0.0477841906249523,0,2,12,11,6,2,-1,14,11,2,2,3,-0.0249434690922499,-0.7933396100997925,-0.00040430951048620045,0,3,7,0,2,2,-1,7,0,1,1,2,8,1,1,1,2,-0.0006225982797332108,0.2043831050395966,-0.0712744519114494,0,3,16,0,2,2,-1,17,0,1,1,2,16,1,1,1,2,-0.00005685929863830097,0.0861500576138496,-0.0658712089061737,0,3,7,0,2,2,-1,7,0,1,1,2,8,1,1,1,2,0.00040834350511431694,-0.1051706001162529,0.2224697023630142,0,2,12,11,6,2,-1,14,11,2,2,3,-0.0011075460352003574,0.0464305393397808,-0.0319086797535419,0,2,7,11,6,2,-1,9,11,2,2,3,-0.0123662399128079,-0.6207143068313599,0.0261646900326014,0,2,5,12,18,3,-1,11,12,6,3,3,-0.0354762189090252,0.1230582967400551,-0.0519298203289509,1,2,2,0,1,2,-1,2,0,1,1,2,-0.002379444893449545,-0.3795419931411743,0.0417488515377045,0,3,21,4,4,2,-1,23,4,2,1,2,21,5,2,1,2,0.0013966970145702362,-0.0851486772298813,0.1512037962675095,0,2,9,3,7,3,-1,9,4,7,1,3,0.005143789108842611,-0.0816644281148911,0.1789588034152985,1,2,13,2,8,5,-1,15,4,4,5,2,-0.1239939033985138,-0.6658980846405029,0.00952041894197464,1,2,12,1,6,4,-1,11,2,6,2,2,0.0393908508121967,0.0182536505162716,-0.7637290954589844,0,2,22,0,2,2,-1,22,1,2,1,2,0.0029372270219027996,0.0226261299103498,-0.3233875036239624,0,2,4,1,16,12,-1,12,1,8,12,2,0.1816650927066803,-0.0618673898279667,0.229893296957016,0,2,3,0,20,10,-1,3,0,10,10,2,0.0892752110958099,-0.0848015919327736,0.2109096944332123,0,3,0,4,6,6,-1,0,4,3,3,2,3,7,3,3,2,0.0179201308637857,-0.0663900971412659,0.2243462055921555,1,2,22,4,3,3,-1,23,5,1,3,3,0.005502411164343357,-0.055913619697094,0.1079157963395119,1,2,3,4,3,3,-1,2,5,3,1,3,-0.0126318400725722,0.3352184891700745,-0.0470694787800312,0,2,22,7,3,4,-1,22,8,3,2,2,0.008204018697142601,0.0521674789488316,-0.5830680727958679,0,2,3,1,4,7,-1,4,1,2,7,2,0.0215438604354858,0.0103719802573323,-0.8169081807136536,0,2,22,7,3,4,-1,22,8,3,2,2,-0.0042779878713190556,-0.3437061011791229,0.034835658967495,1,2,2,0,1,2,-1,2,0,1,1,2,0.00957217626273632,0.0160374492406845,-0.7592146992683411,0,2,18,4,6,2,-1,18,5,6,1,2,0.005949999205768108,-0.0835138633847237,0.0937561765313149,0,2,5,3,15,6,-1,5,5,15,2,3,-0.0868803784251213,0.1977919936180115,-0.0735685229301453,0,2,16,4,8,4,-1,16,5,8,2,2,0.005769073031842709,-0.0611343309283257,0.0826714411377907,0,3,0,1,24,10,-1,0,1,12,5,2,12,6,12,5,2,0.148064598441124,0.0396532900631428,-0.408526211977005,0,2,14,0,4,7,-1,15,0,2,7,2,-0.018668269738555,-0.6671301126480103,0.015644509345293,0,2,0,7,3,4,-1,0,8,3,2,2,0.0101426700130105,0.0211487896740437,-0.5610821843147278,0,3,18,5,4,4,-1,20,5,2,2,2,18,7,2,2,2,-0.002626311033964157,0.0881423130631447,-0.0586008317768574,0,3,5,5,6,2,-1,5,5,3,1,2,8,6,3,1,2,0.0030406240839511156,-0.0699731782078743,0.1942113041877747,0,2,21,9,2,3,-1,21,10,2,1,3,-0.004052311182022095,-0.3989843130111694,0.0284519009292126,0,3,7,1,2,2,-1,7,1,1,1,2,8,2,1,1,2,0.00033293411252088845,-0.0920187085866928,0.1521372944116592,0,3,16,1,2,2,-1,17,1,1,1,2,16,2,1,1,2,-0.00014471479516942054,0.1328881978988648,-0.0869787335395813,-1.3500690460205078,115,0,2,9,7,7,6,-1,9,9,7,2,3,-0.0305288899689913,0.3361127972602844,-0.1605879068374634,0,2,17,2,7,2,-1,17,3,7,1,2,-0.0068238358944654465,0.2510839104652405,-0.2578383982181549,1,2,4,2,9,4,-1,3,3,9,2,2,-0.0260700508952141,0.3176701068878174,-0.111156202852726,0,2,19,14,6,1,-1,19,14,3,1,2,0.0016021650517359376,-0.1096177026629448,0.1561331003904343,0,2,6,9,11,6,-1,6,11,11,2,3,-0.0346175394952297,0.2614395916461945,-0.0955564379692078,0,3,17,3,8,12,-1,21,3,4,6,2,17,9,4,6,2,0.0825498923659325,-0.0359772108495235,0.3189736902713776,0,3,0,7,24,8,-1,0,7,12,4,2,12,11,12,4,2,-0.1079908013343811,-0.4661987125873566,0.0965379774570465,0,3,5,3,16,12,-1,13,3,8,6,2,5,9,8,6,2,-0.0710962936282158,-0.3290941119194031,0.0201707594096661,0,2,0,3,24,6,-1,8,5,8,2,9,0.6102272272109985,-0.0410851910710335,0.5919780731201172,0,2,1,8,24,1,-1,7,8,12,1,2,-0.009618048556149006,0.1845327019691467,-0.1256957054138184,0,3,1,9,14,6,-1,1,9,7,3,2,8,12,7,3,2,-0.0216567497700453,0.355886310338974,-0.0654195472598076,0,2,19,5,3,2,-1,19,6,3,1,2,0.0032288730144500732,-0.1597114056348801,0.1442176997661591,0,2,0,14,10,1,-1,5,14,5,1,2,0.0036023850552737713,-0.1301265954971314,0.1848530024290085,0,2,5,1,15,6,-1,5,3,15,2,3,0.1224254965782166,-0.050962008535862,0.478727400302887,0,2,1,1,7,6,-1,1,3,7,2,3,-0.0398168414831162,0.1911015063524246,-0.1490415036678314,0,2,15,12,6,3,-1,17,13,2,1,9,0.0165654607117176,0.0250385701656342,-0.2660810947418213,1,2,4,0,1,3,-1,3,1,1,1,3,0.006731497123837471,0.0361662209033966,-0.5751237273216248,0,2,1,12,24,3,-1,7,12,12,3,2,-0.0238826293498278,0.1817242056131363,-0.1013408973813057,0,2,3,12,6,3,-1,5,13,2,1,9,0.0168766304850578,0.0499957092106342,-0.496448814868927,0,3,1,0,24,12,-1,13,0,12,6,2,1,6,12,6,2,0.0814632922410965,0.0508196912705898,-0.3092927038669586,0,2,2,0,21,15,-1,9,0,7,15,3,0.1567866057157517,-0.0846417918801308,0.209758996963501,0,2,17,3,6,2,-1,17,4,6,1,2,0.0107369897887111,-0.0588766187429428,0.2673564851284027,0,2,3,3,14,2,-1,3,4,14,1,2,-0.0162507798522711,0.21858249604702,-0.1275278925895691,0,2,4,0,21,4,-1,11,0,7,4,3,-0.0513998307287693,0.1707165986299515,-0.0564976185560226,0,2,6,13,4,1,-1,7,13,2,1,2,0.0018661050125956535,0.0403385981917381,-0.4740450084209442,0,3,17,3,8,12,-1,21,3,4,6,2,17,9,4,6,2,-0.0494354106485844,0.1537600010633469,-0.0417859293520451,0,3,0,3,8,12,-1,0,3,4,6,2,4,9,4,6,2,0.0696671828627586,-0.0588539093732834,0.309996485710144,0,3,5,0,16,8,-1,13,0,8,4,2,5,4,8,4,2,-0.0781185403466225,-0.41095170378685,0.0523068793118,1,2,3,7,4,2,-1,4,8,2,2,2,-0.008616194128990173,-0.5668942928314209,0.0286804605275393,0,2,5,11,15,4,-1,5,12,15,2,2,0.006891637109220028,-0.0957784205675125,0.1680631041526794,0,2,10,13,1,2,-1,10,14,1,1,2,0.00008473441994283348,-0.1476065963506699,0.1278074979782105,0,2,12,14,6,1,-1,14,14,2,1,3,-0.0065460228361189365,-0.5353912711143494,0.0211423803120852,0,2,9,5,6,4,-1,9,6,6,2,2,-0.0119369700551033,0.2489618957042694,-0.0659059137105942,0,2,12,5,13,2,-1,12,6,13,1,2,0.0160134993493557,-0.0751639306545258,0.0920000970363617,0,2,5,0,15,6,-1,5,2,15,2,3,-0.179788202047348,0.3122220933437347,-0.0546800307929516,0,2,3,0,20,15,-1,3,0,10,15,2,0.4293603003025055,-0.0467442497611046,0.4671711027622223,0,2,1,1,22,14,-1,12,1,11,14,2,0.1762980967760086,-0.1196762025356293,0.2303612977266312,0,2,15,5,10,2,-1,15,6,10,1,2,0.0434980615973473,0.0213767793029547,-0.3402695953845978,0,2,0,5,13,2,-1,0,6,13,1,2,0.0168955195695162,-0.1305568963289261,0.1834042966365814,0,2,5,2,15,4,-1,5,3,15,2,2,0.0185353793203831,-0.0754243135452271,0.2354936003684998,0,2,5,4,15,3,-1,5,5,15,1,3,0.0173294302076101,-0.0853839814662933,0.2036404013633728,0,2,21,11,4,4,-1,21,12,4,2,2,0.008663074113428593,0.0385910011827946,-0.6201460957527161,1,2,5,0,1,2,-1,5,0,1,1,2,0.005705268122255802,0.0312472805380821,-0.4070529043674469,0,2,23,3,2,4,-1,23,3,1,4,2,-0.0018030379433184862,0.1957851052284241,-0.1433366984128952,0,2,7,1,4,6,-1,8,1,2,6,2,-0.0187879204750061,-0.8691418766975403,0.0169819705188274,0,2,8,6,11,3,-1,8,7,11,1,3,0.0186009202152491,-0.0818153098225594,0.189138799905777,0,2,0,13,2,1,-1,1,13,1,1,2,0.00008412059833062813,-0.1289912015199661,0.1211050972342491,0,2,21,12,3,3,-1,21,13,3,1,3,-0.005605712998658419,-0.4698300957679749,0.0159890707582235,0,2,1,12,3,3,-1,1,13,3,1,3,0.003519257064908743,0.0361930206418037,-0.4484112858772278,0,2,23,3,2,4,-1,23,3,1,4,2,0.0017741440096870065,-0.0433034710586071,0.139557495713234,0,2,0,3,2,4,-1,1,3,1,4,2,-0.001635042019188404,0.1395068019628525,-0.1124152988195419,0,3,21,3,4,10,-1,23,3,2,5,2,21,8,2,5,2,0.006479477044194937,-0.0600515604019165,0.0728941932320595,0,3,0,3,4,10,-1,0,3,2,5,2,2,8,2,5,2,-0.0203247498720884,0.429781585931778,-0.0396846085786819,0,2,24,1,1,4,-1,24,2,1,2,2,-0.006345304194837809,-0.2533842921257019,0.0242939405143261,0,2,0,0,1,6,-1,0,2,1,2,3,0.009095997549593449,0.0340887792408466,-0.4518730044364929,0,2,16,1,4,4,-1,17,1,2,4,2,0.0161635801196098,0.0068225921131670475,-0.7205737829208374,0,2,5,1,4,4,-1,6,1,2,4,2,-0.0112293101847172,-0.6191986203193665,0.0222914796322584,0,2,15,2,10,12,-1,15,8,10,6,2,-0.1763328015804291,-0.6819115877151489,0.008840755559504032,0,2,8,5,9,3,-1,8,6,9,1,3,0.0192962400615215,-0.079629048705101,0.2013067007064819,0,2,6,7,14,2,-1,6,8,14,1,2,0.0105654401704669,-0.0832984521985054,0.1872760951519013,0,2,10,7,5,4,-1,10,8,5,2,2,-0.006761673837900162,0.2069583982229233,-0.0813189968466759,0,2,23,12,2,3,-1,23,13,2,1,3,-0.0023086878936737776,-0.2798121869564056,0.0293897707015276,0,2,0,7,4,4,-1,0,8,4,2,2,-0.006918931845575571,-0.5095586180686951,0.0291001908481121,0,2,3,13,21,2,-1,10,13,7,2,3,-0.019592609256506,0.1248695999383926,-0.0666698589920998,0,2,6,1,3,1,-1,7,1,1,1,3,-0.000566988019272685,0.1772525012493134,-0.0755556300282478,0,3,16,0,2,2,-1,17,0,1,1,2,16,1,1,1,2,0.0006518710870295763,-0.0468317084014416,0.1377387940883637,0,3,7,0,2,2,-1,7,0,1,1,2,8,1,1,1,2,-0.0004324443871155381,0.1750548034906387,-0.0822173282504082,0,2,23,12,2,3,-1,23,13,2,1,3,0.003209128975868225,0.0258904304355383,-0.3546032905578613,0,2,8,8,9,2,-1,11,8,3,2,3,-0.028899360448122,-0.7315214276313782,0.0180548094213009,0,2,23,12,2,3,-1,23,13,2,1,3,0.0000988036990747787,-0.0383186303079128,0.0343451388180256,0,2,0,12,2,3,-1,0,13,2,1,3,-0.0022848090156912804,-0.3603490889072418,0.0380517281591892,0,2,8,4,9,9,-1,8,7,9,3,3,0.2230083048343658,-0.035387709736824,0.4118692874908447,0,3,3,11,12,4,-1,3,11,6,2,2,9,13,6,2,2,0.0038663020823150873,-0.114794097840786,0.1196625977754593,0,2,10,10,5,4,-1,10,11,5,2,2,0.0036781090311706066,-0.088786207139492,0.2093122005462647,0,2,7,14,6,1,-1,9,14,2,1,3,0.0036886930465698242,0.0420652516186237,-0.3311671912670136,0,2,4,0,18,15,-1,4,0,9,15,2,-0.5000842809677124,0.4582319855690002,-0.0300164502114058,0,2,0,3,4,4,-1,1,3,2,4,2,0.00324575905688107,-0.058139480650425,0.2244455963373184,0,2,22,0,3,4,-1,22,2,3,2,2,-0.000725153717212379,0.0857456997036934,-0.2164471000432968,0,2,0,0,20,8,-1,5,0,10,8,2,0.0756241232156754,-0.0728698670864105,0.1809341013431549,0,3,1,5,24,10,-1,13,5,12,5,2,1,10,12,5,2,-0.1401147991418839,-0.3049497008323669,0.0322263389825821,0,2,0,5,5,6,-1,0,7,5,2,3,0.0012914249673485756,-0.1651930958032608,0.0796989724040031,0,2,18,3,4,2,-1,18,4,4,1,2,0.004806306213140488,-0.0511631406843662,0.1528493016958237,1,2,2,3,4,2,-1,2,3,4,1,2,0.0197005104273558,-0.0214679203927517,0.589863121509552,0,2,14,1,6,6,-1,16,1,2,6,3,-0.0282465498894453,-0.3611007034778595,0.021594600751996,0,2,5,1,6,6,-1,7,1,2,6,3,0.0318388007581234,0.0213881190866232,-0.5591915845870972,0,2,11,10,6,1,-1,13,10,2,1,3,0.005292695946991444,0.0171414706856012,-0.3245368003845215,0,2,6,8,11,4,-1,6,9,11,2,2,0.009317620657384396,-0.069147951900959,0.1877806931734085,0,3,23,13,2,2,-1,24,13,1,1,2,23,14,1,1,2,0.0001981267996598035,-0.0710251703858376,0.1166272014379501,0,2,6,0,13,4,-1,6,1,13,2,2,0.0172033403068781,-0.0834768265485764,0.1448491960763931,1,2,17,0,3,1,-1,18,1,1,1,3,0.008054856210947037,0.0214444492012262,-0.2763100862503052,1,2,8,0,1,3,-1,7,1,1,1,3,0.006741908844560385,0.0341341383755207,-0.355537086725235,0,3,22,12,2,2,-1,23,12,1,1,2,22,13,1,1,2,0.00005713692007702775,-0.0699329003691673,0.0822271332144737,0,2,0,13,2,1,-1,1,13,1,1,2,-0.00006001443034620024,0.1533315926790237,-0.080194279551506,0,2,22,13,2,1,-1,22,13,1,1,2,-0.00006637762271566316,0.0740585327148438,-0.0435769110918045,0,2,1,13,2,1,-1,2,13,1,1,2,0.00007060549251036718,-0.1192411035299301,0.1157367005944252,0,2,22,13,3,1,-1,23,13,1,1,3,0.00007230143819469959,-0.0702318474650383,0.0793638303875923,0,2,1,2,2,12,-1,2,2,1,12,2,-0.0014867830323055387,0.124576099216938,-0.1076287999749184,0,2,18,3,4,2,-1,18,4,4,1,2,-0.005243482068181038,0.111677497625351,-0.0614912398159504,0,2,3,3,4,2,-1,3,4,4,1,2,0.007805523928254843,-0.0496800504624844,0.3046393096446991,0,2,24,0,1,12,-1,24,3,1,6,2,0.0167157892137766,0.0242684707045555,-0.5641499757766724,0,2,5,8,15,6,-1,5,10,15,2,3,-0.0197794307023287,0.129310205578804,-0.101400800049305,1,2,19,7,6,2,-1,19,7,6,1,2,-0.00006775221845600754,0.0773630663752556,-0.0876037329435349,0,2,1,10,5,3,-1,1,11,5,1,3,-0.0129433302208781,-0.8692914843559265,0.0158042199909687,0,2,24,0,1,12,-1,24,3,1,6,2,-0.0125468103215098,-0.1350758969783783,0.045630618929863,0,2,0,0,1,12,-1,0,3,1,6,2,0.007972786203026772,0.0405779294669628,-0.3409133851528168,0,2,9,0,12,1,-1,13,0,4,1,3,-0.006315289996564388,0.137299194931984,-0.056167159229517,0,2,4,0,12,1,-1,8,0,4,1,3,-0.0036897659301757812,0.1639326065778732,-0.0914164036512375,0,2,3,0,20,1,-1,8,0,10,1,2,0.005057888105511665,-0.0800797268748283,0.1433712989091873,0,2,1,0,9,2,-1,4,0,3,2,3,-0.0299335699528456,-0.5326762199401855,0.0227312203496695,0,2,11,6,8,2,-1,11,7,8,1,2,0.0070810988545417786,-0.0732182189822197,0.1027508974075317,0,2,11,3,3,8,-1,11,7,3,4,2,0.0508137904107571,0.0516868904232979,-0.2544622123241425,1,2,20,4,4,2,-1,21,5,2,2,2,0.0047044758684933186,-0.0572907589375973,0.076064832508564,1,2,6,7,2,6,-1,6,7,1,6,2,0.0046408819034695625,0.0559986904263496,-0.2172269970178604,1,2,20,4,4,2,-1,21,5,2,2,2,-0.009512174874544144,0.1812860071659088,-0.0377242304384708,1,2,5,4,2,4,-1,4,5,2,2,2,0.002572624944150448,-0.1238458007574081,0.1421934068202972,-1.3960490226745605,128,0,2,7,5,11,3,-1,7,6,11,1,3,0.0184330195188522,-0.1618741005659103,0.3351263999938965,0,2,20,1,3,4,-1,20,2,3,2,2,0.0048202150501310825,-0.097200833261013,0.2755692005157471,0,2,8,4,9,3,-1,8,5,9,1,3,0.0214508101344109,-0.1013654991984367,0.3922119140625,0,2,9,6,9,3,-1,9,7,9,1,3,0.0201995000243187,-0.1041551977396011,0.3485709130764008,0,3,0,7,8,8,-1,0,7,4,4,2,4,11,4,4,2,0.0154604399576783,-0.1814713031053543,0.2296576052904129,0,2,9,7,7,3,-1,9,8,7,1,3,0.0121146701276302,-0.0955794528126717,0.3321264982223511,0,2,8,3,9,3,-1,8,4,9,1,3,0.0166161693632603,-0.0751067474484444,0.3475660085678101,1,2,21,1,1,6,-1,19,3,1,2,3,-0.0151290399953723,0.1396238952875137,-0.1150512024760246,0,2,0,7,24,5,-1,6,7,12,5,2,-0.0707296282052994,0.2683610916137695,-0.1016533970832825,1,2,24,11,1,2,-1,24,11,1,1,2,0.002283175941556692,0.0443518795073032,-0.4632245898246765,1,2,5,2,8,5,-1,5,2,4,5,2,0.005585364997386932,0.0919516831636429,-0.3147256970405579,0,3,16,3,8,12,-1,20,3,4,6,2,16,9,4,6,2,-0.040678508579731,0.1471066027879715,-0.0726505890488625,0,3,0,0,24,12,-1,0,0,12,6,2,12,6,12,6,2,-0.1358978003263474,-0.5053529739379883,0.0469954796135426,0,3,8,2,10,8,-1,13,2,5,4,2,8,6,5,4,2,-0.0384974703192711,-0.3717043101787567,0.05520835891366,0,3,0,3,2,8,-1,0,3,1,4,2,1,7,1,4,2,0.0027928350027650595,-0.1162076964974403,0.1937797069549561,0,2,22,11,2,4,-1,22,12,2,2,2,0.005341255106031895,0.0129640102386475,-0.4924449026584625,0,2,1,11,2,4,-1,1,12,2,2,2,-0.002660450991243124,-0.4564127027988434,0.0437755398452282,0,2,12,2,13,12,-1,12,8,13,6,2,0.3209887146949768,0.0484563298523426,-0.3930096924304962,1,2,5,8,2,4,-1,5,8,1,4,2,-0.007249520160257816,-0.4188942015171051,0.0410884395241737,0,2,15,6,6,7,-1,17,6,2,7,3,0.0233532395213842,0.0302080996334553,-0.3757928013801575,0,2,4,6,6,6,-1,6,6,2,6,3,-0.022498020902276,-0.4524075090885162,0.0389229394495487,0,2,13,13,9,2,-1,16,13,3,2,3,-0.0238666702061892,-0.5288146734237671,0.0138155296444893,1,2,4,4,7,4,-1,3,5,7,2,2,-0.0336419306695461,0.4436714053153992,-0.0403416194021702,0,3,18,4,6,8,-1,21,4,3,4,2,18,8,3,4,2,0.0221408791840076,-0.0495454296469688,0.2051838934421539,0,2,3,14,9,1,-1,6,14,3,1,3,0.010603429749608,0.0319968499243259,-0.5148760080337524,0,3,11,11,14,4,-1,18,11,7,2,2,11,13,7,2,2,0.009635714814066887,-0.1237379983067513,0.1527843028306961,0,3,1,4,6,8,-1,1,4,3,4,2,4,8,3,4,2,0.0297187492251396,-0.0567854084074497,0.2904588878154755,1,2,23,0,2,2,-1,23,0,1,2,2,0.0002054842043435201,-0.2718465924263001,0.1070784032344818,0,2,6,0,13,4,-1,6,1,13,2,2,-0.0486726500093937,0.4235774874687195,-0.0456859990954399,0,2,11,0,4,2,-1,11,1,4,1,2,0.0025377809070050716,-0.0727348327636719,0.2103600949048996,1,2,2,0,2,2,-1,2,0,2,1,2,-0.003394152969121933,-0.3815236985683441,0.0445483289659023,0,2,20,9,5,6,-1,20,11,5,2,3,-0.0237451493740082,-0.4413619935512543,0.0249414704740047,0,2,5,2,15,3,-1,5,3,15,1,3,-0.020092299208045,0.1694606989622116,-0.0953345969319344,0,2,9,2,7,3,-1,9,3,7,1,3,0.0110265100374818,-0.0721762925386429,0.2484644949436188,0,2,2,14,21,1,-1,9,14,7,1,3,-0.0158068798482418,0.2241718024015427,-0.0724460408091545,0,2,8,11,16,4,-1,8,11,8,4,2,0.0490073598921299,-0.0551217384636402,0.2583925127983093,0,2,0,12,24,2,-1,12,12,12,2,2,0.0288716107606888,-0.1153011992573738,0.1924846023321152,0,2,22,9,3,6,-1,22,11,3,2,3,0.007399017922580242,0.0522995889186859,-0.2191856950521469,0,3,0,1,12,2,-1,0,1,6,1,2,6,2,6,1,2,-0.0061737848445773125,0.2038096934556961,-0.0696693286299706,0,2,8,9,9,3,-1,8,10,9,1,3,0.009433256462216377,-0.0534071698784828,0.2586283981800079,0,2,0,9,3,6,-1,0,11,3,2,3,0.0143210804089904,0.0336425192654133,-0.4679594039916992,0,3,11,11,14,4,-1,18,11,7,2,2,11,13,7,2,2,0.0224872808903456,-0.0431007482111454,0.1123055964708328,0,2,7,9,4,6,-1,8,9,2,6,2,-0.008801883086562157,-0.5997744798660278,0.0238500293344259,0,2,10,12,6,2,-1,12,12,2,2,3,-0.009282492101192474,-0.3792850077152252,0.0247395392507315,0,2,0,12,1,2,-1,0,13,1,1,2,-0.00003828879926004447,0.1094501987099648,-0.127059206366539,0,3,15,3,10,12,-1,20,3,5,6,2,15,9,5,6,2,-0.1060767024755478,0.1223917007446289,-0.0179706607013941,0,3,10,9,4,6,-1,10,9,2,3,2,12,12,2,3,2,0.0145011199638247,0.0254385806620121,-0.5499516725540161,0,2,11,3,6,4,-1,11,3,3,4,2,-0.0294254906475544,-0.4407989084720612,0.0163295306265354,0,2,0,0,14,14,-1,0,7,14,7,2,-0.2141247987747192,-0.581714928150177,0.0224080495536327,0,3,15,2,10,12,-1,20,2,5,6,2,15,8,5,6,2,-0.0159379299730062,0.0447719283401966,-0.0470217689871788,0,2,8,3,6,4,-1,11,3,3,4,2,0.0358322896063328,0.0257156305015087,-0.5430511236190796,0,2,23,5,2,6,-1,23,7,2,2,3,-0.011497899889946,-0.4132392108440399,0.0246592592447996,0,2,10,8,5,3,-1,10,9,5,1,3,0.0076680490747094154,-0.0596144981682301,0.2419749945402145,0,2,20,7,5,4,-1,20,8,5,2,2,0.0123357502743602,0.0375008806586266,-0.4776956140995026,0,2,7,10,11,4,-1,7,11,11,2,2,0.0130474697798491,-0.0609255395829678,0.2419895976781845,0,2,16,13,1,2,-1,16,14,1,1,2,0.000052074559789616615,-0.0981822684407234,0.0891881734132767,0,2,3,1,5,4,-1,3,2,5,2,2,0.0032866070978343487,-0.0941056609153748,0.1441165059804916,0,2,17,3,8,2,-1,17,4,8,1,2,-0.0417326614260674,-0.6405817270278931,0.0221338905394077,0,2,0,7,5,4,-1,0,8,5,2,2,0.00976381916552782,0.0412781611084938,-0.33542799949646,0,2,9,4,12,6,-1,13,4,4,6,3,0.1077456995844841,0.008176249451935291,-0.4347884058952332,0,2,4,4,12,6,-1,8,4,4,6,3,0.1119699031114578,0.0199715103954077,-0.6503595113754272,0,2,11,0,12,9,-1,11,0,6,9,2,0.0680430680513382,-0.0602735094726086,0.138449102640152,0,2,4,5,16,8,-1,12,5,8,8,2,0.1206192970275879,-0.0666261836886406,0.2128939926624298,0,2,16,12,2,1,-1,16,12,1,1,2,-0.0027089789509773254,-0.421476811170578,0.007006293162703514,0,2,7,12,2,1,-1,8,12,1,1,2,-0.00009879899153020233,0.1287330985069275,-0.1178120002150536,0,3,19,3,6,4,-1,22,3,3,2,2,19,5,3,2,2,0.017797689884901,-0.0398075394332409,0.2582241892814636,0,2,8,10,6,3,-1,10,10,2,3,3,-0.0155267501249909,-0.5375617146492004,0.0254285801202059,0,3,16,6,2,2,-1,17,6,1,1,2,16,7,1,1,2,-0.001137480023317039,0.1497129052877426,-0.0317900516092777,0,3,0,0,24,2,-1,0,0,12,1,2,12,1,12,1,2,0.0219873897731304,0.0302675794810057,-0.4156928062438965,0,3,16,6,2,2,-1,17,6,1,1,2,16,7,1,1,2,0.00005988097109366208,-0.0641673132777214,0.079953707754612,0,3,0,3,6,4,-1,0,3,3,2,2,3,5,3,2,2,0.007696608081459999,-0.0727465227246284,0.1708455979824066,0,2,22,0,3,4,-1,22,2,3,2,2,0.0006279948865994811,0.0341552086174488,-0.1379152983427048,0,2,11,0,2,3,-1,11,1,2,1,3,-0.001262214034795761,0.1615235060453415,-0.0755578279495239,1,2,21,7,2,4,-1,20,8,2,2,2,-0.0110059296712279,-0.4823004007339478,0.0268340297043324,0,2,4,9,10,1,-1,9,9,5,1,2,-0.009579379111528397,0.1946887969970703,-0.0669640377163887,0,3,16,6,2,2,-1,17,6,1,1,2,16,7,1,1,2,-0.00009182195935864002,0.0793757066130638,-0.0674495473504066,0,3,7,6,2,2,-1,7,6,1,1,2,8,7,1,1,2,0.0012134959688410163,-0.0511140711605549,0.2775780856609345,0,3,16,6,2,2,-1,17,6,1,1,2,16,7,1,1,2,0.0007920680218376219,-0.0284809302538633,0.1130611971020699,0,2,0,0,1,4,-1,0,2,1,2,2,0.002719694981351495,0.036205168813467,-0.3822895884513855,0,3,16,6,2,2,-1,17,6,1,1,2,16,7,1,1,2,-0.0070203691720962524,-0.7084425091743469,0.00009621540084481239,0,3,7,6,2,2,-1,7,6,1,1,2,8,7,1,1,2,-0.0007491076248697937,0.1899659931659699,-0.0707588419318199,0,2,8,9,9,6,-1,11,11,3,2,9,-0.0300100892782211,0.1409595012664795,-0.0833628922700882,0,2,0,5,2,6,-1,0,7,2,2,3,0.0211524497717619,0.025880130007863,-0.4697616100311279,1,2,14,4,4,7,-1,15,5,2,7,2,-0.0319705903530121,-0.512407124042511,0.0121158296242356,0,3,2,13,20,2,-1,2,13,10,1,2,12,14,10,1,2,0.01050771959126,0.038660790771246,-0.3098644018173218,0,3,23,7,2,2,-1,24,7,1,1,2,23,8,1,1,2,0.000048152811359614134,-0.061655979603529,0.0678063929080963,0,2,3,2,1,4,-1,3,3,1,2,2,0.0009649511775933206,-0.0613585598766804,0.1991685926914215,0,2,11,2,14,4,-1,11,3,14,2,2,-0.0404121391475201,0.1341411024332047,-0.0717744380235672,0,2,5,7,4,5,-1,6,7,2,5,2,0.0058856019750237465,0.0359793491661549,-0.3332307040691376,1,2,23,8,1,4,-1,22,9,1,2,2,0.0053272489458322525,0.032898910343647,-0.5153871178627014,0,2,2,0,10,8,-1,7,0,5,8,2,0.0532727986574173,-0.078457422554493,0.158265694975853,0,2,1,5,24,3,-1,9,6,8,1,9,0.0174429006874561,0.1339583992958069,-0.1186174973845482,0,2,10,0,4,10,-1,10,5,4,5,2,-0.0433590598404408,-0.2269790023565292,0.0467031300067902,0,2,5,4,15,3,-1,5,5,15,1,3,-0.0231206398457289,0.1634031981229782,-0.0685165524482727,0,2,11,6,3,6,-1,11,8,3,2,3,-0.009379617869853973,0.1582739949226379,-0.0771108269691467,0,2,18,8,7,3,-1,18,9,7,1,3,-0.014122249558568,-0.5691561102867126,0.0232016704976559,0,2,0,0,4,2,-1,0,1,4,1,2,-0.0155957797542214,-0.719995379447937,0.0111829601228237,1,2,20,0,2,1,-1,20,0,1,1,2,0.0007452989812009037,-0.076692558825016,0.0582969412207603,0,2,0,6,1,8,-1,0,8,1,4,2,-0.00512205995619297,-0.4147517085075378,0.0252124201506376,0,3,23,7,2,2,-1,24,7,1,1,2,23,8,1,1,2,-0.0000572679091419559,0.0905847102403641,-0.066890686750412,0,3,0,7,2,2,-1,0,7,1,1,2,1,8,1,1,2,0.0008843176765367389,-0.0570513382554054,0.2420555055141449,1,2,24,8,1,4,-1,23,9,1,2,2,-0.006399252917617559,-0.4766991138458252,0.0172231607139111,1,2,1,8,3,1,-1,2,9,1,1,3,0.00342156202532351,0.0330659411847591,-0.3505514860153198,0,3,21,7,2,2,-1,22,7,1,1,2,21,8,1,1,2,0.0006076180143281817,-0.0633307918906212,0.1801937073469162,0,2,5,8,15,6,-1,5,10,15,2,3,-0.0271245595067739,0.1347420066595078,-0.0843034014105797,0,2,6,7,14,8,-1,6,9,14,4,2,0.0320383384823799,-0.0676692426204681,0.179666593670845,0,2,1,4,10,2,-1,1,5,10,1,2,0.007258396130055189,-0.0986167713999748,0.1166217997670174,0,2,12,5,3,3,-1,13,6,1,1,9,-0.0037803640589118004,0.1233021020889282,-0.0477618910372257,0,2,0,4,7,3,-1,0,5,7,1,3,0.0392416305840015,0.0167705602943897,-0.7329750061035156,0,3,21,7,2,2,-1,22,7,1,1,2,21,8,1,1,2,-0.000053865249356022105,0.0850126668810844,-0.0751027390360832,0,3,2,7,2,2,-1,2,7,1,1,2,3,8,1,1,2,0.0008259296882897615,-0.055150531232357,0.2059426009654999,1,2,22,9,1,3,-1,21,10,1,1,3,-0.00005640352901536971,0.0762555226683617,-0.0699946209788322,0,3,11,13,2,2,-1,11,13,1,1,2,12,14,1,1,2,-0.0005692833219654858,-0.2483194023370743,0.0468857996165752,0,3,19,3,6,12,-1,22,3,3,6,2,19,9,3,6,2,0.0424826890230179,-0.0344216786324978,0.1484764963388443,0,3,0,3,6,12,-1,0,3,3,6,2,3,9,3,6,2,-0.0339534096419811,0.2843470871448517,-0.0431083589792252,0,2,17,1,4,11,-1,18,1,2,11,2,0.0188998207449913,0.0142998602241278,-0.4192070066928864,0,2,0,10,6,3,-1,0,11,6,1,3,0.0019765710458159447,0.0621932409703732,-0.1786025017499924,0,2,23,11,2,1,-1,23,11,1,1,2,-0.00005089443948236294,0.0948854833841324,-0.0689786225557327,0,2,4,1,4,11,-1,5,1,2,11,2,0.0114915501326323,0.0331886112689972,-0.3628959059715271,0,3,21,3,4,12,-1,23,3,2,6,2,21,9,2,6,2,-0.0215106792747974,0.2759737968444824,-0.03174914047122,0,3,0,3,4,12,-1,0,3,2,6,2,2,9,2,6,2,0.0130551997572184,-0.0830815583467484,0.1449849009513855,0,2,11,11,6,4,-1,11,12,6,2,2,0.006674758158624172,-0.0461902506649494,0.1383360028266907,0,2,6,11,13,4,-1,6,12,13,2,2,-0.007061630021780729,0.1968749016523361,-0.0837985798716545,0,2,11,10,3,1,-1,12,10,1,1,3,0.0006148166139610112,0.0542011298239231,-0.1981233954429627,0,2,5,2,13,8,-1,5,6,13,4,2,0.2860183119773865,0.0232954602688551,-0.4173370003700256,0,2,15,2,10,6,-1,15,4,10,2,3,0.0463717207312584,-0.0290123391896486,0.1808013021945953,0,2,0,2,10,6,-1,0,4,10,2,3,-0.0557247512042522,0.1358146965503693,-0.106122300028801,0,2,12,1,13,8,-1,12,3,13,4,2,-0.2584396898746491,-0.4910731911659241,0.0151501996442676,-1.3937480449676514,113,0,2,5,3,15,3,-1,5,4,15,1,3,-0.0417404398322105,0.4202992916107178,-0.138658806681633,0,2,9,3,9,3,-1,9,4,9,1,3,0.02743861079216,-0.0691855624318123,0.6378138065338135,1,2,3,2,7,3,-1,2,3,7,1,3,-0.0319233611226082,0.5562999844551086,-0.0588022507727146,0,2,5,2,15,3,-1,5,3,15,1,3,-0.0426339097321033,0.3957036137580872,-0.0923223569989204,0,2,5,4,15,3,-1,5,5,15,1,3,-0.0453329794108868,0.4831672012805939,-0.0990284606814384,0,3,17,6,2,2,-1,18,6,1,1,2,17,7,1,1,2,0.0014149550115689635,-0.038321029394865,0.3782787919044495,1,2,5,10,2,3,-1,5,10,1,3,2,0.003184457076713443,0.0845874175429344,-0.3629348874092102,0,2,23,11,2,4,-1,23,13,2,2,2,0.007986554875969887,0.0660245269536972,-0.4990949034690857,0,3,0,11,14,4,-1,0,11,7,2,2,7,13,7,2,2,0.008363707922399044,-0.1568834036588669,0.1732781976461411,0,2,10,4,6,3,-1,10,5,6,1,3,0.0166161693632603,-0.1092156991362572,0.3208172023296356,0,3,0,1,24,14,-1,0,1,12,7,2,12,8,12,7,2,-0.108372300863266,-0.3144314885139465,0.0960887372493744,0,3,1,5,24,8,-1,13,5,12,4,2,1,9,12,4,2,-0.0552641600370407,-0.3238588869571686,0.0760045275092125,0,3,0,0,24,12,-1,0,0,12,6,2,12,6,12,6,2,0.1263256967067719,0.0652572736144066,-0.4011892974376679,0,2,10,0,15,14,-1,10,7,15,7,2,0.388045608997345,0.0290472805500031,-0.2850419878959656,1,2,1,11,2,1,-1,1,11,1,1,2,0.0021647498942911625,0.0566388815641403,-0.4483107030391693,0,2,1,11,24,4,-1,1,11,12,4,2,-0.0850358307361603,0.2374248951673508,-0.1127642020583153,0,2,7,7,10,3,-1,7,8,10,1,3,0.0297137200832367,-0.0403699316084385,0.4747174084186554,0,2,9,5,7,3,-1,9,6,7,1,3,0.0189488306641579,-0.0794471576809883,0.2721098959445953,0,2,0,9,2,6,-1,0,11,2,2,3,-0.005443382076919079,-0.4018659889698029,0.0573576912283897,1,2,22,8,3,2,-1,22,8,3,1,2,-0.0074416291899979115,-0.4642170965671539,0.0343283303081989,0,2,12,6,1,3,-1,12,7,1,1,3,0.003174582961946726,-0.0719946026802063,0.2899833023548126,0,2,24,6,1,6,-1,24,8,1,2,3,-0.004643504042178392,-0.4219543039798737,0.0394870713353157,1,2,3,3,7,2,-1,3,3,7,1,2,-0.0225970800966024,0.2745698094367981,-0.0772427767515183,0,3,10,4,6,10,-1,13,4,3,5,2,10,9,3,5,2,0.0175681803375483,0.060469850897789,-0.2755838930606842,0,2,0,3,14,6,-1,0,6,14,3,2,0.2285360991954804,0.0372774116694927,-0.5375431180000305,0,3,9,0,8,8,-1,13,0,4,4,2,9,4,4,4,2,0.0323306396603584,0.0458961501717567,-0.3844825029373169,1,2,3,4,5,3,-1,2,5,5,1,3,-0.0285396501421928,0.5891790986061096,-0.0340728089213371,0,2,18,9,7,6,-1,18,11,7,2,3,0.0286119598895311,0.024174140766263,-0.2325512021780014,0,2,0,9,7,6,-1,0,11,7,2,3,0.0190214607864618,0.0562911406159401,-0.3404670059680939,0,2,12,1,3,3,-1,12,2,3,1,3,-0.005794208031147718,0.2392093986272812,-0.0638626366853714,0,3,9,2,6,8,-1,9,2,3,4,2,12,6,3,4,2,0.0198575407266617,0.0513716302812099,-0.3405377864837647,0,2,1,14,24,1,-1,7,14,12,1,2,-0.0227794591337442,0.2922581136226654,-0.0604945607483387,0,3,0,3,12,12,-1,0,3,6,6,2,6,9,6,6,2,0.1480142027139664,-0.0343834199011326,0.466711699962616,0,2,11,3,9,4,-1,14,3,3,4,3,-0.0337039716541767,-0.3770483136177063,0.0263036508113146,0,3,9,4,6,6,-1,9,4,3,3,2,12,7,3,3,2,-0.0162283908575773,-0.338245689868927,0.0570861399173737,1,2,20,0,4,1,-1,20,0,2,1,2,-0.00429419195279479,-0.329514890909195,0.0434178002178669,0,2,8,3,9,4,-1,11,3,3,4,3,-0.0235741101205349,-0.3945200145244598,0.0398236103355885,0,2,14,4,6,9,-1,16,4,2,9,3,0.0218487493693829,0.0268086697906256,-0.2596569955348969,0,2,5,4,6,9,-1,7,4,2,9,3,-0.0209309905767441,-0.3641955852508545,0.043782789260149,0,3,16,5,2,2,-1,17,5,1,1,2,16,6,1,1,2,0.0016019339673221111,-0.0240206904709339,0.218288004398346,0,2,0,0,15,12,-1,0,4,15,4,3,-0.548965573310852,-0.5673372149467468,0.0286840796470642,0,2,8,1,11,3,-1,8,2,11,1,3,0.0151870902627707,-0.081696130335331,0.2107073962688446,0,2,0,6,1,6,-1,0,8,1,2,3,-0.003065345110371709,-0.3701387047767639,0.0471426397562027,0,2,14,5,1,3,-1,14,6,1,1,3,-0.0022847671061754227,0.1813296973705292,-0.0419041812419891,0,3,7,2,2,2,-1,7,2,1,1,2,8,3,1,1,2,0.0013886080123484135,-0.0477169714868069,0.3120515942573547,1,2,22,9,1,4,-1,21,10,1,2,2,-0.0042354268953204155,-0.3120726943016052,0.0365724302828312,0,2,10,5,5,3,-1,10,6,5,1,3,0.004923470783978701,-0.1105178967118263,0.1364745944738388,0,2,14,5,1,3,-1,14,6,1,1,3,-0.000978243537247181,0.101911298930645,-0.0396985597908497,0,2,0,0,2,2,-1,0,1,2,1,2,0.0023952899500727654,0.0345855616033077,-0.4620797038078308,1,2,22,9,1,4,-1,21,10,1,2,2,-0.000027391599360271357,0.0470036789774895,-0.0576489008963108,1,2,3,9,4,1,-1,4,10,2,1,2,-0.003789501031860709,-0.3904446959495544,0.03927081823349,0,2,8,8,9,3,-1,8,9,9,1,3,0.025150740519166,-0.0313480608165264,0.4742729067802429,0,2,2,8,21,3,-1,9,9,7,1,9,-0.0545641481876373,0.1494560986757278,-0.0982013270258904,0,2,10,6,8,8,-1,12,6,4,8,2,-0.0416621901094913,-0.4245094060897827,0.0152987902984023,0,2,7,3,6,12,-1,9,3,2,12,3,-0.0207394007593393,-0.3218981921672821,0.0479229800403118,0,2,11,0,3,1,-1,12,0,1,1,3,-0.0009790281765162945,0.2330693006515503,-0.0597994215786457,0,2,10,10,4,4,-1,11,10,2,4,2,-0.004154779948294163,-0.3040251135826111,0.0456931404769421,0,3,16,5,2,2,-1,17,5,1,1,2,16,6,1,1,2,-0.000026045470804092474,0.055388018488884,-0.0540977194905281,0,3,7,5,2,2,-1,7,5,1,1,2,8,6,1,1,2,0.0010567409917712212,-0.052676759660244,0.2473292946815491,0,3,1,0,24,8,-1,13,0,12,4,2,1,4,12,4,2,0.1842923015356064,0.0165581107139587,-0.5789644718170166,0,2,6,6,3,1,-1,7,6,1,1,3,0.0014177090488374233,-0.0524071305990219,0.2524789869785309,0,2,21,12,4,3,-1,21,13,4,1,3,-0.004088235087692738,-0.3066633939743042,0.0269502196460962,0,3,0,3,4,4,-1,0,3,2,2,2,2,5,2,2,2,0.008542191237211227,-0.0481166206300259,0.2716326117515564,1,2,19,0,2,3,-1,19,0,1,3,2,0.0195690393447876,0.0251199807971716,-0.3371602892875671,0,2,2,2,15,6,-1,2,5,15,3,2,0.267735093832016,0.0231193397194147,-0.5075724124908447,0,2,5,0,15,2,-1,5,1,15,1,2,-0.0326806083321571,0.2773688137531281,-0.048139289021492,0,2,0,0,2,4,-1,0,1,2,2,2,-0.005057450849562883,-0.3639586865901947,0.0363070890307426,1,2,23,1,2,12,-1,20,4,2,6,2,0.0791702270507813,-0.0295530706644058,0.1632819026708603,0,2,4,2,2,3,-1,4,3,2,1,3,0.0022955629974603653,-0.0644191280007362,0.192163497209549,1,2,20,0,2,2,-1,20,0,1,2,2,0.00021744619880337268,-0.1248127967119217,0.0513428300619125,0,2,0,12,4,3,-1,0,13,4,1,3,-0.0059793200343847275,-0.5400406122207642,0.0236572697758675,0,2,13,1,12,8,-1,13,3,12,4,2,-0.2183004021644592,-0.3002713024616242,0.0188296400010586,1,2,5,0,2,2,-1,5,0,2,1,2,-0.002578265964984894,-0.2936800122261047,0.0437353104352951,0,2,11,2,14,12,-1,11,8,14,6,2,-0.1344317942857742,-0.2982031106948853,0.021951649338007,0,2,0,2,14,12,-1,0,8,14,6,2,0.3329834043979645,0.0417996607720852,-0.3464672863483429,0,2,16,7,6,8,-1,18,7,2,8,3,-0.0276046600192785,-0.3169625997543335,0.0150398099794984,1,2,7,0,13,2,-1,7,0,13,1,2,0.0284599401056767,0.031132759526372,-0.4115855097770691,0,2,16,7,6,8,-1,18,7,2,8,3,0.0568751804530621,0.0031998890917748213,-0.849632978439331,0,2,3,7,6,8,-1,5,7,2,8,3,-0.0264140591025352,-0.4030340015888214,0.028532799333334,0,3,17,7,2,2,-1,18,7,1,1,2,17,8,1,1,2,0.0008267092052847147,-0.047888670116663,0.2083473950624466,1,2,12,5,3,6,-1,13,6,1,6,3,-0.0174812003970146,-0.4784274101257324,0.0261973403394222,0,2,20,2,1,6,-1,20,4,1,2,3,0.0102093704044819,-0.0323491990566254,0.3333239853382111,0,3,7,2,2,2,-1,7,2,1,1,2,8,3,1,1,2,-0.0009044284233823419,0.2252988964319229,-0.0502184815704823,0,2,19,10,2,1,-1,19,10,1,1,2,-0.00005515550947166048,0.0854163095355034,-0.0922556668519974,0,2,6,4,8,2,-1,8,4,4,2,2,-0.0075864349491894245,-0.2745333909988403,0.0428331792354584,0,2,9,5,16,7,-1,13,5,8,7,2,0.0689363330602646,-0.0362212397158146,0.220213994383812,0,3,6,7,2,2,-1,6,7,1,1,2,7,8,1,1,2,0.0010017789900302887,-0.0464680194854736,0.2603206038475037,0,3,17,7,2,2,-1,18,7,1,1,2,17,8,1,1,2,-0.0015333900228142738,0.283126711845398,-0.0321949794888496,0,3,11,13,2,2,-1,11,13,1,1,2,12,14,1,1,2,0.0005027548177167773,0.054722610861063,-0.2383649945259094,0,3,17,7,2,2,-1,18,7,1,1,2,17,8,1,1,2,0.00006782740820199251,-0.0391390211880207,0.0501381084322929,0,3,6,7,2,2,-1,6,7,1,1,2,7,8,1,1,2,-0.0009686368284747005,0.2108709067106247,-0.0608406700193882,0,2,20,8,5,3,-1,20,9,5,1,3,0.0157267302274704,0.0115508204326034,-0.8977199196815491,0,3,11,13,2,2,-1,11,13,1,1,2,12,14,1,1,2,-0.0006198352784849703,-0.2865422964096069,0.0380632318556309,0,2,5,11,15,4,-1,5,12,15,2,2,-0.0148898903280497,0.218888595700264,-0.0534253492951393,0,2,0,8,6,3,-1,0,9,6,1,3,0.0091423774138093,0.0289719104766846,-0.4331383109092712,0,2,19,10,2,1,-1,19,10,1,1,2,0.00004456711030798033,-0.0493506006896496,0.0829902365803719,0,2,4,10,2,1,-1,5,10,1,1,2,-0.00004629544127965346,0.1145173981785774,-0.1154157966375351,0,3,1,0,24,6,-1,13,0,12,3,2,1,3,12,3,2,-0.09515430778265,-0.3621807992458344,0.0389639586210251,1,2,5,1,2,5,-1,5,1,1,5,2,0.0114479204639792,-0.0633771494030952,0.1799890995025635,0,3,21,3,4,12,-1,23,3,2,6,2,21,9,2,6,2,0.0168469492346048,-0.079555906355381,0.2080432027578354,0,3,0,3,4,12,-1,0,3,2,6,2,2,9,2,6,2,-0.0195328295230865,0.3306660056114197,-0.0368879809975624,0,2,24,2,1,6,-1,24,5,1,3,2,-0.009995151311159134,-0.2601873874664307,0.020032050088048,0,2,5,2,9,8,-1,8,2,3,8,3,0.0559661500155926,0.0298731103539467,-0.3797968029975891,0,2,24,2,1,6,-1,24,5,1,3,2,0.0223989300429821,0.009444269351661205,-0.3070712089538574,0,2,0,2,1,6,-1,0,5,1,3,2,-0.011130659841001,-0.4547461867332459,0.0237820893526077,0,2,9,6,9,4,-1,9,7,9,2,2,0.0103914495557547,-0.0801509991288185,0.1017400026321411,0,2,11,6,3,4,-1,11,7,3,2,2,-0.009707638993859291,0.322004497051239,-0.0475250408053398,0,2,20,14,2,1,-1,20,14,1,1,2,0.00001917052941280417,-0.061904601752758,0.0758714973926544,0,2,0,8,6,4,-1,0,9,6,2,2,-0.005766047164797783,-0.2893261909484863,0.0357113592326641,0,3,16,0,2,2,-1,17,0,1,1,2,16,1,1,1,2,-0.000801895628683269,0.1487676948308945,-0.0337995104491711,0,2,8,0,9,15,-1,11,5,3,5,9,-0.4516898989677429,-0.5800644755363464,0.0182942803949118,0,2,13,9,4,6,-1,14,9,2,6,2,0.007116700056940317,0.0221952199935913,-0.4342006146907806,0,2,8,2,9,3,-1,8,3,9,1,3,0.0214324798434973,-0.0425198413431644,0.271175891160965,-1.3605639934539795,172,0,3,0,9,8,6,-1,0,9,4,3,2,4,12,4,3,2,0.008846518583595753,-0.2059727013111115,0.2158975005149841,0,2,20,1,5,4,-1,20,3,5,2,2,-0.0114869000390172,0.1450283974409103,-0.2512278854846954,0,2,4,3,16,7,-1,8,3,8,7,2,0.06137790158391,-0.1210888996720314,0.2893109023571014,0,2,15,0,10,8,-1,15,2,10,4,2,-0.05146674066782,0.0770430117845535,-0.1447598934173584,0,3,0,2,24,10,-1,0,2,12,5,2,12,7,12,5,2,0.0990432873368263,0.0879464074969292,-0.3668490052223206,0,2,20,9,5,4,-1,20,10,5,2,2,0.00602407893165946,0.0559716187417507,-0.423053503036499,0,2,0,14,22,1,-1,11,14,11,1,2,0.009322894737124443,-0.1488721966743469,0.1423504054546356,1,2,22,0,3,12,-1,22,0,3,6,2,-0.0837828367948532,-0.0506230294704437,0.0671857669949532,0,2,0,4,2,2,-1,1,4,1,2,2,-0.001436957041732967,0.1669974029064179,-0.118479497730732,0,2,20,9,5,4,-1,20,10,5,2,2,-0.008492374792695045,-0.5746508240699768,0.0469529181718826,0,2,0,9,5,4,-1,0,10,5,2,2,0.006158161908388138,0.0387838594615459,-0.4179377853870392,0,2,7,3,18,6,-1,13,5,6,2,9,0.3882668018341065,-0.0341588892042637,0.3883490860462189,0,2,4,10,10,1,-1,9,10,5,1,2,-0.0062880381010472775,0.1877942979335785,-0.1096756979823113,1,2,21,1,4,10,-1,21,1,2,10,2,-0.0886473506689072,0.2961074113845825,-0.0496502704918385,1,2,4,1,10,4,-1,4,1,10,2,2,0.0573849491775036,-0.0621429793536663,0.4039953947067261,0,2,16,8,4,7,-1,17,8,2,7,2,0.006304989103227854,0.03024085983634,-0.2553277909755707,0,2,5,8,4,7,-1,6,8,2,7,2,-0.0128176100552082,-0.749150276184082,0.0188356805592775,0,2,6,0,13,2,-1,6,1,13,1,2,0.006515969056636095,-0.0749715119600296,0.1975888013839722,0,2,0,12,8,3,-1,0,13,8,1,3,0.00829929206520319,0.0329895503818989,-0.434665709733963,1,2,22,0,2,1,-1,22,0,1,1,2,0.006391171831637621,0.0297571904957294,-0.3072845935821533,1,2,3,0,1,2,-1,3,0,1,1,2,0.00006894963735248893,-0.1729405969381332,0.09270279109478,0,3,17,3,8,8,-1,21,3,4,4,2,17,7,4,4,2,0.0413548089563847,-0.0279047600924969,0.1629645973443985,0,2,6,2,13,6,-1,6,4,13,2,3,0.1899937987327576,-0.031295470893383,0.4835174977779388,0,2,10,0,15,14,-1,10,7,15,7,2,-0.1273290067911148,-0.4309565126895905,0.0414485186338425,1,2,1,1,12,1,-1,1,1,6,1,2,-0.0356059707701206,-0.2009662985801697,0.0775555819272995,0,2,18,3,4,2,-1,18,4,4,1,2,-0.007276066113263369,0.1169442981481552,-0.0564889013767242,0,2,7,11,6,4,-1,9,11,2,4,3,-0.0167282801121473,-0.5582438707351685,0.024678710848093,0,2,20,4,5,6,-1,20,6,5,2,3,0.003516335040330887,-0.1312393993139267,0.0638676136732101,0,2,1,12,5,3,-1,1,13,5,1,3,-0.003770946990698576,-0.33209028840065,0.0413776598870754,0,3,1,0,24,2,-1,13,0,12,1,2,1,1,12,1,2,-0.0138869602233171,-0.3127424120903015,0.0425702482461929,1,2,3,3,5,3,-1,2,4,5,1,3,0.00935373269021511,-0.0667856708168983,0.1907455027103424,0,2,17,6,8,4,-1,19,6,4,4,2,-0.0194346699863672,0.315269410610199,-0.047358151525259,1,2,5,0,1,3,-1,4,1,1,1,3,0.006251101847738028,0.0309588797390461,-0.3830946981906891,0,2,23,0,2,4,-1,23,2,2,2,2,-0.025296900421381,-0.2962245941162109,0.0151915997266769,0,2,0,0,3,6,-1,0,3,3,3,2,-0.003075412940233946,0.0729133188724518,-0.1764045059680939,0,3,11,1,14,2,-1,18,1,7,1,2,11,2,7,1,2,0.007800100836902857,-0.0501575507223606,0.1162889003753662,0,3,0,1,14,2,-1,0,1,7,1,2,7,2,7,1,2,-0.007768054027110338,0.2415755987167358,-0.0778944417834282,0,2,5,4,15,6,-1,5,6,15,2,3,-0.0880923122167587,0.2515082955360413,-0.0482993088662624,0,2,10,7,2,2,-1,10,8,2,1,2,-0.0017023129621520638,0.1797576993703842,-0.0970716699957848,1,2,13,2,8,5,-1,15,4,4,5,2,-0.099703423678875,-0.4700092971324921,0.0155829498544335,1,2,2,9,2,2,-1,2,9,1,2,2,0.004665717016905546,0.029513580724597,-0.4018146991729736,0,2,12,8,6,3,-1,14,8,2,3,3,-0.0176613796502352,-0.5449513792991638,0.0168585199862719,0,2,0,9,24,6,-1,8,11,8,2,9,-0.2230933010578156,0.1843273043632507,-0.0632233396172524,0,2,1,12,24,3,-1,9,13,8,1,9,0.052850779145956,-0.0734771713614464,0.1994421929121018,0,2,5,11,15,4,-1,5,13,15,2,2,-0.0246656592935324,0.2699545025825501,-0.0523515492677689,1,2,24,10,1,4,-1,23,11,1,2,2,-0.0049799769185483456,-0.4495851993560791,0.026983380317688,1,2,1,10,4,1,-1,2,11,2,1,2,0.003053586930036545,0.0375075116753578,-0.3464896082878113,0,2,15,1,10,14,-1,15,8,10,7,2,-0.0263100396841764,-0.1766241043806076,0.0256136003881693,0,2,0,7,4,2,-1,2,7,2,2,2,-0.004868402145802975,0.187709704041481,-0.0605575516819954,0,2,20,4,5,6,-1,20,6,5,2,3,0.0458405800163746,0.0330421291291714,-0.2026686072349548,0,2,0,4,7,6,-1,0,6,7,2,3,0.006748796906322241,-0.1384654939174652,0.1144922971725464,0,2,11,7,6,3,-1,11,8,6,1,3,0.010793830268085,-0.0550474487245083,0.1810662001371384,0,2,8,10,9,1,-1,11,10,3,1,3,-0.0132016502320766,-0.4654887914657593,0.0258085392415524,0,2,5,10,15,1,-1,10,10,5,1,3,-0.0049963342025876045,0.1138966009020805,-0.1140139997005463,0,2,7,8,6,3,-1,9,8,2,3,3,-0.0158193595707417,-0.4853562116622925,0.0220876205712557,0,2,23,12,2,1,-1,23,12,1,1,2,0.0000682646204950288,-0.0819193720817566,0.0840993970632553,0,3,0,13,24,2,-1,0,13,12,1,2,12,14,12,1,2,-0.0156373791396618,-0.4515635073184967,0.0227358005940914,0,2,9,9,7,3,-1,9,10,7,1,3,0.008300557732582092,-0.0514142103493214,0.2212347984313965,0,2,0,6,2,4,-1,0,7,2,2,2,0.006699975114315748,0.0297896005213261,-0.35434889793396,0,2,18,2,5,4,-1,18,3,5,2,2,0.005174416117370129,-0.0496886894106865,0.220291405916214,0,3,1,4,8,2,-1,1,4,4,1,2,5,5,4,1,2,0.006127804052084684,-0.0630758926272392,0.1783366054296494,0,2,21,8,4,4,-1,21,9,4,2,2,0.0068791587837040424,0.0284415297210217,-0.2993854880332947,0,2,4,4,8,4,-1,4,5,8,2,2,-0.0217361003160477,0.1791318953037262,-0.0602877512574196,0,2,11,4,14,4,-1,11,5,14,2,2,0.0140090202912688,-0.1060196980834007,0.1548174023628235,0,2,3,0,18,9,-1,12,0,9,9,2,0.2186813950538635,-0.0483517609536648,0.257346898317337,0,2,3,0,20,15,-1,3,0,10,15,2,0.2838009893894196,-0.0509055890142918,0.293605387210846,1,2,12,1,6,8,-1,14,3,2,8,3,0.1209316030144692,0.017309570685029,-0.6926872134208679,1,2,17,4,1,9,-1,14,7,1,3,3,0.0569618307054043,-0.0186788197606802,0.3227567970752716,0,2,6,7,4,8,-1,7,7,2,8,2,-0.00905009638518095,-0.4240661859512329,0.0268415194004774,0,2,21,5,4,3,-1,21,6,4,1,3,0.0231182798743248,0.0105462800711393,-0.5228689908981323,0,3,7,0,2,2,-1,7,0,1,1,2,8,1,1,1,2,0.0011480690445750952,-0.0459857396781445,0.2319914996623993,0,2,21,8,4,3,-1,21,9,4,1,3,-0.009890930727124214,-0.5407552123069763,0.0142617002129555,0,3,7,1,2,2,-1,7,1,1,1,2,8,2,1,1,2,0.0007059997878968716,-0.0649549588561058,0.1677557975053787,0,3,16,1,2,2,-1,17,1,1,1,2,16,2,1,1,2,-0.00008231129322666675,0.0727679133415222,-0.0542482398450375,0,2,0,8,4,3,-1,0,9,4,1,3,0.005338047165423632,0.0320924408733845,-0.3186857998371124,0,3,20,9,2,2,-1,21,9,1,1,2,20,10,1,1,2,0.0000598358892602846,-0.0492977797985077,0.0571143105626106,0,3,3,9,2,2,-1,3,9,1,1,2,4,10,1,1,2,0.00004074164098710753,-0.0992263928055763,0.1105673015117645,0,3,19,3,6,12,-1,22,3,3,6,2,19,9,3,6,2,-0.0271146595478058,0.2459900975227356,-0.0621489509940147,0,3,7,1,2,2,-1,7,1,1,1,2,8,2,1,1,2,-0.000884772278368473,0.202344998717308,-0.0529261194169521,0,2,7,4,12,3,-1,7,5,12,1,3,-0.0192636791616678,0.1516259014606476,-0.0715369805693626,0,2,0,0,11,2,-1,0,1,11,1,2,0.009689152240753174,0.035710871219635,-0.3255082964897156,0,2,13,2,6,5,-1,15,2,2,5,3,-0.0228419005870819,-0.3499914109706879,0.0171892996877432,0,3,0,0,24,10,-1,0,0,12,5,2,12,5,12,5,2,-0.1477797031402588,-0.4319078028202057,0.0216299500316381,0,2,20,4,2,3,-1,20,5,2,1,3,0.0023399880155920982,-0.0442668199539185,0.0963377729058266,0,2,0,3,7,4,-1,0,4,7,2,2,-0.0728321895003319,-0.818618893623352,0.0117990002036095,0,2,11,1,14,14,-1,11,8,14,7,2,-0.3072721064090729,-0.7007309198379517,0.003556411014869809,0,2,6,2,6,5,-1,8,2,2,5,3,-0.0207666493952274,-0.3913905024528503,0.0246222894638777,0,3,16,0,2,2,-1,17,0,1,1,2,16,1,1,1,2,-0.0036341920495033264,-0.4501088857650757,0.0055562350898981094,0,3,7,0,2,2,-1,7,0,1,1,2,8,1,1,1,2,-0.00007079407077981159,0.1087834984064102,-0.0905004590749741,0,3,16,0,2,2,-1,17,0,1,1,2,16,1,1,1,2,-0.00008831486047711223,0.0641764104366302,-0.0494646318256855,0,2,2,0,20,1,-1,7,0,10,1,2,-0.0110706500709057,0.1473083049058914,-0.0670493170619011,0,2,11,0,14,1,-1,11,0,7,1,2,0.006362635176628828,-0.0400333292782307,0.0926633775234222,0,2,9,3,6,2,-1,9,4,6,1,2,-0.007749951910227537,0.1392461061477661,-0.0774780735373497,0,2,11,3,3,4,-1,11,4,3,2,2,0.004753272980451584,-0.0729171708226204,0.1706562042236328,0,2,0,11,18,3,-1,6,12,6,1,9,-0.0168079808354378,0.130800798535347,-0.0801806673407555,0,3,15,3,10,12,-1,20,3,5,6,2,15,9,5,6,2,0.1279494017362595,-0.0199226494878531,0.3711799085140228,0,2,0,3,14,3,-1,0,4,14,1,3,-0.018189599737525,0.1235873028635979,-0.0830406174063683,0,2,9,4,8,3,-1,11,4,4,3,2,-0.0161725897341967,-0.449065089225769,0.0227566491812468,0,2,0,12,2,1,-1,1,12,1,1,2,0.00006804615259170532,-0.1011824011802673,0.0935735777020454,0,3,23,13,2,2,-1,24,13,1,1,2,23,14,1,1,2,0.00011714019638020545,-0.0810816064476967,0.1062628999352455,0,3,0,13,2,2,-1,0,13,1,1,2,1,14,1,1,2,0.00005452167897601612,-0.0932891815900803,0.1159989982843399,0,2,9,12,8,1,-1,11,12,4,1,2,-0.009509580209851265,-0.505190372467041,0.0141592798754573,0,2,0,7,6,4,-1,0,8,6,2,2,-0.0028461390174925327,-0.1991575956344605,0.0473652109503746,0,3,19,3,6,12,-1,22,3,3,6,2,19,9,3,6,2,0.0232862401753664,-0.0403292290866375,0.0805157274007797,0,3,0,3,6,12,-1,0,3,3,6,2,3,9,3,6,2,-0.0426056496798992,0.3344807922840118,-0.0383727103471756,0,2,23,7,2,4,-1,23,8,2,2,2,0.004510118160396814,0.0263549294322729,-0.2349215000867844,0,2,0,7,2,4,-1,0,8,2,2,2,0.006181781180202961,0.0211725104600191,-0.4420514106750488,0,3,13,7,8,4,-1,17,7,4,2,2,13,9,4,2,2,-0.0106069697067142,0.0654574930667877,-0.0324725992977619,0,2,0,1,10,14,-1,0,8,10,7,2,-0.085813581943512,-0.3406231105327606,0.0301514994353056,0,2,9,8,7,3,-1,9,9,7,1,3,0.006275806110352278,-0.0619911886751652,0.1503033936023712,0,2,9,8,3,4,-1,9,9,3,2,2,-0.0030965260230004787,0.1481299996376038,-0.0813362672924995,1,2,18,10,2,3,-1,17,11,2,1,3,-0.0111239803954959,-0.4638158082962036,0.0152134699746966,1,2,7,10,3,2,-1,8,11,1,2,3,-0.011103980243206,-0.6005380153656006,0.0135854296386242,1,2,23,0,2,1,-1,23,0,1,1,2,-0.003294483060017228,-0.4641366004943848,0.026226969435811,1,2,12,8,4,3,-1,12,8,2,3,2,0.0113766100257635,-0.0565435998141766,0.1575082987546921,0,2,5,7,15,3,-1,10,8,5,1,9,-0.0294652003794909,0.1486423015594482,-0.0651882514357567,0,2,0,0,20,8,-1,10,0,10,8,2,0.0491673015058041,-0.0922251716256142,0.1015425994992256,1,2,21,0,4,3,-1,20,1,4,1,3,-0.0209590997546911,0.1749638020992279,-0.0255501996725798,1,2,4,0,3,4,-1,5,1,1,4,3,0.0054627470672130585,-0.0626592189073563,0.1695216000080109,0,2,18,3,5,2,-1,18,4,5,1,2,-0.0043515427969396114,0.0822615697979927,-0.0598390214145184,0,2,2,3,5,2,-1,2,4,5,1,2,0.007477249950170517,-0.049545519053936,0.2469687014818192,1,2,13,0,2,5,-1,13,0,1,5,2,-0.0374278612434864,-0.9178332090377808,0.0035620180424302816,0,2,5,12,6,3,-1,7,13,2,1,9,-0.0248439908027649,-0.4893918037414551,0.0171825792640448,1,2,13,0,2,5,-1,13,0,1,5,2,0.008012044243514538,0.02174236997962,-0.0648176670074463,0,2,9,6,4,2,-1,9,7,4,1,2,0.005730602890253067,-0.0707883909344673,0.1390995979309082,0,2,18,9,4,3,-1,18,10,4,1,3,0.0109893204644322,0.007036118768155575,-0.3556833863258362,0,2,3,9,4,3,-1,3,10,4,1,3,-0.0035342550836503506,-0.2303902953863144,0.0395394414663315,0,2,7,9,15,6,-1,7,12,15,3,2,0.0326121784746647,-0.0834509506821632,0.0961622893810272,0,3,4,1,12,6,-1,4,1,6,3,2,10,4,6,3,2,-0.0519190989434719,-0.3597438931465149,0.023558309301734,0,2,10,5,14,10,-1,10,10,14,5,2,0.2802706062793732,0.0191025994718075,-0.2738722860813141,0,2,10,6,2,3,-1,10,7,2,1,3,-0.0018680640496313572,0.1557087004184723,-0.0592420399188995,1,2,13,4,4,6,-1,14,5,2,6,2,0.0412711799144745,0.00921028945595026,-0.6225361824035645,1,2,12,4,6,4,-1,11,5,6,2,2,-0.0341574586927891,-0.6910676956176758,0.0140588199719787,0,2,19,0,5,3,-1,19,1,5,1,3,0.0281112492084503,0.006389203947037458,-0.6016489267349243,0,2,6,7,3,1,-1,7,7,1,1,3,-0.0009767578449100256,0.1663821935653687,-0.053310938179493,0,2,19,0,5,3,-1,19,1,5,1,3,-0.0284041091799736,-0.8431190848350525,0.004920249804854393,0,2,6,7,3,1,-1,7,7,1,1,3,0.000976581359282136,-0.0524366609752178,0.1696853935718536,0,2,11,0,6,15,-1,13,0,2,15,3,-0.079386442899704,-0.7418122291564941,0.004584290087223053,0,3,0,2,2,6,-1,0,2,1,3,2,1,5,1,3,2,0.0029205000028014183,-0.0499707907438278,0.1705241948366165,1,2,21,0,2,1,-1,21,0,1,1,2,-0.00497920997440815,-0.4247047007083893,0.0113332699984312,1,2,4,0,1,2,-1,4,0,1,1,2,0.007530936039984226,0.0200634505599737,-0.4817556142807007,0,2,9,0,14,8,-1,9,0,7,8,2,-0.1206317022442818,0.1783839017152786,-0.0404023304581642,0,3,7,0,2,2,-1,7,0,1,1,2,8,1,1,1,2,0.00006450695218518376,-0.08585424721241,0.1069532036781311,0,2,4,6,18,4,-1,4,6,9,4,2,0.1407386958599091,-0.0227742493152618,0.4258378148078919,0,3,0,7,2,2,-1,0,7,1,1,2,1,8,1,1,2,0.0005870871245861053,-0.0585701502859592,0.1556326001882553,0,3,23,7,2,2,-1,24,7,1,1,2,23,8,1,1,2,0.000042137140553677455,-0.057670820504427,0.0648988783359528,0,3,0,7,2,2,-1,0,7,1,1,2,1,8,1,1,2,-0.00005485915971803479,0.1383187025785446,-0.0935516208410263,0,3,23,7,2,2,-1,24,7,1,1,2,23,8,1,1,2,-0.00008131826325552538,0.0786737129092216,-0.0584529899060726,0,3,0,7,2,2,-1,0,7,1,1,2,1,8,1,1,2,0.00010710170317906886,-0.1036069020628929,0.1105291023850441,0,2,24,6,1,4,-1,24,7,1,2,2,0.005948519799858332,0.0124739902094007,-0.6046726703643799,0,2,0,6,1,4,-1,0,7,1,2,2,-0.003834115108475089,-0.5651066899299622,0.0139579800888896,0,2,11,0,6,15,-1,13,0,2,15,3,0.048183299601078,0.006878762040287256,-0.2265198975801468,0,2,0,1,2,3,-1,0,2,2,1,3,0.009846852160990238,0.0149204200133681,-0.5408421754837036,0,2,8,1,9,3,-1,8,2,9,1,3,0.007079598028212786,-0.0740584135055542,0.1212510019540787,0,2,8,1,3,3,-1,9,2,1,1,9,-0.001718766987323761,0.1150275021791458,-0.0767944231629372,1,2,19,7,5,3,-1,18,8,5,1,3,0.0141321197152138,0.0222348105162382,-0.3713991045951843,1,2,6,7,3,5,-1,7,8,1,5,3,-0.008070403710007668,-0.2536310851573944,0.0307344105094671,0,3,1,0,24,14,-1,13,0,12,7,2,1,7,12,7,2,0.2283755987882614,0.0168569702655077,-0.5456647872924805,0,2,8,11,9,4,-1,8,12,9,2,2,-0.0106975501403213,0.1705504059791565,-0.048232439905405,0,2,6,11,14,4,-1,6,12,14,2,2,0.006105799227952957,-0.0747807994484901,0.1244964972138405,0,2,0,11,3,4,-1,0,12,3,2,2,0.003582532051950693,0.0343106091022491,-0.2529211938381195,0,2,17,11,8,2,-1,17,12,8,1,2,0.008796939626336098,0.0227318406105042,-0.2092120051383972,0,2,0,11,8,2,-1,0,12,8,1,2,-0.0117600196972489,-0.578932523727417,0.0150208799168468,0,2,23,13,1,2,-1,23,14,1,1,2,0.0014420140068978071,0.0108067002147436,-0.174350306391716,0,2,1,13,1,2,-1,1,14,1,1,2,-0.00004906246977043338,0.0891510024666786,-0.0946391522884369,0,2,9,0,14,8,-1,9,0,7,8,2,0.0330546088516712,-0.0502973310649395,0.072425939142704,0,2,0,1,14,8,-1,0,3,14,4,2,-0.0449321903288364,0.0714013203978539,-0.1246540024876595,0,2,20,4,2,3,-1,20,5,2,1,3,-0.0123274503275752,0.2216438055038452,-0.0160399992018938,0,2,0,1,14,9,-1,0,4,14,3,3,-0.3724926114082336,-0.3693152964115143,0.0260022208094597,0,2,9,13,9,1,-1,12,13,3,1,3,0.0152763100340962,0.0053399899043142796,-0.5456783771514893,0,2,7,13,9,1,-1,10,13,3,1,3,-0.0145687395706773,-0.5883231163024902,0.0139877004548907,0,3,20,7,2,2,-1,21,7,1,1,2,20,8,1,1,2,0.000998902483843267,-0.0358810797333717,0.174325704574585,-1.2964390516281128,201,0,2,5,9,15,6,-1,5,12,15,3,2,0.0572950802743435,-0.1768665015697479,0.2448291033506393,0,2,21,0,2,6,-1,21,3,2,3,2,-0.010082540102303,0.1378919035196304,-0.2031147032976151,0,3,4,4,8,10,-1,4,4,4,5,2,8,9,4,5,2,-0.0185250397771597,0.1623972952365875,-0.1676190942525864,0,2,16,1,8,6,-1,16,3,8,2,3,-0.0527544915676117,0.134710505604744,-0.1428814977407455,1,2,2,1,11,2,-1,2,1,11,1,2,0.024354750290513,-0.0266546793282032,0.4326488971710205,0,2,20,4,5,6,-1,20,6,5,2,3,0.0634179636836052,0.0422610901296139,-0.401317685842514,0,2,0,4,5,6,-1,0,6,5,2,3,0.0038921029772609472,-0.1906750947237015,0.1267316043376923,0,3,19,11,6,4,-1,22,11,3,2,2,19,13,3,2,2,0.0015238909982144833,-0.1371546983718872,0.1246439963579178,0,2,10,4,5,2,-1,10,5,5,1,2,-0.006765741854906082,0.2558242976665497,-0.0607152618467808,0,2,7,6,11,4,-1,7,7,11,2,2,-0.0241763703525066,0.285988986492157,-0.0642128363251686,1,2,9,2,4,4,-1,9,2,2,4,2,-0.009176191873848438,0.1021848022937775,-0.1999447047710419,0,2,1,0,24,11,-1,7,0,12,11,2,-0.1578399986028671,0.239830806851387,-0.0785783529281616,0,2,4,0,10,10,-1,9,0,5,10,2,0.0487401895225048,-0.1100914031267166,0.1558353006839752,1,2,23,8,2,4,-1,23,8,2,2,2,0.0191179793328047,0.0197066999971867,-0.3720233142375946,1,2,2,8,4,2,-1,2,8,2,2,2,-0.0127781601622701,-0.4160012900829315,0.0353787206113338,0,3,23,3,2,12,-1,24,3,1,6,2,23,9,1,6,2,0.0026996301021426916,-0.0985597372055054,0.1149144023656845,0,3,9,3,6,12,-1,9,3,3,6,2,12,9,3,6,2,0.0245021991431713,0.0430920794606209,-0.3663294017314911,0,3,1,0,24,12,-1,13,0,12,6,2,1,6,12,6,2,0.0850031301379204,0.0430114008486271,-0.2886289954185486,0,3,0,3,2,12,-1,0,3,1,6,2,1,9,1,6,2,0.003164753085002303,-0.114293098449707,0.1279425024986267,1,2,14,8,3,4,-1,14,8,3,2,2,0.0116577902808785,-0.0515255816280842,0.1422376930713654,0,2,0,0,6,1,-1,2,0,2,1,3,-0.006680144928395748,-0.4743103981018066,0.0287305805832148,0,2,9,2,16,7,-1,13,2,8,7,2,-0.0388207696378231,0.0953134000301361,-0.0473909191787243,1,2,8,7,1,6,-1,8,7,1,3,2,-0.0254217702895403,-0.4219881892204285,0.028437789529562,0,2,8,7,9,4,-1,8,8,9,2,2,-0.0121460696682334,0.1830082982778549,-0.0762820765376091,0,2,7,5,10,4,-1,7,6,10,2,2,-0.026787219569087,0.2859373092651367,-0.0522297993302345,1,2,14,2,1,6,-1,12,4,1,2,3,-0.0116149904206395,0.1138594970107079,-0.0663506835699081,0,3,0,3,8,12,-1,0,3,4,6,2,4,9,4,6,2,-0.0599568895995617,0.2777940034866333,-0.0470041483640671,0,2,19,13,6,2,-1,19,13,3,2,2,-0.00867370143532753,0.2129196971654892,-0.0287764091044664,0,2,0,13,6,2,-1,3,13,3,2,2,0.002854354912415147,-0.1221636980772018,0.1421594023704529,0,2,23,12,1,3,-1,23,13,1,1,3,0.002271306002512574,0.0182375106960535,-0.4104354083538055,0,2,1,12,1,3,-1,1,13,1,1,3,-0.0012334890197962523,-0.3772745132446289,0.035043578594923,0,2,23,12,1,3,-1,23,13,1,1,3,-0.0026904400438070297,-0.4196098148822784,0.0100445803254843,0,2,4,10,10,1,-1,9,10,5,1,2,-0.0026551370974630117,0.1150795966386795,-0.1072231009602547,0,2,23,12,1,3,-1,23,13,1,1,3,-0.000056895318266469985,0.0416303612291813,-0.0317232310771942,0,2,1,12,1,3,-1,1,13,1,1,3,0.000987313687801361,0.0429715514183044,-0.2815021872520447,0,2,11,2,12,4,-1,11,3,12,2,2,0.0182135794311762,-0.0451830588281155,0.1914888024330139,0,2,3,1,12,6,-1,3,3,12,2,3,-0.0872772708535194,0.171896293759346,-0.121959999203682,1,2,23,0,2,2,-1,23,0,1,2,2,-0.005389865022152662,-0.386665403842926,0.0155352503061295,1,2,2,0,2,2,-1,2,0,2,1,2,0.0108539797365665,0.0364841781556606,-0.3959751129150391,0,2,14,13,4,2,-1,15,13,2,2,2,-0.004180129151791334,-0.4820233881473541,0.0170424394309521,1,2,3,6,6,3,-1,2,7,6,1,3,-0.0234517697244883,0.4986476898193359,-0.0220960807055235,0,2,14,13,4,2,-1,15,13,2,2,2,0.0029061511158943176,0.0269486699253321,-0.3256624042987824,0,3,0,7,24,4,-1,0,7,12,2,2,12,9,12,2,2,0.0463646091520786,0.026882030069828,-0.3762974143028259,0,2,23,0,2,2,-1,23,1,2,1,2,-0.00021972910326439887,0.0705367177724838,-0.1089593023061752,0,2,7,13,4,2,-1,8,13,2,2,2,-0.0037804399617016315,-0.4887917041778565,0.0199932008981705,0,3,16,11,2,2,-1,17,11,1,1,2,16,12,1,1,2,0.00006064217086532153,-0.0753576681017876,0.0811428874731064,0,2,8,11,9,4,-1,8,12,9,2,2,-0.0106888897716999,0.2206722944974899,-0.0562041401863098,0,2,2,12,21,3,-1,9,13,7,1,9,0.0436831787228584,-0.0610822103917599,0.1712581962347031,0,2,1,13,21,2,-1,8,13,7,2,3,-0.0202471297234297,0.1565587073564529,-0.0770068317651749,1,2,22,10,1,4,-1,21,11,1,2,2,-0.005928528029471636,-0.4369310140609741,0.0202764291316271,1,2,3,5,6,3,-1,2,6,6,1,3,0.01134920027107,-0.0597750283777714,0.1651744991540909,1,2,13,2,8,5,-1,15,4,4,5,2,-0.1365716010332108,-0.8707361817359924,0.004286841955035925,0,2,4,2,8,6,-1,4,4,8,2,3,0.0663046464323998,-0.0388697795569897,0.2649452090263367,0,2,5,1,15,4,-1,5,2,15,2,2,0.0195911191403866,-0.0803443267941475,0.1665123999118805,0,2,0,1,8,4,-1,0,2,8,2,2,0.0340932197868824,0.026182109490037,-0.4526833891868591,0,2,10,0,15,14,-1,10,7,15,7,2,-0.2061661928892136,-0.4254589080810547,0.0156788490712643,0,2,9,13,6,2,-1,11,13,2,2,3,-0.007667514029890299,-0.3513334095478058,0.0274340193718672,0,2,8,9,11,4,-1,8,10,11,2,2,-0.0129145104438066,0.1359857022762299,-0.0633687376976013,1,2,8,6,3,3,-1,9,7,1,3,3,0.0160742308944464,0.0215212907642126,-0.4643712937831879,0,2,21,5,4,6,-1,21,7,4,2,3,0.0369430296123028,0.0274755004793406,-0.3073608875274658,1,2,12,3,6,6,-1,10,5,6,2,3,-0.075521357357502,-0.4241931140422821,0.0237817000597715,0,2,12,9,10,6,-1,12,9,5,6,2,0.0243982393294573,-0.0493879318237305,0.1672402024269104,0,2,3,9,10,6,-1,8,9,5,6,2,0.1157704964280129,0.0166440103203058,-0.6928011178970337,0,2,12,0,4,1,-1,13,0,2,1,2,0.000915299984626472,-0.0502800084650517,0.1328525990247726,1,2,3,10,4,1,-1,4,11,2,1,2,-0.003624845063313842,-0.3066833913326263,0.028492359444499,1,2,18,12,1,2,-1,18,12,1,1,2,-0.0007358163129538298,0.0559885688126087,-0.0392797887325287,0,2,2,0,20,10,-1,12,0,10,10,2,0.2000436931848526,-0.0568408109247684,0.1685038954019547,1,2,22,2,3,6,-1,23,3,1,6,3,-0.0178776904940605,0.193175196647644,-0.0514639392495155,1,2,3,2,6,3,-1,2,3,6,1,3,0.011350380256772,-0.0489644110202789,0.2181939035654068,0,3,21,1,4,6,-1,23,1,2,3,2,21,4,2,3,2,0.0125029096379876,-0.0419848784804344,0.2713862061500549,0,3,0,1,4,6,-1,0,1,2,3,2,2,4,2,3,2,-0.009303327649831772,0.1590452045202255,-0.0626974031329155,0,2,24,0,1,6,-1,24,3,1,3,2,0.009820517152547836,0.015533110126853,-0.330407589673996,0,2,0,0,1,6,-1,0,3,1,3,2,0.0044993069022893906,0.0376702398061752,-0.3112137019634247,0,2,18,0,6,6,-1,18,2,6,2,3,0.0140464501455426,-0.0434262491762638,0.1032719984650612,0,2,5,1,15,4,-1,5,2,15,2,2,-0.0411175191402435,0.1867991983890533,-0.0664343684911728,0,2,4,8,18,1,-1,10,8,6,1,3,-0.0107145197689533,0.1244383975863457,-0.0663585364818573,0,2,8,6,6,4,-1,8,7,6,2,2,0.009289542213082314,-0.0821698531508446,0.1224353983998299,0,2,9,5,8,2,-1,11,5,4,2,2,-0.0130508001893759,-0.400338888168335,0.016636909916997,0,2,5,0,6,6,-1,7,0,2,6,3,-0.0364681892096996,-0.5473737716674805,0.0148177295923233,0,2,21,8,2,1,-1,21,8,1,1,2,-0.00007537294004578143,0.0594716407358646,-0.0578790009021759,1,2,7,1,2,2,-1,7,1,2,1,2,0.0142522901296616,0.0252972692251205,-0.3336473107337952,0,2,17,4,8,4,-1,17,5,8,2,2,0.0033469200134277344,-0.0707368031144142,0.0745013207197189,0,2,6,0,13,2,-1,6,1,13,1,2,0.004444595891982317,-0.0672459527850151,0.1451885998249054,0,2,21,5,4,6,-1,21,7,4,2,3,-0.008720582351088524,-0.202135294675827,0.0275202393531799,0,2,0,5,4,6,-1,0,7,4,2,3,0.0469216890633106,0.0161568503826857,-0.5311927795410156,0,2,21,8,2,1,-1,21,8,1,1,2,0.000058387980971019715,-0.0557161718606949,0.0720106214284897,0,2,2,8,2,1,-1,3,8,1,1,2,-0.00004610310134012252,0.0959030091762543,-0.0971473827958107,1,2,23,0,2,1,-1,23,0,1,1,2,0.006065776105970144,0.0240712091326714,-0.2376091033220291,0,2,4,0,15,4,-1,4,1,15,2,2,-0.0555203706026077,0.3074511885643005,-0.0299711804836988,0,2,15,1,10,8,-1,15,3,10,4,2,-0.0365539006888866,0.0328120291233063,-0.0570152215659618,0,3,0,5,4,2,-1,0,5,2,1,2,2,6,2,1,2,0.0018784699495881796,-0.0653261989355087,0.1390983015298843,1,2,23,0,2,1,-1,23,0,1,1,2,-0.007482212036848068,-0.7748216986656189,0.00592863280326128,0,2,0,5,1,4,-1,0,6,1,2,2,-0.0033365150447934866,-0.3616085052490234,0.0226737502962351,0,2,19,13,4,2,-1,19,14,4,1,2,-0.0122549999505281,-0.6580218076705933,0.0043241591192781925,0,3,7,12,2,2,-1,7,12,1,1,2,8,13,1,1,2,-0.0002502274001017213,0.1368491053581238,-0.0613101907074451,0,3,1,0,24,8,-1,13,0,12,4,2,1,4,12,4,2,0.1189583986997604,0.024467010051012,-0.3081929087638855,0,2,2,4,3,3,-1,2,5,3,1,3,0.0018534749979153275,-0.0657177790999413,0.1380506008863449,1,2,20,6,4,3,-1,19,7,4,1,3,-0.0139663796871901,-0.4281671941280365,0.0166652500629425,1,2,5,6,3,4,-1,6,7,1,4,3,-0.0120118902996182,-0.4546675086021423,0.0174813903868198,0,3,16,11,2,2,-1,17,11,1,1,2,16,12,1,1,2,0.0008638032013550401,0.0268306396901608,-0.1949577033519745,0,3,7,11,2,2,-1,7,11,1,1,2,8,12,1,1,2,-0.0005486354930326343,0.172817200422287,-0.0519250482320786,0,2,9,5,9,3,-1,12,5,3,3,3,0.0356420204043388,0.011997340247035,-0.2636224925518036,0,2,0,0,6,1,-1,2,0,2,1,3,0.009283074177801609,0.0153813296929002,-0.5276867151260376,0,2,17,4,8,1,-1,19,4,4,1,2,0.003344479948282242,-0.0448165088891983,0.1556369960308075,0,2,7,5,9,3,-1,10,5,3,3,3,-0.0348524898290634,-0.6144651770591736,0.014714409597218,0,2,17,4,8,1,-1,19,4,4,1,2,-0.0036836538929492235,0.0679996237158775,-0.0403181910514832,0,2,0,4,8,1,-1,2,4,4,1,2,0.002637067111209035,-0.0527165904641151,0.1650273054838181,0,3,16,11,2,2,-1,17,11,1,1,2,16,12,1,1,2,-0.001140838023275137,-0.1495666950941086,0.0155292097479105,0,2,6,11,12,2,-1,9,11,6,2,2,-0.005560464225709438,0.1015162020921707,-0.0783084183931351,0,2,4,6,20,9,-1,9,6,10,9,2,0.031304020434618,-0.0519621782004833,0.1036399006843567,0,2,6,8,12,2,-1,6,9,12,1,2,0.00929038506001234,-0.0539887212216854,0.1653061956167221,0,2,6,8,13,4,-1,6,9,13,2,2,-0.0108930300921202,0.1281013935804367,-0.0734129622578621,0,2,2,13,4,2,-1,2,14,4,1,2,-0.004919060971587896,-0.3507530987262726,0.0244891606271267,0,2,11,1,3,12,-1,11,4,3,6,2,0.0811754167079926,0.0209406390786171,-0.3776533007621765,0,2,7,10,11,4,-1,7,11,11,2,2,-0.007118931971490383,0.1320966929197311,-0.074379600584507,0,2,5,9,15,6,-1,5,11,15,2,3,0.0290335901081562,-0.0601534284651279,0.1686525046825409,0,2,1,5,14,10,-1,1,10,14,5,2,0.2666859030723572,0.030215110629797,-0.3336375057697296,0,3,13,10,2,2,-1,14,10,1,1,2,13,11,1,1,2,0.001343771000392735,0.0244619604200125,-0.3497652113437653,0,2,0,0,4,2,-1,0,1,4,1,2,-0.00006406597094610333,0.0681859701871872,-0.1218236982822418,0,2,18,3,4,2,-1,18,4,4,1,2,-0.0022273659706115723,0.0591664388775826,-0.0569609887897968,0,2,0,7,4,4,-1,0,8,4,2,2,0.0001082283997675404,-0.118367500603199,0.0699028074741364,0,2,12,12,6,2,-1,14,12,2,2,3,0.007776250131428242,0.0182663407176733,-0.3238837122917175,0,2,7,0,3,1,-1,8,0,1,1,3,-0.0008562789880670607,0.1596496999263763,-0.0523401089012623,0,2,15,0,2,1,-1,15,0,1,1,2,0.003980595152825117,0.0056993248872458935,-0.6384922862052917,0,2,8,0,2,1,-1,9,0,1,1,2,-0.0004905238165520132,0.1629474014043808,-0.0742301419377327,0,2,18,3,2,10,-1,18,3,1,10,2,-0.0184035003185272,-0.6773443222045898,0.010705940425396,0,3,7,1,2,2,-1,7,1,1,1,2,8,2,1,1,2,-0.0008971457136794925,0.1691973060369492,-0.0477185398340225,0,2,18,0,7,3,-1,18,1,7,1,3,-0.0167341101914644,-0.3151237964630127,0.0124420495703816,0,2,7,12,6,2,-1,9,12,2,2,3,-0.0119769899174571,-0.5293223857879639,0.0144362701103091,0,2,20,7,4,3,-1,20,8,4,1,3,0.007036808878183365,0.0264915898442268,-0.2470992058515549,0,2,5,3,2,10,-1,6,3,1,10,2,-0.0105798998847604,-0.4092808067798615,0.0187591798603535,0,3,16,0,2,2,-1,17,0,1,1,2,16,1,1,1,2,0.0006084999768063426,-0.0334094502031803,0.0843884497880936,0,3,7,0,2,2,-1,7,0,1,1,2,8,1,1,1,2,-0.000594453071244061,0.1412419974803925,-0.0555582903325558,0,2,15,0,6,2,-1,17,0,2,2,3,-0.0157594103366137,-0.3833500146865845,0.0156633593142033,0,2,0,0,1,4,-1,0,2,1,2,2,-0.0101080304011703,-0.3391439020633698,0.0209970101714134,1,2,22,1,2,12,-1,18,5,2,4,3,0.008824238553643227,0.046882901340723,-0.0345581099390984,1,2,4,0,12,3,-1,8,4,4,3,3,0.1695280969142914,-0.0297883804887533,0.2978200018405914,0,3,14,13,2,2,-1,15,13,1,1,2,14,14,1,1,2,0.0014175090473145247,0.0145506802946329,-0.2557711899280548,0,2,11,6,3,3,-1,12,7,1,1,9,-0.006245535798370838,0.1703144013881683,-0.0457185097038746,0,2,15,1,10,8,-1,15,3,10,4,2,0.08297199010849,-0.0108856502920389,0.2358570992946625,0,2,0,1,10,8,-1,0,3,10,4,2,-0.036387961357832,0.0720635578036308,-0.1351491957902908,0,2,11,3,14,10,-1,11,8,14,5,2,0.2605817019939423,0.0307604894042015,-0.208186000585556,0,3,0,0,24,12,-1,0,0,12,6,2,12,6,12,6,2,-0.1837086975574493,-0.4619984030723572,0.0176900699734688,0,2,20,7,4,3,-1,20,8,4,1,3,-0.00397269893437624,-0.1660892963409424,0.0209467206150293,0,2,0,1,7,3,-1,0,2,7,1,3,0.0214559100568295,0.0231478307396173,-0.3625465929508209,0,2,20,7,4,3,-1,20,8,4,1,3,0.0144318202510476,0.004468928091228008,-0.2445929050445557,0,2,0,7,1,8,-1,0,9,1,4,2,-0.0033524229656904936,-0.2480840981006622,0.0316352993249893,1,2,22,4,3,4,-1,23,5,1,4,3,-0.0156694706529379,0.3172483146190643,-0.0374899208545685,1,2,11,2,12,1,-1,15,6,4,1,3,-0.0400774292647839,-0.2589775919914246,0.0327349714934826,1,2,22,4,3,4,-1,23,5,1,4,3,0.0123612098395824,-0.0450748614966869,0.169064998626709,0,2,1,7,4,3,-1,1,8,4,1,3,0.0109678898006678,0.0187921095639467,-0.4384852945804596,0,2,13,9,6,2,-1,15,9,2,2,3,-0.0137434704229236,-0.4609765112400055,0.0122369602322578,0,3,6,7,2,2,-1,6,7,1,1,2,7,8,1,1,2,-0.001032243948429823,0.1648599952459335,-0.0516587682068348,0,2,13,9,6,2,-1,15,9,2,2,3,0.008831336162984371,0.015935530886054,-0.2015953958034515,0,2,4,0,6,2,-1,6,0,2,2,3,0.0144206797704101,0.0160773508250713,-0.4641633033752441,0,2,13,9,6,2,-1,15,9,2,2,3,-0.0018205989617854357,0.0433134213089943,-0.0280837193131447,1,2,7,7,2,6,-1,7,7,1,6,2,0.003930467180907726,0.0497011989355087,-0.1514773964881897,0,2,24,0,1,10,-1,24,5,1,5,2,-0.008321069180965424,-0.1029928028583527,0.0179813895374537,0,2,6,7,3,1,-1,7,7,1,1,3,-0.0011277500307187438,0.1659521013498306,-0.0483443103730679,0,3,14,13,2,2,-1,15,13,1,1,2,14,14,1,1,2,-0.000783850671723485,-0.1946461051702499,0.0250845197588205,0,2,8,7,4,1,-1,9,7,2,1,2,-0.0008546434110030532,0.1473073959350586,-0.0529893897473812,1,2,24,4,1,9,-1,21,7,1,3,3,-0.006144941784441471,0.0951583385467529,-0.0323545187711716,1,2,1,4,9,1,-1,4,7,3,1,3,0.0537422299385071,-0.0160139091312885,0.5178387761116028,0,2,11,1,6,13,-1,13,1,2,13,3,-0.009177369065582752,0.0658730715513229,-0.0286986008286476,0,2,10,2,4,7,-1,11,2,2,7,2,-0.001626214012503624,0.1165013015270233,-0.0662005692720413,0,2,11,1,6,13,-1,13,1,2,13,3,-0.0702467709779739,-0.5561671257019043,0.0033650770783424377,0,2,8,1,6,13,-1,10,1,2,13,3,-0.045713048428297,-0.5554363131523132,0.0145238302648067,0,2,16,9,4,1,-1,16,9,2,1,2,-0.0016252630157396197,0.0774459466338158,-0.0477535910904408,0,2,5,9,4,1,-1,7,9,2,1,2,-0.00877845473587513,-0.6660557985305786,0.0114997997879982,1,2,17,4,1,9,-1,14,7,1,3,3,0.0581780597567558,-0.0126901902258396,0.2431164979934692,0,3,7,4,2,2,-1,7,4,1,1,2,8,5,1,1,2,-0.0010166700230911374,0.1701835989952087,-0.0434626787900925,0,3,13,9,2,2,-1,14,9,1,1,2,13,10,1,1,2,-0.0008318690815940499,-0.1554417014122009,0.0277679692953825,0,3,7,11,2,2,-1,7,11,1,1,2,8,12,1,1,2,0.0001063566014636308,-0.0799610763788223,0.0975525230169296,0,3,13,9,2,2,-1,14,9,1,1,2,13,10,1,1,2,0.0007735859835520387,0.0280197393149138,-0.1640979051589966,0,2,6,13,10,1,-1,11,13,5,1,2,-0.005128828808665276,0.1435500979423523,-0.0521811507642269,0,2,9,8,10,7,-1,9,8,5,7,2,-0.0296237897127867,0.1256711930036545,-0.0727018266916275,0,2,4,5,15,10,-1,9,5,5,10,3,0.0479203201830387,-0.0627507865428925,0.1496749967336655,0,2,20,6,5,4,-1,20,7,5,2,2,0.0299077890813351,0.0033279890194535255,-0.5352283716201782,0,2,0,6,5,4,-1,0,7,5,2,2,-0.00311031611636281,-0.184633806347847,0.0402609407901764,0,2,11,7,3,1,-1,12,7,1,1,3,0.0011777599574998021,-0.0421488806605339,0.1833201944828033,0,2,9,4,7,3,-1,9,5,7,1,3,0.0149721698835492,-0.0501780100166798,0.1479559987783432,0,2,15,4,4,3,-1,15,4,2,3,2,0.022697489708662,0.008885804563760757,-0.3510260879993439,0,2,6,4,4,3,-1,8,4,2,3,2,0.0128841297701001,0.0346549116075039,-0.2406193017959595,0,3,16,6,2,2,-1,17,6,1,1,2,16,7,1,1,2,-0.0011240700259804726,0.1314530968666077,-0.0288430396467447,0,3,7,6,2,2,-1,7,6,1,1,2,8,7,1,1,2,-0.0013627869775518775,0.2013843953609467,-0.0379555486142635,0,3,14,13,2,2,-1,15,13,1,1,2,14,14,1,1,2,0.0005355795728974044,0.0279592797160149,-0.1196514964103699,1,2,6,0,4,2,-1,6,0,4,1,2,-0.0152801796793938,-0.4851869940757752,0.0156223699450493,0,2,20,14,2,1,-1,20,14,1,1,2,0.00004641250052372925,-0.0589389093220234,0.0601089298725128,0,3,1,13,6,2,-1,1,13,3,1,2,4,14,3,1,2,0.0000965538783930242,-0.0965948700904846,0.0779175236821175,0,2,12,1,2,2,-1,12,2,2,1,2,0.0038991239853203297,-0.0261822007596493,0.1902385950088501,0,3,8,0,8,8,-1,8,0,4,4,2,12,4,4,4,2,0.0237854700535536,0.0403596796095371,-0.1793317049741745,0,3,16,12,2,2,-1,17,12,1,1,2,16,13,1,1,2,0.00005911722837481648,-0.0676945373415947,0.0789666101336479,0,3,0,4,8,8,-1,0,4,4,4,2,4,8,4,4,2,0.0585355199873447,-0.0279133208096027,0.2635962069034576,0,2,19,4,2,1,-1,19,4,1,1,2,-0.006712567061185837,-0.8246011137962341,0.0036960430443286896,0,2,4,4,2,1,-1,5,4,1,1,2,-0.0046747662127017975,-0.7625464797019958,0.009274384006857872,0,3,20,0,2,2,-1,21,0,1,1,2,20,1,1,1,2,0.005398152861744165,0.0019147379789501429,-0.8057739734649658,0,2,0,5,15,3,-1,0,6,15,1,3,0.007725214120000601,-0.0822006091475487,0.0925986021757126,0,2,13,5,1,3,-1,13,6,1,1,3,-0.001167214009910822,0.1147938966751099,-0.0459650196135044,1,2,4,9,3,2,-1,5,10,1,2,3,-0.007402225863188505,-0.4262216091156006,0.0174518898129463,0,3,20,0,2,2,-1,21,0,1,1,2,20,1,1,1,2,0.00006543080235132948,-0.0445476993918419,0.0498182512819767,0,3,3,0,2,2,-1,3,0,1,1,2,4,1,1,1,2,0.0000463534306618385,-0.082009993493557,0.0922331288456917,-1.254032015800476,218,0,3,0,11,12,4,-1,0,11,6,2,2,6,13,6,2,2,0.0105607798323035,-0.1728546023368835,0.2072951048612595,0,2,17,1,8,4,-1,17,3,8,2,2,-0.038237389177084,0.1771112978458405,-0.1585303992033005,0,2,6,6,13,6,-1,6,8,13,2,3,-0.0541206710040569,0.2564443051815033,-0.0884335711598396,0,2,23,4,2,3,-1,23,4,1,3,2,-0.002200446091592312,0.2010346055030823,-0.1101640984416008,0,2,2,13,10,2,-1,2,14,10,1,2,0.0654388666152954,0.0007821313920430839,-4350.8232421875,0,2,23,4,2,3,-1,23,4,1,3,2,-0.0135645801201463,-0.5407810807228088,0.004865359049290419,0,2,0,4,2,3,-1,1,4,1,3,2,-0.0018708320567384362,0.1633561998605728,-0.1228590980172157,0,2,2,7,21,3,-1,9,8,7,1,9,0.1699268966913223,-0.004541059955954552,0.4810850024223328,1,2,2,11,2,2,-1,2,11,1,2,2,0.003598150098696351,0.0356757305562496,-0.4236158132553101,0,2,2,2,21,6,-1,9,4,7,2,9,0.5448976159095764,-0.0198735594749451,0.5460472106933594,0,2,1,1,8,6,-1,1,3,8,2,3,-0.0627753064036369,0.1722137033939362,-0.1143800020217896,0,2,6,4,15,4,-1,6,5,15,2,2,-0.0459444113075733,0.2595784068107605,-0.0732216089963913,1,2,2,10,4,1,-1,3,11,2,1,2,0.002180942101404071,0.0495434813201427,-0.3175086975097656,0,2,4,14,18,1,-1,4,14,9,1,2,-0.00965660810470581,0.1581763029098511,-0.0890468433499336,0,3,0,3,24,10,-1,0,3,12,5,2,12,8,12,5,2,0.080804243683815,0.0503276288509369,-0.2887117862701416,0,3,15,3,10,12,-1,20,3,5,6,2,15,9,5,6,2,0.0987789332866669,-0.0381883382797241,0.3119831085205078,0,2,9,5,6,3,-1,9,6,6,1,3,0.008411401882767677,-0.0949936509132385,0.1344850063323975,0,2,2,13,21,1,-1,9,13,7,1,3,-0.0147700998932123,0.1715719997882843,-0.0750405564904213,0,3,0,3,10,12,-1,0,3,5,6,2,5,9,5,6,2,0.105756402015686,-0.0440231785178185,0.3495194017887116,0,2,5,3,15,4,-1,5,4,15,2,2,0.0401043891906738,-0.0572791509330273,0.2763915061950684,0,2,8,6,9,3,-1,8,7,9,1,3,0.0135993398725986,-0.0886402428150177,0.1596630066633225,0,2,14,13,3,1,-1,15,13,1,1,3,-0.003337878966704011,-0.499087005853653,0.007176036946475506,0,2,7,1,10,2,-1,7,2,10,1,2,0.006549019832164049,-0.0597806982696056,0.2110590040683746,0,2,14,13,3,1,-1,15,13,1,1,3,-0.00006275867053773254,0.0655476525425911,-0.0541992485523224,0,2,8,13,3,1,-1,9,13,1,1,3,0.000908895512111485,0.042570099234581,-0.2828716039657593,0,3,1,0,24,12,-1,13,0,12,6,2,1,6,12,6,2,0.0881031826138496,0.0406627096235752,-0.298372894525528,0,2,0,0,13,14,-1,0,7,13,7,2,-0.1351538002490997,-0.4011076092720032,0.025998929515481,1,2,21,6,3,3,-1,20,7,3,1,3,0.0105496803298593,0.0265602301806211,-0.3554666042327881,0,2,8,9,8,4,-1,8,10,8,2,2,-0.0109745198860765,0.1540209054946899,-0.0715849623084068,0,2,13,10,6,4,-1,15,10,2,4,3,-0.01281054969877,-0.2680475115776062,0.0205432493239641,1,2,11,3,4,4,-1,11,3,2,4,2,-0.067375123500824,-0.5299177169799805,0.0192500203847885,0,2,13,10,6,4,-1,15,10,2,4,3,0.0133285904303193,0.0141924796625972,-0.2692896127700806,0,2,7,10,10,4,-1,7,12,10,2,2,-0.034924790263176,0.2877762019634247,-0.0366922505199909,0,2,13,10,6,4,-1,15,10,2,4,3,-0.0259607005864382,-0.5250588059425354,0.004201324190944433,0,2,6,10,6,4,-1,8,10,2,4,3,-0.0144326100125909,-0.4404621124267578,0.0239412691444159,0,2,21,14,4,1,-1,21,14,2,1,2,0.0010242980206385255,-0.0813294127583504,0.1090075969696045,0,2,0,7,4,4,-1,0,8,4,2,2,-0.0033913699444383383,-0.2744260132312775,0.0353980511426926,0,3,19,3,6,12,-1,22,3,3,6,2,19,9,3,6,2,-0.0254591107368469,0.1884281933307648,-0.0505212917923927,0,2,5,1,15,2,-1,5,2,15,1,2,-0.0250639300793409,0.1583306044340134,-0.067982017993927,0,2,19,1,3,4,-1,19,2,3,2,2,0.00457573588937521,-0.0512838996946812,0.114658497273922,0,2,2,5,20,4,-1,12,5,10,4,2,-0.1538352966308594,0.42741459608078,-0.0233538504689932,0,2,21,14,4,1,-1,21,14,2,1,2,0.00674419803544879,0.0116364201530814,-0.1990616023540497,0,2,0,14,4,1,-1,2,14,2,1,2,0.0004985763225704432,-0.1112217977643013,0.0913273170590401,0,3,19,3,6,12,-1,22,3,3,6,2,19,9,3,6,2,0.0416502095758915,-0.0342307090759277,0.1340909004211426,0,3,0,3,6,12,-1,0,3,3,6,2,3,9,3,6,2,-0.0486865788698196,0.3840608894824982,-0.0367092713713646,0,2,19,1,3,4,-1,19,2,3,2,2,-0.0142661100253463,0.1904101967811585,-0.0373262614011765,0,2,3,1,3,4,-1,3,2,3,2,2,0.002073825104162097,-0.0940800234675407,0.1367546021938324,0,2,10,1,10,2,-1,10,1,5,2,2,-0.0127805396914482,0.0790209397673607,-0.0321417711675167,0,2,5,0,8,3,-1,9,0,4,3,2,0.008742088451981544,-0.0805833786725998,0.1433219015598297,1,2,21,0,2,1,-1,21,0,1,1,2,0.00006978053716011345,-0.1539752036333084,0.0694082602858543,1,2,2,8,4,2,-1,3,9,2,2,2,-0.007998161017894745,-0.4497911930084229,0.0232297703623772,1,2,21,0,2,1,-1,21,0,1,1,2,0.005380451213568449,0.0246548391878605,-0.1725358963012695,0,2,2,0,21,1,-1,9,0,7,1,3,-0.0200069397687912,0.165263906121254,-0.0625987574458122,1,2,21,0,2,1,-1,21,0,1,1,2,-0.004465640988200903,-0.3730463087558746,0.0105512700974941,1,2,4,0,1,2,-1,4,0,1,1,2,-0.0031919090542942286,-0.4411549866199493,0.0209588091820478,0,3,1,11,24,4,-1,13,11,12,2,2,1,13,12,2,2,-0.0622704289853573,-0.5413467884063721,0.0132205402478576,0,3,0,11,24,4,-1,0,11,12,2,2,12,13,12,2,2,-0.044956348836422,-0.4331294000148773,0.0206683203577995,0,3,16,5,2,2,-1,17,5,1,1,2,16,6,1,1,2,0.0011595709947869182,-0.0236924402415752,0.1087998002767563,0,3,7,5,2,2,-1,7,5,1,1,2,8,6,1,1,2,-0.0008840562077239156,0.1649617999792099,-0.0524947308003902,0,2,18,1,6,2,-1,18,1,3,2,2,0.0266917701810598,0.0148458201438189,-0.5571644902229309,0,2,2,0,21,2,-1,9,0,7,2,3,0.0182767305523157,-0.066286213696003,0.1257701069116592,0,2,13,0,10,15,-1,13,0,5,15,2,-0.0809113383293152,0.1131376996636391,-0.049807820469141,0,2,6,0,13,4,-1,6,1,13,2,2,-0.036403700709343,0.2336605936288834,-0.0383339710533619,0,2,11,3,9,3,-1,11,4,9,1,3,-0.0139478798955679,0.0991646125912666,-0.0678260922431946,1,2,3,2,10,3,-1,2,3,10,1,3,-0.0224205106496811,0.1904506981372833,-0.0484246909618378,0,2,6,6,16,8,-1,6,6,8,8,2,0.0995163321495056,-0.0482200607657433,0.2056124061346054,0,2,5,0,12,15,-1,8,0,6,15,2,0.1495629996061325,0.0141723398119211,-0.6450886726379395,0,2,23,8,2,4,-1,23,8,1,4,2,0.0009669344290159643,-0.0378436110913754,0.0635498985648155,0,2,0,5,3,3,-1,0,6,3,1,3,0.0120417503640056,0.018035089597106,-0.4774137139320374,0,2,21,5,4,2,-1,22,5,2,2,2,0.0023097700905054808,-0.0415334291756153,0.1302794069051743,0,2,0,5,4,2,-1,1,5,2,2,2,0.002201986964792013,-0.0514689311385155,0.1736146062612534,1,2,21,2,3,4,-1,22,3,1,4,3,0.0272558908909559,-0.0153390001505613,0.3625235855579376,1,2,4,2,4,3,-1,3,3,4,1,3,0.008874750696122646,-0.0426916293799877,0.2076780050992966,1,2,23,2,2,2,-1,23,2,2,1,2,0.0047241621650755405,-0.0500567816197872,0.087361179292202,0,2,0,5,4,4,-1,0,6,4,2,2,0.00007316731353057548,-0.1244131028652191,0.0726777836680412,0,2,23,7,2,5,-1,23,7,1,5,2,-0.001263994025066495,0.0776199027895927,-0.0404986217617989,0,2,0,0,1,4,-1,0,1,1,2,2,0.003690955927595496,0.0311388503760099,-0.3086219131946564,0,2,23,1,2,4,-1,23,3,2,2,2,-0.028352240100503,-0.3550184071063995,0.0135328602045774,0,2,0,1,2,4,-1,0,3,2,2,2,-0.0009666720288805664,0.0676028430461884,-0.1432974934577942,0,2,19,3,5,4,-1,19,4,5,2,2,-0.0587403103709221,-0.5506312847137451,0.0042741261422634125,1,2,12,1,6,2,-1,12,1,6,1,2,-0.0272757392376661,-0.6493160724639893,0.012534529902041,0,2,19,11,6,4,-1,19,12,6,2,2,-0.0117558799684048,-0.5648565292358398,0.0137637602165341,0,2,1,3,6,4,-1,1,4,6,2,2,0.007592375855892897,-0.0431140698492527,0.200558602809906,1,2,23,0,2,1,-1,23,0,1,1,2,-0.0007197940140031278,-0.1374174952507019,0.0340671092271805,1,2,2,0,1,2,-1,2,0,1,1,2,0.004119044169783592,0.0367105789482594,-0.2477497011423111,0,2,19,0,4,2,-1,20,0,2,2,2,0.007544305175542831,0.007234477903693914,-0.4473736882209778,0,3,0,0,2,12,-1,0,0,1,6,2,1,6,1,6,2,-0.005235828924924135,0.2173164039850235,-0.0386803299188614,0,3,22,4,2,8,-1,23,4,1,4,2,22,8,1,4,2,0.0007468659896403551,-0.0371707193553448,0.0385193713009357,0,3,1,4,2,8,-1,1,4,1,4,2,2,8,1,4,2,0.0008846849086694419,-0.1020980030298233,0.0926149412989616,0,2,17,9,4,1,-1,17,9,2,1,2,-0.0011738609755411744,0.110879197716713,-0.0856960415840149,1,2,12,2,5,8,-1,10,4,5,4,2,-0.0989599674940109,-0.4499149918556213,0.0212421305477619,0,3,18,13,2,2,-1,19,13,1,1,2,18,14,1,1,2,0.0008824847172945738,0.0228975899517536,-0.1995048969984055,0,2,6,9,13,6,-1,6,11,13,2,3,-0.0413776896893978,0.1549389958381653,-0.0591393709182739,0,2,6,10,13,4,-1,6,11,13,2,2,0.00679467897862196,-0.0783610120415688,0.1739570051431656,0,3,0,8,24,4,-1,0,8,12,2,2,12,10,12,2,2,0.0447585098445416,0.0260890107601881,-0.3311159014701843,0,2,17,10,8,3,-1,17,11,8,1,3,0.0029978479724377394,0.0459281504154205,-0.1491470038890839,0,3,4,0,16,8,-1,4,0,8,4,2,12,4,8,4,2,-0.059589359909296,-0.2485350966453552,0.032523650676012,0,2,14,0,1,2,-1,14,1,1,1,2,0.0009419932030141354,-0.0425546802580357,0.1344856023788452,0,2,3,9,6,6,-1,5,9,2,6,3,-0.0239475108683109,-0.4583190977573395,0.0178181305527687,0,2,13,10,12,3,-1,16,10,6,3,2,0.007446235977113247,-0.0423585288226604,0.0580310709774494,0,2,0,10,12,3,-1,3,10,6,3,2,-0.0129095697775483,0.197303906083107,-0.0445232689380646,0,2,19,8,5,3,-1,19,9,5,1,3,0.0028930921107530594,0.0428810603916645,-0.1371746063232422,0,2,7,1,3,1,-1,8,1,1,1,3,-0.0006818625843152404,0.1337869018316269,-0.0565496906638145,0,2,15,1,3,1,-1,16,1,1,1,3,0.0009088438237085938,-0.0361675098538399,0.1220118999481201,0,2,7,1,3,1,-1,8,1,1,1,3,0.0004230542981531471,-0.0695094764232636,0.1302513927221298,0,2,20,8,2,3,-1,20,9,2,1,3,-0.0016460029873996973,-0.1300535947084427,0.032738208770752,0,2,2,0,4,2,-1,3,0,2,2,2,0.007249381858855486,0.0122888395562768,-0.6227869987487793,0,2,19,8,5,3,-1,19,9,5,1,3,0.007820780389010906,0.007436948828399181,-0.1486981958150864,0,2,4,1,6,11,-1,6,1,2,11,3,0.0359272807836533,0.0188675802201033,-0.3921496868133545,0,2,16,9,2,1,-1,16,9,1,1,2,-0.00006161881174193695,0.0568877793848515,-0.0677392184734344,0,2,5,2,15,4,-1,5,3,15,2,2,0.0374080687761307,-0.038547120988369,0.2218790054321289,0,2,11,2,3,3,-1,11,3,3,1,3,-0.005215566139668226,0.1363334953784943,-0.0673948600888252,0,2,2,7,18,6,-1,11,7,9,6,2,-0.0935681909322739,0.1743745058774948,-0.0487747117877007,0,2,1,6,24,9,-1,7,6,12,9,2,0.076228141784668,-0.0574758499860764,0.1471180021762848,0,2,0,0,1,10,-1,0,5,1,5,2,-0.0200377702713013,-0.4157789945602417,0.0179230198264122,0,2,9,3,10,2,-1,9,4,10,1,2,-0.0118243796750903,0.1144623011350632,-0.0700482204556465,0,2,12,6,1,3,-1,12,7,1,1,3,-0.0016057320171967149,0.1678820997476578,-0.0499466583132744,0,2,16,9,2,1,-1,16,9,1,1,2,-0.002551743993535638,-0.3828516900539398,0.011361270211637,0,2,7,9,2,1,-1,8,9,1,1,2,-0.00009951562969945371,0.0925496816635132,-0.0903496667742729,0,3,16,7,6,6,-1,19,7,3,3,2,16,10,3,3,2,-0.0167104993015528,0.1787143051624298,-0.0413177497684956,0,3,10,10,2,2,-1,10,10,1,1,2,11,11,1,1,2,-0.0009668730199337006,-0.2522006928920746,0.0305528100579977,0,3,16,9,2,2,-1,17,9,1,1,2,16,10,1,1,2,-0.00006082893014536239,0.0542593784630299,-0.0474381409585476,0,3,7,9,2,2,-1,7,9,1,1,2,8,10,1,1,2,-0.0008633537217974663,0.1779994070529938,-0.0423120781779289,0,3,13,10,2,2,-1,14,10,1,1,2,13,11,1,1,2,-0.0008921846165321767,-0.1845878958702087,0.0251416098326445,0,2,11,7,2,3,-1,11,8,2,1,3,-0.003487017937004566,0.1677664965391159,-0.0460440590977669,0,2,19,0,6,3,-1,19,1,6,1,3,0.0195988900959492,0.0180558506399393,-0.3022567927837372,0,2,0,0,6,3,-1,0,1,6,1,3,-0.0109872100874782,-0.3727653026580811,0.0197681505233049,0,2,24,0,1,2,-1,24,1,1,1,2,-0.00006639063940383494,0.0768569633364677,-0.1268360018730164,0,2,0,0,16,1,-1,4,0,8,1,2,-0.004260623827576637,0.1132820025086403,-0.0696604028344154,0,2,19,11,6,4,-1,19,12,6,2,2,0.007314716000109911,0.0329976715147495,-0.2646273076534271,0,2,0,11,6,4,-1,0,12,6,2,2,-0.0101194800809026,-0.470618486404419,0.0138464700430632,0,2,5,3,15,6,-1,5,6,15,3,2,0.0921443328261375,-0.0886306688189507,0.0808285027742386,0,2,8,3,9,3,-1,8,4,9,1,3,0.0118425898253918,-0.0542713403701782,0.1590622961521149,0,2,12,0,1,12,-1,12,3,1,6,2,0.0260604508221149,0.0202190801501274,-0.3709642887115479,0,2,1,3,14,8,-1,1,7,14,4,2,0.2863250076770783,0.0171639006584883,-0.3946934938430786,0,2,15,0,6,4,-1,17,0,2,4,3,-0.019337460398674,-0.2173891961574554,0.0148878796026111,0,3,3,7,4,2,-1,3,7,2,1,2,5,8,2,1,2,0.0006899603758938611,-0.0642509534955025,0.1074123978614807,0,2,14,5,1,8,-1,14,9,1,4,2,0.0273154806345701,0.005089373793452978,-0.5541477799415588,0,2,0,7,3,3,-1,0,8,3,1,3,-0.007314932066947222,-0.5788456201553345,0.0114226602017879,0,2,11,12,6,3,-1,13,12,2,3,3,0.0134929800406098,0.0069531891494989395,-0.3359794020652771,0,2,8,12,6,3,-1,10,12,2,3,3,0.0170349292457104,0.009658707305788994,-0.6638085842132568,0,3,16,5,6,10,-1,19,5,3,5,2,16,10,3,5,2,-0.0495363213121891,-0.1099594011902809,0.007144455797970295,0,3,3,5,6,10,-1,3,5,3,5,2,6,10,3,5,2,-0.0326232202351093,0.188817098736763,-0.0416569598019123,0,2,17,8,8,1,-1,19,8,4,1,2,0.0025752598885446787,-0.0510260090231895,0.1057118028402329,0,2,0,8,8,1,-1,2,8,4,1,2,0.0024968909565359354,-0.0559858083724976,0.1347001940011978,0,2,9,13,14,2,-1,9,13,7,2,2,-0.0116916997358203,0.0694792568683624,-0.0498108491301537,0,2,1,14,20,1,-1,6,14,10,1,2,0.005096627864986658,-0.0719841867685318,0.120134100317955,0,3,17,7,2,2,-1,18,7,1,1,2,17,8,1,1,2,0.0008642909815534949,-0.0280915908515453,0.110590897500515,0,2,0,8,2,2,-1,0,9,2,1,2,-0.0030658349860459566,-0.4070394039154053,0.0187105592340231,0,3,17,7,2,2,-1,18,7,1,1,2,17,8,1,1,2,-0.000055272910685744137,0.0707912817597389,-0.0700317397713661,0,3,6,7,2,2,-1,6,7,1,1,2,7,8,1,1,2,0.0006569849792867899,-0.0492957085371017,0.154824897646904,0,3,13,10,2,2,-1,14,10,1,1,2,13,11,1,1,2,0.0005370734143070877,0.0302961803972721,-0.1238510981202126,0,2,4,0,6,4,-1,6,0,2,4,3,-0.027268910780549,-0.4674024879932404,0.0149874398484826,0,2,10,0,6,2,-1,12,0,2,2,3,-0.002613895107060671,0.116668201982975,-0.0615368783473969,0,2,8,1,8,3,-1,10,1,4,3,2,-0.027707589790225,-0.6434546709060669,0.0120052499696612,1,2,14,6,7,2,-1,14,6,7,1,2,-0.0200542695820332,-0.3493579030036926,0.0109763201326132,0,2,8,10,4,1,-1,9,10,2,1,2,0.0006917031714692712,0.0442647784948349,-0.1491888016462326,0,3,16,11,2,2,-1,17,11,1,1,2,16,12,1,1,2,0.00006456066330429167,-0.0422041602432728,0.0473436005413532,0,3,7,11,2,2,-1,7,11,1,1,2,8,12,1,1,2,-0.00008837810310069472,0.1016054973006249,-0.0740641728043556,0,3,16,11,2,2,-1,17,11,1,1,2,16,12,1,1,2,-0.0000661065278109163,0.0759406536817551,-0.0495208092033863,0,3,7,11,2,2,-1,7,11,1,1,2,8,12,1,1,2,0.00042288508848287165,-0.0588600113987923,0.1385688036680222,0,2,17,9,4,1,-1,17,9,2,1,2,0.0025251980405300856,-0.0302844792604446,0.1643659025430679,0,2,4,9,4,1,-1,6,9,2,1,2,-0.009034793823957443,-0.6502289175987244,0.0117079298943281,0,2,11,8,3,4,-1,11,9,3,2,2,-0.0042698681354522705,0.1213309019804001,-0.0608336813747883,1,2,9,6,3,2,-1,10,7,1,2,3,0.0166539791971445,0.0145571101456881,-0.5031678080558777,1,2,21,0,4,8,-1,19,2,4,4,2,-0.1178558021783829,-0.3486539125442505,0.005829961039125919,1,2,4,0,8,4,-1,6,2,4,4,2,-0.0389890410006046,0.1082129999995232,-0.0824354067444801,1,2,20,1,5,2,-1,20,1,5,1,2,-0.006974487099796534,0.0920993909239769,-0.0447417609393597,0,2,0,6,6,4,-1,0,7,6,2,2,0.0154374102130532,0.029481740668416,-0.2408691942691803,0,2,20,6,5,4,-1,20,7,5,2,2,-0.005959998816251755,-0.2254153043031693,0.025642080232501,0,2,6,8,3,1,-1,7,8,1,1,3,-0.0005335814203135669,0.1183808967471123,-0.0571242086589336,0,3,1,8,24,2,-1,13,8,12,1,2,1,9,12,1,2,0.0176937691867352,0.0266077890992165,-0.3055857121944428,0,2,8,8,8,3,-1,8,9,8,1,3,0.005359944887459278,-0.0569497905671597,0.1210888996720314,0,2,17,11,6,4,-1,19,11,2,4,3,0.0158548094332218,0.0215572193264961,-0.2521420121192932,0,2,0,0,18,1,-1,9,0,9,1,2,0.0549633502960205,0.0106362197548151,-0.5730599761009216,1,2,14,6,3,2,-1,15,7,1,2,3,-0.0037383600138127804,0.077441543340683,-0.0306048095226288,0,2,5,6,13,2,-1,5,7,13,1,2,0.0182623900473118,-0.0549028292298317,0.1176588013768196,1,2,14,6,3,2,-1,15,7,1,2,3,-0.0318278707563877,-0.9110031723976135,0.0013938200427219272,0,2,10,6,2,6,-1,10,8,2,2,3,-0.00364661798812449,0.1085240989923477,-0.0722526162862778,1,2,20,1,5,2,-1,20,1,5,1,2,-0.0517431795597076,-0.9186943173408508,0.001879784045740962,1,2,5,1,2,5,-1,5,1,1,5,2,-0.009044954553246498,0.1787680983543396,-0.038844209164381,0,2,24,7,1,8,-1,24,9,1,4,2,-0.004534022882580757,-0.2472573071718216,0.029726779088378,0,2,7,7,11,3,-1,7,8,11,1,3,0.006873410195112228,-0.0675214827060699,0.1065412983298302,0,3,13,11,2,2,-1,14,11,1,1,2,13,12,1,1,2,0.0007732778904028237,0.022192569449544,-0.1398307979106903,0,2,10,11,3,1,-1,11,11,1,1,3,-0.00008525294106220827,0.0903024971485138,-0.0786189734935761,0,2,24,7,1,8,-1,24,9,1,4,2,0.0048931739293038845,0.0311242006719112,-0.1617130041122437,1,2,10,5,2,4,-1,10,5,2,2,2,-0.0357618294656277,-0.3406237065792084,0.0201859101653099,1,2,22,1,2,3,-1,21,2,2,1,3,-0.0110698901116848,0.1165141984820366,-0.0340334698557854,1,2,3,1,3,2,-1,4,2,1,2,3,0.0034201510716229677,-0.0530161187052727,0.1339436024427414,0,2,16,4,3,3,-1,17,5,1,1,9,-0.049969270825386,-0.8493295907974243,0.002754738088697195,1,2,3,0,3,2,-1,3,0,3,1,2,-0.0011221430031582713,-0.1629413068294525,0.0413381010293961,0,2,17,0,8,3,-1,17,0,4,3,2,0.0371481291949749,0.0171750299632549,-0.2840433120727539,0,2,0,12,4,3,-1,0,13,4,1,3,0.00238473410718143,0.0348382107913494,-0.1844726949930191,0,2,2,3,21,3,-1,9,3,7,3,3,0.1431124955415726,0.0252217296510935,-0.2543725967407227,1,2,8,1,2,5,-1,8,1,1,5,2,-0.0119188595563173,0.1655784994363785,-0.0447442717850208,0,3,19,7,6,4,-1,22,7,3,2,2,19,9,3,2,2,0.006477945018559694,-0.0250237993896008,0.0799132883548737,0,3,0,7,6,4,-1,0,7,3,2,2,3,9,3,2,2,0.0014581739669665694,-0.0797923728823662,0.0829188674688339,0,2,24,4,1,4,-1,24,5,1,2,2,0.0062418850138783455,0.013290929608047,-0.2995111048221588,1,2,4,7,3,4,-1,3,8,3,2,2,-0.0227145906537771,0.4398984909057617,-0.0150371296331286,0,2,17,9,4,1,-1,18,9,2,1,2,-0.0043001482263207436,-0.3546585142612457,0.007952126674354076,0,2,4,9,4,1,-1,5,9,2,1,2,0.0010604769922792912,0.0385937690734863,-0.1762923002243042,0,2,23,6,2,2,-1,23,7,2,1,2,0.0043205441907048225,0.0171245392411947,-0.1075016036629677,0,2,0,6,2,2,-1,0,7,2,1,2,-0.0038217399269342422,-0.4589209854602814,0.0141258295625448,0,2,12,0,3,1,-1,13,0,1,1,3,0.0009733684710226953,-0.0361551195383072,0.1268056929111481,0,3,1,7,2,2,-1,1,7,1,1,2,2,8,1,1,2,-0.0007908184779807925,0.1707147061824799,-0.0376146212220192,0,3,22,7,2,2,-1,23,7,1,1,2,22,8,1,1,2,-0.0007615988724865019,0.2311398983001709,-0.0603629797697067,0,2,2,11,6,4,-1,4,11,2,4,3,-0.0210315398871899,-0.4918564856052399,0.0156012997031212,0,3,14,1,10,4,-1,19,1,5,2,2,14,3,5,2,2,0.0180973205715418,-0.0467358492314816,0.1050693020224571,0,2,6,2,12,2,-1,6,3,12,1,2,-0.0131208598613739,0.1018344014883041,-0.0857265591621399,0,2,9,6,8,9,-1,9,9,8,3,3,0.2012819051742554,-0.009487469680607319,0.5418189764022827,0,2,3,8,3,3,-1,4,9,1,1,9,0.007332609035074711,0.0282447207719088,-0.2452981024980545,0,3,22,7,2,2,-1,23,7,1,1,2,22,8,1,1,2,0.0009054064285010099,-0.0559650883078575,0.2322594970464706,0,3,11,10,2,2,-1,11,10,1,1,2,12,11,1,1,2,0.0005353200249373913,0.0432194508612156,-0.1652047038078308,0,3,22,7,2,2,-1,23,7,1,1,2,22,8,1,1,2,-0.0000802397116785869,0.0588538907468319,-0.0475415214896202,0,2,4,13,10,1,-1,9,13,5,1,2,0.004840339999645948,-0.0541158504784107,0.1303326934576035,0,2,3,0,20,15,-1,3,0,10,15,2,0.6619219779968262,-0.0147952698171139,0.5785722732543945,0,2,0,13,24,1,-1,6,13,12,1,2,-0.008544123731553555,0.1165743991732597,-0.0628988370299339,0,3,22,7,2,2,-1,23,7,1,1,2,22,8,1,1,2,0.000054021849791752174,-0.0602008998394012,0.0699716731905937]);

}());