/*jslint sloppy: true */
/*global define */

/**
 * Classify - Sugar syntax for Prototypal Inheritance
 *
 * @author Luís Couto
 * @contact lcouto87@gmail.com
 * @version 1.0.0
 *
 * @example
 *      var Example = Classify({
 *          Implements : [oneInterface, twoInterface],
 *          Extends: ParentClassify,
 *          Borrows: [Mixin1, Mixin2],
 *          Binds: ['method1', 'method2'],
 *          Statics: {
 *              staticMethod1: function(){},
 *              staticMethod2: function(){},
 *              staticMethod3: function(){},
 *          },
 *          initialize: function () {},
 *          method1: function () {},
 *          method2: function () {},
 *          method3: function () {}
 *      });
 *
 * @param {Object} methods Object
 * @returns Function
 */

define("Trinity/Classify", ["Classify.Abstract", "Classify.Interface", "Classify.Singleton"], function (Abstract, Singleton, Interface) {

    function Classify(methods) {

        var classify;



        /**
         * Extends an object with another given object
         *
         * @private
         *
         * @param {Object} target Object's that will get the new methods
         * @returns undefined
         */

        function extend(methods, target) {
            var k;
            for (k in methods) {
                if (methods.hasOwnProperty(k)) {
                    target[k] = methods[k];
                }
            }
        }



        /**
         * For an Array of Objects, add their methods/properties to
         * target's prototype
         *
         * @private
         * @param {Array} arr Array of objects that will give their methods
         * @param {Object} Target that will receive the methods
         * @returns undefined
         */

        function borrows(arr, target) {

            var i = arr.length - 1,
                constructorBck;

            for (i; i >= 0; i -= 1) {
                if (arr[i].prototype && arr[i].prototype.constructor) {
                    constructorBck = arr[i].prototype.constructor;
                    delete arr[i].prototype.constructor;
                    extend(arr[i].prototype, target.prototype);
                    arr[i].prototype.constructor = constructorBck;
                } else {
                    extend(arr[i].prototype || arr[i], target.prototype);
                }
            }
        }



        /**
         * Fixes the context in given methods
         *
         * @private
         * @param {Function}
         * @returns function handler with fixed context
         */

        function binds(arr, context, target) {
            var proxy = function (func) {

                if (Function.prototype.bind) {
                    return func.bind(context);
                }

                return function () {
                    return func.apply(context, arguments);
                };

            },
                i = arr.length - 1;

            for (i; i >= 0; i -= 1) {
                target[arr[i]] = proxy(target[arr[i]], classify);
            }
        }



        /**
         * Copies the given object into a freshly
         * created empty function's prototype
         *
         * @private
         * @param {Object} o Object
         * @returns {Function} Instance
         * @type Function
         */

        function clone(o) {
            function F() {}
            F.prototype = o;
            return new F();
        }



        function interfaces(arr, target) {
            var i = arr.length - 1,
                k;

            for (i; i >= 0; i -= 1) {
                for (k in arr[i]) {
                    if (!(target.hasOwnProperty(k)) && (k !== "Extends" || k !== "Name")) {
                        throw new Error("Class does not implements Interface " + arr[i].Name + "correctly");
                    }
                }
            }
        }


        classify = methods.initialize || function classify() {};

        if (methods.Extends) {
            classify.Parent = methods.Extends.prototype;
            classify.prototype = clone(classify.Parent);
            extend(methods, classify.prototype);
        } else {
            classify.prototype = methods;
        }

        classify.prototype.constructor = classify;

        if (methods.Borrows) {
            borrows(methods.Borrows, classify);
        }

        if (methods.Binds) {
            binds(methods.Binds, classify, classify.prototype);
        }

        if (methods.Statics) {
            extend(methods.Statics, classify);
            delete classify.prototype.Static;
        }

        if (methods.Implements) {
            interfaces(methods.Implements, this);
        }



        return classify;

    }


    Classify.Abstract = Abstract;
    Classify.Interface = Interface;
    Classify.Singleton = Singleton;

    return Classify;
});
