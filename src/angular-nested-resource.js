/**!
 * AngularJS Nested Resource
 * @author  Roy  <peled.roy@gmail.com>
 * @version 1.0.0
 */
(function() {
    var angularNested = angular.module('ngNestedResource', []);

    angularNested.factory('nestedResource', ['$resource', function($resource) {


        function buildStep(currentRoute, actions){

            var result = {};
            var nested = {};

            // Check if we have any nested objects in the resource
            // If we found any, remove them and save in a different object
            for(var key in actions){
                if(actions[key].nested || actions[key].route){
                    nested[key] = actions[key];
                    delete actions[key];
                }
            }

            // Create a new resource for the normal resource requests (resource API)
            var resource = $resource(currentRoute, {}, actions);

            // Add all methods from the resource to our result object
            for(var key in actions){
                result[key] = resource[key];
            }

            for(var key in nested){
                // For each nested object, create a new route from the config
                var futureRoute = currentRoute + (nested[key].route || "");
                // Create a resource object for that route, replace the '@'
                // symbol with a resource param placeholder, and pass the configurations
                // to the resource
                var nestedResource = $resource(futureRoute.replace("@", ":param"), {}, {
                    get: {method: nested[key].method, params: {param: "@param"}, isArray: nested[key].isArray}
                });
                // Loop through the nested objects inside this action
                result[key] = fabricateStep(futureRoute, nested[key], nestedResource);
            }

            return result;
        }

        function fabricateStep(current, nest, nestedResource){
            return function(mainParam, payloadObj){
                // When this method is called with a param save a new route with the static param
                // for a future nested object
                if(typeof mainParam == "object"){
                    payloadObj = mainParam;
                    mainParam = "";
                }
                var resourceParams = {param: mainParam};
                for(var key in payloadObj){
                    resourceParams[key] = payloadObj[key];
                }
                var futureRoute = current.replace("@", mainParam);
                var nestedResult = nestedResource.get(resourceParams);
                nestedResult.$promise.then(function(resourceObject){
                    for(var action in nestedSteps)
                        resourceObject["$" + action] = nestedSteps[action];
                })
                var nestedSteps = buildStep(futureRoute, angular.copy(nest.nested));

                for(var action in nestedSteps)
                    nestedResult["$" + action] = nestedSteps[action];

                return nestedResult;
            }
        }

        return function(root, actions){
            return buildStep(root, actions);
        }
    }]);
})();