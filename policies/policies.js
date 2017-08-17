const GROUPS = require('../fepsApp-BE').constants.groups;

module.exports=[
  {"api" : "/news", "method" : "post", "groups" : [GROUPS.super_admin]},
  {"api" : "/news", "method" : "put", "groups" : [GROUPS.super_admin]},
  {"api" : "/news", "method" : "delete", "groups" : [GROUPS.super_admin]},
  {"api" : "/users", "method" : "patch", "groups" : [GROUPS.super_admin]}
];
