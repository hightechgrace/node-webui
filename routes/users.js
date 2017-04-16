var express = require('express');
var router = express.Router();
var path = require('path');
var winston = require('winston');

var userService = require(path.join(__dirname, '../models/user'));
var restrict = require(path.join(__dirname, '../auth/restrict'));

/* GET users listing. */
router.get('/', restrict, function(req, res, next) {
  redirect('/');
});

/* GET /users/view listing. */
router.get('/logout', restrict, function(req, res, next) {
    winston.log("info", "[webui] user logging out.....");
    winston.log("info", "[webui] user session "+JSON.stringify(req.session));

    if(typeof req.session.passport !== 'undefined'){

        //delete facebook token and google token
        var user = req.session.passport.user;

        user.googletoken = '';
        user.fbtoken = '';

        userService.updateUser(user, function (userResult) {
        });
    }

    req.logout();
    req.session.destroy();
    res.redirect('/');


});



router.get('/check-google-login', function (req, res, next) {

    var result = {
        'status': 'not-login'
    };

    if ( typeof req.session.googleUser !== 'undefined' && req.session.googleUser.googletoken ) {

        result = {
            'status': 'login'
        };

    }

    res.json(result);

});



router.get('/check-fb-login', function (req, res, next) {

    var result = {
        'status': 'not-login'
    };

    if ( typeof req.session.fbUser !== 'undefined' && req.session.fbUser.fbtoken ) {

        result = {
            'status': 'login'
        };

    }

    res.json(result);

});


router.get('/profile', restrict, function (req, res, next) {

    var vm = {
        title: 'Profile - Evostream Web UI ',
        layout: 'admin/layout',
        error: req.flash('error')
    };
    res.render('admin/profile', vm);

});



router.get('/profile-info', restrict, function (req, res, next) {

    winston.log("info", '[webui] profile information');

    var userInfo = {};

    if(typeof req.session.passport != 'undefined'){
        userInfo.email = req.session.passport.user.email;
        userInfo.password = req.session.passport.user.password;
    }

    userInfo.fbtoken = '';
    userInfo.fbemail = '';
    userInfo.fbname = '';
    userInfo.googletoken = '';
    userInfo.googleemail = '';
    userInfo.googlename = '';

    //Get Facebook info on session
    if(req.session.fbUser){
        userInfo.fbtoken = req.session.fbUser.fbtoken;
        userInfo.fbemail = req.session.fbUser.email;
        userInfo.fbname = req.session.fbUser.name;
    }

    //Get Google info on session
    if(req.session.googleUser){
        userInfo.googletoken = req.session.googleUser.googletoken;
        userInfo.googleemail = req.session.googleUser.email;
        userInfo.googlename = req.session.googleUser.name;
    }

    //Get the user data
    res.json(userInfo);
    // res.json(req.session);

});


router.get('/profile-change-password', restrict, function (req, res, next) {

    winston.log("info", '[webui] profile - change password' );
    
    var result = {};
    result.status = false;

    var parameter = req.query;

    var userResult = {
        email: parameter.email,
        password: parameter.password,
        oldpassword: parameter.oldpassword
    }

    if(parameter){

        //Check Old Password
        winston.log("info", '[webui] profile - check old password' );

        userService.findUserOldPassword(userResult, function (response) {
            if (response.status != false) {

                //Update to New Password only if the Old Password match
                winston.log("info", '[webui] profile - setting the new password' );
                userService.updateUserPassword(userResult, function (response) {
                    winston.log("info", '[webui] profile - setting the new password response '+JSON.stringify(response) );

                    if (response.status == 'success') {
                        result.status = true;
                    }

                    winston.log("verbose", "[webui] profile - setting the new password result" + JSON.stringify(result));
                    res.json(result);
                });
            }else{
                winston.log("verbose", "[webui] profile - setting the new password result" + JSON.stringify(result));
                res.json(result);
            }
        });

    }else{
        winston.log("verbose", "[webui] profile - setting the new password result" + JSON.stringify(result));
        res.json(result);
    }


});

router.get('/unlink-social-token', restrict, function (req, res, next) {

    winston.log("info", '[webui] unlink social token');

    var result = {};
    result.status = false;

    var parameter = req.query;

    var removeTokenUser = {
        email: parameter.email,
        token: ''
    };

    if(parameter){
        if(parameter.social == 'fb'){

            //remove token in database
            userService.findFbEmailUpdateToken(removeTokenUser, function (response) {
                if (response.length != 0) {
                    result.status = true;

                    //remove token in session
                    if(req.session.passport){
                        req.session.passport.user.fbtoken = '';
                    }
                    req.session.fbUser = {};

                    res.json(result);
                }

            });




        }else if(parameter.social == 'google'){
            //remove token in database
            userService.findGoogleEmailUpdateToken(removeTokenUser, function (response) {
                if (response.length != 0) {
                    result.status = true;

                    //remove token in session
                    if(req.session.passport){
                        req.session.passport.user.googletoken = '';
                    }
                    req.session.googleUser = {};

                    res.json(result);
                }

            });
        }

    }


});



module.exports = router;
