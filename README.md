angular-nested-resource
======================

A lightweight angular module that helps working with RESTful models.
I was researching restangular and didn't like the fact that it was dependant on lodash and the dact that the models weren't configurable.

I liked ng-resources approach, but the implementation is horrible with nested objects.

So here is my solution.

### Version 2.0
- Removed dependency with ngResource, now this code duplicates $resource's behavior.
- Refactored the entire process, code is much more organized.
- Added support to define a type for a resource which will be accesible on the $$type flag.
- Added better promise behavior.
- Added 'constructor' flag which will allow wrapping of objects in an inner actions.
- Added 'iterator' function to manipulate wrapping of array results.


## Usage
To use this module you must add the JS file to your HTML and add `ngNestedResource` as a dependency to your app:
```html
<!DOCTYPE html>
<html>
<head>
    <title></title>
    <script src="https://ajax.googleapis.com/ajax/libs/angularjs/1.2.5/angular.min.js"></script>
    <script src="angular-nested-resource.js"></script>
</head>
<body ng-app="app">
...

```
```js
angular.module("app", ["ngNestedResource"]);
```

### Basic root object
Nested resource is using angular's own resource module as a scaffolding. So you can use the original resource configuration:
```js

var organizations = nestedResource("/api/organizations/", {
    getAll: {method: "GET", isArray: true},
    create: {method: "POST"}
});

organizations.getAll();
// GET: "/api/organizations/"
organizations.create({name: "Google.com"}); 
// POST: "/api/organizations/", payload: "{name: 'Google.com'}"
// returns { id:1, name: "Google.com"}

```
Each method will behave like a regular resource object.

### Creating nested objects
```js
var organizations = nestedResource("/api/organizations/", {
    getAll: {method: "GET", isArray: true},
    create: {method: "POST"},
    get: {
        route: "@/",
        method: "GET"
    }
});

organizations.get(1); 
// GET: "/api/organizations/1/"
// returns { id:1, name: "Google.com"}
```
When specifying a route to an action you can add a wildcard (@) which will be replaced with the parameter supplied to the action, or a field name (@id) which will be replaced from the same field name in a supplied object.

### Extending a nested object
```js
var organizations = nestedResource("/api/organizations/", {
    get: {
        route: "@/",
        method: "GET",
        nested: {
            update: { method: "PUT" },
            delete: { method: "DELETE" },
            workers: {
                method: "GET",
                route: "workers/",
                isArray: true,
                nested: {
                    update: {
                        method: "PUT",
                        route: "@/"
                    }
                }
            }
        }
    }
});

var organization = organizations.get(1); 
// GET: "/api/organizations/1/"
// returns { id:1, name: "Google.com"}

organization.$update({name: "Bing.com"});
// PUT: "/api/organizations/1/", payload: "{name: 'Bing.com'}"
// returns { id:1, name: "Bing.com"}

var workers = organization.$workers();
// GET: "/api/organizations/1/workers/"
// returns [...]

workers.$update(264, {name: "Steve Ballmer"});
// PUT: "/api/organizations/1/workers/264/", payload: "{name: 'Steve Ballmer'}"
```
You can nest objects using the 'nested' property, and just follow the same pattern inside.


### Creating a new resource with existing data

```js
var Organizations = nestedResource("/api/organizations/", {
    get: {
        route: "@id/",
        method: "GET",
        construct: true,
        nested: {
            update: { method: "PUT" },
            delete: { method: "DELETE" },
            workers: {
                method: "GET",
                route: "workers/",
                isArray: true,
                nested: {
                    update: {
                        method: "PUT",
                        route: "@/"
                    }
                }
            }
        }
    }
});

var org = {
    id: 294,
    name: "Google Inc."
}

var orgResource = new Organizations(org);
orgResource.$delete()
// DELETE: "/api/organizations/294/"
```
A constructor action will us its nested actions to wrap a new object. When defining a constructor action define which property name should be used in the route (@id -> id: 294).

### Defining type

```js
var Organizations = nestedResource("/api/organizations/", {
    getAll: {method: "GET", isArray: true},
    create: {method: "POST"},
    get: {
        route: "@/",
        isArray: true,
        method: "GET"
    }
}, "organization");

Organizations.$$type;
// "organization"

var org = Organizations.get(1);
org[0].$$type;
// "organization"

var org = new Organizations();
org.$$type;
// "organization"
```
A type is added for every nestedResource object.


### Async Handling

Since this module is using resource, all requests are handled with $q's promises.
