/**!
 * AngularJS Nested Resource
 * @author  Roy  <peled.roy@gmail.com>
 * @version 2.0.0
 */
(function() {
    var angularNested = angular.module('ngNestedResource', []);

    angularNested.factory('nestedResource', ['$http', '$q', function($http, $q) {


        var noop = angular.noop,
            forEach = angular.forEach,
            extend = angular.extend,
            copy = angular.copy,
            isFunction = angular.isFunction,
            isObject = angular.isObject;

        var KEYS_TO_REMOVE = {
            params: true, isArray: true, interceptor: true, construct: true, nested: true, route: true
        }


        function cleanParams(params){
            var result = {};
            forEach(params, function(value, key){
                if(!/^\$/.test(key))
                    result[key] = value;
            });
            return result;
        }

        function defaultResponseInterceptor(response) {
            return response;
        }

        function Route(template){
            var builtRoute = template;

            return {
                build: function(param){
                    if(typeof param == "object") {
                        builtRoute = template.replace(/@([^/]*)/, function(match, group){
                            return param[group];
                        });
                    } else
                        builtRoute = template.replace(/@([^/]*)/, param);

                    isBuilt = true;
                },
                parameterize: function(obj){
                    if(!obj)
                        return;

                    builtRoute = builtRoute.replace(/:([^/]*)/gi, function(match, group){
                        return obj[group];
                    });
                },
                url: function(){
                    return builtRoute;
                },
                template: function(){
                    return template;
                }

            }
        }

        return (function Factory(root, setup, type){

            var constructObject, rootObject;

            type = type || "resource";

            function NestedAction(parentRoute, setupParams){

                var currentRoute, httpConfig = {}, parameters, FutureActions;

                var DEFAULT_SETTINGS = {
                    method: "GET",
                    route: ""
                }

                forEach(setupParams, function(value, key) {
                    if (!KEYS_TO_REMOVE[key]) {
                        httpConfig[key] = copy(value);
                    }
                });

                return function callNestedAction(param, payload, success, error){
                    /**
                     * Fallback variables
                     */
                    if(isObject(param)){
                        error = success;
                        success = payload
                        payload = param;
                        param = null;
                    } else if(isFunction(param)){
                        error = payload;
                        success = param;
                        payload = {};
                        param = null;
                    } else if(isFunction(payload)){
                        error = success;
                        success = payload;
                        payload = {};
                    }

                    parameters = copy(payload || {});
                    extend(parameters, this);

                    currentRoute = new Route(parentRoute.url() + (setupParams.route || DEFAULT_SETTINGS.route));
                    FutureActions = innerStepFactory(currentRoute, setupParams.nested);

                    currentRoute.build(param || parameters);
                    currentRoute.parameterize(parameters);

                    httpConfig.url = currentRoute.url();

                    // If the request if GET, send in querystring only the supplied arguments. Else (PUT, POST, DELETE), send the entire object:
                    if(httpConfig.method == "GET")
                        httpConfig.params = payload;
                    else
                        httpConfig.data = cleanParams(parameters);

                    var responseInterceptor = setupParams.interceptor && setupParams.interceptor.response ||
                        defaultResponseInterceptor;
                    var responseErrorInterceptor = setupParams.interceptor && setupParams.interceptor.responseError ||
                        undefined;

                    var value;
                    if(setupParams.isArray)
                        value = [];
                    else if(!setupParams.scoped)
                        value = this.$$type ? this : new FutureActions(this);
                    else
                        value =  new FutureActions();

                    var result = $http(httpConfig)
                        .then(function(response){
                            var data = response.data;

                            if (data) {
                                if (setupParams.isArray) {
                                    if(setupParams.iterator){
                                        var wrapped = setupParams.iterator(data, function(item){
                                            return new FutureActions(item, true);
                                        });
                                        value = value.concat(wrapped);
                                    } else {
                                        for (var i = 0; i < data.length; i++) {
                                            value.push(new FutureActions(data[i], true));
                                        }
                                    }
                                } else if(isObject(data)) {
                                    extend(value, data);
                                }
                            }

                            response.resource = value;

                            return response;

                        }, function(response) {

                            (error||noop)(response);

                            return $q.reject(response);
                        });

                    result = result.then(
                        function(response) {
                            var value = responseInterceptor(response.resource);
                            (success||noop)(value, response.headers);
                            return value;
                        },
                        responseErrorInterceptor);

                    return value;

                }

            }

            function rootStepFactory(baseRoute, setupActions){
                var actions = {};

                function NestedResource(data){
                    if(data && constructObject)
                        data = new constructObject(data);
                    else
                        extend(this, actions);
                    extend(this, data);
                }

                NestedResource.prototype["$$type"] = type;

                forEach(setupActions, function(action, name){
                    actions[name] = new NestedAction(baseRoute, action);
                });

                extend(NestedResource, actions);

                return NestedResource;
            }

            function innerStepFactory(baseRoute, setupActions){
                if(!setupActions)
                    return constructObject || rootObject;

                var actions = {};

                function NestedResource(data){
                    extend(this, data);
                    extend(this, actions);
                }

                actions["$$type"] = type;

                forEach(setupActions, function(action, name){
                    actions["$" + name] = new NestedAction(baseRoute, action);
                });

                return NestedResource;
            }

            function constructStepFactory(baseRoute, setupActions){
                forEach(setupActions, function(action, name){
                    if(action.construct) {
                        var newRoute = new Route(baseRoute.url() + action.route)
                        constructObject = innerStepFactory(newRoute, action.nested);
                    }
                });
            }

            var root = new Route(root);

            constructStepFactory(root, setup);

            rootObject = rootStepFactory(root, setup);

            return rootObject;

        })

    }]);
})();
