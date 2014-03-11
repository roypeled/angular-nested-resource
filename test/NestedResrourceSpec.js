'use strict';

var module = angular.module('module',['ngResource', 'ngNestedResource']);

describe("Nested Resource", function(){


    beforeEach(module('module'));

    var organizations, httpBackend;


    beforeEach(inject(function($httpBackend, nestedResource){

        httpBackend = $httpBackend;

        organizations = nestedResource("/api/organizations/", {
            getAll: {method: "GET", isArray: true},
            create: {method: "POST"},
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
    }));

    it("should verify all calls are handled correctly", function(){

        organizations.getAll();
        httpBackend.expectGET("/api/organizations").respond([{id:1, name:"Google.com"}]);
        httpBackend.flush();

        organizations.create({name: "Google.com"});
        httpBackend.expectPOST("/api/organizations").respond({id:1, name:"Google.com"});
        httpBackend.flush();

        var organization = organizations.get(1);
        httpBackend.expectGET("/api/organizations/1").respond({id:1, name:"Google.com"});
        httpBackend.flush();

        organization.$update({name: "Bing.com"});
        httpBackend.expectPUT("/api/organizations/1").respond({id:1, name:"Bing.com"});
        httpBackend.flush();

        var workers = organization.$workers();
        httpBackend.expectGET("/api/organizations/1/workers?").respond([{id:264, name:"No Name"}]);
        httpBackend.flush();

        workers.$update(264, {name: "Steve Ballmer"});
        httpBackend.expectPUT("/api/organizations/1/workers", {param:264, name: "Steve Ballmer"})
            .respond({id:264, name:"Steve Ballmer"});
        httpBackend.flush();

    })


})