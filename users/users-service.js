const crypto = require('crypto');
let cache = require('memory-cache');
const usersModel = require('./users.model');
const Promise = require('promise');
const pino = require('../fepsApp-BE').pino;
const messages = require('../fepsApp-BE').messages;
const ErrorMessage = require('../fepsApp-BE').ErrorMessage;
const Message = require('../fepsApp-BE').Message;
const CONSTANTS = require('../fepsApp-BE').constants;
const securtiyUtil = require('../fepsApp-BE').securtiyUtil;
const ModelUtil = require('../fepsApp-BE').ModelUtil;
const ObjectUtil = require('../fepsApp-BE').objectUtil;
const utils = require('../fepsApp-BE').utils;
const attachementService = require('../attachments/attachment-service');

exports.getUserByUsername = function(username){
  return new Promise(function(resolve,reject){
    const funcName = "getUserByUsername";
    const query = {"username" : username};
    pino.debug({fnction : __filename+ ">" + funcName}, "Getting user by username : " + username);
    usersModel.getUsers(query).then((user)=>{
      if(user){
        delete user.hash;
        delete user.salt;
      }
      pino.info({fnction : __filename+ ">" + funcName, user : user}, "Getting user by username : " + username);
      let message = new Message(Message.GETTING_DATA, user, null);
      resolve(message);
    },(err)=>{
      return utils.rejectMessage(ErrorMessage.DATABASE_ERROR,  err, funcName, reject);
    });
  });
};

exports.getUsersByGroups = function(groups){
	return new Promise((resolve, reject)=>{
    const funcName = "getUsersByGroups";
		let query = {
			type : CONSTANTS.documents.type.users,
			"groups" :  {
				"$elemMatch": { "id":  {"$in": groups}}
			}
		};
    pino.debug({fnction : __filename+ ">" + funcName}, "Getting user by groups : " + groups);
		ModelUtil.findByQuery(query).then((users)=>{
      if(users){
        for(let i =0; i < users.length; i++){
          delete users[i].hash;
          delete users[i].salt;
        }
      }
      pino.debug({fnction : __filename+ ">" + funcName}, "Result of getting user by groups : " + users);
			resolve(users);
		}, (err)=>{
			reject(err);
		});
	});
}

exports.getUserByUsernameGroup = function(username, group){
  return new Promise((resolve, reject)=>{
    let funcName = "getUserByUsernameGroup";
    let query = {
      type : CONSTANTS.documents.type.users,
      "username" : username,
      "groups" :  {
        "$elemMatch": { "name":  group}
      }
    };
    ModelUtil.findByQuery(query).then((users)=>{
      if(users){
        for(let i =0; i < users.length; i++){
          delete users[i].hash;
          delete users[i].salt;
        }
      }
      pino.debug({fnction : __filename+ ">" + funcName}, "Result of getting user by groups : " + users);
			resolve(users?users[0] : null);
		}, (err)=>{
			reject(err);
		});

  });
}
exports.createUser = function(userObj){
  return new Promise((resolve, reject)=>{
    const funcName = "createUser";
    //check if username, email, phone is exist
    let query = {
      "$or": [
        { "email": userObj.email },
        { "phone": userObj.phone },
        { "username" : userObj.username}
      ]
    };

    ModelUtil.findByQuery(query).then((users)=>{
      if(users){
        let errorMessages = [];
        let usernameErrorExist, phoneErrorExist, emailErrorExist;

        for(let i = 0; i < users.length; i ++){
          if(users[i].username === userObj.username & !usernameErrorExist){
            errorMessages.push(new ErrorMessage(ErrorMessage.VALIDATION_ERROR,messages.errorMessages.username_already_exist));
            usernameErrorExist = true;
          }
          if(users[i].phone === userObj.phone && !phoneErrorExist){
            errorMessages.push(new ErrorMessage(ErrorMessage.VALIDATION_ERROR,messages.errorMessages.phone_already_exist));
            phoneErrorExist = true;
          }
          if(users[i].email === userObj.email && !emailErrorExist){
            errorMessages.push(new ErrorMessage(ErrorMessage.VALIDATION_ERROR,messages.errorMessages.email_already_exist));
            emailErrorExist = true;
          }
          if(usernameErrorExist && emailErrorExist && phoneErrorExist){
            break;
          }
        }
        return reject(errorMessages);
      }
      pino.debug({fnction : __filename+ ">" + funcName}, "creating user");

      userObj = securtiyUtil.setPassword(userObj, userObj.password);
      //Do not save password directly in DB, we save hash instead.

      delete userObj.password;

      userObj.type = CONSTANTS.documents.type.users;
      let groups = cache.get(CONSTANTS.documents.type.groups);
      userObj.groups = [groups.groups[CONSTANTS.groups.registered_user]];
      userObj.active = true;
      ModelUtil.insertDoc(userObj).then((createdUser)=>{
        let message = new Message(Message.USER_CREATED, createdUser, messages.businessMessages.user_register_success);
        pino.debug({fnction : __filename+ ">" + funcName, user : createdUser}, "User created successfully");
        resolve(message);
      }, (err)=>{
        return utils.rejectMessage(ErrorMessage.DATABASE_ERROR,  err, funcName, reject);
      });

    },(err)=>{
      return utils.rejectMessage(ErrorMessage.DATABASE_ERROR,  err, funcName, reject);
    });

  });
};


