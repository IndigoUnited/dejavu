define([
    './common/randomAccessor',
    './options',
    'amd-utils/lang/createObject',
    'amd-utils/lang/isObject',
    'amd-utils/lang/isArray',
    'amd-utils/lang/isFunction',
    'amd-utils/object/hasOwn',
    'amd-utils/array/forEach',
    'amd-utils/function/bind'
], function (randomAccessor, options, createObject, isObject, isArray, isFunction, hasOwn, forEach, bind) {

    'use strict';

    var random = randomAccessor('inspectWrapper'),
        $class = '$class_' + random,
        cacheKeyword = '$cache_' + random,
        redefinedCacheKeyword = '$redefined_cache_' + random;

    /**
     * Fetches an already inspected target from the cache.
     * Returns null if not in the cache.
     *
     * @param {Object|Function} target The instance or constructor.
     * @param {Array}           cache  The cache
     *
     * @return {Object|Function} The inspected target
     */
    function fetchCache(target, cache) {
        var x,
            length = cache.length,
            curr;

        for (x = 0; x < length; x += 1) {
            curr = cache[x];
            if (curr.target === target) {
                return curr.inspect;
            }
        }

        return null;
    }

    /**
     * Inspects an instance.
     *
     * @param {Object} target The instance
     * @param {Array}  cache  The cache
     *
     * @return {Object} The inspected instance
     */
    function inspectInstance(target, cache) {
        var cached = fetchCache(target, cache),
            def,
            simpleConstructor,
            methodsCache,
            propertiesCache,
            obj,
            tmp,
            key;

        if (cached) {
            return cached;
        }

        def = target.$static[$class];
        simpleConstructor = def.simpleConstructor;
        methodsCache = target[cacheKeyword].methods;
        propertiesCache = target[cacheKeyword].properties;

        obj = createObject(simpleConstructor.prototype);
        cache.push({ target: target, inspect: obj });

        // Methods
        for (key in target[redefinedCacheKeyword].methods) {
            obj[key] = methodsCache[key];
        }

        // Properties
        for (key in target[redefinedCacheKeyword].properties) {
            tmp = propertiesCache[key];
            obj[key] = inspect(tmp, cache, true);
        }

        // Handle undeclared properties
        for (key in target) {
            if (!hasOwn(obj, key) && !hasOwn(propertiesCache, key) && !methodsCache[key]) {
                obj[key] = inspect(target[key], cache, true);
            }
        }

        // Fix the .constructor
        tmp = obj.constructor;
        while (tmp) {
            obj.constructor = inspectConstructor(obj.constructor.$constructor, cache, true);
            tmp = tmp.$parent;
        }

        return obj;
    }

    /**
     * Inspects an constructor.
     *
     * @param {Function} target The constructor
     *
     * @return {Object} The inspected constructor
     */
    function inspectConstructor(target, cache) {
        var cached = fetchCache(target, cache),
            def,
            methodsCache,
            propertiesCache,
            obj,
            tmp,
            key;

        if (cached) {
            return cached;
        }

        def = target[$class];
        obj = def.simpleConstructor;
        methodsCache = target[cacheKeyword].methods;
        propertiesCache = target[cacheKeyword].properties;

        cache.push({ target: target, inspect: obj });

        // Methods
        for (key in methodsCache) {
            obj[key] = methodsCache[key];
        }

        // Properties
        for (key in propertiesCache) {
            tmp = propertiesCache[key];
            obj[key] = inspect(tmp, cache, true);
        }

        // Handle undeclared properties
        for (key in target) {
            if (!hasOwn(obj, key) && !hasOwn(propertiesCache, key) && !methodsCache[key]) {
                obj[key] = inspect(target[key], cache, true);
            }
        }

        return obj;
    }

    /**
     * Inspects a property, recursively finding for instances/constructors.
     *
     * @param {Object}  prop  The property
     * @param {Array}   cache The cache
     * @param {Boolean} clone True to clone findings, false otherwise
     *
     * @return {Object} The inspected property
     */
    function inspect(prop, cache, clone) {
        var key,
            x,
            length,
            ret;

        cache = cache || [];

        if (isObject(prop)) {
            if (prop.$static) {
                return inspectInstance(prop, cache);
            }

            ret = clone ? {} : prop;
            for (key in prop) {
                ret[key] = inspect(prop[key], cache, clone);
            }

            return ret;
        }

        if (isArray(prop)) {
            length = prop.length;
            ret = clone ? [] : prop;
            for (x = 0; x < length; x += 1) {
                ret[x] = inspect(prop[x], cache, clone);
            }

            return ret;
        }

        if (isFunction(prop)) {
            if (prop[$class]) {
                return inspectConstructor(prop, cache);
            }

            return prop;
        }

        return prop;
    }

    /**
     * Rewrites console methods, enhancing them with inspect capability
     *
     * @param {Array} methods The method names to rewrite
     */
    function rewriteConsole(methods) {
        forEach(methods, function (method) {
            var prev = console[method];
            if (prev) {
                // Fix for IE..
                if (typeof prev === 'object') {
                    prev = bind(prev, console);
                }

                console[method] = function () {
                    var args = [],
                        length = arguments.length,
                        x;

                    for (x = 0; x < length; x += 1) {
                        args[x] = inspect(arguments[x]);
                    }

                    prev.apply(console, args);
                };
            }
        });
    }

    // Rewrite some console methods to deliver the inspect automatically
    if (options.rewriteConsole && typeof console !== 'undefined') {
        rewriteConsole(['log', 'info', 'warn', 'error', 'debug', 'dir']);
    }

    return inspect;
});