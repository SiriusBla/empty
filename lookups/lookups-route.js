const express = require('express');
const router = express.Router();
const CONSTANTS = require('../fepsApp-BE').constants;
const cacheOperations = require('../fepsApp-BE').cacheOperations;
let cache = require('memory-cache');
const auth = require('../fepsApp-BE').auth;

router.get('/sectors', (req, res)=>{
  let sectors = cache.get(CONSTANTS.documents.type.sectors);
  res.json(sectors);
});
router.get('/sectors/refresh', (req, res)=>{
  cacheOperations.refreshSectors().then((sectors)=>{
    res.json({message : "Sectors are refreshed successfully", data : sectors});
  }, (err)=>{
    res.send(err)
  });
});

router.get('/groups', (req, res)=>{
  let groups = cache.get(CONSTANTS.documents.type.groups);
  res.json(groups);
});

router.get('/groups/refresh', (req, res)=>{
  cacheOperations.refreshGroups().then((groups)=>{
    res.json({message : "Groups are refreshed successfully", data : groups});
  }, (err)=>{
    res.send(err)
  });
});

router.get('/projects_status', (req, res)=>{
    let project_status = cache.get(CONSTANTS.documents.type.project_status);
res.json(project_status);
});

router.get('/projects_status/refresh', (req, res)=>{
    cacheOperations.refreshProjectStatus().then((status)=>{
    res.json({message : "Project Status are refreshed successfully", data : status});
}, (err)=>{
    res.send(err)
});
});

module.exports = router;