exports.updateUser = function(userObj){
	  return new Promise((resolve, reject)=>{

	      //remove password fields if exist
	      delete userObj.password;
	      const funcName = "updateUser";
	      //Check these fields are unique
	      let query = {
	    	      "$or": [
	    	        { "email": userObj.email },
	    	        { "phone": userObj.phone },
	    	        { "username" : userObj.username}
	    	      ]
	    	    };

	      //Check the returned users are different user not the same user
	      ModelUtil.findByQuery(query).then((users)=>{
	        if(users.length >1){
	          let errorMessages = [];
	          let usernameErrorExist, phoneErrorExist, emailErrorExist;

	          for(let i = 0; i < users.length; i ++){
	            if(users[i].username === userObj.username && !usernameErrorExist && users[i]._id != userObj._id){
	              errorMessages.push(new ErrorMessage(ErrorMessage.VALIDATION_ERROR,messages.errorMessages.username_already_exist));
	              usernameErrorExist = true;
	            }
	            if(users[i].phone === userObj.phone && !phoneErrorExist && users[i]._id != userObj._id){
	              errorMessages.push(new ErrorMessage(ErrorMessage.VALIDATION_ERROR,messages.errorMessages.phone_already_exist));
	              phoneErrorExist = true;
	            }
	            if(users[i].email === userObj.email && !emailErrorExist && users[i]._id != userObj._id){
	              errorMessages.push(new ErrorMessage(ErrorMessage.VALIDATION_ERROR,messages.errorMessages.email_already_exist));
	              emailErrorExist = true;
	            }
	            if(usernameErrorExist && emailErrorExist && phoneErrorExist){
	              break;
	            }
	          }
	          return reject(errorMessages);
	        }
	  	pino.debug({fnction : __filename+ ">" + funcName}, "updating user");
        ModelUtil.findById(userObj._id).then((freshUser)=>{
          const oldPic = freshUser.profilePic;
          const newPic = userObj.profilePic;
          freshUser = ObjectUtil.copySameTypeObject(userObj, freshUser);

          ModelUtil.insertDoc(freshUser).then((updatedUser)=>{
	          let message = new Message(Message.UPDATE_OBJECT, updatedUser, messages.businessMessages.user_update_success);
	          pino.debug({fnction : __filename+ ">" + funcName, user : updatedUser}, "User updated successfully");
            if(newPic && oldPic && oldPic.id !== newPic.id){
              attachementService.removeAttachement(oldPic.id, oldPic.rev).then((response)=>{
                let message = new Message(Message.UPDATE_OBJECT, updatedUser, messages.businessMessages.user_update_success);
                resolve(message);
              }, (err)=>{
                reject(err)
              });
            }else{
              let message = new Message(Message.UPDATE_OBJECT, updatedUser, messages.businessMessages.user_update_success);
              resolve(message);
            }
	        }, (err)=>{
	          return utils.rejectMessage(ErrorMessage.DATABASE_ERROR,  err, funcName, reject);
	        });
        }, (err)=>{
          return utils.rejectMessage(ErrorMessage.DATABASE_ERROR,  err, funcName, reject);
        });

	  },(err)=>{
	        return utils.rejectMessage(ErrorMessage.DATABASE_ERROR,  err, funcName, reject);
	      });
	    });
	  };



