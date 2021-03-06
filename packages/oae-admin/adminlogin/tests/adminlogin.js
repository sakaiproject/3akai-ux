/*!
 * Copyright 2014 Apereo Foundation (AF) Licensed under the
 * Educational Community License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License. You may
 * obtain a copy of the License at
 *
 *     http://opensource.org/licenses/ECL-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an "AS IS"
 * BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express
 * or implied. See the License for the specific language governing
 * permissions and limitations under the License.
 */

casper.test.begin('Widget - Login', function(test) {
    /**
     * Verify the log in form validation by checking the following:
     *     - Try submitting an empty form
     *     - Try submitting a form without username
     *     - Try submitting a form without password
     *     - Try submitting a form with incorrect user credentials
     */
    var verifyLoginValidation = function() {
        casper.waitForSelector('#adminlogin-local', function() {
            // Fill empty form
            casper.fill('form#adminlogin-local', {
                'adminlogin-local-username': '',
                'adminlogin-local-password': ''
            }, false);
            // Do the login
            casper.click('form#adminlogin-local button[type="submit"]');
            // Verify that an error label is shown
            test.assertExists('#adminlogin-local-username-error', 'Log in form successfully validated empty form - username');
            test.assertExists('#adminlogin-local-password-error', 'Log in form successfully validated empty form - password');


            // Fill form without username
            casper.fill('form#adminlogin-local', {
                'adminlogin-local-username': '',
                'adminlogin-local-password': 'administrator'
            }, false);
            // Do the login
            casper.click('form#adminlogin-local button[type="submit"]');
            test.assertExists('#adminlogin-local-username-error', 'Log in form successfully validated empty username field');

            // Fill form without password
            casper.fill('form#adminlogin-local', {
                'adminlogin-local-username': 'administrator',
                'adminlogin-local-password': ''
            }, false);
            // Do the login
            casper.click('form#adminlogin-local button[type="submit"]');
            test.assertExists('#adminlogin-local-password-error', 'Log in form successfully validated empty password field');

            // Fill form with incorrect user credentials
            casper.fill('form#adminlogin-local', {
                'adminlogin-local-username': 'incorrect',
                'adminlogin-local-password': 'user'
            }, false);
            // Do the login
            // TODO: This is no longer using a notification
            //casper.click('form#adminlogin-local button[type="submit"]');
            //casper.waitForSelector('#oae-notification-container .alert', function() {
            //    test.assertExists('#oae-notification-container .alert.alert-error', 'Log in form successfully validated incorrect user credentials');
            //    casper.click('#oae-notification-container .close');
            //});
        });
    };

    casper.start(configUtil.adminUI, function() {
        // Verify logging in
        casper.then(function() {
            casper.echo('# Verify logging in to the administration interface', 'INFO');
            userUtil.doLogIn(configUtil.adminUsername, configUtil.adminPassword);
            uiUtil.openAdmin();
            casper.then(function() {
                test.assertExists('#adminheader-content #adminheader-logout', 'Successfully logged in to the administration interface');
            });
        });

        // Verify logging out
        casper.then(function() {
            casper.echo('# Verify logging out of the administration interface', 'INFO');
            userUtil.doLogOut();
            uiUtil.openAdmin();
            casper.waitForSelector('#adminlogin-local', function() {
                test.assertExists('#adminlogin-local', 'Successfully logged out of the administration interface');
            });
        });

        // Verify form validation
        casper.then(function() {
            casper.echo('# Verify log in form validation', 'INFO');
            casper.then(verifyLoginValidation);
        });
    });

    casper.run(function() {
        test.done();
    });
});