exports.deleteUser = function(_id, _rev){
  return new Promise((resolve, reject)=>{
    const funcName = "deleteUser";
    pino.debug({fnction : __filename+ ">" + funcName}, "delete user");
    pino.debug({fnction : __filename+ ">" + funcName, _id : _id, _rev : _rev});
    ModelUtil.findById(_id).then((document)=>{
      ModelUtil.deleteDoc(_id, _rev).then((result)=>{
        let message = new Message(Message.OBJECT_REMOVED, result, messages.businessMessages.user_removed);
        pino.debug({fnction : __filename+ ">" + funcName, result :result}, "user is removed");
        if(document.profilePic){
          attachementService.removeAttachement(document.profilePic.id, document.profilePic.rev).then((response)=>{
            resolve(message);
          }, (err)=>{
            reject(err)
          });
        }else{
          resolve(message);
        }
        resolve(message);
      },(err)=>{
        return utils.rejectMessage(ErrorMessage.DATABASE_ERROR,  err, funcName, reject);
      });
    }, (err)=>{

    });

  });
};

exports.checkUserGroup = function(userObj, group){
  if(!userObj || !group){
    throw new Error('userObj and group must be objects');
  }

  for(let i = 0; userObj.groups && i < userObj.groups.length; i++){
    if(userObj.groups[i].name === group){
      return true;
    }
  }
  return false;
}


const setPassword = function(userObj, password){
  userObj.salt = crypto.randomBytes(16).toString('hex');
  userObj.hash = crypto.pbkdf2Sync(password, userObj.salt, 1000, 64, 'sha512').toString('hex');
};


exports.getMentors = function(){
	  return new Promise(function(resolve,reject){
	    const funcName = "get Mentor List";
	    const query = "{\"groups.name\":"+"mentor}";

	    pino.debug({fnction : __filename+ ">" + funcName}, "Getting Mentors List : " );
	    usersModel.getUsers(query).then((result)=>{
	      pino.info({fnction : __filename+ ">" + funcName, result : result}, "Getting mentors List: ");
	   //   let message = new Message(Message.GETTING_DATA, result, null);
	      resolve(result);
	    },(err)=>{
	      return utils.rejectMessage(ErrorMessage.DATABASE_ERROR,  err, funcName, reject);
	    });
	  });
	};

exports.getAllUsers = function(){
    return new Promise((resolve,reject)=>{
        const funcName = "getAllUsers";
        const query = {type : CONSTANTS.documents.type.users};
        pino.debug({fnction : __filename+ ">" + funcName}, "Getting all users");
        ModelUtil.findByQuery(query).then((users)=>{
          //remove password
        if(users){
            for(let i =0; i < users.length; i++){
                delete users[i].hash;
                delete users[i].salt;
            }
        }
        pino.info({fnction : __filename+ ">" + funcName, users : users}, "Getting all users : ");
        let message = new Message(Message.GETTING_DATA, users, null);
        resolve(message);
    },(err)=>{
        return utils.rejectMessage(ErrorMessage.DATABASE_ERROR,  err, funcName, reject);
        });
    });
};

exports.assignProjectsToMentor = function(userObj){
  return new Promise((resolve, reject)=>{
    const funcName = 'assignProjectsToMentor';
    ModelUtil.findById(userObj._id).then((freshUser)=>{
      //user must be mentor to assign projects to him
      if(!freshUser.groups || freshUser.groups.length == 0 || freshUser.groups[0].name !== CONSTANTS.groups.mentor){
        return utils.rejectMessage(ErrorMessage.UNAUTHORIZATION_ERROR,  messages.errorMessages.user_must_be_mentor, funcName, reject);
      }

      if(!freshUser.projects || !Array.isArray(freshUser.projects)){
        freshUser.projects = [];
      }
      freshUser.projects = freshUser.projects.concat(userObj.projects);

      //Remove duplicates projects in user
      let jsonProjects = ObjectUtil.convertArrayIntoJson(freshUser.projects, '_id');

      freshUser.projects = ObjectUtil.convertJsonIntoArrayValues(jsonProjects);

      let updatedUserData;

      ModelUtil.insertDoc(freshUser).then((result)=>{
        updatedUserData = result;
        const projectIds = ObjectUtil.getArrayValuesFromJsons(userObj.projects, '_id');
        //send false because projectIds is array of integers.
        let promises = ModelUtil.getFindByIdPromises(projectIds, false);
        let deassignProjectPromises = [];
        Promise.all(promises).then((freshProjects)=>{

          for (var i = 0; i < freshProjects.length; i++) {
            //deassign project from its old mentors
            // this condition freshProjects[i].mentors[0]._id !== userObj._id, just to make sure the current mentor is not the old mentor
            if(freshProjects[i].mentors && freshProjects[i].mentors[0]._id !== userObj._id && freshProjects[i].mentors.length > 0){
              deassignProjectPromises.push(removeProjectsFromUser(freshProjects[i].mentors[0]._id, [freshProjects[i]._id]));
            }
            freshProjects[i].mentors = [{"_id" : freshUser._id, "_rev" : freshUser._rev, "username" : userObj.username}];
            delete freshProjects[i].score;
            delete freshProjects[i].feedback;
            freshProjects[i].status = CONSTANTS.projects.status.assigned;

          }
          return ModelUtil.bulkUpdates(freshProjects);
        }, (err)=>{
          return utils.rejectMessage(ErrorMessage.DATABASE_ERROR,  err, funcName, reject);
        }).then(()=>{
          //Projects updated successfully
          Promise.all(deassignProjectPromises).then(()=>{
            let message = new Message(Message.UPDATE_OBJECT, updatedUserData, messages.businessMessages.user_update_success);
            resolve(message);
          }, (err)=>{
            return utils.rejectMessage(ErrorMessage.DATABASE_ERROR,  err, funcName, reject);
          });
        }, (err)=>{
          return utils.rejectMessage(ErrorMessage.DATABASE_ERROR,  err, funcName, reject);
        });
      }, (err)=>{
        return utils.rejectMessage(ErrorMessage.DATABASE_ERROR,  err, funcName, reject);
      });

    }, (err)=>{
      return utils.rejectMessage(ErrorMessage.DATABASE_ERROR,  err, funcName, reject);
    });
  });
}


function removeProjectsFromUser(userId, projectIds){
  return new Promise((resolve, reject)=>{
    if(!projectIds || projectIds.length == 0){
      resolve();
    }

    ModelUtil.findById(userId).then((freshUser)=>{
      if(freshUser.projects){
        let remainProjects = [];
        //exclude deleted Projects
        for(let i = 0, total = freshUser.projects.length; i < total; i++){
          if(!projectIds.includes(freshUser.projects[i]._id)){
            remainProjects.push(freshUser.projects[i]);
          }
        }
        freshUser.projects = remainProjects;
        ModelUtil.insertDoc(freshUser).then((result)=>{
          resolve(result);
        }, (err)=>{
          return utils.rejectMessage(ErrorMessage.DATABASE_ERROR,  err, funcName, reject);
        })
      }else{
        resolve();
      }
    }, (err)=>{
      return utils.rejectMessage(ErrorMessage.DATABASE_ERROR,  err, funcName, reject);
    });
  });
}
